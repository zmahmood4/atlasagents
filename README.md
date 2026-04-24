# ATLAS — Autonomous AI Company

A production-ready multi-agent platform where **13 Claude-powered agents** collaborate to build and grow a micro-SaaS business. You are the silent owner — agents pause for you only when they genuinely need a human decision (external publish, email send, deploy, money spend, pivot).

All agent work streams live into a Next.js dashboard over Supabase Realtime.

---

## Stack

- **Backend** — Python 3.11 + FastAPI + APScheduler, deployed on Railway
- **Agents** — Anthropic `claude-sonnet-4-6` (all 13 agents, no exceptions)
- **Database** — Supabase (Postgres + Realtime + Auth)
- **Frontend** — Next.js 14 App Router + TypeScript + Tailwind + Framer Motion + Recharts + Shiki, deployed on Vercel
- **Search** — Brave Search API (optional, degrades gracefully)
- **Cost** — ~$0/month on free tiers until scale

---

## 13-agent org (Part 2)

**Command:** `ceo`

**VP layer:** `vp_product` · `vp_engineering` · `vp_gtm`

**ICs:** `product_manager` · `developer_frontend` · `developer_backend` · `marketing` · `sales`

**Always-on:** `support` (every 5 min) · `finance` (every 6 h) · `research` (every 4 h) · `analytics` (every 6 h)

Each agent has an opinionated system prompt, its own token caps, its own schedule, and a gated tool set (search for CEO/vp_product/marketing/sales/research; experiments for CEO/vp_product; metrics for CEO/analytics/finance; dev tickets for engineering).

---

## Quick start — local

### 0. Prereqs
- Python 3.11, Node 18+
- A free Supabase project
- An Anthropic API key
- (Optional) Brave Search API key

### 1. Supabase
Open `supabase/migrations/001_initial.sql` in the Supabase SQL editor and run it. This creates every table, index, RLS policy, and the realtime publication.

### 2. Backend
```bash
cd backend
python -m venv ../venv && source ../venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # fill keys
python seed.py                  # seeds 13 agents, 3 experiments, KB, sample artifacts
uvicorn main:app --reload       # API + scheduler on :8000
```

### 3. Tests
```bash
cd backend
pytest -q                       # 35 tests — all pass
```

### 4. Frontend
```bash
cd frontend
cp .env.example .env.local      # fill keys
npm install
npm run dev                     # http://localhost:3000
```

Open the dashboard, go to **Settings → Controls**, paste your `DASHBOARD_API_KEY` once (stored in `localStorage`).

---

## Deploy

- **Backend** — `backend/Dockerfile` + `backend/railway.toml`; Railway picks them up automatically.
- **Frontend** — `frontend/vercel.json`; `vercel --prod`.
- **DB** — Supabase free tier is enough for this build.

Env vars: mirror `backend/.env.example` in Railway and `frontend/.env.example` in Vercel.

---

## API surface (Part 9)

```
GET  /api/health                     (no auth)
GET  /api/agents                     list
GET  /api/agents/{id}                detail + last 20 actions
PUT  /api/agents/{id}                update config
POST /api/agents/{id}/trigger        manual tick (10/min)

GET  /api/actions                    paginated feed
GET  /api/actions/stream             SSE

GET  /api/approvals?status=pending   urgency-sorted
POST /api/approvals/{id}/approve     (30/min)
POST /api/approvals/{id}/reject      (30/min)
POST /api/approvals/{id}/redirect    {note}

GET  /api/experiments
POST /api/experiments                owner-initiated
PUT  /api/experiments/{id}

GET  /api/artifacts
GET  /api/artifacts/{id}

GET  /api/metrics
GET  /api/metrics/summary

GET  /api/knowledge
POST /api/knowledge
PUT  /api/knowledge/{id}

GET  /api/settings
PUT  /api/settings/global
POST /api/settings/pause-all
POST /api/settings/resume-all
POST /api/settings/reset-caps
```

All write routes require `X-API-Key: $DASHBOARD_API_KEY`. Rate limits: `approvals/*` 30/min, `agents/*/trigger` 10/min, everything else 60/min.

---

## Pages (Part 10)

- **`/`** — Company Feed (realtime activity stream, dept/agent/type/importance filters, coloured dept avatars, importance borders, Framer Motion stagger-in)
- **`/agents`** — Agent Board (grouped by dept, pulsing ACTIVE dots, click → slide-over with system prompt + recent actions + artifacts + **Run Now** with 60s cooldown)
- **`/work`** — Work Product (two panel, filter by agent/type/date/search, Shiki-highlighted code, Copy + Download)
- **`/experiments`** — Kanban 4-col PROPOSED | ACTIVE | MEASURING | CLOSED, with effort/revenue score bars and WINNER/KILLED outcome badges, Framer Motion transitions, owner-create via button
- **`/financials`** — MRR, Spend today (count-up), Spend this month, Tokens today, Active experiments; **Recharts dual-line** Revenue vs AI Costs; per-agent spend bars; cost projection card
- **`/approvals`** — urgency-sorted (critical → low), Pending / Resolved tabs, Approve / Reject / Redirect-with-note, empty state "Your team is running independently — nothing needs your attention."
- **`/knowledge`** — 7 categories + All, search, add-entry, two-panel viewer
- **`/settings`** — Agents / Business / Controls tabs. Business tab edits the 5 spec fields (Company name, Company description, ICP, Current product focus, Revenue model). Controls has **PAUSE ALL AGENTS** with confirm dialog + Resume All + Reset all daily caps + masked API key reveal.

---

## Security (Part 5)

- `X-API-Key` header on all write routes, verified with `hmac.compare_digest`
- Per-route SlowAPI limits (30/60/10 per minute)
- 429s include `Retry-After: 60`
- CORS locked to `NEXT_PUBLIC_FRONTEND_URL` + localhost
- 1 MB request body cap
- Global exception handler returns consistent JSON; never surfaces stack traces
- Per-agent daily + monthly token caps enforced **before** the Claude call
- Paused-on-cap agents unpause at midnight UTC via scheduled cron (`cap_reset_daily`, `cap_reset_monthly`)
- Supabase service-role for backend writes; RLS locks down everything for anon; authenticated dashboard users get read/write via auth role

---

## Agent loop (Part 6)

`backend/agents/base.py::run()` is a pure-async Claude tool-use loop:
1. Check enabled + daily/monthly cap → set `status='active'`.
2. Create `agent_runs` row.
3. Load context: last 20 `shared_memory`, pending `task_bus` items, last 10 `agent_actions`.
4. Call `claude-sonnet-4-6` with `max_tokens=4096` and the agent's gated tool set.
5. On 429 → 60 s sleep + retry, up to 3 times.
6. Dispatch each `tool_use` to the async handler; log every call to `agent_actions`.
7. Persist tokens + cost to `agents`; finalise `agent_runs`; status → `idle`.

On unhandled error → `status='error'`, run marked `failed`, traceback logged server-side only.

---

## Repo layout

```
.
├── supabase/migrations/001_initial.sql
├── backend/
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── security.py
│   ├── scheduler.py
│   ├── seed.py
│   ├── agents/
│   │   ├── base.py
│   │   ├── ceo.py / vp_product.py / vp_engineering.py / vp_gtm.py
│   │   ├── product_manager.py
│   │   ├── developer_frontend.py / developer_backend.py
│   │   ├── marketing.py / sales.py
│   │   └── support.py / finance.py / research.py / analytics.py
│   ├── tools/
│   │   ├── memory_tools.py / task_tools.py / decision_tools.py
│   │   ├── artifact_tools.py / search_tools.py
│   │   ├── metrics_tools.py / experiment_tools.py
│   │   └── registry.py
│   ├── routers/
│   │   ├── health.py / agents.py / actions.py / artifacts.py
│   │   ├── approvals.py / experiments.py / knowledge.py
│   │   ├── metrics.py / settings.py
│   └── tests/
│       ├── conftest.py
│       └── test_security.py / test_agents.py / test_tools.py / test_api.py
└── frontend/
    ├── app/                     (8 pages)
    ├── components/              (layout, agents, feed, work, experiments, approvals, financials, knowledge, ui)
    ├── hooks/                   (useAgents, useFeed, useApprovals, useArtifacts, useMetrics)
    └── lib/                     (api.ts, supabase.ts, types.ts, utils.ts)
```

---

## Extending

- **Add an agent:** drop `backend/agents/<name>.py`, export `AGENT = AgentDefinition(...)`, add to `backend/agents/__init__.py`'s `ALL_AGENTS`. Scheduler picks it up on next restart.
- **Add a tool:** create `backend/tools/<name>_tools.py` with `TOOLS` + `HANDLERS`, register in `tools/registry.py` (including per-agent gating if the tool is specialist).
- **Add a page:** `frontend/app/<path>/page.tsx` + an entry in `components/layout/Sidebar.tsx`.

---

## Verified

- Backend: **35/35 tests pass** (`pytest -q`)
- Frontend: **TypeScript clean** (`tsc --noEmit`)
- Frontend: **production build succeeds** (`npm run build`)
