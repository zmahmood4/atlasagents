"""APScheduler wiring for the 13 agents + daily cap reset (Part 9)."""

from __future__ import annotations

import logging
import random
from datetime import datetime, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from agents import ALL_AGENTS, AGENTS_BY_NAME, run
from database import db

log = logging.getLogger(__name__)

_scheduler: AsyncIOScheduler | None = None


async def _safe_run(agent_name: str) -> None:
    defn = AGENTS_BY_NAME.get(agent_name)
    if defn is None:
        log.warning("scheduler tried to run unknown agent %s", agent_name)
        return
    try:
        await run(defn)
    except Exception:
        log.exception("run(%s) raised — suppressed", agent_name)


async def _reset_daily_caps() -> None:
    try:
        db().table("agents").update({"tokens_used_today": 0, "cost_usd_today": 0}).neq(
            "name", ""
        ).execute()
        # Unpause agents that were paused solely because of the daily cap.
        db().table("agents").update({"status": "idle", "enabled": True}).eq(
            "status", "paused"
        ).execute()
        log.info("daily caps reset at %s", datetime.now(timezone.utc).isoformat())
    except Exception:
        log.exception("daily cap reset failed")


async def _reset_monthly_caps() -> None:
    try:
        db().table("agents").update({"tokens_used_month": 0, "cost_usd_month": 0}).neq(
            "name", ""
        ).execute()
        log.info("monthly caps reset at %s", datetime.now(timezone.utc).isoformat())
    except Exception:
        log.exception("monthly cap reset failed")


def start_scheduler() -> AsyncIOScheduler:
    global _scheduler
    if _scheduler is not None:
        return _scheduler

    sched = AsyncIOScheduler(timezone="UTC")
    for defn in ALL_AGENTS:
        sched.add_job(
            _safe_run,
            "interval",
            seconds=max(defn.schedule_seconds, 60),
            args=[defn.name],
            id=f"agent:{defn.name}",
            next_run_time=None,
            max_instances=1,
            coalesce=True,
            misfire_grace_time=120,
            replace_existing=True,
            jitter=random.randint(0, 30),
        )

    # Midnight UTC daily reset (Part 5 — caps reset at midnight UTC).
    sched.add_job(
        _reset_daily_caps,
        CronTrigger(hour=0, minute=0, timezone="UTC"),
        id="cap_reset_daily",
        replace_existing=True,
    )
    # First day of the month monthly reset.
    sched.add_job(
        _reset_monthly_caps,
        CronTrigger(day=1, hour=0, minute=0, timezone="UTC"),
        id="cap_reset_monthly",
        replace_existing=True,
    )

    sched.start()
    _scheduler = sched
    log.info("scheduler started: %d agents + cap-reset jobs", len(ALL_AGENTS))
    return sched


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
