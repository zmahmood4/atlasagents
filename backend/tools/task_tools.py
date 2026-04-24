"""Task-bus tools (Part 8 — base + ticket tools)."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from database import db

TOOLS: list[dict[str, Any]] = [
    {
        "name": "post_task",
        "description": "Assign a task to another agent via the task_bus. task_type examples: 'prd_request', 'dev_ticket', 'research_request', 'content_brief'. Priority 1 (urgent) to 10 (low); default 5. Payload is a JSON object with everything the receiving agent needs to act.",
        "input_schema": {
            "type": "object",
            "properties": {
                "to_agent": {"type": "string"},
                "task_type": {"type": "string"},
                "payload": {"type": "object"},
                "priority": {"type": "integer", "minimum": 1, "maximum": 10},
            },
            "required": ["to_agent", "task_type", "payload"],
        },
    },
    {
        "name": "get_my_tasks",
        "description": "Return tasks assigned to you on the task_bus. Default status filter is 'pending'; pass 'in_progress' or 'completed' to see other states.",
        "input_schema": {
            "type": "object",
            "properties": {"status": {"type": "string"}},
        },
    },
    {
        "name": "complete_task",
        "description": "Mark one of your tasks complete. Result must be a JSON object summarising what you did (e.g. {'artifact_id': ..., 'summary': ...}).",
        "input_schema": {
            "type": "object",
            "properties": {
                "task_id": {"type": "string"},
                "result": {"type": "object"},
            },
            "required": ["task_id", "result"],
        },
    },
    {
        "name": "create_ticket",
        "description": "Convenience wrapper around post_task with task_type='dev_ticket'. Use this when assigning engineering work (to 'developer_frontend' or 'developer_backend'). Payload should include 'title', 'description', 'acceptance_criteria'.",
        "input_schema": {
            "type": "object",
            "properties": {
                "to_agent": {"type": "string"},
                "payload": {"type": "object"},
                "priority": {"type": "integer", "minimum": 1, "maximum": 10},
            },
            "required": ["to_agent", "payload"],
        },
    },
    {
        "name": "get_tickets",
        "description": "Return dev_ticket tasks on the bus. assigned_to filters by recipient agent name. Useful for VP Engineering to see the backlog.",
        "input_schema": {
            "type": "object",
            "properties": {
                "assigned_to": {"type": "string"},
                "status": {"type": "string"},
            },
        },
    },
]


async def post_task(
    agent_name: str,
    to_agent: str,
    task_type: str,
    payload: dict[str, Any],
    priority: int = 5,
) -> str:
    row = {
        "from_agent": agent_name,
        "to_agent": to_agent,
        "task_type": task_type,
        "payload": payload,
        "priority": priority,
    }
    res = db().table("task_bus").insert(row).execute()
    data = (res.data or [{}])[0]
    return json.dumps({"ok": True, "task_id": data.get("id")}, default=str)


async def get_my_tasks(agent_name: str, status: str = "pending") -> str:
    q = db().table("task_bus").select("*").eq("to_agent", agent_name).eq("status", status)
    res = q.order("priority", desc=False).order("created_at", desc=False).limit(50).execute()
    return json.dumps({"tasks": res.data or []}, default=str)


async def complete_task(agent_name: str, task_id: str, result: dict[str, Any]) -> str:
    existing = db().table("task_bus").select("*").eq("id", task_id).limit(1).execute()
    rows = existing.data or []
    if not rows:
        return json.dumps({"error": "task not found"})
    if rows[0]["to_agent"] != agent_name:
        return json.dumps({"error": "task is not assigned to you"})
    db().table("task_bus").update(
        {
            "status": "completed",
            "result": result,
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }
    ).eq("id", task_id).execute()
    return json.dumps({"ok": True})


async def create_ticket(
    agent_name: str,
    to_agent: str,
    payload: dict[str, Any],
    priority: int = 5,
) -> str:
    return await post_task(
        agent_name, to_agent=to_agent, task_type="dev_ticket", payload=payload, priority=priority
    )


async def get_tickets(
    agent_name: str,
    assigned_to: str | None = None,
    status: str = "pending",
) -> str:
    q = db().table("task_bus").select("*").eq("task_type", "dev_ticket").eq("status", status)
    if assigned_to:
        q = q.eq("to_agent", assigned_to)
    res = q.order("priority", desc=False).limit(50).execute()
    return json.dumps({"tickets": res.data or []}, default=str)


HANDLERS = {
    "post_task": post_task,
    "get_my_tasks": get_my_tasks,
    "complete_task": complete_task,
    "create_ticket": create_ticket,
    "get_tickets": get_tickets,
}
