"""Security primitives: API key auth, CORS, rate limiting, body-size cap, global error handler (Part 5)."""

from __future__ import annotations

import hmac
import logging
from typing import Awaitable, Callable

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from config import get_settings

log = logging.getLogger(__name__)

API_KEY_HEADER = "X-API-Key"
MAX_BODY_BYTES = 1_048_576  # 1 MB (Part 5)

_api_key_scheme = APIKeyHeader(name=API_KEY_HEADER, auto_error=False)

limiter = Limiter(key_func=get_remote_address, default_limits=[])


# ---------------------------------------------------------------------------
# API key auth
# ---------------------------------------------------------------------------
def require_api_key(api_key: str | None = Depends(_api_key_scheme)) -> None:
    settings = get_settings()
    expected = settings.dashboard_api_key
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="DASHBOARD_API_KEY is not configured on the server.",
        )
    if not api_key or not hmac.compare_digest(api_key, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid API key.",
        )


# ---------------------------------------------------------------------------
# Rate limit decorators per Part 5
# ---------------------------------------------------------------------------
def default_rate_limit() -> Callable:
    return limiter.limit(f"{get_settings().rate_limit_per_minute}/minute")


def approvals_rate_limit() -> Callable:
    return limiter.limit("30/minute")


def trigger_rate_limit() -> Callable:
    return limiter.limit("10/minute")


# ---------------------------------------------------------------------------
# Body-size + exception middleware
# ---------------------------------------------------------------------------
class MaxBodySizeMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable]):
        cl = request.headers.get("content-length")
        if cl is not None:
            try:
                if int(cl) > MAX_BODY_BYTES:
                    return JSONResponse(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        content={"error": "payload_too_large", "detail": "Max 1MB body."},
                    )
            except ValueError:
                pass
        return await call_next(request)


# ---------------------------------------------------------------------------
# Consistent JSON error format + never expose stack traces
# ---------------------------------------------------------------------------
async def _http_exc_handler(request: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": "http_error", "detail": exc.detail},
        headers=getattr(exc, "headers", None) or {},
    )


async def _unhandled_handler(request: Request, exc: Exception) -> JSONResponse:
    log.exception("unhandled error on %s %s", request.method, request.url.path)
    body: dict[str, object] = {"error": "internal_error", "detail": "Internal server error."}
    # In non-production, surface the actual error so the operator can diagnose.
    try:
        from config import get_settings
        if get_settings().environment != "production":
            body["detail"] = f"{type(exc).__name__}: {exc}"
    except Exception:
        pass
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=body,
    )


def _rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={"error": "rate_limited", "detail": str(exc.detail)},
        headers={"Retry-After": "60"},
    )


def install_security(app: FastAPI) -> None:
    settings = get_settings()

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*", API_KEY_HEADER],
    )
    app.add_middleware(MaxBodySizeMiddleware)

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_handler)
    app.add_exception_handler(HTTPException, _http_exc_handler)
    app.add_exception_handler(Exception, _unhandled_handler)
