"""Action feed + SSE stream (Part 9)."""

from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query, Request
from starlette.responses import StreamingResponse

from database import db
from security import default_rate_limit, require_api_key

router = APIRouter(prefix="/api/actions", tags=["actions"], dependencies=[Depends(require_api_key)])


@router.get("")
@default_rate_limit()
async def list_actions(
    request: Request,
    agent: str | None = None,
    type: str | None = None,
    importance: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    q = db().table("agent_actions").select("*", count="exact")
    if agent:
        q = q.eq("agent_name", agent)
    if type:
        q = q.eq("action_type", type)
    if importance:
        q = q.eq("importance", importance)
    res = q.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
    return {
        "actions": res.data or [],
        "total": getattr(res, "count", None),
        "limit": limit,
        "offset": offset,
    }


@router.get("/stream")
async def stream_actions(request: Request, api_key: str | None = None):
    """Server-Sent Events feed. Polls agent_actions every 2s and streams new rows.

    Auth: accepts api key via standard X-API-Key header OR ?api_key= query param
    (browsers cannot set headers on EventSource). Verification mirrors
    require_api_key but runs inline so StreamingResponse works.
    """
    from hmac import compare_digest

    from config import get_settings

    provided = request.headers.get("X-API-Key") or api_key or ""
    expected = get_settings().dashboard_api_key
    if not expected or not compare_digest(provided, expected):
        return StreamingResponse(
            iter([b'event: error\ndata: "unauthorized"\n\n']),
            status_code=401,
            media_type="text/event-stream",
        )

    async def gen():
        last_cursor = datetime.now(timezone.utc).isoformat()
        while True:
            if await request.is_disconnected():
                break
            try:
                rows = (
                    db()
                    .table("agent_actions")
                    .select("*")
                    .gt("created_at", last_cursor)
                    .order("created_at", desc=False)
                    .limit(50)
                    .execute()
                    .data
                    or []
                )
                for row in rows:
                    yield f"event: action\ndata: {json.dumps(row, default=str)}\n\n".encode()
                    last_cursor = row["created_at"]
            except Exception as exc:
                yield f"event: error\ndata: {json.dumps({'error': str(exc)})}\n\n".encode()
            await asyncio.sleep(2.0)

    return StreamingResponse(gen(), media_type="text/event-stream")
