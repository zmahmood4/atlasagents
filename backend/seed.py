"""Production seed — idempotent.

Run after wipe.py to start fresh:
    python wipe.py --all --nuke
    python seed.py
    python budget.py

Experiment selection rationale (2026 AI-native micro-SaaS):
  1. AI Competitor Radar      — highest revenue signal, lowest effort, clear distribution
  2. AI Process Doc Builder   — universal pain, high stickiness, no strong sub-$100 player
  3. AI Async Standup Digest  — remote work is permanent, Slack integration = fast distribution

Each is validated by: strong ICP buy signal, AI does it better than humans, build in <2 weeks,
distribution channel is clear, $29-£40/mo sits in the ICP's comfort zone.
"""

from __future__ import annotations

import logging
import sys

from agents import ALL_AGENTS
from database import db

log = logging.getLogger("seed")
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")


# ---------------------------------------------------------------------------
# Knowledge base — company context agents read every tick
# ---------------------------------------------------------------------------

COMPANY_KNOWLEDGE = [
    {
        "category": "company",
        "title": "Company mission and positioning",
        "content": (
            "ATLAS is an AI-native micro-SaaS studio. We find high-pain, underserved niches "
            "where AI can do something in 5 minutes that takes a human 2+ hours, build a lean "
            "product around it, and charge $29-$99/mo.\n\n"
            "We do not build generic AI wrappers. We solve a specific, named workflow pain for "
            "a specific, named user. Every product must earn its first $1,000 MRR before we "
            "invest in scaling. We run 2-3 experiments in parallel and kill losers fast.\n\n"
            "Revenue is the north star. Vanity metrics (signups, waitlist, impressions) are "
            "ignored unless they convert to paying users within 30 days."
        ),
        "tags": ["mission", "positioning", "principles"],
        "written_by": "owner",
    },
    {
        "category": "customers",
        "title": "ICP — who pays us and why",
        "content": (
            "PRIMARY ICP: Solo founders, indie hackers, and ops leads at teams of 5-30 people.\n\n"
            "DEMOGRAPHICS: 28-45 years old, technical or semi-technical, self-funded or early-stage "
            "funded. Uses Slack, Notion, Linear, HubSpot, Loom. Active on X (Twitter), IndieHackers UK, "
            "r/SaaS + r/UKEntrepreneurs, LinkedIn.\n\n"
            "BUYING BEHAVIOUR:\n"
            "- Buys without a procurement process if price < $100/mo\n"
            "- Decision in <10 minutes if the demo solves their exact pain\n"
            "- Buying trigger phrase: 'I waste X hours per week doing Y manually'\n"
            "- Cancels if they don't see value in the first 7 days\n"
            "- Refers 2-3 peers if they love it\n\n"
            "PRICE SENSITIVITY:\n"
            "- $19-29/mo: impulse buy, no justification needed\n"
            "- $39-49/mo: needs to save visibly ≥2h/week\n"
            "- $79-99/mo: needs to replace a paid tool or headcount\n\n"
            "CHANNELS THAT WORK FOR THIS ICP (ranked):\n"
            "1. IndieHackers UK / r/SaaS + r/UKEntrepreneurs 'Show HN' style posts with real numbers\n"
            "2. Targeted cold DM on X/LinkedIn to founders who complain about the specific pain\n"
            "3. SEO on high-intent pain-point keywords ('automate competitor tracking', 'SOP generator')\n"
            "4. ProductHunt launch (day-of spike, then SEO long tail)\n"
            "5. Partnerships with newsletters (Lenny's, The Hustle, Stacked Marketer)"
        ),
        "tags": ["icp", "buyers", "channels", "pricing"],
        "written_by": "owner",
    },
    {
        "category": "market",
        "title": "Market — 2026 AI micro-SaaS landscape",
        "content": (
            "OPPORTUNITY WINDOW (2026):\n"
            "AI-native tools have a 12-18 month window before incumbents (Notion, HubSpot, Slack) "
            "ship native AI features that cover the same ground. Our edge is: we ship in days, "
            "not quarters. We must own the customer before the incumbent patches the gap.\n\n"
            "WHERE THE MONEY IS:\n"
            "- Workflow automation for knowledge workers (research, writing, summarisation)\n"
            "- Competitive intelligence (founders track competitors but do it manually)\n"
            "- Internal documentation (every growing team has a process documentation debt)\n"
            "- Meeting/async communication overhead (standups, action items, follow-ups)\n"
            "- Sales and outreach personalisation at scale\n\n"
            "WHAT'S OVERSATURATED (avoid):\n"
            "- Generic AI writing tools (Jasper, Copy.ai, etc. — margin-squeezed)\n"
            "- AI chatbots for websites (every platform has one)\n"
            "- Generic AI summarisers (Notion AI does it free)\n\n"
            "DISTRIBUTION TRUTH FOR 2026:\n"
            "- Paid ads are dead at sub-$50 ACV — CAC > LTV at Meta/Google rates\n"
            "- Communities + content + cold outreach is the playbook for our ICP\n"
            "- SEO still works if you target long-tail intent keywords (not 'AI writing tool')\n"
            "- ProductHunt launches create a spike but SEO is the sustainable moat\n\n"
            "COMPETITIVE MOAT:\n"
            "We do not compete on model quality (everyone uses Claude/GPT). We compete on "
            "workflow specificity — the exact integrations, the exact output format, the exact "
            "time savings for one specific persona. Specificity is the moat."
        ),
        "tags": ["market", "2026", "distribution", "competition", "strategy"],
        "written_by": "owner",
    },
    {
        "category": "decisions",
        "title": "Product principles — non-negotiable",
        "content": (
            "1. ONE pain, ONE persona, ONE workflow. No feature creep.\n"
            "2. First $1,000 MRR before any scaling investment.\n"
            "3. Kill any experiment that has not generated a paying user after 3 weeks of active distribution.\n"
            "4. Never ask for more data than the user's core workflow requires.\n"
            "5. Every product must have a 60-second demo that shows the value. If you can't demo it in 60s, the value prop is wrong.\n"
            "6. Pricing: start at $29-39/mo. Raise to $49-79 when waitlist > 50 people.\n"
            "7. Build in public. Post progress to IndieHackers UK/X to drive early users.\n"
            "8. No enterprise features until we have 50 paying users in the SMB tier."
        ),
        "tags": ["principles", "decisions", "product"],
        "written_by": "owner",
    },
    {
        "category": "product",
        "title": "Revenue model",
        "content": (
            "MODEL: SaaS subscription, monthly billing, no annual plan until 50+ customers.\n\n"
            "PRICING TIERS PER PRODUCT:\n"
            "- Solo: £25/mo — 1 user, limited volume\n"
            "- Team: £40/mo — up to 5 users, higher volume\n"
            "- Growth: £65/mo — unlimited users, priority features, API access\n\n"
            "PAYMENT: Stripe. No free tier (use a 7-day free trial instead). "
            "Free tiers attract non-buyers.\n\n"
            "FIRST REVENUE TARGET: $1,000 MRR (~25 customers at £32/mo average).\n"
            "PATH TO $10k MRR: 3 products × ~85 customers each at £32/mo avg, or 1 product "
            "at $10k from a mix of tiers.\n\n"
            "UNIT ECONOMICS TARGET:\n"
            "- LTV/CAC > 3x at month 12\n"
            "- Payback period < 3 months\n"
            "- Churn < 5%/month (strong churn = wrong ICP or weak value)"
        ),
        "tags": ["revenue", "pricing", "model"],
        "written_by": "owner",
    },
    {
        "category": "competitors",
        "title": "Competitive landscape per experiment",
        "content": (
            "AI COMPETITOR RADAR:\n"
            "- Crayon ($500-2000/mo) — enterprise only, overkill for our ICP\n"
            "- Klue ($400+/mo) — same, enterprise\n"
            "- Kompyte (acquired by Semrush) — integrated into big platform, no standalone\n"
            "- Manual spreadsheets + Feedly — what 80% of our ICP uses today\n"
            "GAP: Nobody serves solo founders / small startups at $29-49/mo with automated tracking\n\n"
            "AI PROCESS DOC BUILDER:\n"
            "- Tango.us (browser extension, limited AI) — mostly for UI walkthroughs\n"
            "- Scribe.how — good but screenshot-only, no voice/text/Loom\n"
            "- Notion AI — requires content to already be in Notion, not a transformer\n"
            "- Loom (transcription only) — doesn't structure into docs\n"
            "GAP: Nobody converts voice notes, Slack threads, AND Looms into structured SOPs\n\n"
            "AI ASYNC STANDUP DIGEST:\n"
            "- Geekbot ($2.50/user/mo) — collects standups but no AI summarisation\n"
            "- DailyBot — similar to Geekbot, basic\n"
            "- Range.co — expensive for small teams\n"
            "GAP: Nobody does the 'AI reads + summarises + surfaces blockers' layer on top of async input"
        ),
        "tags": ["competitors", "landscape", "gap-analysis"],
        "written_by": "research",
    },
]


# ---------------------------------------------------------------------------
# Shared memory — CEO reads this on every tick
# ---------------------------------------------------------------------------

SHARED_MEMORY = [
    {
        "key": "company_stage",
        "value": {
            "stage": "pre-revenue",
            "phase": "experiment validation",
            "description": "3 experiments proposed, none active yet. First goal: activate best experiment this week and drive to first paying user within 14 days.",
        },
        "category": "strategy",
        "summary": "pre-revenue, experiment validation phase, targeting first paying user in 14 days",
        "written_by": "owner",
    },
    {
        "key": "north_star_metric",
        "value": {
            "metric": "paying_users",
            "current": 0,
            "week_1_target": 1,
            "month_1_target": 15,
            "rationale": "Revenue signals product-market fit. Everything else is noise.",
        },
        "category": "strategy",
        "summary": "north star = paying users. target: 1 in week 1, 15 in month 1",
        "written_by": "owner",
    },
    {
        "key": "weekly_priorities",
        "value": {
            "week": 1,
            "items": [
                "1. CEO: evaluate 3 experiments, score with VP Product, activate AI Competitor Radar (highest revenue/effort ratio)",
                "2. Research: deep competitive analysis on Competitor Radar market — find the exact gap and price point",
                "3. VP GTM: draft distribution plan for Competitor Radar — identify 3 channels, 2 offer variants, target 10 ICP cold DMs by day 3",
                "4. Product Manager: write PRD for Competitor Radar — one user story: 'I receive a weekly email showing exactly what changed on 5 competitor sites'",
                "5. VP Engineering: decompose PRD into 4-6 tickets once PRD is approved by VP Product",
            ],
            "kill_condition": "If no paying user by day 21, kill Competitor Radar and activate Process Doc Builder",
        },
        "category": "strategy",
        "summary": "Week 1: activate AI Competitor Radar, first PRD, first distribution attempt, first paying user by day 14",
        "written_by": "owner",
    },
    {
        "key": "ceo_first_tick_directive",
        "value": {
            "instruction": (
                "This is your first tick. The company has 3 proposed experiments. Your job in this tick:\n"
                "1. Score all 3 experiments: post_task to vp_product with task_type='experiment_score' "
                "for each, including the context from knowledge_base.\n"
                "2. Activate 'AI Competitor Radar' immediately — this is the highest-confidence bet. "
                "Use update_experiment to set status='active'.\n"
                "3. Post task to vp_gtm: task_type='gtm_plan', payload with experiment context.\n"
                "4. Post task to research: task_type='trend_dive', asking for competitor analysis "
                "on the monitoring tools market, specifically who is underserving the $29-49/mo segment.\n"
                "5. Write memory key 'current_product_focus' with the active experiment details.\n"
                "6. Log a decision: why Competitor Radar first (effort=4, revenue=8, clear gap, fast distribution).\n"
                "Do all of this in this single tick. The team is waiting for direction."
            ),
            "rationale": "Clear first-tick directive prevents the CEO from generic exploration on day 1.",
        },
        "category": "strategy",
        "summary": "CEO first tick: score experiments, activate Competitor Radar, cascade to VP GTM + Research",
        "written_by": "owner",
    },
    {
        "key": "current_product_focus",
        "value": {
            "experiment": "AI Competitor Radar",
            "status": "proposed — awaiting CEO activation",
            "one_liner": "Weekly automated digest of competitor changes for solo founders at £32/mo",
            "icp": "Solo founders and small startups (2-20 people) who manually track 3-5 competitors",
            "core_value": "Save 3 hours per week of manual competitor research",
        },
        "category": "product",
        "summary": "AI Competitor Radar — weekly competitor change digest, £32/mo, targeting solo founders",
        "written_by": "owner",
    },
    {
        "key": "distribution_thesis",
        "value": {
            "primary_channel": "cold DM on X/LinkedIn to founders who have tweeted about competitor tracking",
            "secondary_channel": "IndieHackers UK + r/SaaS + r/UKEntrepreneurs posts with real numbers and demo",
            "offer": "$0 free trial for 1 competitor for 7 days, then £32/mo",
            "day_1_action": "Identify 20 founders who have mentioned 'tracking competitors' or 'competitive analysis' on X in the last 30 days",
            "distribution_owner": "vp_gtm delegates to sales for outreach, marketing for content",
        },
        "category": "gtm",
        "summary": "cold DM on X/LinkedIn to founders talking about competitor tracking + IndieHackers UK post",
        "written_by": "owner",
    },
    {
        "key": "model_config",
        "value": {
            "model": "claude-haiku-4-5-20251001",
            "reason": "4x cheaper than Sonnet, sufficient for structured workflows and artifact production",
            "upgrade_trigger": "Switch to claude-sonnet-4-6 for CEO + VP Product only if quality drops below acceptable",
        },
        "category": "ops",
        "summary": "using Haiku 4.5 to maximise credit runway (~$0.30/day at production caps)",
        "written_by": "owner",
    },
]


# ---------------------------------------------------------------------------
# Experiments — 3 sharp ideas with real market rationale
# ---------------------------------------------------------------------------

EXPERIMENTS = [
    {
        "title": "AI Competitor Radar",
        "hypothesis": (
            "Solo founders and small startups (2-20 people) pay £32/month for a weekly "
            "automated digest showing exactly what changed on their top 5 competitors — "
            "pricing updates, new features, job listings signalling product direction, "
            "content shifts, and social activity. Currently they do this manually in a "
            "spreadsheet or don't do it at all. Crayon and Klue serve enterprise at "
            "$500-2000/mo, leaving the sub-$100 segment completely unserved."
        ),
        "success_metric": "15 paying users at £32/mo within 30 days of launch",
        "owner_agent": "ceo",
        "status": "proposed",
        "effort_score": 4,
        "revenue_score": 9,
    },
    {
        "title": "AI Process Doc Builder",
        "hypothesis": (
            "Operations leads and team managers at companies of 5-30 people pay £40/month "
            "for AI that converts their Loom recordings, Slack threads, and voice notes into "
            "polished, structured SOPs and process documents in under 5 minutes. Currently "
            "writing a process doc takes 2-3 hours per document. Scribe.how covers "
            "UI walkthroughs but nobody converts mixed-media input (voice + text + video "
            "transcripts) into structured process documentation. High stickiness: stored "
            "docs create switching cost."
        ),
        "success_metric": "10 paying users at £40/mo within 30 days of launch",
        "owner_agent": "ceo",
        "status": "proposed",
        "effort_score": 6,
        "revenue_score": 8,
    },
    {
        "title": "AI Async Standup Digest",
        "hypothesis": (
            "Remote and hybrid teams of 5-25 people pay £25/month for AI that reads "
            "their daily async standup messages from Slack (or email/form), automatically "
            "identifies blockers and dependencies, and emails the team lead a structured "
            "60-second summary each morning. Geekbot ($2.50/user/mo) and DailyBot collect "
            "standups but provide no AI summarisation or blocker detection. The unmet need "
            "is the synthesis layer: turning 10 individual standup messages into one "
            "actionable team brief."
        ),
        "success_metric": "10 paying teams at £25/mo within 30 days of launch",
        "owner_agent": "ceo",
        "status": "proposed",
        "effort_score": 5,
        "revenue_score": 7,
    },
]


# ---------------------------------------------------------------------------
# Sample artifacts — give the Work Product page real content from day 1
# These are high-quality enough to guide agents, not just placeholder text.
# ---------------------------------------------------------------------------

SAMPLE_ARTIFACTS = [
    {
        "agent_name": "ceo",
        "artifact_type": "plan",
        "title": "Day 1 directive — experiment prioritisation",
        "content": (
            "# ATLAS — Day 1 decision log\n\n"
            "## Experiment priority ranking\n"
            "Based on effort × revenue scoring and distribution clarity:\n\n"
            "1. **AI Competitor Radar** (effort 4/10, revenue 9/10) — ACTIVATE NOW\n"
            "   - Crayon/Klue serve enterprise at $500-2000/mo. Zero sub-$100 players.\n"
            "   - Distribution is pull: founders are already talking about this pain on X/LinkedIn.\n"
            "   - Build is straightforward: scrape → diff → LLM summarise → email.\n"
            "   - First paying user achievable in 14 days if we start outreach today.\n\n"
            "2. **AI Process Doc Builder** (effort 6/10, revenue 8/10) — HOLD\n"
            "   - Strong idea, but 6-week build. Activate only after Competitor Radar hits PMF or kills.\n\n"
            "3. **AI Async Standup Digest** (effort 5/10, revenue 7/10) — HOLD\n"
            "   - Slack API + AI is doable. Revenue signal is weaker (Geekbot already at low price).\n"
            "   - Revisit if Competitor Radar fails.\n\n"
            "## Cascade\n"
            "- VP Product: score all 3 experiments this tick\n"
            "- VP GTM: draft Competitor Radar GTM plan today\n"
            "- Research: competitive analysis on monitoring tools market\n"
            "- Product Manager: first PRD draft by day 3\n\n"
            "## Kill condition\n"
            "If Competitor Radar has zero paying users by day 21, kill and activate Process Doc Builder."
        ),
        "metadata": {"experiment": "AI Competitor Radar", "day": 1},
    },
    {
        "agent_name": "research",
        "artifact_type": "research",
        "title": "Competitor monitoring tools — market gap analysis",
        "content": (
            "# Research: Competitor Monitoring Market — Sub-$100 Gap\n\n"
            "## Question\n"
            "Is there a real gap in the competitor monitoring market for solo founders / small "
            "startups at $29-49/mo? Who is solving this and how well?\n\n"
            "## Findings\n\n"
            "**Enterprise-only players (not our competition):**\n"
            "- Crayon: $500-2,000/mo, sales-led, requires contract. Target: 100-person+ companies.\n"
            "- Klue: similar pricing, similar target. Strong product but wrong ICP for us.\n"
            "- Kompyte: acquired by Semrush. Now a Semrush add-on. Not standalone anymore.\n\n"
            "**Prosumer / self-serve tools (closest to our space):**\n"
            "- Visualping: $12-40/mo, detects web page changes, NO AI summarisation, NO context.\n"
            "- Mention.com: $49-99/mo, monitors brand mentions, not structured competitor changes.\n"
            "- Google Alerts: free, too noisy, no differentiation between signal and noise.\n\n"
            "**The gap:**\n"
            "Nobody is offering: automated weekly 'what changed and why it matters' digest "
            "for a founder's top 5 competitors, priced at $29-49/mo, with AI context that "
            "says 'their pricing changed — they're targeting enterprise now' not just 'page changed'.\n\n"
            "## Signals from ICP\n"
            "- r/SaaS + r/UKEntrepreneurs thread (2024): 'How do you keep up with competitors?' — 73 comments, top answer: 'manually each week, it's brutal'\n"
            "- IndieHackers UK poll: 68% of solo founders say they track competitors 'inconsistently or not at all'\n"
            "- Common X complaint pattern: 'Found out my competitor shipped X feature 3 months ago. I'm still responding.'\n\n"
            "## Recommendation\n"
            "**Activate AI Competitor Radar immediately.** The gap is real, validated, and uncontested "
            "at our price point. Distribution angle: cold DM founders who have tweeted about competitor "
            "tracking. Offer: 'Track 1 competitor free for 7 days, then £32/mo for 5 competitors.'\n\n"
            "## Confidence\n"
            "8/10 — strong signal from community research. Recommend 10 ICP conversations to validate "
            "willingness to pay before full build."
        ),
        "metadata": {"experiment": "AI Competitor Radar", "signal_strength": 8},
    },
    {
        "agent_name": "vp_product",
        "artifact_type": "report",
        "title": "Experiment scoring — Day 1",
        "content": (
            "# Experiment Scoring\n\n"
            "Scoring criteria: Effort (1=easy, 10=months) × Revenue (1=weak, 10=strong signal)\n\n"
            "| Experiment | Effort | Revenue | Verdict |\n"
            "|---|---|---|---|\n"
            "| AI Competitor Radar | 4 | 9 | **ACTIVATE** |\n"
            "| AI Process Doc Builder | 6 | 8 | Hold — activate if Radar fails week 3 |\n"
            "| AI Async Standup Digest | 5 | 7 | Hold — weakest revenue signal |\n\n"
            "## Competitor Radar — activation notes\n"
            "- Core loop: crawl → diff → LLM summarise → weekly email\n"
            "- MVP scope (week 1-2): track 5 URLs for a user, diff content weekly, "
            "Claude generates a 'what changed + why it matters' paragraph per competitor\n"
            "- Out of scope for MVP: Slack integration, job listing tracking, social monitoring\n"
            "- PRD requested from Product Manager. Should be ready by day 3.\n\n"
            "## Roadmap update\n"
            "Now: Competitor Radar validation (14 days to first paying user)\n"
            "Next: Process Doc Builder (activate at week 3 if needed)\n"
            "Later: Standup Digest (if market expands beyond Geekbot users)"
        ),
        "metadata": {"period": "day-1", "method": "effort-revenue-matrix"},
    },
    {
        "agent_name": "vp_gtm",
        "artifact_type": "plan",
        "title": "GTM plan — AI Competitor Radar",
        "content": (
            "# GTM Plan: AI Competitor Radar\n\n"
            "## Positioning\n"
            "For solo founders and small startups who manually track competitors: "
            "ATLAS Radar sends you a weekly email showing exactly what changed on your "
            "top 5 competitors — pricing, features, job listings, content — so you never "
            "fall behind again. £32/mo. Cancel anytime.\n\n"
            "## Channels (priority order)\n\n"
            "**Channel 1: Cold DM on X / LinkedIn (days 1-7)**\n"
            "- Search: 'competitor tracking' OR 'competitive analysis' on X, last 30 days\n"
            "- Target: founders with 500-50k followers who are building in public\n"
            "- Message: 'Saw you mentioned competitor tracking — we built a tool that automates "
            "the weekly check. Want a free 7-day trial for 1 competitor?'\n"
            "- Goal: 20 DMs → 5 trials → 2 paying users by day 7\n\n"
            "**Channel 2: IndieHackers UK post (day 5)**\n"
            "- Title: 'How I automated my competitor tracking in 10 minutes (and what I found)'\n"
            "- Content: walk through the product, show real output example, link to trial\n"
            "- Goal: 500 views → 50 clicks → 10 trials → 3 paying users\n\n"
            "**Channel 3: r/SaaS + r/UKEntrepreneurs post (day 7)**\n"
            "- Ask 'How do you track competitors right now?' — engage, then mention the product\n\n"
            "## Offer\n"
            "Free trial: track 1 competitor for 7 days, receive 1 weekly digest.\n"
            "Paid: £32/mo for up to 5 competitors, weekly digest, email alerts for major changes.\n\n"
            "## Early indicators (first 14 days)\n"
            "- Trial signups: target 20\n"
            "- Trial → paid conversion: target 15%\n"
            "- First paying user: target day 10\n\n"
            "## Kill signal\n"
            "If <3 trial signups by day 7: rewrite the positioning. "
            "If 10+ trials but <1 paid by day 14: pricing or onboarding problem."
        ),
        "metadata": {"experiment": "AI Competitor Radar", "channel_count": 3},
    },
    {
        "agent_name": "product_manager",
        "artifact_type": "prd",
        "title": "PRD: AI Competitor Radar — MVP",
        "content": (
            "# PRD: AI Competitor Radar — MVP\n\n"
            "## Problem\n"
            "Solo founders and small startup teams manually track 3-5 competitors each week. "
            "This takes 2-4 hours: checking pricing pages, blogs, job listings, changelog. "
            "Most founders fall behind and discover competitor moves 4-12 weeks late.\n\n"
            "## Target user\n"
            "James, 34, solo founder of a B2B SaaS tool with 3 direct competitors he watches. "
            "He checks them manually every Sunday, sometimes forgets, and has been surprised "
            "twice by pricing changes he missed.\n\n"
            "## Core user story\n"
            "As a solo founder, I want to receive a weekly email on Monday morning that tells "
            "me exactly what changed on my top 5 competitor websites last week and what it "
            "might mean, so I can stay informed without spending 3 hours doing it manually.\n\n"
            "## MVP scope (IN)\n"
            "- Onboarding: enter up to 5 competitor URLs\n"
            "- Weekly crawl: diff page content vs prior week snapshot\n"
            "- AI summary: Claude generates 1-paragraph 'what changed + implication' per competitor\n"
            "- Delivery: weekly email digest every Monday 8am (user's timezone)\n"
            "- Settings: add/remove URLs, change delivery day/time\n\n"
            "## MVP scope (OUT)\n"
            "- Slack/Notion integration (v2)\n"
            "- Job listing monitoring (v2)\n"
            "- Social media tracking (v3)\n"
            "- Real-time alerts (v2)\n"
            "- Team/multi-seat (post-PMF)\n\n"
            "## Acceptance criteria\n"
            "- [ ] User can sign up and enter 5 URLs in <3 minutes\n"
            "- [ ] System crawls all URLs within 24h of signup\n"
            "- [ ] Weekly digest email arrives Monday 8am ±30 min (user TZ)\n"
            "- [ ] Each competitor section: URL, what changed (bullet list), 1 AI paragraph on implications\n"
            "- [ ] If nothing changed for a competitor, section says 'No significant changes this week'\n"
            "- [ ] Email has one-click unsubscribe\n"
            "- [ ] Stripe payment flow: 7-day free trial → £32/mo\n\n"
            "## Technical notes\n"
            "- Crawler: httpx + BeautifulSoup, store snapshots in Supabase\n"
            "- Diffing: text diff on cleaned HTML (strip nav/header/footer)\n"
            "- AI: Claude Haiku for summaries (cost-effective, sufficient quality)\n"
            "- Email: Resend API (free tier: 100 emails/day)\n"
            "- Payments: Stripe Checkout + webhook to activate subscription\n\n"
            "## Success metric\n"
            "15 paying users at £32/mo within 30 days of launch."
        ),
        "metadata": {"experiment": "AI Competitor Radar", "status": "draft", "version": 1},
    },
    {
        "agent_name": "vp_engineering",
        "artifact_type": "spec",
        "title": "Engineering tickets — AI Competitor Radar MVP",
        "content": (
            "# Ticket breakdown: AI Competitor Radar\n\n"
            "**FE-01** (developer_frontend, priority 2): Onboarding flow\n"
            "  - Page: /onboarding — enter 1-5 competitor URLs + email + timezone\n"
            "  - Validate URLs (http/https, resolvable)\n"
            "  - On submit: POST /api/monitors → redirect to /dashboard\n\n"
            "**FE-02** (developer_frontend, priority 3): Dashboard\n"
            "  - List active monitors with last-checked date and 'change detected' badge\n"
            "  - Show last digest preview for each monitor\n"
            "  - Settings: add/remove URL, change delivery schedule\n\n"
            "**BE-01** (developer_backend, priority 1): Crawler + snapshot store\n"
            "  - POST /api/monitors → save URL + user_id to monitors table\n"
            "  - Crawler job: fetch URL, extract main content (strip nav/ads), store snapshot\n"
            "  - Run on signup (immediate) + weekly cron\n\n"
            "**BE-02** (developer_backend, priority 1): Diff + AI summary engine\n"
            "  - Compare current snapshot vs previous, extract meaningful diffs\n"
            "  - Claude Haiku call: 'Here is what changed on [url] this week: [diff]. "
            "In 1 paragraph, explain what this might mean for a competitor of theirs.'\n"
            "  - Store summary in digest_items table\n\n"
            "**BE-03** (developer_backend, priority 2): Weekly digest email\n"
            "  - Assemble digest from all monitors for a user\n"
            "  - Render HTML email template with sections per competitor\n"
            "  - Send via Resend API\n"
            "  - Cron: Monday 8am per user timezone\n\n"
            "**BE-04** (developer_backend, priority 2): Stripe integration\n"
            "  - Stripe Checkout session for £32/mo subscription\n"
            "  - Webhook: activate/deactivate user on subscription events\n"
            "  - 7-day trial logic: start crawling immediately, gate email delivery on paid status after day 7\n\n"
            "**Sprint goal:** BE-01 + BE-02 + FE-01 by day 5. BE-03 + BE-04 + FE-02 by day 10. "
            "First paying user target: day 14."
        ),
        "metadata": {"experiment": "AI Competitor Radar", "tickets": 6, "sprint_days": 10},
    },
    {
        "agent_name": "marketing",
        "artifact_type": "content",
        "title": "Landing page copy — AI Competitor Radar",
        "content": (
            "# Headline\n"
            "Stop finding out about competitor moves 3 months late.\n\n"
            "# Subheadline\n"
            "ATLAS Radar monitors your top 5 competitors every week and emails you a clear, "
            "AI-generated brief of exactly what changed — pricing, features, messaging, job listings. "
            "Takes 2 minutes to set up. Replaces 3 hours of manual research.\n\n"
            "# How it works\n"
            "1. Enter up to 5 competitor URLs (takes 90 seconds)\n"
            "2. We crawl them every week and detect changes\n"
            "3. Every Monday morning, you get a plain-English brief: what changed and what it means\n\n"
            "# Pricing\n"
            "7-day free trial. Then £32/month. Cancel anytime.\n"
            "Track 5 competitors. Weekly digest. No setup fees.\n\n"
            "# CTA\n"
            "Start free — track your first competitor today →\n\n"
            "# Objection handling\n"
            "Q: 'I already use Google Alerts.'\n"
            "A: Google Alerts tells you when someone mentions your competitor. "
            "We tell you when their pricing page changes, they add a new feature, or "
            "they start hiring for a role that signals a new product direction.\n\n"
            "Q: 'I can just check manually.'\n"
            "A: You said that last month. Did you check? We did. Your competitor lowered prices by 20%.\n\n"
            "# Social proof placeholder\n"
            "'I found out my biggest competitor added a feature I was planning — saved me 3 months of build.'\n"
            "— [First beta user name, placeholder]"
        ),
        "metadata": {"channel": "landing", "version": 1, "experiment": "AI Competitor Radar"},
    },
    {
        "agent_name": "sales",
        "artifact_type": "content",
        "title": "Cold DM sequence — founders on X/LinkedIn",
        "content": (
            "# Cold DM sequence: AI Competitor Radar — ICP: founders on X/LinkedIn\n\n"
            "## Targeting criteria\n"
            "- Posted about 'competitor tracking', 'competitive analysis', or 'keeping up with competitors' in last 60 days\n"
            "- Building in public, 500-50k followers\n"
            "- Founder or co-founder title\n\n"
            "## Message 1 (connection / opener)\n"
            "Subject: Quick question about competitor tracking\n\n"
            "Hey {first_name}, saw your post about {specific_competitor_mention}. "
            "Curious — how do you currently keep tabs on what competitors are shipping? "
            "Manual checks, Google Alerts, something else?\n\n"
            "---\n\n"
            "## Message 2 (if they respond / alternative cold pitch)\n"
            "Following up — we built a tool that automates this. It crawls your top 5 "
            "competitor sites weekly and sends you a plain-English brief of what changed "
            "(pricing, features, messaging). No noise — just signal.\n\n"
            "Would it be useful to track {their_competitor} for free for 7 days? "
            "Takes 2 minutes to set up.\n\n"
            "---\n\n"
            "## Message 3 (if no response after 4 days)\n"
            "One more attempt — here's an example of the brief we generated for {example_company}: "
            "[link to sample digest]. If useful, grab a free trial at [url]. "
            "If not, no worries — appreciate your time.\n\n"
            "---\n\n"
            "## Rules\n"
            "- Always reference something specific they said or posted\n"
            "- Never send message 2 without a reply to message 1 (unless using alternative cold pitch)\n"
            "- All outreach must be approved before sending (request_approval action_type=EMAIL)"
        ),
        "metadata": {"sequence": "x_linkedin_cold_dm", "experiment": "AI Competitor Radar"},
    },
    {
        "agent_name": "finance",
        "artifact_type": "report",
        "title": "Unit economics model — AI Competitor Radar",
        "content": (
            "# Unit Economics: AI Competitor Radar\n\n"
            "## Revenue model\n"
            "Price: £32/mo. 7-day free trial.\n"
            "Target: 15 paying users in 30 days = $585 MRR.\n\n"
            "## COGS per user\n"
            "- Crawling: ~50 pages/week × 5 competitors = 250 requests. "
            "At Playwright/httpx scale: negligible ($0.01/user/mo)\n"
            "- AI summaries: 5 competitors × 1 Claude Haiku call × 4 weeks = 20 calls/mo. "
            "At ~500 tokens per call: 10K tokens/mo/user × $0.80/MTok = $0.008/mo per user\n"
            "- Email delivery (Resend): 4 emails/mo. Free tier covers 100 emails/day. $0/mo until >750 users.\n"
            "- Hosting (Render free): $0 until >$5 credit threshold\n"
            "**Total COGS per user: <$0.05/mo**\n\n"
            "## Gross margin\n"
            "£32/mo revenue - $0.05 COGS = **99.9% gross margin**\n\n"
            "## Path to $10k MRR\n"
            "Scenario A: 256 users at £32/mo = $9,984 MRR\n"
            "Scenario B: 3 products × 85 users each at £32/mo avg = $9,945 MRR\n\n"
            "## Payback period\n"
            "CAC target: <$40 (1 month payback at £32/mo)\n"
            "If cold DM converts at 5%: 20 DMs per paying user = ~2h of sales effort → free for now\n\n"
            "## Risk\n"
            "Main risk: churn if weekly digest quality is low. "
            "Mitigation: Claude Haiku summaries + human-edited template for first 10 users."
        ),
        "metadata": {"experiment": "AI Competitor Radar", "model": "unit-economics"},
    },
    {
        "agent_name": "analytics",
        "artifact_type": "report",
        "title": "Funnel instrumentation plan — day 1",
        "content": (
            "# Funnel instrumentation plan\n\n"
            "## Events to track (in order of priority)\n\n"
            "**Acquisition:**\n"
            "- `landing_visit` — source, medium, utm_campaign\n"
            "- `cta_click` — which CTA, position on page\n"
            "- `signup_started` — email entered\n\n"
            "**Activation:**\n"
            "- `onboarding_complete` — n_competitors_added, time_to_complete\n"
            "- `first_crawl_done` — time since signup\n"
            "- `first_digest_sent` — competitors_tracked\n"
            "- `first_digest_opened` — open rate\n\n"
            "**Revenue:**\n"
            "- `trial_started` — source\n"
            "- `checkout_started` — days_since_signup\n"
            "- `subscription_activated` — plan, amount\n"
            "- `subscription_cancelled` — reason_survey, days_active\n\n"
            "## Week 1 baselines (pre-launch, all zeroes)\n"
            "- landing_visit: 0\n"
            "- signup_started: 0\n"
            "- first_digest_sent: 0\n"
            "- paying_users: 0\n\n"
            "## Alert conditions\n"
            "- If trial→paid < 10% after 20 trials: pricing or onboarding issue — alert CEO\n"
            "- If digest_opened < 40%: subject line or content quality issue — alert marketing\n"
            "- If churn > 15%/month in first 90 days: product-market fit issue — alert CEO + VP Product"
        ),
        "metadata": {"period": "day-1", "experiment": "AI Competitor Radar"},
    },
    {
        "agent_name": "support",
        "artifact_type": "content",
        "title": "Onboarding + FAQ — AI Competitor Radar beta",
        "content": (
            "# Welcome to ATLAS Radar — beta\n\n"
            "Thanks for joining. Here's what happens next:\n\n"
            "1. **Right now:** We're crawling your competitors for the first time. "
            "This takes up to 2 hours.\n"
            "2. **First digest:** You'll get your first brief on the next Monday. "
            "If you signed up on a Monday after 8am, your first digest is next Monday.\n"
            "3. **Questions?** Reply to this email. A human reads every reply.\n\n"
            "---\n\n"
            "# FAQ\n\n"
            "**Q: What counts as a 'change'?**\n"
            "We look for meaningful changes: pricing updates, new feature announcements, "
            "case studies, major copy rewrites. We ignore minor navigation tweaks.\n\n"
            "**Q: Can I add a competitor mid-week?**\n"
            "Yes — go to your dashboard and add any time. It'll be included in the next Monday digest.\n\n"
            "**Q: What if a site blocks crawling?**\n"
            "We'll tell you. Some sites block automated access — we'll list them as 'unable to access' "
            "in your digest and suggest alternatives.\n\n"
            "**Q: Can I see the raw changes, not just the AI summary?**\n"
            "In your digest email, click 'View full diff' next to any competitor to see "
            "the exact text that changed."
        ),
        "metadata": {"flow": "beta-onboarding", "experiment": "AI Competitor Radar"},
    },
]


# ---------------------------------------------------------------------------
# Seed writers (idempotent)
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
            db().table("knowledge_base").update(
                {"content": entry["content"], "tags": entry.get("tags", [])}
            ).eq("title", entry["title"]).execute()
        else:
            db().table("knowledge_base").insert(entry).execute()
    log.info("seeded %d knowledge entries", len(COMPANY_KNOWLEDGE))


def seed_memory() -> None:
    for row in SHARED_MEMORY:
        db().table("shared_memory").upsert(row, on_conflict="key").execute()
    log.info("seeded %d memory keys", len(SHARED_MEMORY))


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
        if not existing:
            db().table("experiment_log").insert(exp).execute()
    log.info("seeded %d experiments", len(EXPERIMENTS))


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
        if not existing:
            db().table("work_artifacts").insert(art).execute()
            count += 1
    log.info("seeded %d artifacts", count)


def main() -> int:
    seed_agents()
    seed_knowledge()
    seed_memory()
    seed_experiments()
    seed_artifacts()
    log.info("seed complete — run `python budget.py` to apply production spending caps")
    return 0


if __name__ == "__main__":
    sys.exit(main())
