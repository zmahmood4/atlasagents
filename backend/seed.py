"""One-shot seed script — idempotent.

Usage (inside backend/):  python seed.py
Assumes supabase/migrations/001_initial.sql has been applied.
"""

from __future__ import annotations

import logging
import sys

from agents import ALL_AGENTS
from database import db

log = logging.getLogger("seed")
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")


# ---------------------------------------------------------------------------
# Part 12 — literal content
# ---------------------------------------------------------------------------

COMPANY_KNOWLEDGE = [
    {
        "category": "company",
        "title": "Company",
        "content": (
            "ATLAS is an AI-native micro-SaaS studio. We build and launch small "
            "profitable software products using a fully autonomous AI team. Our "
            "mission is to find underserved niches and ship fast."
        ),
        "tags": ["mission", "positioning"],
        "written_by": "owner",
    },
    {
        "category": "customers",
        "title": "ICP",
        "content": (
            "Solo founders, indie hackers, and small teams (2-10 people) who want "
            "to automate repetitive work and will pay $29-99/month for tools that "
            "save them hours per week."
        ),
        "tags": ["icp", "pricing"],
        "written_by": "owner",
    },
    {
        "category": "market",
        "title": "Market",
        "content": (
            "The AI tools market in 2026 has opportunity in vertical niches. "
            "Distribution via communities, newsletters, and product-led growth "
            "outperforms paid ads for our segment."
        ),
        "tags": ["market", "distribution"],
        "written_by": "owner",
    },
]


SHARED_MEMORY = [
    {
        "key": "company_stage",
        "value": {"text": "pre-revenue, exploring first product"},
        "category": "strategy",
        "summary": "pre-revenue, exploring first product",
        "written_by": "owner",
    },
    {
        "key": "weekly_priorities",
        "value": {
            "text": "Validate top experiment, write first PRD, set up landing page",
            "items": [
                "Validate top experiment",
                "Write first PRD",
                "Set up landing page",
            ],
        },
        "category": "strategy",
        "summary": "Validate top experiment, write first PRD, set up landing page",
        "written_by": "owner",
    },
]


EXPERIMENTS = [
    {
        "title": "AI Newsletter Summariser",
        "hypothesis": (
            "Busy founders pay $19/month for their newsletter subscriptions "
            "summarised into a 5-minute daily digest"
        ),
        "success_metric": "10 paying users in 30 days",
        "owner_agent": "ceo",
        "status": "proposed",
    },
    {
        "title": "Cold Outreach Personaliser",
        "hypothesis": (
            "SDRs pay $49/month for AI that writes hyper-personalised cold "
            "emails using live prospect research"
        ),
        "success_metric": "5 paying users in 30 days",
        "owner_agent": "ceo",
        "status": "proposed",
    },
    {
        "title": "Meeting Notes to Action Items",
        "hypothesis": (
            "Teams pay $29/month for AI that turns meeting transcripts into "
            "structured action items sent to their PM tool"
        ),
        "success_metric": "8 paying users in 30 days",
        "owner_agent": "ceo",
        "status": "proposed",
    },
]


SAMPLE_ARTIFACTS = [
    {
        "agent_name": "ceo",
        "artifact_type": "plan",
        "title": "Week 1 — Priorities",
        "content": (
            "Priorities: (1) Validate top experiment via 10 ICP conversations. "
            "(2) Ship landing page for winning idea. (3) Instrument signup funnel. "
            "Risk: spreading thin across 3 experiments — pick one by end of week."
        ),
        "metadata": {"week": 1},
    },
    {
        "agent_name": "vp_product",
        "artifact_type": "report",
        "title": "Experiment scoring — week 1",
        "content": (
            "Newsletter Summariser: effort 4 / revenue 7 — pass\n"
            "Cold Outreach: effort 6 / revenue 6 — hold\n"
            "Meeting Notes → Action Items: effort 7 / revenue 6 — hold"
        ),
        "metadata": {"period": "week-1"},
    },
    {
        "agent_name": "product_manager",
        "artifact_type": "prd",
        "title": "PRD: AI Newsletter Summariser (draft)",
        "content": (
            "# Problem\nFounders subscribe to 10+ newsletters; signal is drowning in noise.\n\n"
            "# User\nSolo founder, 1 hour/day for reading.\n\n"
            "# Core flow\nUser connects inbox → we detect newsletters → nightly 5-min digest emailed at 7am.\n\n"
            "# Scope (in)\nGmail OAuth, sender-based detection, Claude digest, daily email.\n\n"
            "# Scope (out)\nMobile app, multi-inbox, shared digests.\n\n"
            "# Success\n10 paying users at $19 in 30 days."
        ),
        "metadata": {"experiment_title": "AI Newsletter Summariser"},
    },
    {
        "agent_name": "vp_engineering",
        "artifact_type": "spec",
        "title": "Ticket split — AI Newsletter Summariser",
        "content": (
            "- FE: Connect-inbox onboarding flow (Gmail OAuth)\n"
            "- FE: Digest preview UI\n"
            "- BE: Gmail ingestion worker\n"
            "- BE: Newsletter classifier + Claude summariser pipeline\n"
            "- BE: Daily email sender"
        ),
        "metadata": {"experiment_title": "AI Newsletter Summariser"},
    },
    {
        "agent_name": "developer_frontend",
        "artifact_type": "code",
        "title": "frontend/app/onboarding/connect/page.tsx (scaffold)",
        "content": (
            '"use client";\n\n'
            "import { useState } from \"react\";\n\n"
            "export default function ConnectInboxPage() {\n"
            "  const [busy, setBusy] = useState(false);\n"
            "  return (\n"
            "    <main className=\"mx-auto max-w-md p-6\">\n"
            "      <h1 className=\"text-xl font-semibold\">Connect your inbox</h1>\n"
            "      <p className=\"mt-2 text-sm text-slate-400\">We read only newsletter senders. Nothing else.</p>\n"
            "      <button\n"
            "        disabled={busy}\n"
            "        onClick={() => setBusy(true)}\n"
            "        className=\"mt-4 rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white\"\n"
            "      >\n"
            "        Continue with Google\n"
            "      </button>\n"
            "    </main>\n"
            "  );\n"
            "}\n"
        ),
        "metadata": {"ticket": "FE: Connect-inbox onboarding flow"},
    },
    {
        "agent_name": "developer_backend",
        "artifact_type": "code",
        "title": "apps/summariser/ingest.py (scaffold)",
        "content": (
            '"""Minimal scaffold for the newsletter ingestion job."""\n\n'
            "from dataclasses import dataclass\n\n"
            "@dataclass\n"
            "class Newsletter:\n"
            "    sender: str\n"
            "    subject: str\n"
            "    body: str\n\n"
            "def classify(items: list[Newsletter]) -> list[Newsletter]:\n"
            "    return [i for i in items if _is_newsletter(i)]\n\n"
            "def _is_newsletter(item: Newsletter) -> bool:\n"
            "    return any(tag in item.sender.lower() for tag in ('@substack.com', '@beehiiv.com', 'noreply'))\n"
        ),
        "metadata": {"ticket": "BE: Gmail ingestion worker"},
    },
    {
        "agent_name": "marketing",
        "artifact_type": "content",
        "title": "Landing page hero copy v1",
        "content": (
            "Every newsletter, summarised before coffee.\n"
            "Connect your inbox. Get one five-minute brief at 7am with only what matters for you. "
            "No more archive-without-reading guilt.\n[Get the beta]"
        ),
        "metadata": {"channel": "landing"},
    },
    {
        "agent_name": "sales",
        "artifact_type": "content",
        "title": "Cold email — ICP: indie founders",
        "content": (
            "Subject: 5-minute daily digest from your 12 newsletters?\n\n"
            "Hey {first}, saw you follow {newsletter_a} and {newsletter_b} — most founders I talk to "
            "archive 40%+ without reading. Built a tool that gives you a single 5-minute brief at 7am "
            "with just what matters for your role. Would it be useful for you? Happy to send a preview."
        ),
        "metadata": {"sequence": "intro_v1"},
    },
    {
        "agent_name": "support",
        "artifact_type": "content",
        "title": "Welcome email template",
        "content": (
            "Welcome to ATLAS Digest. You will get your first brief tomorrow at 7am. "
            "Reply to this email with the newsletters you want prioritised — we read every reply."
        ),
        "metadata": {"flow": "onboarding"},
    },
    {
        "agent_name": "finance",
        "artifact_type": "report",
        "title": "Week 1 finance snapshot",
        "content": (
            "Revenue: $0 (pre-revenue). AI spend: trending $X/day based on scheduled tick rate. "
            "Runway: n/a (bootstrapped). Watchlist: developer_frontend + developer_backend token spend."
        ),
        "metadata": {"period": "week-1"},
    },
    {
        "agent_name": "research",
        "artifact_type": "research",
        "title": "Newsletter tool landscape",
        "content": (
            "Competitors: Refind (free/$7), Meco (free), Feedly (free/$8). "
            "Gap: none focus specifically on founder-relevant signal + actionable daily brief. "
            "Signal: 37% of founders surveyed say they 'archive without reading' > 3 newsletters/day."
        ),
        "metadata": {"sources": ["refind.com", "meco.app", "feedly.com"]},
    },
    {
        "agent_name": "analytics",
        "artifact_type": "report",
        "title": "Baseline instrumentation plan",
        "content": (
            "Finding: no data yet — pre-launch. Recommend instrumenting landing_visit, "
            "signup, trial_started, paid_converted. Track per-channel. Revisit week 2."
        ),
        "metadata": {"period": "week-1"},
    },
    {
        "agent_name": "vp_gtm",
        "artifact_type": "plan",
        "title": "GTM: AI Newsletter Summariser",
        "content": (
            "Channel 1: IndieHackers post + thread in r/SaaS. Channel 2: cold DM 20 founders on X who "
            "follow AI newsletters. Offer: first 50 users get $9/mo for life. "
            "Measure: landing CTR, signup→trial, trial→paid."
        ),
        "metadata": {"experiment_title": "AI Newsletter Summariser"},
    },
]


# ---------------------------------------------------------------------------
# Seed writers
# ---------------------------------------------------------------------------

def seed_agents() -> None:
    for defn in ALL_AGENTS:
        row = {
            "name": defn.name,
            "role": defn.role,
            "department": defn.department,
            "system_prompt": defn.system_prompt,
            "schedule_seconds": defn.schedule_seconds,
            "daily_token_cap": defn.daily_token_cap,
            "monthly_token_cap": defn.monthly_token_cap,
            "enabled": True,
            "status": "idle",
            "current_task": None,
        }
        db().table("agents").upsert(row, on_conflict="name").execute()
    log.info("seeded %d agents", len(ALL_AGENTS))


def seed_knowledge() -> None:
    for entry in COMPANY_KNOWLEDGE:
        existing = (
            db()
            .table("knowledge_base")
            .select("id")
            .eq("title", entry["title"])
            .limit(1)
            .execute()
            .data
            or []
        )
        if existing:
            continue
        db().table("knowledge_base").insert(entry).execute()
    log.info("seeded knowledge base")


def seed_memory() -> None:
    for row in SHARED_MEMORY:
        db().table("shared_memory").upsert(row, on_conflict="key").execute()
    log.info("seeded shared memory")


def seed_experiments() -> None:
    for exp in EXPERIMENTS:
        existing = (
            db()
            .table("experiment_log")
            .select("id")
            .eq("title", exp["title"])
            .limit(1)
            .execute()
            .data
            or []
        )
        if existing:
            continue
        db().table("experiment_log").insert(exp).execute()
    log.info("seeded experiments")


def seed_artifacts() -> None:
    count = 0
    for art in SAMPLE_ARTIFACTS:
        existing = (
            db()
            .table("work_artifacts")
            .select("id")
            .eq("agent_name", art["agent_name"])
            .eq("title", art["title"])
            .limit(1)
            .execute()
            .data
            or []
        )
        if existing:
            continue
        db().table("work_artifacts").insert(art).execute()
        count += 1
    log.info("seeded %d artifacts", count)


def main() -> int:
    seed_agents()
    seed_knowledge()
    seed_memory()
    seed_experiments()
    seed_artifacts()
    log.info("seed complete")
    return 0


if __name__ == "__main__":
    sys.exit(main())
