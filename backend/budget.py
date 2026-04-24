"""Apply a conservative spend preset across all 13 agents.

Useful when running on a tight Anthropic credit balance (e.g. $15 of free credit).
Updates the agents row directly — does not touch schedules or prompts.

Usage (inside backend/):

    python budget.py           # 'overnight' preset — ~$1 / 24h total on Sonnet 4.6
    python budget.py --tight   # ~$0.30 / 24h — smallest viable run
    python budget.py --normal  # back to the spec defaults (baked into agents/*.py)

After running, restart uvicorn and/or kick off from the dashboard. The scheduler
picks up the new caps immediately because it reads them every tick from the DB.
"""

from __future__ import annotations

import argparse
import logging
import sys

from database import db

log = logging.getLogger("budget")
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")


# Per-agent daily token caps. Monthly is 10× daily in every preset.
PRESETS: dict[str, dict[str, int]] = {
    # ~$1 per 24h on Sonnet 4.6 ($3/$15 per MTok). Fits 8-hour overnight + morning.
    "overnight": {
        "ceo":                 40_000,
        "vp_product":          30_000,
        "vp_engineering":      35_000,
        "vp_gtm":              30_000,
        "product_manager":     35_000,
        "developer_frontend":  50_000,
        "developer_backend":   50_000,
        "marketing":           30_000,
        "sales":               25_000,
        "support":             20_000,
        "finance":             12_000,
        "research":            20_000,
        "analytics":           15_000,
    },
    # ~$0.30 per 24h — for first-boot testing. Agents still work but make fewer tool calls.
    "tight": {
        "ceo":                 12_000,
        "vp_product":          10_000,
        "vp_engineering":      10_000,
        "vp_gtm":              10_000,
        "product_manager":     12_000,
        "developer_frontend":  15_000,
        "developer_backend":   15_000,
        "marketing":           10_000,
        "sales":                8_000,
        "support":              6_000,
        "finance":              5_000,
        "research":             7_000,
        "analytics":            6_000,
    },
    # Spec defaults (from agents/*.py). Restores normal production caps.
    "normal": {
        "ceo":                 60_000,
        "vp_product":          40_000,
        "vp_engineering":      50_000,
        "vp_gtm":              40_000,
        "product_manager":     40_000,
        "developer_frontend":  70_000,
        "developer_backend":   70_000,
        "marketing":           40_000,
        "sales":               40_000,
        "support":             30_000,
        "finance":             20_000,
        "research":            30_000,
        "analytics":           25_000,
    },
}


def main() -> int:
    p = argparse.ArgumentParser()
    grp = p.add_mutually_exclusive_group()
    grp.add_argument("--tight", action="store_true")
    grp.add_argument("--normal", action="store_true")
    args = p.parse_args()

    preset_name = "tight" if args.tight else "normal" if args.normal else "overnight"
    caps = PRESETS[preset_name]
    log.info("applying preset: %s", preset_name)

    total_daily = 0
    for name, daily in caps.items():
        monthly = daily * 10
        res = (
            db()
            .table("agents")
            .update({"daily_token_cap": daily, "monthly_token_cap": monthly})
            .eq("name", name)
            .execute()
        )
        if not (res.data or []):
            log.warning("no row updated for %s — is the agent seeded?", name)
            continue
        total_daily += daily
        log.info("  %-22s daily=%d monthly=%d", name, daily, monthly)

    # Rough cost estimate on Sonnet 4.6 assuming a ~3:1 input:output mix.
    # cost = 0.75 * tokens * 3/M + 0.25 * tokens * 15/M = tokens * 6/M  approx
    est_usd = total_daily * 6 / 1_000_000
    log.info("total daily cap across 13 agents: %d tokens (~$%.2f on Sonnet 4.6 if fully used)", total_daily, est_usd)
    log.info("done — restart uvicorn / redeploy for change to propagate to the scheduler.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
