"""Business-metric tools (Part 8 — gated to analytics, finance, ceo)."""

from __future__ import annotations

import json
from datetime import date, datetime, timedelta, timezone
from typing import Any

from database import db

TOOLS: list[dict[str, Any]] = [
    {
        "name": "write_metric",
        "description": "Record a single business metric sample for today (UTC). metric_unit examples: 'usd', 'count', 'pct'.",
        "input_schema": {
            "type": "object",
            "properties": {
                "metric_name": {"type": "string"},
                "metric_value": {"type": "number"},
                "metric_unit": {"type": "string"},
            },
            "required": ["metric_name", "metric_value", "metric_unit"],
        },
    },
    {
        "name": "read_metrics",
        "description": "Read historical samples for a metric over the last N days (default 30).",
        "input_schema": {
            "type": "object",
            "properties": {
                "metric_name": {"type": "string"},
                "days": {"type": "integer", "minimum": 1, "maximum": 365},
            },
            "required": ["metric_name"],
        },
    },
]


async def write_metric(
    agent_name: str,
    metric_name: str,
    metric_value: float,
    metric_unit: str,
) -> str:
    row = {
        "metric_name": metric_name,
        "metric_value": metric_value,
        "metric_unit": metric_unit,
        "period_date": date.today().isoformat(),
        "written_by": agent_name,
    }
    res = db().table("business_metrics").insert(row).execute()
    data = (res.data or [{}])[0]
    return json.dumps({"ok": True, "id": data.get("id")}, default=str)


async def read_metrics(agent_name: str, metric_name: str, days: int = 30) -> str:
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).date().isoformat()
    res = (
        db()
        .table("business_metrics")
        .select("*")
        .eq("metric_name", metric_name)
        .gte("period_date", cutoff)
        .order("period_date", desc=True)
        .limit(500)
        .execute()
    )
    return json.dumps({"metric_name": metric_name, "days": days, "samples": res.data or []}, default=str)


HANDLERS = {
    "write_metric": write_metric,
    "read_metrics": read_metrics,
}
