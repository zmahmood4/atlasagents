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


MOCK_RESPONSES: dict[str, str] = {
    "ceo": (
        "Understood. I've reviewed the request and assessed our current sprint context.\n\n"
        "**My assessment:**\n"
        "- We are on day {day} of the AI Competitor Radar sprint\n"
        "- Current phase: Build — developers are producing code artifacts\n"
        "- GTM plan is drafted; Marketing has a content brief waiting for approval\n\n"
        "**I'm cascading to the team:**\n"
        "1. VP Product → review PRD scope and confirm MVP features\n"
        "2. VP GTM → confirm UK distribution channels are active\n"
        "3. Research → pull latest competitive intel on monitoring tools\n\n"
        "I'll check back in 60 minutes with a progress update. Anything else you'd like to prioritise?"
    ),
    "vp_product": (
        "Here's the current product status:\n\n"
        "**Active experiment:** AI Competitor Radar\n"
        "**PRD status:** Drafted — 5 user stories, acceptance criteria complete\n"
        "**Engineering:** 4 tickets open (2 FE, 2 BE) — on track for day 9 completion\n\n"
        "**Roadmap next:**\n"
        "- AI Process Doc Builder (effort 6, revenue 8) — queued after Radar validates\n\n"
        "No blockers. PRD is locked — no scope changes until first user."
    ),
    "developer_frontend": (
        "Here's a landing page component for your request:\n\n"
        "```tsx\n"
        "// frontend/app/landing/page.tsx\n"
        "'use client';\n\n"
        "export default function LandingPage() {\n"
        "  return (\n"
        "    <main className=\"min-h-screen bg-slate-950 text-white\">\n"
        "      <section className=\"flex flex-col items-center justify-center py-24 px-6 text-center\">\n"
        "        <h1 className=\"text-4xl font-bold mb-4\">\n"
        "          Stop missing what your competitors are doing\n"
        "        </h1>\n"
        "        <p className=\"text-slate-400 text-xl mb-8 max-w-xl\">\n"
        "          ATLAS Radar monitors 5 competitors weekly and emails you\n"
        "          a plain-English brief of exactly what changed. £32/mo.\n"
        "        </p>\n"
        "        <button className=\"bg-blue-500 hover:bg-blue-400 text-white px-8 py-3 rounded-xl font-semibold\">\n"
        "          Start free trial →\n"
        "        </button>\n"
        "      </section>\n"
        "    </main>\n"
        "  );\n"
        "}\n"
        "```\n\n"
        "This is a working Next.js component. Saved as a code artifact. Let me know if you want the full page with social proof, pricing section, and FAQ."
    ),
    "developer_backend": (
        "Here's a backend API endpoint for the requested functionality:\n\n"
        "```python\n"
        "# backend/routers/competitor.py\n"
        "from fastapi import APIRouter\n"
        "from pydantic import BaseModel\n\n"
        "router = APIRouter(prefix='/api/competitors')\n\n"
        "class MonitorRequest(BaseModel):\n"
        "    urls: list[str]  # up to 5 competitor URLs\n"
        "    user_id: str\n\n"
        "@router.post('/monitor')\n"
        "async def add_monitor(body: MonitorRequest):\n"
        "    # Store URLs, schedule weekly crawl\n"
        "    return {'ok': True, 'monitors': len(body.urls)}\n"
        "```\n\n"
        "This is production-ready Python. Should I also scaffold the crawler job and the weekly digest email sender?"
    ),
    "marketing": (
        "**Landing page copy — AI Competitor Radar (UK)**\n\n"
        "**Hero headline:**\n"
        "Stop finding out about competitor moves 3 months late.\n\n"
        "**Sub-headline:**\n"
        "ATLAS Radar monitors your top 5 competitors every week and sends you a clear brief of what changed — pricing, features, messaging, job listings. Takes 2 minutes to set up. Replaces 3 hours of manual research.\n\n"
        "**CTA:** Start free — track your first competitor today →\n\n"
        "**Social proof (placeholder):**\n"
        "_'Found out my competitor dropped their price 20% the day it happened. Used to miss this for months.'_ — UK SaaS founder\n\n"
        "**Pricing:** 7-day free trial, then £32/month. Cancel anytime.\n\n"
        "Ready to publish — requesting PUBLISH approval."
    ),
    "research": (
        "**Market research: AI Competitor Monitoring — UK sub-£50 gap**\n\n"
        "**Finding:** The sub-£50/mo competitor monitoring market is essentially unserved in the UK.\n\n"
        "**Competitors at enterprise tier:**\n"
        "- Crayon: £400-1,600/mo — enterprise only\n"
        "- Klue: £350+/mo — requires annual contract\n\n"
        "**Prosumer gap:**\n"
        "- Visualping: £12-35/mo — detects changes but zero AI analysis\n"
        "- Google Alerts: free — noisy, no synthesis\n\n"
        "**UK ICP signal:**\n"
        "IndieHackers UK thread (2024): 'How do you track competitors?' — top answer from 68% of respondents: 'manually, spreadsheet, occasionally.'\n\n"
        "**Recommendation:** Activate Competitor Radar sprint immediately. Confidence: 8/10."
    ),
    "finance": (
        "**Finance snapshot — today**\n\n"
        "- AI spend today: £0.18 (Haiku 4.5, 13 agents)\n"
        "- AI spend this month: £1.24\n"
        "- Monthly projection at current rate: £3.72/month\n"
        "- Revenue: £0 (pre-revenue, sprint day 5)\n\n"
        "**Unit economics (Competitor Radar):**\n"
        "- Price: £32/mo\n"
        "- COGS per user: <£0.05/mo (crawling + AI summaries)\n"
        "- Gross margin: ~99.8%\n"
        "- Path to £1k MRR: 32 paying users\n\n"
        "No anomalies. Spend within budget. Caps are set — no runaway risk."
    ),
    "analytics": (
        "**Analytics report — sprint day 5**\n\n"
        "No live user data yet (pre-launch). Here's the instrumentation plan:\n\n"
        "**Events to track at launch:**\n"
        "1. `landing_visit` — source + medium\n"
        "2. `trial_started` — time on page before signup\n"
        "3. `first_digest_opened` — email open rate target: >40%\n"
        "4. `paid_converted` — target: 15% trial→paid\n\n"
        "**Week 1 target:** 10 trial signups\n"
        "**Week 2 target:** 2 paying users at £32/mo\n\n"
        "I'll auto-report once data starts flowing."
    ),
    "sales": (
        "**Outreach status — UK ICP**\n\n"
        "I've identified 20 UK founders on LinkedIn + X who have posted about competitor tracking in the last 60 days.\n\n"
        "**Draft message sequence (3-touch):**\n\n"
        "_Touch 1:_\n"
        "Hey {first_name}, noticed you posted about tracking competitors manually — we just built a tool that automates the weekly check and gives you a plain-English brief. Happy to show you a demo?\n\n"
        "_Touch 2 (no reply, +4 days):_\n"
        "Sending a quick example of what the weekly brief looks like for a SaaS business like yours: [link]\n\n"
        "All outreach requires your approval before sending. Ready to submit for EMAIL approval."
    ),
    "support": (
        "**Support status:**\n\n"
        "No support tickets in the queue (pre-launch — no customers yet).\n\n"
        "I've prepared the onboarding email template and FAQ for when the first users sign up.\n\n"
        "**FAQ ready:**\n"
        "- What counts as a 'change'?\n"
        "- How do I add/remove competitors?\n"
        "- What if a site blocks crawling?\n"
        "- Can I see the raw diff?\n\n"
        "Standing by for first customer interactions."
    ),
    "vp_engineering": (
        "**Engineering status:**\n\n"
        "**Open tickets (4):**\n"
        "- BE-01: Crawler endpoint — in progress (developer_backend)\n"
        "- BE-02: Diff + AI summary engine — pending (blocked on BE-01)\n"
        "- FE-01: Onboarding flow — in progress (developer_frontend)\n"
        "- BE-03: Weekly email digest — pending\n\n"
        "**Velocity:** On track for day 9 MVP completion.\n\n"
        "**No blockers** currently. BE-02 will unblock once BE-01 crawler is done — ETA day 7."
    ),
    "vp_gtm": (
        "**GTM plan — AI Competitor Radar (UK)**\n\n"
        "**Positioning:** For UK founders who manually track competitors — ATLAS Radar sends a weekly email showing exactly what changed on your top 5 competitors, so you never fall behind again. £32/mo.\n\n"
        "**Channel 1 (primary):** Cold DM on LinkedIn + X to UK founders who've mentioned competitor tracking\n"
        "**Channel 2 (secondary):** IndieHackers UK post + r/SaaS share\n\n"
        "**Offer:** 7-day free trial (track 1 competitor), then £32/mo for 5\n\n"
        "**Week 1 target:** 10 trial signups · 2 paying users by day 14\n\n"
        "Content brief sent to Marketing. Outreach brief sent to Sales. Both ready for approval."
    ),
    "product_manager": (
        "**PRD: AI Competitor Radar — MVP**\n\n"
        "**Problem:** UK founders manually check 3-5 competitor websites weekly. Takes 2-4 hours. They fall behind.\n\n"
        "**Target user:** James, 32, UK SaaS founder, manually checks 4 competitors every Sunday, sometimes forgets.\n\n"
        "**Core user story:** As a solo founder, I want a weekly email on Monday morning showing exactly what changed on my top 5 competitors, so I can stay informed without 3 hours of manual research.\n\n"
        "**MVP scope:** URL monitoring · weekly diff · Claude Haiku summaries · Monday 8am email · Stripe £32/mo\n\n"
        "**Success metric:** 15 paying users in 30 days at £32/mo\n\n"
        "PRD complete. Posted to VP Engineering for ticket decomposition."
    ),
    "ops": (
        "**Daily digest — ATLAS sprint**\n\n"
        "**Experiment:** AI Competitor Radar · Day 5/14 · Phase: Build\n\n"
        "✅ Done yesterday:\n"
        "- product_manager: PRD written (5 stories, acceptance criteria)\n"
        "- vp_gtm: GTM plan with UK channels drafted\n"
        "- research: Competitive analysis complete\n\n"
        "🔄 In progress:\n"
        "- developer_backend: crawler endpoint (BE-01)\n"
        "- developer_frontend: onboarding flow (FE-01)\n\n"
        "🟡 Needs owner:\n"
        "- marketing: landing copy ready for PUBLISH approval\n"
        "- sales: outreach ready for EMAIL approval\n\n"
        "📊 Sprint health: ON TRACK · Next milestone: MVP build by day 9"
    ),
}


async def _mock_stream(agent_name: str, message: str):
    """Return a scripted response without calling Anthropic. Zero API cost."""
    import asyncio
    response = MOCK_RESPONSES.get(agent_name, f"[MOCK] {agent_name} here. I received your message: '{message[:80]}'. In production I would respond with full context.")
    words = response.split(" ")
    full = ""
    chunk = ""
    for i, word in enumerate(words):
        chunk += word + " "
        if (i + 1) % 8 == 0 or i == len(words) - 1:
            full += chunk
            yield f"data: {json.dumps({'type': 'text', 'content': chunk})}\n\n"
            chunk = ""
            await asyncio.sleep(0.04)
    _save_message(agent_name, "owner", message)
    _save_message(agent_name, "agent", full.strip(), metadata={"mock": True})
    yield f"data: {json.dumps({'type': 'done', 'agent': agent_name, 'mock': True})}\n\n"


@router.post("/{agent_name}")
@default_rate_limit()
async def chat(request: Request, agent_name: str, body: ChatMessage):
    """Stream a conversational response from the named agent."""
    defn = AGENTS_BY_NAME.get(agent_name)
    if defn is None:
        raise HTTPException(status_code=404, detail=f"agent '{agent_name}' not found")

    settings = get_settings()

    # Mock mode — no Anthropic calls, realistic scripted responses
    if settings.mock_mode or not settings.anthropic_api_key:
        return StreamingResponse(
            _mock_stream(agent_name, body.message.strip()[:4000]),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

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
