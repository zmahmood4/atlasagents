"""Wipe helper — blanks the database for go-live, keeps the 13-agent roster.

Usage (inside backend/, with .env loaded):

    python wipe.py              # wipes demo data but keeps agents table + config
    python wipe.py --all        # wipes EVERYTHING except the 13 agent rows
    python wipe.py --nuke       # also clears agent token counters / last_run_at

After wiping you typically re-seed only the company_knowledge + shared_memory
that ATLAS starts with in production:

    python seed.py              # idempotent; re-seeds 13 agents + minimal KB

The wipe is a set of DELETE FROM statements against the PostgREST API.
Requires SUPABASE_SERVICE_KEY to be set (bypasses RLS).
"""

from __future__ import annotations

import argparse
import logging
import sys

from database import db

log = logging.getLogger("wipe")
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")


# Every table except `agents` (config is preserved by default).
DEMO_TABLES = [
    "agent_actions",
    "agent_runs",
    "task_bus",
    "pending_approvals",
    "work_artifacts",
    "business_metrics",
    "api_rate_limits",
]

OPTIONAL_TABLES = [
    # --all wipes these too; seed.py will repopulate minimal versions.
    "knowledge_base",
    "shared_memory",
    "experiment_log",
]


NIL_UUID = "00000000-0000-0000-0000-000000000000"


def _delete_all(table: str) -> int:
    """Delete every row in the table. supabase-py requires a filter, so we use
    `neq("id", NIL_UUID)` which matches every real row (ids are generated via
    gen_random_uuid() and never collide with the nil UUID)."""
    try:
        res = db().table(table).delete().neq("id", NIL_UUID).execute()
        return len(res.data or [])
    except Exception as exc:
        log.warning("failed to wipe %s: %s", table, exc)
        return 0


def _reset_agent_counters() -> None:
    db().table("agents").update(
        {
            "tokens_used_today": 0,
            "tokens_used_month": 0,
            "cost_usd_today": 0,
            "cost_usd_month": 0,
            "last_run_at": None,
            "current_task": None,
            "status": "idle",
        }
    ).neq("name", "").execute()


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--all", action="store_true", help="also wipe knowledge_base, shared_memory, experiment_log")
    p.add_argument("--nuke", action="store_true", help="also reset agents' token + cost counters")
    args = p.parse_args()

    for t in DEMO_TABLES:
        n = _delete_all(t)
        log.info("wiped %s (%d rows returned)", t, n)

    if args.all:
        for t in OPTIONAL_TABLES:
            n = _delete_all(t)
            log.info("wiped %s (%d rows returned)", t, n)

    if args.nuke or args.all:
        _reset_agent_counters()
        log.info("reset agent counters")

    log.info("wipe complete — agents table preserved; run `python seed.py` to restore baseline knowledge.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
