"""GET /api/health + /api/health/db diagnostic (Part 9)."""

from __future__ import annotations

import logging

from fastapi import APIRouter

from config import get_settings
from database import db

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
async def health():
    try:
        res = db().table("agents").select("name").eq("status", "active").execute()
        running = len(res.data or [])
        return {"status": "ok", "agents_running": running}
    except Exception as exc:
        log.exception("health-check DB call failed")
        return {
            "status": "degraded",
            "agents_running": 0,
            "error": f"{type(exc).__name__}: {exc}",
        }


@router.get("/health/db")
async def health_db():
    """Probes every table we depend on. Use when you see 500s from the dashboard."""
    settings = get_settings()
    tables = [
        "agents",
        "agent_runs",
        "agent_actions",
        "task_bus",
        "shared_memory",
        "experiment_log",
        "pending_approvals",
        "business_metrics",
        "knowledge_base",
        "work_artifacts",
        "api_rate_limits",
    ]
    results: dict[str, object] = {}
    ok = True
    for t in tables:
        try:
            r = db().table(t).select("*", count="exact").limit(1).execute()
            results[t] = {"ok": True, "count": getattr(r, "count", None)}
        except Exception as exc:
            ok = False
            results[t] = {"ok": False, "error": f"{type(exc).__name__}: {exc}"}
    return {
        "ok": ok,
        "supabase_url_set": bool(settings.supabase_url and settings.supabase_url != "https://xxxx.supabase.co"),
        "service_key_set": bool(settings.supabase_service_key and not settings.supabase_service_key.startswith("eyJ-")),
        "tables": results,
    }
