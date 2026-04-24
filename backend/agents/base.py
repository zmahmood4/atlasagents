"""Reusable async agent loop (Part 6).

Each agent tick:
  1. Checks enabled + daily/monthly cap.
  2. Creates an agent_runs row, sets agents.status='active'.
  3. Loads context: recent shared_memory (last 20), pending tasks, recent actions (last 10).
  4. Builds messages for Claude (system prompt + contextual wake-up message).
  5. Calls claude-sonnet-4-6 with the agent's allowed tools.
  6. On Anthropic 429 → wait 60 s and retry up to 3 times.
  7. Processes tool_use blocks in a loop, each dispatched to its async handler.
  8. Logs every tool call + every decision as an agent_actions row.
  9. Updates tokens_used_today / tokens_used_month / cost_usd_* on the agents row.
 10. Finalises the agent_runs row and sets agents.status='idle' (or 'error').
"""

from __future__ import annotations

import asyncio
import json
import logging
import traceback
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from anthropic import APIStatusError, AsyncAnthropic

from config import get_settings
from database import db
from tools.registry import all_handlers, tool_specs_for

log = logging.getLogger(__name__)


@dataclass(frozen=True)
class AgentDefinition:
    name: str
    role: str
    department: str
    system_prompt: str
    schedule_seconds: int
    daily_token_cap: int = 50_000
    monthly_token_cap: int = 500_000


_client: AsyncAnthropic | None = None


def _anthropic() -> AsyncAnthropic:
    global _client
    if _client is None:
        _client = AsyncAnthropic(api_key=get_settings().anthropic_api_key)
    return _client


def set_anthropic_override(client: Any) -> None:
    """Test hook — inject a mock client."""
    global _client
    _client = client


# ---------------------------------------------------------------------------
# Row helpers
# ---------------------------------------------------------------------------

def _load_agent_row(name: str) -> dict[str, Any] | None:
    res = db().table("agents").select("*").eq("name", name).limit(1).execute()
    rows = res.data or []
    return rows[0] if rows else None


def _over_cap(row: dict[str, Any]) -> str | None:
    if not row.get("enabled", True):
        return "disabled"
    if row.get("status") == "paused":
        return "paused"
    d_used = row.get("tokens_used_today") or 0
    d_cap = row.get("daily_token_cap") or 0
    m_used = row.get("tokens_used_month") or 0
    m_cap = row.get("monthly_token_cap") or 0
    if d_cap > 0 and d_used >= d_cap:
        return "daily_cap_reached"
    if m_cap > 0 and m_used >= m_cap:
        return "monthly_cap_reached"
    return None


def _set_status(agent_id: str, status: str, current_task: str | None = None) -> None:
    update: dict[str, Any] = {"status": status}
    if current_task is not None:
        update["current_task"] = current_task
    db().table("agents").update(update).eq("id", agent_id).execute()


def _price_run(input_tokens: int, output_tokens: int) -> float:
    s = get_settings()
    return (
        input_tokens * s.price_input_per_mtok / 1_000_000.0
        + output_tokens * s.price_output_per_mtok / 1_000_000.0
    )


def _log_action(
    agent_id: str | None,
    agent_name: str,
    run_id: str | None,
    action_type: str,
    summary: str,
    tool_name: str | None = None,
    tool_input: Any = None,
    tool_output: Any = None,
    importance: str = "normal",
) -> None:
    try:
        row: dict[str, Any] = {
            "agent_name": agent_name,
            "run_id": run_id,
            "action_type": action_type,
            "summary": summary,
            "importance": importance,
        }
        if agent_id:
            row["agent_id"] = agent_id
        if tool_name is not None:
            row["tool_name"] = tool_name
        if tool_input is not None:
            row["tool_input"] = tool_input
        if tool_output is not None:
            row["tool_output"] = tool_output
        db().table("agent_actions").insert(row).execute()
    except Exception:
        log.exception("failed to log action")


def _start_run(agent_id: str | None, agent_name: str) -> str | None:
    try:
        res = (
            db()
            .table("agent_runs")
            .insert(
                {
                    "agent_id": agent_id,
                    "agent_name": agent_name,
                    "status": "running",
                }
            )
            .execute()
        )
        return (res.data or [{}])[0].get("id")
    except Exception:
        log.exception("failed to start run row")
        return None


def _finish_run(
    run_id: str | None,
    status: str,
    input_tokens: int,
    output_tokens: int,
    cost: float,
    actions_taken: list[dict[str, Any]],
    summary: str,
    error: str | None = None,
) -> None:
    if not run_id:
        return
    try:
        db().table("agent_runs").update(
            {
                "status": status,
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "cost_usd": cost,
                "actions_taken": actions_taken,
                "summary": summary,
                "error": error,
            }
        ).eq("id", run_id).execute()
    except Exception:
        log.exception("failed to finalise run row")


def _persist_usage(agent_id: str, input_tokens: int, output_tokens: int, cost: float) -> None:
    row = db().table("agents").select("*").eq("id", agent_id).limit(1).execute().data
    if not row:
        return
    current = row[0]
    total = input_tokens + output_tokens
    update = {
        "tokens_used_today": (current.get("tokens_used_today") or 0) + total,
        "tokens_used_month": (current.get("tokens_used_month") or 0) + total,
        "cost_usd_today": float(current.get("cost_usd_today") or 0) + cost,
        "cost_usd_month": float(current.get("cost_usd_month") or 0) + cost,
        "last_run_at": datetime.now(timezone.utc).isoformat(),
    }
    db().table("agents").update(update).eq("id", agent_id).execute()


# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------

def _turn_prompt(agent_row: dict[str, Any], context: dict[str, Any]) -> str:
    memory_lines = "\n".join(
        f"  - [{e['category']}] {e['key']}: {e.get('summary') or ''}".strip()
        for e in context["memory"][:15]
    ) or "  (none)"
    task_lines = "\n".join(
        f"  - #{t['id'][:8]} type={t['task_type']} prio={t['priority']} payload={json.dumps(t['payload'])[:200]}"
        for t in context["tasks"][:10]
    ) or "  (none)"
    recent_lines = "\n".join(
        f"  - [{a['action_type']}] {a['summary']}" for a in context["recent_actions"][:8]
    ) or "  (none)"

    return (
        "You have just been woken by the scheduler. Work one productive tick.\n\n"
        f"CURRENT STATE for {agent_row['name']} ({agent_row['role']}):\n"
        f"  status: {agent_row.get('status')}\n"
        f"  daily budget: {agent_row.get('tokens_used_today', 0)}/{agent_row.get('daily_token_cap', 0)} tokens, "
        f"${float(agent_row.get('cost_usd_today') or 0):.4f} today\n\n"
        "RECENT SHARED MEMORY:\n"
        f"{memory_lines}\n\n"
        "YOUR PENDING TASKS:\n"
        f"{task_lines}\n\n"
        "YOUR RECENT ACTIONS:\n"
        f"{recent_lines}\n\n"
        "Decide the single highest-leverage thing to do this tick, then act with your tools. "
        "Make 2–6 focused tool calls. Finish with a short plain-text summary of what you did and stop. "
        "Only call request_approval when the owner must decide."
    )


def _load_context(agent_name: str) -> dict[str, Any]:
    memory = (
        db()
        .table("shared_memory")
        .select("key,category,summary,updated_at")
        .order("updated_at", desc=True)
        .limit(20)
        .execute()
        .data
        or []
    )
    tasks = (
        db()
        .table("task_bus")
        .select("*")
        .eq("to_agent", agent_name)
        .eq("status", "pending")
        .order("priority", desc=False)
        .limit(10)
        .execute()
        .data
        or []
    )
    recent_actions = (
        db()
        .table("agent_actions")
        .select("action_type,summary,created_at")
        .eq("agent_name", agent_name)
        .order("created_at", desc=True)
        .limit(10)
        .execute()
        .data
        or []
    )
    return {"memory": memory, "tasks": tasks, "recent_actions": recent_actions}


async def _call_claude_with_backoff(**kwargs) -> Any:
    client = _anthropic()
    for attempt in range(3):
        try:
            return await client.messages.create(**kwargs)
        except APIStatusError as exc:
            if getattr(exc, "status_code", None) == 429 and attempt < 2:
                log.warning("anthropic 429 — backing off 60s (attempt %d)", attempt + 1)
                await asyncio.sleep(60)
                continue
            raise


def _block_to_dict(block: Any) -> dict[str, Any]:
    t = getattr(block, "type", None)
    if t == "text":
        return {"type": "text", "text": block.text}
    if t == "tool_use":
        return {"type": "tool_use", "id": block.id, "name": block.name, "input": block.input}
    return {"type": t or "unknown"}


async def run(definition: AgentDefinition) -> dict[str, Any]:
    """One scheduled tick. Returns a small summary dict."""
    settings = get_settings()
    agent_row = _load_agent_row(definition.name)
    if agent_row is None:
        return {"ok": False, "skipped": True, "reason": "agent not seeded"}

    cap_reason = _over_cap(agent_row)
    if cap_reason:
        _log_action(
            agent_row.get("id"),
            definition.name,
            None,
            "skip",
            f"tick skipped: {cap_reason}",
            importance="low",
        )
        if "cap" in cap_reason:
            _set_status(agent_row["id"], "paused")
        return {"ok": True, "skipped": True, "reason": cap_reason}

    _set_status(agent_row["id"], "active", current_task="thinking")
    run_id = _start_run(agent_row.get("id"), definition.name)
    _log_action(agent_row.get("id"), definition.name, run_id, "run_start", f"{definition.name} tick started")

    total_input = 0
    total_output = 0
    actions_taken: list[dict[str, Any]] = []

    try:
        context = _load_context(definition.name)
        tools = tool_specs_for(definition.name)
        handlers = all_handlers()

        messages: list[dict[str, Any]] = [
            {"role": "user", "content": _turn_prompt(agent_row, context)}
        ]

        final_text = ""
        for _ in range(settings.agent_max_tool_iterations):
            response = await _call_claude_with_backoff(
                model=settings.anthropic_model,
                max_tokens=settings.anthropic_max_tokens,
                system=definition.system_prompt,
                tools=tools,
                messages=messages,
            )

            usage = getattr(response, "usage", None)
            if usage is not None:
                total_input += getattr(usage, "input_tokens", 0) or 0
                total_output += getattr(usage, "output_tokens", 0) or 0

            assistant_blocks = [_block_to_dict(b) for b in response.content]
            messages.append({"role": "assistant", "content": assistant_blocks})

            if getattr(response, "stop_reason", None) != "tool_use":
                final_text = " ".join(
                    b["text"] for b in assistant_blocks if b.get("type") == "text"
                ).strip()
                break

            tool_results: list[dict[str, Any]] = []
            for block in response.content:
                if getattr(block, "type", None) != "tool_use":
                    continue
                tool_name = block.name
                tool_input = block.input or {}
                handler = handlers.get(tool_name)
                try:
                    if handler is None:
                        output = json.dumps({"error": f"unknown tool {tool_name}"})
                    else:
                        output_raw = await handler(definition.name, **tool_input)
                        output = output_raw if isinstance(output_raw, str) else json.dumps(output_raw)
                except TypeError as exc:
                    output = json.dumps({"error": f"bad arguments: {exc}"})
                except Exception as exc:
                    log.exception("tool %s crashed", tool_name)
                    output = json.dumps({"error": str(exc)})

                try:
                    parsed_out = json.loads(output)
                except Exception:
                    parsed_out = {"raw": output[:500]}

                summary_line = _summarise_tool_call(tool_name, tool_input)
                _log_action(
                    agent_row.get("id"),
                    definition.name,
                    run_id,
                    _action_type_for_tool(tool_name),
                    summary_line,
                    tool_name=tool_name,
                    tool_input=tool_input,
                    tool_output=parsed_out,
                )
                # Reflect the latest tool call as current_task so monitoring shows
                # what the agent is doing right now.
                try:
                    _set_status(agent_row["id"], "active", current_task=summary_line[:180])
                except Exception:
                    pass
                actions_taken.append(
                    {"tool": tool_name, "input": tool_input, "output": parsed_out}
                )
                tool_results.append(
                    {"type": "tool_result", "tool_use_id": block.id, "content": output}
                )

            if not tool_results:
                break
            messages.append({"role": "user", "content": tool_results})

        cost = _price_run(total_input, total_output)
        if agent_row.get("id"):
            _persist_usage(agent_row["id"], total_input, total_output, cost)
        _finish_run(
            run_id,
            status="completed",
            input_tokens=total_input,
            output_tokens=total_output,
            cost=cost,
            actions_taken=actions_taken,
            summary=final_text or f"{len(actions_taken)} tool calls",
        )
        _log_action(
            agent_row.get("id"),
            definition.name,
            run_id,
            "run_end",
            f"{definition.name} tick complete · {len(actions_taken)} tool calls · ${cost:.4f}",
        )
        _set_status(agent_row["id"], "idle", current_task=None)
        return {
            "ok": True,
            "input_tokens": total_input,
            "output_tokens": total_output,
            "cost_usd": cost,
            "tool_calls": len(actions_taken),
        }

    except Exception as exc:
        tb = traceback.format_exc()
        log.error("agent %s crashed: %s\n%s", definition.name, exc, tb)
        _log_action(
            agent_row.get("id"),
            definition.name,
            run_id,
            "error",
            str(exc)[:500],
            importance="critical",
        )
        _finish_run(
            run_id,
            status="failed",
            input_tokens=total_input,
            output_tokens=total_output,
            cost=_price_run(total_input, total_output),
            actions_taken=actions_taken,
            summary=f"error: {exc}",
            error=str(exc)[:1000],
        )
        _set_status(agent_row["id"], "error", current_task=None)
        return {"ok": False, "error": str(exc)}


def _action_type_for_tool(tool_name: str) -> str:
    if tool_name == "request_approval":
        return "escalation"
    if tool_name == "log_decision":
        return "decision"
    if tool_name == "save_artifact":
        return "artifact"
    if tool_name in {"post_task", "complete_task", "create_ticket"}:
        return "task"
    return "tool"


def _summarise_tool_call(name: str, data: dict[str, Any]) -> str:
    for key in ("title", "decision", "query", "key", "task_type", "metric_name", "artifact_type"):
        v = data.get(key)
        if isinstance(v, str):
            return f"{name} · {v[:120]}"
    return name
