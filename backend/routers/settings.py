"""Settings endpoints (Part 9 — /api/settings)."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from database import db
from security import default_rate_limit, require_api_key

router = APIRouter(prefix="/api/settings", tags=["settings"], dependencies=[Depends(require_api_key)])


class GlobalSettingsPatch(BaseModel):
    company_name: str | None = None
    company_description: str | None = None
    icp: str | None = None
    current_product_focus: str | None = None
    revenue_model: str | None = None


def _upsert_knowledge(title: str, content: str, category: str) -> None:
    existing = (
        db()
        .table("knowledge_base")
        .select("id")
        .eq("title", title)
        .limit(1)
        .execute()
        .data
        or []
    )
    if existing:
        db().table("knowledge_base").update({"content": content, "category": category}).eq(
            "id", existing[0]["id"]
        ).execute()
    else:
        db().table("knowledge_base").insert(
            {
                "title": title,
                "content": content,
                "category": category,
                "written_by": "owner",
                "tags": ["business_settings"],
            }
        ).execute()


@router.get("")
@default_rate_limit()
async def get_settings_all(request: Request):
    agents = db().table("agents").select("*").order("name").execute().data or []
    knowledge = (
        db()
        .table("knowledge_base")
        .select("*")
        .contains("tags", ["business_settings"])
        .execute()
        .data
        or []
    )
    return {"agents": agents, "business": {e["title"]: e["content"] for e in knowledge}}


@router.put("/global")
@default_rate_limit()
async def update_global(request: Request, patch: GlobalSettingsPatch):
    data = patch.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="no fields to update")
    mapping = {
        "company_name": ("Company name", "company"),
        "company_description": ("Company description", "company"),
        "icp": ("Target customer (ICP)", "customers"),
        "current_product_focus": ("Current product focus", "product"),
        "revenue_model": ("Revenue model", "product"),
    }
    for key, value in data.items():
        title, category = mapping[key]
        _upsert_knowledge(title, value or "", category)
    return {"ok": True}


@router.post("/pause-all")
@default_rate_limit()
async def pause_all(request: Request):
    db().table("agents").update({"enabled": False, "status": "paused"}).neq(
        "name", ""
    ).execute()
    return {"ok": True}


@router.post("/resume-all")
@default_rate_limit()
async def resume_all(request: Request):
    db().table("agents").update({"enabled": True, "status": "idle"}).neq("name", "").execute()
    return {"ok": True}


@router.post("/reset-caps")
@default_rate_limit()
async def reset_caps(request: Request):
    db().table("agents").update(
        {"tokens_used_today": 0, "cost_usd_today": 0}
    ).neq("name", "").execute()
    db().table("agents").update({"last_run_at": datetime.now(timezone.utc).isoformat()}).eq(
        "status", "paused"
    ).execute()
    return {"ok": True}


@router.post("/kickoff")
@default_rate_limit()
async def kickoff(request: Request):
    """Cold-start the company: CEO runs first; VPs cascade 10-30s later.

    This gives the system a coherent top-down first move instead of waiting for
    each agent's natural tick. Safe to call repeatedly — the scheduler and cap
    enforcement still apply.
    """
    import asyncio

    from agents import AGENTS_BY_NAME, run as run_agent

    ceo = AGENTS_BY_NAME.get("ceo")
    vps = [AGENTS_BY_NAME[n] for n in ("vp_product", "vp_engineering", "vp_gtm") if n in AGENTS_BY_NAME]

    async def cascade():
        if ceo:
            try:
                await run_agent(ceo)
            except Exception:
                pass
        # Stagger VPs so they see the CEO's tasks and memory writes.
        await asyncio.sleep(8)
        for i, v in enumerate(vps):
            try:
                asyncio.create_task(run_agent(v))
            except Exception:
                pass
            await asyncio.sleep(4)

    asyncio.create_task(cascade())
    return {
        "ok": True,
        "queued": ["ceo"] + [v.name for v in vps],
        "message": "Kickoff initiated — CEO first, VPs follow.",
    }
