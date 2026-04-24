"""Sprint management — the engine that gives agents a shared direction.

POST /api/sprint/start/{experiment_id}   — activate an experiment as the current sprint
GET  /api/sprint/status                  — current sprint state
POST /api/sprint/advance                 — manually advance to next phase (CEO can also do this)
POST /api/sprint/kill                    — end the sprint early with learnings
GET  /api/sprint/history                 — past sprints

A sprint is a 14-day experiment run. The system writes a structured
sprint_brief into shared_memory that every agent reads on each tick.
It also fires kick-off tasks to the CEO, VP Product, VP GTM, and Research
simultaneously so all four start moving in the first tick.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from agents import AGENTS_BY_NAME, run as run_agent
from database import db
from security import default_rate_limit, require_api_key

log = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/sprint",
    tags=["sprint"],
    dependencies=[Depends(require_api_key)],
)

# Sprint phases and which agents are primary in each phase
PHASES = {
    1: {
        "name": "Discovery",
        "days": "1–3",
        "description": "CEO sets strategy. VP Product scores + PRD request. Research dives deep. VP GTM begins distribution planning.",
        "leads": ["ceo", "vp_product", "research"],
    },
    2: {
        "name": "PRD + GTM",
        "days": "4–5",
        "description": "Product Manager writes full PRD. VP GTM completes distribution plan with channels and offer. VP Engineering reviews PRD.",
        "leads": ["product_manager", "vp_gtm", "vp_engineering"],
    },
    3: {
        "name": "Build",
        "days": "6–9",
        "description": "Engineering builds MVP. Developers write code artifacts. Marketing drafts copy. Sales identifies ICP prospects.",
        "leads": ["developer_frontend", "developer_backend", "marketing", "sales"],
    },
    4: {
        "name": "Launch Prep",
        "days": "10–11",
        "description": "Landing page copy ready for PUBLISH approval. Outreach sequence ready for EMAIL approval. Owner reviews and approves.",
        "leads": ["marketing", "sales", "reviewer"],
    },
    5: {
        "name": "Validation",
        "days": "12–14",
        "description": "Distribution in motion. Analytics tracks daily signups. Finance calculates unit economics. CEO evaluates success metric.",
        "leads": ["analytics", "finance", "ceo"],
    },
}


def _current_phase(start_date: str) -> int:
    days_elapsed = (datetime.now(timezone.utc) - datetime.fromisoformat(start_date)).days
    if days_elapsed <= 2: return 1
    if days_elapsed <= 4: return 2
    if days_elapsed <= 8: return 3
    if days_elapsed <= 10: return 4
    return 5


def _build_sprint_brief(experiment: dict, phase: int, start_date: str) -> dict:
    days_elapsed = (datetime.now(timezone.utc) - datetime.fromisoformat(start_date)).days + 1
    days_remaining = 14 - days_elapsed
    ph = PHASES[phase]
    return {
        "active": True,
        "experiment_id": experiment["id"],
        "experiment_title": experiment["title"],
        "hypothesis": experiment["hypothesis"],
        "success_metric": experiment["success_metric"],
        "start_date": start_date,
        "day": days_elapsed,
        "days_remaining": max(0, days_remaining),
        "current_phase": phase,
        "phase_name": ph["name"],
        "phase_days": ph["days"],
        "phase_description": ph["description"],
        "phase_leads": ph["leads"],
        "all_phases": PHASES,
        "instruction_for_all_agents": (
            f"ACTIVE SPRINT: {experiment['title']} · Day {days_elapsed}/14 · Phase {phase}: {ph['name']}. "
            f"Success metric: {experiment['success_metric']}. "
            f"Days remaining: {days_remaining}. "
            f"Phase leads this phase: {', '.join(ph['leads'])}. "
            f"Every agent: check get_my_tasks first. Complete all open tasks before creating new ones. "
            f"Every deliverable must advance the sprint toward the success metric. "
            f"No idle work. If you have nothing specific to do in your phase, write a status note to ops_digest in shared_memory and stop."
        ),
    }


def _fire_kickoff_tasks(experiment: dict) -> None:
    """Post kick-off tasks to the four agents that start the sprint cascade."""
    kickoffs = [
        {
            "from_agent": "owner",
            "to_agent": "ceo",
            "task_type": "sprint_kickoff",
            "payload": {
                "experiment_id": experiment["id"],
                "experiment_title": experiment["title"],
                "instruction": (
                    f"Sprint started: {experiment['title']}. "
                    "This tick: (1) read the sprint_brief from shared_memory, "
                    "(2) write a strategy note to shared_memory[ceo_sprint_strategy], "
                    "(3) post_task to vp_product (task_type=sprint_score, payload includes experiment_id), "
                    "(4) post_task to vp_gtm (task_type=gtm_plan_request), "
                    "(5) post_task to research (task_type=trend_dive for this market), "
                    "(6) log_decision: why this experiment, what the win condition is. "
                    "Be specific and decisive."
                ),
            },
            "priority": 1,
        },
        {
            "from_agent": "owner",
            "to_agent": "vp_product",
            "task_type": "sprint_score",
            "payload": {
                "experiment_id": experiment["id"],
                "instruction": (
                    "Score this experiment (effort 1-10, revenue 1-10), "
                    "then immediately post_task to product_manager with task_type=prd_request. "
                    "Include the experiment context and a note on scope: MVP only, no feature creep."
                ),
            },
            "priority": 1,
        },
        {
            "from_agent": "owner",
            "to_agent": "vp_gtm",
            "task_type": "gtm_plan_request",
            "payload": {
                "experiment_id": experiment["id"],
                "instruction": (
                    "Write a complete GTM plan for this experiment as a 'plan' artifact. "
                    "Include: UK-specific positioning, 2 distribution channels with exact tactics, "
                    "offer + GBP price, early indicators for week 1. "
                    "Then post_task to marketing (content_brief) and sales (outbound_brief)."
                ),
            },
            "priority": 1,
        },
        {
            "from_agent": "owner",
            "to_agent": "research",
            "task_type": "trend_dive",
            "payload": {
                "topic": experiment["title"],
                "question": (
                    "Who is our ICP in the UK for this product? "
                    "What do they currently use? "
                    "What's the competitive gap at sub-£50/mo? "
                    "Which UK communities and channels can we reach them through?"
                ),
            },
            "priority": 2,
        },
    ]
    for task in kickoffs:
        db().table("task_bus").insert(task).execute()


class KillBody(BaseModel):
    learnings: str
    result: str = "killed"


@router.post("/start/{experiment_id}")
@default_rate_limit()
async def start_sprint(request: Request, experiment_id: str):
    """Activate an experiment as the current 14-day sprint."""
    exp = (
        db().table("experiment_log").select("*").eq("id", experiment_id).limit(1).execute().data or []
    )
    if not exp:
        raise HTTPException(status_code=404, detail="experiment not found")
    experiment = exp[0]

    # Deactivate any other running experiments
    db().table("experiment_log").update({"status": "proposed"}).eq("status", "active").execute()

    # Activate this one
    start_date = datetime.now(timezone.utc).isoformat()
    db().table("experiment_log").update({
        "status": "active",
        "owner_agent": "ceo",
    }).eq("id", experiment_id).execute()

    # Write the sprint brief to shared_memory
    brief = _build_sprint_brief(experiment, phase=1, start_date=start_date)
    db().table("shared_memory").upsert({
        "key": "sprint_brief",
        "value": brief,
        "category": "strategy",
        "summary": f"Sprint: {experiment['title']} · Day 1/14 · Phase 1: Discovery",
        "written_by": "owner",
    }, on_conflict="key").execute()

    # Update company priorities
    db().table("shared_memory").upsert({
        "key": "weekly_priorities",
        "value": {
            "sprint": experiment["title"],
            "items": [
                f"Sprint day 1: CEO + VP Product + Research run discovery on '{experiment['title']}'",
                f"VP GTM begins distribution planning — UK channels",
                f"Success metric: {experiment['success_metric']}",
                f"14-day kill condition: if no progress toward success_metric by day 10, pivot",
            ],
        },
        "category": "strategy",
        "summary": f"14-day sprint on {experiment['title']} · success metric: {experiment['success_metric']}",
        "written_by": "owner",
    }, on_conflict="key").execute()

    # Fire kick-off tasks to 4 agents simultaneously
    _fire_kickoff_tasks(experiment)

    # Trigger CEO + VP Product immediately (non-blocking)
    async def _cascade():
        await asyncio.sleep(2)
        for name in ("ceo", "vp_product", "vp_gtm"):
            d = AGENTS_BY_NAME.get(name)
            if d:
                asyncio.create_task(run_agent(d))
                await asyncio.sleep(3)

    asyncio.create_task(_cascade())

    return {
        "ok": True,
        "sprint": {
            "experiment_id": experiment_id,
            "title": experiment["title"],
            "day": 1,
            "phase": 1,
            "phase_name": "Discovery",
            "agents_triggered": ["ceo", "vp_product", "vp_gtm"],
            "kick_off_tasks_posted": 4,
        },
        "message": f"Sprint started on '{experiment['title']}'. CEO + VPs triggered. Watch the live feed.",
    }


@router.get("/status")
@default_rate_limit()
async def sprint_status(request: Request):
    """Current sprint state from shared_memory + experiment."""
    brief_row = (
        db().table("shared_memory").select("value").eq("key", "sprint_brief").limit(1).execute().data or []
    )
    if not brief_row or not brief_row[0].get("value", {}).get("active"):
        return {"active": False, "message": "No active sprint. Start one from the Experiments page."}

    brief = brief_row[0]["value"]
    exp_id = brief.get("experiment_id")
    artifacts = []
    tasks = []
    if exp_id:
        artifacts = (
            db().table("work_artifacts").select("agent_name,artifact_type,title,created_at")
            .eq("metadata->>experiment_id", exp_id)
            .order("created_at", desc=True).limit(20).execute().data or []
        )
        tasks = (
            db().table("task_bus").select("from_agent,to_agent,task_type,status,priority")
            .in_("status", ["pending", "in_progress"])
            .order("priority").limit(30).execute().data or []
        )

    return {
        "active": True,
        "brief": brief,
        "recent_artifacts": artifacts,
        "open_tasks": tasks,
    }


@router.post("/advance")
@default_rate_limit()
async def advance_phase(request: Request):
    """Manually advance the sprint to the next phase."""
    brief_row = (
        db().table("shared_memory").select("value").eq("key", "sprint_brief").limit(1).execute().data or []
    )
    if not brief_row or not brief_row[0].get("value", {}).get("active"):
        raise HTTPException(status_code=400, detail="no active sprint")
    brief = dict(brief_row[0]["value"])
    current = brief.get("current_phase", 1)
    if current >= 5:
        raise HTTPException(status_code=400, detail="already in final phase")

    brief["current_phase"] = current + 1
    new_phase = PHASES[current + 1]
    brief["phase_name"] = new_phase["name"]
    brief["phase_days"] = new_phase["days"]
    brief["phase_description"] = new_phase["description"]
    brief["phase_leads"] = new_phase["leads"]

    db().table("shared_memory").update({"value": brief, "summary": f"Sprint: {brief['experiment_title']} · Phase {current+1}: {new_phase['name']}"}).eq("key", "sprint_brief").execute()

    # Trigger phase lead agents
    async def _trigger():
        for name in new_phase["leads"][:2]:
            d = AGENTS_BY_NAME.get(name)
            if d:
                asyncio.create_task(run_agent(d))
                await asyncio.sleep(3)

    asyncio.create_task(_trigger())

    return {"ok": True, "new_phase": current + 1, "phase_name": new_phase["name"], "triggers": new_phase["leads"][:2]}


@router.post("/kill")
@default_rate_limit()
async def kill_sprint(request: Request, body: KillBody):
    """End the current sprint early."""
    brief_row = (
        db().table("shared_memory").select("value").eq("key", "sprint_brief").limit(1).execute().data or []
    )
    if not brief_row:
        raise HTTPException(status_code=400, detail="no active sprint")
    brief = dict(brief_row[0]["value"])
    exp_id = brief.get("experiment_id")

    if exp_id:
        db().table("experiment_log").update({
            "status": "closed",
            "result": body.result,
            "learnings": body.learnings,
        }).eq("id", exp_id).execute()

    brief["active"] = False
    db().table("shared_memory").update({"value": brief}).eq("key", "sprint_brief").execute()

    return {"ok": True, "experiment_id": exp_id, "result": body.result}
