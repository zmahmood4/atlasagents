"""Apply a spend preset across all 13 agents.

Usage (inside backend/):

    python budget.py             # 'production' preset — ~$0.30/24h on Haiku 4.5
    python budget.py --tight     # ~$0.08/24h — lean first-run
    python budget.py --normal    # full caps (use after topping up credits)

Haiku 4.5 is ~4x cheaper than Sonnet 4.6:
    Haiku 4.5:  $0.80 input / $4.00 output per MTok
    Sonnet 4.6: $3.00 input / $15.00 output per MTok

Cost formula (3:1 input:output mix):
    Haiku cost  ≈ tokens × 1.6 / 1_000_000
    Sonnet cost ≈ tokens × 6.0 / 1_000_000
"""

from __future__ import annotations

import argparse
import logging
import sys

from database import db

log = logging.getLogger("budget")
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

HAIKU_COST_PER_MTOK = 1.6   # blended 3:1 input:output on Haiku 4.5

PRESETS: dict[str, dict[str, int]] = {
    # Production default on Haiku 4.5 — agents do real work, ~$0.30/24h total.
    "production": {
        "ceo":                 50_000,
        "vp_product":          40_000,
        "vp_engineering":      45_000,
        "vp_gtm":              40_000,
        "product_manager":     45_000,
        "developer_frontend":  60_000,
        "developer_backend":   60_000,
        "marketing":           40_000,
        "sales":               35_000,
        "support":             25_000,
        "finance":             15_000,
        "research":            30_000,
        "analytics":           20_000,
    },
    # Lean run — agents can still do one meaningful thing per tick.
    "tight": {
        "ceo":                 20_000,
        "vp_product":          15_000,
        "vp_engineering":      15_000,
        "vp_gtm":              15_000,
        "product_manager":     18_000,
        "developer_frontend":  22_000,
        "developer_backend":   22_000,
        "marketing":           15_000,
        "sales":               12_000,
        "support":              8_000,
        "finance":              7_000,
        "research":            12_000,
        "analytics":            8_000,
    },
    # Uncapped production (use when you have credits to spend).
    "normal": {
        "ceo":                100_000,
        "vp_product":          70_000,
        "vp_engineering":      80_000,
        "vp_gtm":              70_000,
        "product_manager":     70_000,
        "developer_frontend": 100_000,
        "developer_backend":  100_000,
        "marketing":           70_000,
        "sales":               60_000,
        "support":             50_000,
        "finance":             30_000,
        "research":            50_000,
        "analytics":           40_000,
    },
}


def main() -> int:
    p = argparse.ArgumentParser()
    grp = p.add_mutually_exclusive_group()
    grp.add_argument("--tight", action="store_true")
    grp.add_argument("--normal", action="store_true")
    args = p.parse_args()

    preset_name = "tight" if args.tight else "normal" if args.normal else "production"
    caps = PRESETS[preset_name]
    log.info("applying preset: %s", preset_name)

    total_daily = 0
    for name, daily in caps.items():
        monthly = daily * 20          # 20 days of full-speed before monthly cap
        res = (
            db()
            .table("agents")
            .update({"daily_token_cap": daily, "monthly_token_cap": monthly})
            .eq("name", name)
            .execute()
        )
        if not (res.data or []):
            log.warning("no row updated for %s — agent not seeded yet", name)
            continue
        total_daily += daily
        log.info("  %-22s daily=%6d  monthly=%7d", name, daily, monthly)

    est_haiku = total_daily * HAIKU_COST_PER_MTOK / 1_000_000
    log.info(
        "total daily cap: %d tokens  (~$%.4f/24h on Haiku 4.5 if fully used)",
        total_daily, est_haiku,
    )
    log.info("done — Render will pick up the new caps on the next agent tick (no redeploy needed).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
