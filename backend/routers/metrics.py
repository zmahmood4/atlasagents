"""Metrics + /api/metrics/summary (Part 9)."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query, Request

from database import db
from security import default_rate_limit, require_api_key

router = APIRouter(prefix="/api/metrics", tags=["metrics"], dependencies=[Depends(require_api_key)])


@router.get("")
@default_rate_limit()
async def list_metrics(
    request: Request,
    metric: str | None = None,
    days: int = Query(default=30, ge=1, le=365),
):
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).date().isoformat()
    q = db().table("business_metrics").select("*").gte("period_date", cutoff)
    if metric:
        q = q.eq("metric_name", metric)
    res = q.order("period_date", desc=True).limit(2000).execute()
    return {"metrics": res.data or []}


@router.get("/summary")
@default_rate_limit()
async def metrics_summary(request: Request):
    agents = (
        db()
        .table("agents")
        .select("id,name,role,department,status,cost_usd_today,cost_usd_month,tokens_used_today,tokens_used_month,daily_token_cap,monthly_token_cap")
        .execute()
        .data
        or []
    )
    totals = {
        "tokens_today": sum((a.get("tokens_used_today") or 0) for a in agents),
        "tokens_month": sum((a.get("tokens_used_month") or 0) for a in agents),
        "cost_today": sum(float(a.get("cost_usd_today") or 0) for a in agents),
        "cost_month": sum(float(a.get("cost_usd_month") or 0) for a in agents),
        "agents_active": sum(1 for a in agents if a.get("status") == "active"),
        "agents_total": len(agents),
    }
    today = date.today().isoformat()
    runs = (
        db()
        .table("agent_runs")
        .select("agent_name,input_tokens,output_tokens,cost_usd,started_at")
        .gte("started_at", today)
        .limit(500)
        .execute()
        .data
        or []
    )
    return {
        "totals": totals,
        "agents": agents,
        "runs_today": runs,
    }
