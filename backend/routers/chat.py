"""Owner ↔ agent conversational chat.

POST /api/chat/{agent_name}   — send a message, get a streamed response
GET  /api/chat/{agent_name}   — conversation history
DELETE /api/chat/{agent_name} — clear conversation for this agent

The chat mode is different from the scheduled tick:
  - No autonomous tool loop — the agent responds conversationally.
  - Limited tools allowed: write_memory, post_task, log_decision, read_memory,
    get_my_tasks, read_experiments, read_artifacts.  No save_artifact, no web search.
  - The CEO chat is special: it can post_task to any other agent, making the
    conversation the primary command channel for the owner.
  - Context is loaded fresh on each message: recent shared_memory, pending tasks,
    last 5 agent_actions, and the full conversation history.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from agents import AGENTS_BY_NAME
from config import get_settings
from database import db
from security import default_rate_limit, require_api_key
from tools.registry import all_handlers

log = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/chat",
    tags=["chat"],
    dependencies=[Depends(require_api_key)],
)

# Tools permitted in chat mode — useful without being autonomy-triggering
CHAT_ALLOWED_TOOLS = {
    "read_memory", "write_memory",
    "get_my_tasks", "post_task", "complete_task",
    "log_decision",
    "read_artifacts",
    "read_experiments",
    "list_experiments",
    "read_knowledge",
    "request_approval",
}

MAX_HISTORY = 40  # messages kept in context


class ChatMessage(BaseModel):
    message: str


def _load_context(agent_name: str) -> str:
    mem = (
        db().table("shared_memory").select("key,summary,category")
        .order("updated_at", desc=True).limit(15).execute().data or []
    )
    tasks = (
        db().table("task_bus").select("task_type,payload,priority")
        .eq("to_agent", agent_name).eq("status", "pending")
        .order("priority").limit(8).execute().data or []
    )
    recent = (
        db().table("agent_actions").select("action_type,summary,created_at")
        .eq("agent_name", agent_name)
        .order("created_at", desc=True).limit(6).execute().data or []
    )
    experiments = (
        db().table("experiment_log").select("title,status,hypothesis,learnings")
        .in_("status", ["active", "measuring"]).limit(5).execute().data or []
    )

    parts = []
    if mem:
        parts.append("CURRENT SHARED MEMORY (recent):\n" + "\n".join(
            f"  [{e['category']}] {e['key']}: {e.get('summary') or ''}" for e in mem
        ))
    if tasks:
        parts.append("YOUR PENDING TASKS:\n" + "\n".join(
            f"  {t['task_type']} (priority {t['priority']}): {json.dumps(t['payload'])[:120]}" for t in tasks
        ))
    if experiments:
        parts.append("ACTIVE EXPERIMENTS:\n" + "\n".join(
            f"  [{e['status']}] {e['title']}" for e in experiments
        ))
    if recent:
        parts.append("YOUR LAST ACTIONS:\n" + "\n".join(
            f"  [{a['action_type']}] {a['summary']}" for a in recent
        ))
    return "\n\n".join(parts)


def _chat_system_prompt(agent_name: str, base_prompt: str) -> str:
    return (
        base_prompt
        + "\n\n--- CONVERSATION MODE ---\n"
        "You are now in a direct 1-1 conversation with the owner (your silent controller). "
        "Respond helpfully, concisely, and with your full role context. "
        "You can use your available tools to take action during this conversation — "
        "but only if the owner explicitly asks for action, or if it is immediately useful. "
        "Never use tools gratuitously. Keep responses focused and useful. "
        "When the owner asks you to do something, confirm what you'll do, use the relevant tools "
        "to actually do it (post_task, write_memory, log_decision etc), then summarise what you did. "
        "Speak as your role — the CEO speaks strategically, the developers speak technically, etc. "
        "Format responses clearly. Use markdown lists and headings when helpful. "
        "You are speaking with the company controller who has full authority."
    )


def _load_history(agent_name: str) -> list[dict]:
    rows = (
        db().table("conversations").select("role,content")
        .eq("agent_name", agent_name)
        .order("created_at", desc=False)
        .limit(MAX_HISTORY).execute().data or []
    )
    messages = []
    for r in rows:
        role = "user" if r["role"] == "owner" else "assistant"
        messages.append({"role": role, "content": r["content"]})
    return messages


def _save_message(agent_name: str, role: str, content: str, metadata: dict | None = None) -> None:
    db().table("conversations").insert({
        "agent_name": agent_name,
        "role": role,
        "content": content,
        "metadata": metadata or {},
    }).execute()


async def _stream_response(agent_name: str, agent_def, user_message: str):
    """Yield SSE chunks for a streaming chat response."""
    from anthropic import AsyncAnthropic
    settings = get_settings()
    client = AsyncAnthropic(api_key=settings.anthropic_api_key)

    context = _load_context(agent_name)
    history = _load_history(agent_name)
    system = _chat_system_prompt(agent_name, agent_def.system_prompt)
    if context:
        system += f"\n\nCURRENT CONTEXT:\n{context}"

    history.append({"role": "user", "content": user_message})

    # Filter tools to chat-allowed subset
    from tools.registry import tool_specs_for
    all_specs = tool_specs_for(agent_name)
    chat_tools = [s for s in all_specs if s["name"] in CHAT_ALLOWED_TOOLS]

    handlers = all_handlers()
    messages = history.copy()
    full_response = ""
    tool_results_log = []

    # Agentic loop (bounded to 4 iterations in chat mode)
    for iteration in range(4):
        response = await client.messages.create(
            model=settings.anthropic_model,
            max_tokens=2048,
            system=system,
            tools=chat_tools,
            messages=messages,
        )

        assistant_blocks = []
        text_so_far = ""
        for block in response.content:
            btype = getattr(block, "type", None)
            if btype == "text":
                assistant_blocks.append({"type": "text", "text": block.text})
                text_so_far += block.text
            elif btype == "tool_use":
                assistant_blocks.append({
                    "type": "tool_use", "id": block.id, "name": block.name, "input": block.input
                })

        messages.append({"role": "assistant", "content": assistant_blocks})

        if text_so_far:
            full_response += text_so_far
            # Stream the text chunk
            yield f"data: {json.dumps({'type': 'text', 'content': text_so_far})}\n\n"

        if getattr(response, "stop_reason", None) != "tool_use":
            break

        # Execute tool calls
        tool_results = []
        for block in response.content:
            if getattr(block, "type", None) != "tool_use":
                continue
            tool_name = block.name
            tool_input = block.input or {}
            handler = handlers.get(tool_name)
            try:
                output = await handler(agent_name, **tool_input) if handler else json.dumps({"error": "unknown tool"})
            except Exception as exc:
                output = json.dumps({"error": str(exc)})

            try:
                parsed = json.loads(output)
            except Exception:
                parsed = {"raw": output[:300]}

            tool_results.append({"type": "tool_result", "tool_use_id": block.id, "content": output})
            tool_results_log.append({"tool": tool_name, "input": tool_input, "output": parsed})

            # Tell the client a tool was called
            yield f"data: {json.dumps({'type': 'tool_use', 'tool': tool_name, 'summary': str(tool_input)[:80]})}\n\n"

        if not tool_results:
            break
        messages.append({"role": "user", "content": tool_results})

    # Persist both messages
    _save_message(agent_name, "owner", user_message)
    _save_message(agent_name, "agent", full_response, metadata={"tool_calls": tool_results_log})

    # Done
    yield f"data: {json.dumps({'type': 'done', 'agent': agent_name})}\n\n"


@router.post("/{agent_name}")
@default_rate_limit()
async def chat(request: Request, agent_name: str, body: ChatMessage):
    """Stream a conversational response from the named agent."""
    defn = AGENTS_BY_NAME.get(agent_name)
    if defn is None:
        raise HTTPException(status_code=404, detail=f"agent '{agent_name}' not found")

    settings = get_settings()
    if not settings.anthropic_api_key:
        raise HTTPException(status_code=503, detail="ANTHROPIC_API_KEY not configured")

    return StreamingResponse(
        _stream_response(agent_name, defn, body.message.strip()[:4000]),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/{agent_name}")
@default_rate_limit()
async def get_history(
    request: Request,
    agent_name: str,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    rows = (
        db().table("conversations").select("*", count="exact")
        .eq("agent_name", agent_name)
        .order("created_at", desc=False)
        .range(offset, offset + limit - 1)
        .execute()
    )
    return {
        "agent_name": agent_name,
        "messages": rows.data or [],
        "total": getattr(rows, "count", None),
    }


@router.delete("/{agent_name}")
@default_rate_limit()
async def clear_history(request: Request, agent_name: str):
    from wipe import NIL_UUID
    db().table("conversations").delete().eq("agent_name", agent_name).neq("id", NIL_UUID).execute()
    return {"ok": True, "agent_name": agent_name}
