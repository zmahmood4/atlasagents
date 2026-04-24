"""Work artifact tools (Part 8 — base tools)."""

from __future__ import annotations

import json
from typing import Any

from database import db

TOOLS: list[dict[str, Any]] = [
    {
        "name": "save_artifact",
        "description": "Persist a work artifact. Common artifact_type values: 'prd', 'spec', 'code', 'report', 'content', 'research', 'analysis', 'design'. Artifacts are the concrete deliverables of your work and surface on the Work Product page.",
        "input_schema": {
            "type": "object",
            "properties": {
                "artifact_type": {"type": "string"},
                "title": {"type": "string"},
                "content": {"type": "string"},
                "metadata": {"type": "object"},
            },
            "required": ["artifact_type", "title", "content"],
        },
    },
    {
        "name": "read_artifacts",
        "description": "List recent work artifacts, optionally filtered by producing agent (agent_name) or artifact_type. Default limit 10.",
        "input_schema": {
            "type": "object",
            "properties": {
                "agent_name": {"type": "string"},
                "artifact_type": {"type": "string"},
                "limit": {"type": "integer", "minimum": 1, "maximum": 50},
            },
        },
    },
]


async def save_artifact(
    agent_name: str,
    artifact_type: str,
    title: str,
    content: str,
    metadata: dict[str, Any] | None = None,
) -> str:
    row = {
        "agent_name": agent_name,
        "artifact_type": artifact_type,
        "title": title,
        "content": content,
        "metadata": metadata or {},
    }
    res = db().table("work_artifacts").insert(row).execute()
    data = (res.data or [{}])[0]
    return json.dumps({"ok": True, "artifact_id": data.get("id")}, default=str)


async def read_artifacts(
    agent_name: str,
    artifact_type: str | None = None,
    limit: int = 10,
    **kwargs: Any,
) -> str:
    # Allow the JSON-schema param named 'agent_name' for filtering without
    # colliding with the invoking agent's own name.
    filter_name = kwargs.get("agent_name")
    q = db().table("work_artifacts").select(
        "id,agent_name,artifact_type,title,metadata,experiment_id,created_at"
    )
    if filter_name:
        q = q.eq("agent_name", filter_name)
    if artifact_type:
        q = q.eq("artifact_type", artifact_type)
    res = q.order("created_at", desc=True).limit(limit).execute()
    return json.dumps({"artifacts": res.data or []}, default=str)


HANDLERS = {
    "save_artifact": save_artifact,
    "read_artifacts": read_artifacts,
}
