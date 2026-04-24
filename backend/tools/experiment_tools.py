"""Experiment tools (Part 8 — gated to ceo, vp_product)."""

from __future__ import annotations

import json
from typing import Any

from database import db

STATUSES = {"proposed", "active", "measuring", "closed"}

TOOLS: list[dict[str, Any]] = [
    {
        "name": "create_experiment",
        "description": "Propose a new product experiment. Starts in 'proposed' status until an owner or the CEO activates it.",
        "input_schema": {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "hypothesis": {"type": "string"},
                "success_metric": {"type": "string"},
            },
            "required": ["title", "hypothesis", "success_metric"],
        },
    },
    {
        "name": "update_experiment",
        "description": "Update an experiment. status values: proposed, active, measuring, closed. Use result='winner' or result='killed' on closed experiments. Use effort_score and revenue_score (1–10) when moving to active.",
        "input_schema": {
            "type": "object",
            "properties": {
                "experiment_id": {"type": "string"},
                "status": {"type": "string"},
                "result": {"type": "string"},
                "learnings": {"type": "string"},
                "effort_score": {"type": "integer", "minimum": 1, "maximum": 10},
                "revenue_score": {"type": "integer", "minimum": 1, "maximum": 10},
            },
            "required": ["experiment_id"],
        },
    },
    {
        "name": "read_experiments",
        "description": "List experiments, optionally filtered by status.",
        "input_schema": {
            "type": "object",
            "properties": {"status": {"type": "string"}},
        },
    },
]


async def create_experiment(
    agent_name: str,
    title: str,
    hypothesis: str,
    success_metric: str,
) -> str:
    row = {
        "title": title,
        "hypothesis": hypothesis,
        "success_metric": success_metric,
        "owner_agent": agent_name,
        "status": "proposed",
    }
    res = db().table("experiment_log").insert(row).execute()
    data = (res.data or [{}])[0]
    return json.dumps({"ok": True, "experiment_id": data.get("id")}, default=str)


async def update_experiment(
    agent_name: str,
    experiment_id: str,
    status: str | None = None,
    result: str | None = None,
    learnings: str | None = None,
    effort_score: int | None = None,
    revenue_score: int | None = None,
) -> str:
    update: dict[str, Any] = {}
    if status:
        if status not in STATUSES:
            return json.dumps({"error": f"invalid status {status}"})
        update["status"] = status
    if result is not None:
        update["result"] = result
    if learnings is not None:
        update["learnings"] = learnings
    if effort_score is not None:
        update["effort_score"] = effort_score
    if revenue_score is not None:
        update["revenue_score"] = revenue_score
    if not update:
        return json.dumps({"error": "no fields to update"})
    db().table("experiment_log").update(update).eq("id", experiment_id).execute()
    return json.dumps({"ok": True})


async def read_experiments(agent_name: str, status: str | None = None) -> str:
    q = db().table("experiment_log").select("*")
    if status:
        q = q.eq("status", status)
    res = q.order("created_at", desc=True).execute()
    return json.dumps({"experiments": res.data or []}, default=str)


HANDLERS = {
    "create_experiment": create_experiment,
    "update_experiment": update_experiment,
    "read_experiments": read_experiments,
}
