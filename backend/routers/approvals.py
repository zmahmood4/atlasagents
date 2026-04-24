"""Pending approvals (Part 9)."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel

from database import db
from security import approvals_rate_limit, require_api_key

router = APIRouter(prefix="/api/approvals", tags=["approvals"], dependencies=[Depends(require_api_key)])


class RedirectBody(BaseModel):
    note: str


URGENCY_RANK = {"critical": 0, "urgent": 0, "high": 1, "normal": 2, "low": 3}


def _sort_urgency(rows: list[dict]) -> list[dict]:
    return sorted(
        rows,
        key=lambda r: (URGENCY_RANK.get(r.get("urgency") or "normal", 2), r.get("created_at") or ""),
    )


@router.get("")
@approvals_rate_limit()
async def list_approvals(
    request: Request,
    status: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
):
    q = db().table("pending_approvals").select("*")
    if status:
        q = q.eq("status", status)
    res = q.order("created_at", desc=True).limit(limit).execute()
    return {"approvals": _sort_urgency(res.data or [])}


def _resolve(approval_id: str, status: str, note: str | None = None) -> dict:
    update = {
        "status": status,
        "resolved_at": datetime.now(timezone.utc).isoformat(),
    }
    if note is not None:
        update["owner_note"] = note
    res = db().table("pending_approvals").update(update).eq("id", approval_id).execute()
    rows = res.data or []
    if not rows:
        raise HTTPException(status_code=404, detail="approval not found")
    return rows[0]


@router.post("/{approval_id}/approve")
@approvals_rate_limit()
async def approve(request: Request, approval_id: str):
    return _resolve(approval_id, "approved")


@router.post("/{approval_id}/reject")
@approvals_rate_limit()
async def reject(request: Request, approval_id: str):
    return _resolve(approval_id, "rejected")


@router.post("/{approval_id}/redirect")
@approvals_rate_limit()
async def redirect(request: Request, approval_id: str, body: RedirectBody):
    approval = _resolve(approval_id, "redirected", note=body.note)
    # Convert the redirect into a task so the originating agent sees the feedback.
    db().table("task_bus").insert(
        {
            "from_agent": "owner",
            "to_agent": approval["agent_name"],
            "task_type": "owner_redirect",
            "payload": {
                "approval_id": approval["id"],
                "original_title": approval["title"],
                "note": body.note,
            },
            "priority": 2,
        }
    ).execute()
    return approval
