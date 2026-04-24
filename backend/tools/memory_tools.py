"""Shared memory tools (Part 8 — base tools)."""

from __future__ import annotations

import json
from typing import Any

from database import db

MAX_VALUE_BYTES = 64_000

TOOLS: list[dict[str, Any]] = [
    {
        "name": "read_memory",
        "description": "Read entries from shared_memory. Pass a specific key for a single value, or a category to list all entries in that category, or neither to list the most recent entries.",
        "input_schema": {
            "type": "object",
            "properties": {
                "key": {"type": "string"},
                "category": {"type": "string"},
            },
        },
    },
    {
        "name": "write_memory",
        "description": "Upsert an entry into shared_memory. Value must be a JSON object. Include a short human-readable summary so other agents can scan memory quickly.",
        "input_schema": {
            "type": "object",
            "properties": {
                "key": {"type": "string"},
                "value": {"type": "object"},
                "category": {"type": "string"},
                "summary": {"type": "string"},
            },
            "required": ["key", "value", "category", "summary"],
        },
    },
]


async def read_memory(agent_name: str, key: str | None = None, category: str | None = None) -> str:
    q = db().table("shared_memory").select("*")
    if key:
        q = q.eq("key", key)
    if category:
        q = q.eq("category", category)
    res = q.order("updated_at", desc=True).limit(50).execute()
    return json.dumps({"entries": res.data or []}, default=str)


async def write_memory(
    agent_name: str,
    key: str,
    value: dict[str, Any],
    category: str,
    summary: str,
) -> str:
    payload = json.dumps(value)
    if len(payload) > MAX_VALUE_BYTES:
        return json.dumps({"error": f"value exceeds {MAX_VALUE_BYTES} bytes"})
    db().table("shared_memory").upsert(
        {
            "key": key,
            "value": value,
            "category": category,
            "summary": summary,
            "written_by": agent_name,
        },
        on_conflict="key",
    ).execute()
    return json.dumps({"ok": True, "key": key})


HANDLERS = {
    "read_memory": read_memory,
    "write_memory": write_memory,
}
