"""Agent endpoints (Part 9)."""

from __future__ import annotations

import asyncio

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from agents import AGENTS_BY_NAME, run
from database import db
from security import default_rate_limit, require_api_key, trigger_rate_limit

router = APIRouter(prefix="/api/agents", tags=["agents"], dependencies=[Depends(require_api_key)])


class AgentUpdate(BaseModel):
    enabled: bool | None = None
    daily_token_cap: int | None = Field(default=None, ge=0)
    monthly_token_cap: int | None = Field(default=None, ge=0)
    schedule_seconds: int | None = Field(default=None, ge=30)


@router.get("")
@default_rate_limit()
async def list_agents(request: Request):
    res = db().table("agents").select("*").order("name").execute()
    rows = res.data or []
    # Stable sort by department then name, Python-side (postgrest chained .order()
    # has serialisation quirks across client versions).
    dept_order = {"command": 0, "product": 1, "engineering": 2, "gtm": 3, "ops": 4}
    rows.sort(key=lambda r: (dept_order.get(r.get("department") or "", 99), r.get("name") or ""))
    return {"agents": rows}


@router.get("/{agent_id}")
@default_rate_limit()
async def get_agent(request: Request, agent_id: str):
    agent = (
        db().table("agents").select("*").eq("id", agent_id).limit(1).execute().data or []
    )
    if not agent:
        raise HTTPException(status_code=404, detail="agent not found")
    actions = (
        db()
        .table("agent_actions")
        .select("*")
        .eq("agent_id", agent_id)
        .order("created_at", desc=True)
        .limit(20)
        .execute()
        .data
        or []
    )
    return {"agent": agent[0], "recent_actions": actions}


@router.put("/{agent_id}")
@default_rate_limit()
async def update_agent(request: Request, agent_id: str, patch: AgentUpdate):
    data = patch.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="no fields to update")
    res = db().table("agents").update(data).eq("id", agent_id).execute()
    if not (res.data or []):
        raise HTTPException(status_code=404, detail="agent not found")
    return res.data[0]


@router.post("/{agent_id}/trigger")
@trigger_rate_limit()
async def trigger_agent(request: Request, agent_id: str):
    row = (
        db().table("agents").select("name").eq("id", agent_id).limit(1).execute().data or []
    )
    if not row:
        raise HTTPException(status_code=404, detail="agent not found")
    defn = AGENTS_BY_NAME.get(row[0]["name"])
    if defn is None:
        raise HTTPException(status_code=404, detail="agent definition not loaded")
    # Fire the run in the background; return immediately.
    asyncio.create_task(run(defn))
    return {"ok": True, "agent": defn.name, "queued": True}
