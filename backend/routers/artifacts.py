"""Work artifacts (Part 9)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from database import db
from security import default_rate_limit, require_api_key

router = APIRouter(prefix="/api/artifacts", tags=["artifacts"], dependencies=[Depends(require_api_key)])


@router.get("")
@default_rate_limit()
async def list_artifacts(
    request: Request,
    agent: str | None = None,
    type: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    q = db().table("work_artifacts").select(
        "id,agent_name,artifact_type,title,metadata,experiment_id,created_at", count="exact"
    )
    if agent:
        q = q.eq("agent_name", agent)
    if type:
        q = q.eq("artifact_type", type)
    res = q.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
    return {
        "artifacts": res.data or [],
        "total": getattr(res, "count", None),
        "limit": limit,
        "offset": offset,
    }


@router.get("/{artifact_id}")
@default_rate_limit()
async def get_artifact(request: Request, artifact_id: str):
    res = db().table("work_artifacts").select("*").eq("id", artifact_id).limit(1).execute()
    rows = res.data or []
    if not rows:
        raise HTTPException(status_code=404, detail="artifact not found")
    return rows[0]
