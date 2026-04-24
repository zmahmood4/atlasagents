"""Composed tool registry.

Base tools are available to every agent. Specialist tools are gated per Part 8.
Each agent's allowed tool-name set is derived from its department / role.
"""

from __future__ import annotations

from typing import Any, Awaitable, Callable

from tools import (
    artifact_tools,
    decision_tools,
    experiment_tools,
    memory_tools,
    metrics_tools,
    search_tools,
    task_tools,
)

BASE_TOOL_NAMES: set[str] = {
    *(t["name"] for t in memory_tools.TOOLS),
    *(t["name"] for t in decision_tools.TOOLS),
    *(t["name"] for t in artifact_tools.TOOLS),
    "post_task",
    "get_my_tasks",
    "complete_task",
}

SEARCH_AGENTS = {"ceo", "vp_product", "marketing", "sales", "research"}
EXPERIMENT_AGENTS = {"ceo", "vp_product"}
METRICS_AGENTS = {"ceo", "analytics", "finance"}
TICKET_AGENTS = {"vp_engineering", "developer_frontend", "developer_backend"}


def _all_specs() -> list[dict[str, Any]]:
    return [
        *memory_tools.TOOLS,
        *task_tools.TOOLS,
        *decision_tools.TOOLS,
        *artifact_tools.TOOLS,
        *search_tools.TOOLS,
        *metrics_tools.TOOLS,
        *experiment_tools.TOOLS,
    ]


def tool_specs_for(agent_name: str) -> list[dict[str, Any]]:
    allowed = set(BASE_TOOL_NAMES)
    if agent_name in SEARCH_AGENTS:
        allowed.update(t["name"] for t in search_tools.TOOLS)
    if agent_name in EXPERIMENT_AGENTS:
        allowed.update(t["name"] for t in experiment_tools.TOOLS)
    if agent_name in METRICS_AGENTS:
        allowed.update(t["name"] for t in metrics_tools.TOOLS)
    if agent_name in TICKET_AGENTS:
        allowed.update({"create_ticket", "get_tickets"})
    return [spec for spec in _all_specs() if spec["name"] in allowed]


def all_handlers() -> dict[str, Callable[..., Awaitable[str]]]:
    combined: dict[str, Callable[..., Awaitable[str]]] = {}
    for mod in (
        memory_tools,
        task_tools,
        decision_tools,
        artifact_tools,
        search_tools,
        metrics_tools,
        experiment_tools,
    ):
        combined.update(mod.HANDLERS)
    return combined


TOOL_NAMES = {spec["name"] for spec in _all_specs()}
