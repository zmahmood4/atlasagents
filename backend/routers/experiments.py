"""Experiments (Part 9)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from database import db
from security import default_rate_limit, require_api_key

router = APIRouter(prefix="/api/experiments", tags=["experiments"], dependencies=[Depends(require_api_key)])


class ExperimentCreate(BaseModel):
    title: str
    hypothesis: str
    success_metric: str
    owner_agent: str = "owner"


class ExperimentPatch(BaseModel):
    status: str | None = None
    result: str | None = None
    learnings: str | None = None
    effort_score: int | None = Field(default=None, ge=1, le=10)
    revenue_score: int | None = Field(default=None, ge=1, le=10)


@router.get("")
@default_rate_limit()
async def list_experiments(request: Request, status: str | None = None):
    q = db().table("experiment_log").select("*")
    if status:
        q = q.eq("status", status)
    res = q.order("created_at", desc=True).execute()
    return {"experiments": res.data or []}


@router.post("")
@default_rate_limit()
async def create_experiment(request: Request, body: ExperimentCreate):
    res = (
        db()
        .table("experiment_log")
        .insert(
            {
                "title": body.title,
                "hypothesis": body.hypothesis,
                "success_metric": body.success_metric,
                "owner_agent": body.owner_agent,
                "status": "proposed",
            }
        )
        .execute()
    )
    return (res.data or [{}])[0]


@router.put("/{experiment_id}")
@default_rate_limit()
async def update_experiment(request: Request, experiment_id: str, patch: ExperimentPatch):
    data = patch.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="no fields to update")
    res = db().table("experiment_log").update(data).eq("id", experiment_id).execute()
    if not (res.data or []):
        raise HTTPException(status_code=404, detail="experiment not found")
    return res.data[0]
