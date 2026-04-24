"""Decision and approval tools (Part 8 — base tools)."""

from __future__ import annotations

import json
from typing import Any

from database import db

APPROVAL_TYPES = {"PUBLISH", "EMAIL", "DEPLOY", "SPEND", "PIVOT", "OTHER"}
URGENCIES = {"low", "normal", "high", "critical", "urgent"}

TOOLS: list[dict[str, Any]] = [
    {
        "name": "log_decision",
        "description": "Record a decision you have made. Writes an agent_actions row with action_type='decision' and importance tied to confidence. Confidence is 1–10.",
        "input_schema": {
            "type": "object",
            "properties": {
                "decision": {"type": "string"},
                "reasoning": {"type": "string"},
                "confidence": {"type": "integer", "minimum": 1, "maximum": 10},
            },
            "required": ["decision", "reasoning", "confidence"],
        },
    },
    {
        "name": "request_approval",
        "description": "Pause the current action and ask the owner. action_type must be one of PUBLISH, EMAIL, DEPLOY, SPEND, PIVOT, OTHER. Include full reasoning — the owner reads this and decides.",
        "input_schema": {
            "type": "object",
            "properties": {
                "action_type": {
                    "type": "string",
                    "enum": sorted(APPROVAL_TYPES),
                },
                "title": {"type": "string"},
                "description": {"type": "string"},
                "reasoning": {"type": "string"},
                "payload": {"type": "object"},
                "urgency": {"type": "string", "enum": sorted(URGENCIES)},
            },
            "required": ["action_type", "title", "description", "reasoning"],
        },
    },
]


def _importance_for_confidence(confidence: int) -> str:
    if confidence >= 9:
        return "critical"
    if confidence >= 7:
        return "high"
    if confidence >= 4:
        return "normal"
    return "low"


async def log_decision(
    agent_name: str,
    decision: str,
    reasoning: str,
    confidence: int,
) -> str:
    agent = (
        db().table("agents").select("id").eq("name", agent_name).limit(1).execute().data or [{}]
    )[0]
    row: dict[str, Any] = {
        "agent_name": agent_name,
        "action_type": "decision",
        "summary": decision,
        "tool_input": {"reasoning": reasoning, "confidence": confidence},
        "importance": _importance_for_confidence(confidence),
    }
    if agent.get("id"):
        row["agent_id"] = agent["id"]
    res = db().table("agent_actions").insert(row).execute()
    data = (res.data or [{}])[0]
    return json.dumps({"ok": True, "action_id": data.get("id")}, default=str)


async def request_approval(
    agent_name: str,
    action_type: str,
    title: str,
    description: str,
    reasoning: str,
    payload: dict[str, Any] | None = None,
    urgency: str = "normal",
) -> str:
    if action_type not in APPROVAL_TYPES:
        return json.dumps({"error": f"invalid action_type {action_type}"})
    agent_row = (
        db().table("agents").select("id").eq("name", agent_name).limit(1).execute().data or [{}]
    )[0]
    row = {
        "agent_id": agent_row.get("id"),
        "agent_name": agent_name,
        "action_type": action_type,
        "title": title,
        "description": description,
        "reasoning": reasoning,
        "payload": payload or {},
        "urgency": urgency,
    }
    res = db().table("pending_approvals").insert(row).execute()
    data = (res.data or [{}])[0]
    return json.dumps(
        {
            "ok": True,
            "approval_id": data.get("id"),
            "message": "Paused on this decision until the owner responds.",
        },
        default=str,
    )


HANDLERS = {
    "log_decision": log_decision,
    "request_approval": request_approval,
}
