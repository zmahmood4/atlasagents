Build a complete, production-ready autonomous entrepreneurial AI company system. This is a fully working multi-agent platform where AI agents collaborate to build and grow a business. I am the silent owner. My input is minimal. Agents pause and wait for me only when genuinely required.

This must be tested, secure, rate-limited, and deployable for free or near-free. Every agent uses claude-sonnet-4-6. All agent work is stored and browsable from my dashboard.

═══════════════════════════════════════════════════════════
PART 1: ARCHITECTURE OVERVIEW
═══════════════════════════════════════════════════════════

TECH STACK (free-tier first):
- Backend: Python 3.11, FastAPI
- Database: Supabase free tier (Postgres + pgvector + Realtime + Auth)
- Frontend: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion
- AI: Anthropic Python SDK, claude-sonnet-4-6 for ALL agents
- Search: Brave Search API free tier (2000 calls/month free)
- Scheduler: APScheduler (in-process, no Redis needed)
- Hosting: Railway free tier (backend) + Vercel free tier (frontend)
- Auth: Supabase Auth (owner login to dashboard)

COST ESTIMATE:
- Supabase: free (500MB DB, 2GB bandwidth)
- Railway: free ($5 credit/month, enough for light workloads)
- Vercel: free
- Anthropic: pay-per-use, ~$0.003 per 1K input tokens on Sonnet
- Total infrastructure: $0/month until scale

═══════════════════════════════════════════════════════════
PART 2: AGENT ORG STRUCTURE (13 agents, all Sonnet)
═══════════════════════════════════════════════════════════

COMMAND:
- CEO Agent — strategy, entrepreneurial loop, arbitration, escalation

VP LAYER:
- VP of Product — idea scoring, roadmap ownership, manages PM
- VP of Engineering — task splitting, ticket assignment, unblocking devs
- VP of GTM (Go-To-Market) — marketing, sales, growth strategy

IC AGENTS:
- Product Manager — PRDs, user stories, acceptance criteria
- Developer 1 (Frontend) — UI features, takes tickets from VP Eng
- Developer 2 (Backend) — APIs, logic, takes tickets from VP Eng
- Marketing Agent — content, SEO, social copy
- Sales Agent — lead research, outreach drafts, CRM

ALWAYS-ON:
- Support Agent — tickets, FAQs, help docs (runs every 5 min)
- Finance Agent — P&L, burn rate, anomaly detection
- Research Agent — competitor intel, market trends
- Analytics Agent — metrics, weekly reports

═══════════════════════════════════════════════════════════
PART 3: DATABASE SCHEMA (Supabase)
═══════════════════════════════════════════════════════════

Create a complete SQL migration file: supabase/migrations/001_initial.sql

Tables:

agents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  department text not null,
  status text default 'idle',
  current_task text,
  system_prompt text not null,
  schedule_seconds integer not null,
  daily_token_cap integer default 50000,
  monthly_token_cap integer default 500000,
  tokens_used_today integer default 0,
  tokens_used_month integer default 0,
  cost_usd_today numeric(10,4) default 0,
  cost_usd_month numeric(10,4) default 0,
  last_run_at timestamptz,
  enabled boolean default true,
  created_at timestamptz default now()
)

agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references agents(id),
  agent_name text not null,
  started_at timestamptz default now(),
  completed_at timestamptz,
  status text,
  input_tokens integer default 0,
  output_tokens integer default 0,
  cost_usd numeric(10,6) default 0,
  actions_taken jsonb default '[]',
  summary text,
  error text
)

agent_actions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references agents(id),
  agent_name text not null,
  run_id uuid references agent_runs(id),
  action_type text not null,
  tool_name text,
  tool_input jsonb,
  tool_output jsonb,
  summary text not null,
  importance text default 'normal',
  created_at timestamptz default now()
)

task_bus (
  id uuid primary key default gen_random_uuid(),
  from_agent text not null,
  to_agent text not null,
  task_type text not null,
  payload jsonb not null,
  priority integer default 5,
  status text default 'pending',
  result jsonb,
  created_at timestamptz default now(),
  claimed_at timestamptz,
  completed_at timestamptz
)

shared_memory (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null,
  category text not null,
  written_by text not null,
  summary text,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
)

experiment_log (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  hypothesis text not null,
  success_metric text not null,
  owner_agent text not null,
  status text default 'proposed',
  effort_score integer,
  revenue_score integer,
  result text,
  learnings text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)

pending_approvals (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references agents(id),
  agent_name text not null,
  action_type text not null,
  title text not null,
  description text not null,
  reasoning text not null,
  payload jsonb,
  urgency text default 'normal',
  status text default 'pending',
  owner_note text,
  created_at timestamptz default now(),
  resolved_at timestamptz
)

business_metrics (
  id uuid primary key default gen_random_uuid(),
  metric_name text not null,
  metric_value numeric not null,
  metric_unit text,
  period_date date not null,
  written_by text not null,
  created_at timestamptz default now()
)

knowledge_base (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  title text not null,
  content text not null,
  written_by text not null,
  tags text[],
  updated_at timestamptz default now(),
  created_at timestamptz default now()
)

work_artifacts (
  id uuid primary key default gen_random_uuid(),
  agent_name text not null,
  artifact_type text not null,
  title text not null,
  content text not null,
  metadata jsonb default '{}',
  experiment_id uuid references experiment_log(id),
  created_at timestamptz default now()
)

api_rate_limits (
  id uuid primary key default gen_random_uuid(),
  identifier text not null,
  endpoint text not null,
  requests_count integer default 0,
  window_start timestamptz default now(),
  created_at timestamptz default now(),
  unique(identifier, endpoint)
)

Enable Row Level Security on all tables. Create policies so only authenticated users (the owner) can read/write via the dashboard API. The agent backend uses the service_role key and bypasses RLS.

Create indexes on:
- agent_actions(agent_name, created_at desc)
- agent_actions(created_at desc)
- task_bus(to_agent, status)
- shared_memory(category)
- pending_approvals(status)
- business_metrics(metric_name, period_date)
- work_artifacts(agent_name, artifact_type)

═══════════════════════════════════════════════════════════
PART 4: BACKEND PROJECT STRUCTURE
═══════════════════════════════════════════════════════════

backend/
  main.py
  config.py
  security.py
  database.py
  scheduler.py
  agents/
    base.py
    ceo.py
    vp_product.py
    vp_engineering.py
    vp_gtm.py
    product_manager.py
    developer_frontend.py
    developer_backend.py
    marketing.py
    sales.py
    support.py
    finance.py
    research.py
    analytics.py
  tools/
    __init__.py
    memory_tools.py
    task_tools.py
    decision_tools.py
    artifact_tools.py
    search_tools.py
    metrics_tools.py
    experiment_tools.py
  routers/
    agents.py
    actions.py
    approvals.py
    experiments.py
    artifacts.py
    metrics.py
    knowledge.py
    settings.py
    health.py
  tests/
    test_security.py
    test_agents.py
    test_tools.py
    test_api.py
  Dockerfile
  requirements.txt
  railway.toml
  seed.py
  .env.example

═══════════════════════════════════════════════════════════
PART 5: SECURITY AND RATE LIMITING
═══════════════════════════════════════════════════════════

Implement all of the following in security.py and as FastAPI middleware:

1. API KEY AUTH
   - All API routes protected by X-API-Key header
   - Key stored in env var DASHBOARD_API_KEY
   - Return 401 if missing or wrong

2. RATE LIMITING
   - Use slowapi
   - /api/approvals/* — 30 req/min per IP
   - /api/agents/*/trigger — 10 req/min per IP
   - All other routes — 60 req/min per IP
   - Return 429 with Retry-After header

3. CORS
   - Allow only NEXT_PUBLIC_FRONTEND_URL and localhost:3000
   - Credentials: true

4. AGENT SPEND CAPS
   - Before every Claude API call, check agent's tokens_used_today vs daily_token_cap
   - If over cap: log the cap hit, set agent status to 'paused', skip the run
   - Cap resets at midnight UTC via a scheduled job
   - Monthly cap checked separately

5. INPUT VALIDATION
   - All request bodies validated with Pydantic models
   - Max payload size: 1MB
   - Sanitise all text inputs before storing

6. SECRETS
   - All secrets via environment variables only
   - Never log API keys
   - .env.example with placeholder values

7. ERROR HANDLING
   - Global exception handler returns consistent JSON error format
   - Never expose stack traces to the client
   - Log full errors server-side

═══════════════════════════════════════════════════════════
PART 6: AGENT BASE CLASS
═══════════════════════════════════════════════════════════

AgentBase in agents/base.py handles the full agent loop:

async def run():
  1. Check agent is enabled and not over cap
  2. Set status = 'active', update last_run_at
  3. Load context: recent shared_memory, pending tasks, recent actions
  4. Build messages array for Claude
  5. Call Claude claude-sonnet-4-6 with tools (exponential backoff retry on 429)
  6. Process tool calls in a loop until Claude stops calling tools
  7. Log every tool call to agent_actions
  8. Update token counts and costs in agents table
  9. Set status = 'idle'
  10. Write run summary to agent_runs

Claude call config:
  model = "claude-sonnet-4-6"
  max_tokens = 4096
  tools = agent's tool definitions
  system = agent's system prompt

On Anthropic 429: wait 60 seconds, retry up to 3 times.
On other errors: log to agent_runs with status='failed', set agent status='error'.

═══════════════════════════════════════════════════════════
PART 7: ALL 13 AGENT SYSTEM PROMPTS
═══════════════════════════════════════════════════════════

Write a complete, detailed system prompt for each agent. Every prompt must:
1. Define role, seniority, and ownership clearly
2. Embody a 2026 entrepreneurial mindset — ambitious, data-driven, fast-moving, practical
3. List exact tools available and when to use each one
4. Define autonomy boundaries — what to decide alone vs what needs approval
5. Define collaboration pattern — who gives this agent direction, who it delegates to
6. Instruct it to store all work in work_artifacts and write clear action summaries
7. Give it a personality consistent with its seniority level

CEO AGENT — the entrepreneurial loop:
The CEO wakes every 60 minutes and runs this loop:
  1. Read all recent shared_memory, experiment results, analytics, research intel
  2. Evaluate active experiments: kill below-threshold ones, accelerate winners
  3. Generate 1-2 new experiment ideas using this lens:
     "What problems are people paying to solve right now in 2026?"
     "What can AI do today that was impossible 2 years ago?"
     "What are our experiments telling us about what the market wants?"
  4. Set weekly priorities and write them to shared_memory
  5. Post tasks to VP layer via task_bus
  6. Escalate to owner only when: fundamental pivot needed, real money required, unresolvable VP conflict, legal question arises

CEO mindset: distribution first, product second. Small fast experiments over big slow bets. Kill losers fast, double down on winners. Revenue signals over vanity metrics.

VP OF ENGINEERING — task decomposition:
  - Reads PRDs and specs from work_artifacts
  - Breaks work into tickets with: title, description, acceptance criteria, assigned_to (developer_frontend or developer_backend), priority 1-10
  - Posts tickets via post_task to correct developer
  - Checks ticket status every run, unblocks developers
  - Reports sprint progress to CEO via shared_memory

DEVELOPER FRONTEND and DEVELOPER BACKEND:
  - Poll task_bus for tickets assigned to them every 20 minutes
  - Write actual working code (real Python/TypeScript/JavaScript, not pseudocode) to work_artifacts with artifact_type='code'
  - Update ticket status as they work
  - Flag blockers to VP Engineering via task_bus
  - Each developer focuses on their domain: frontend=UI/React/Next.js, backend=APIs/FastAPI/DB

VP OF PRODUCT:
  - Scores incoming experiment ideas on effort (1-10) and revenue potential (1-10)
  - Maintains the product roadmap in shared_memory
  - Delegates PRD writing to Product Manager via task_bus
  - Gates experiments: only passes high-score ideas to engineering

PRODUCT MANAGER:
  - Writes detailed PRDs and user stories as work_artifacts (artifact_type='prd')
  - Includes: problem statement, user stories, acceptance criteria, technical notes, success metrics
  - Posts completed PRDs to task_bus for VP Engineering

VP GTM:
  - Sets go-to-market strategy per experiment
  - Delegates content to Marketing, lead gen to Sales
  - Monitors what distribution channels are working via analytics

MARKETING AGENT:
  - Writes blog posts, social content, email copy as work_artifacts (artifact_type='content')
  - All publishing actions go to pending_approvals — never posts directly
  - Does keyword research using search_web tool
  - Reports content performance hypotheses to VP GTM

SALES AGENT:
  - Researches potential leads using search_web
  - Drafts outreach messages as work_artifacts (artifact_type='content')
  - All outreach goes to pending_approvals — never sends directly
  - Updates CRM records in shared_memory

SUPPORT AGENT (runs every 5 minutes):
  - Checks task_bus for support_ticket type tasks
  - Writes responses as work_artifacts (artifact_type='content')
  - Identifies patterns and writes FAQ entries to knowledge_base
  - First-contact responses go to pending_approvals; follow-ups on existing threads are autonomous

FINANCE AGENT (runs every 6 hours):
  - Generates P&L summary and writes to work_artifacts (artifact_type='report')
  - Tracks running API costs from agent_runs table
  - Flags anomalies (cost spike, unusual spend pattern) as high-importance actions
  - Writes financial summary to shared_memory

RESEARCH AGENT (runs every 4 hours):
  - Uses search_web to monitor competitor activity, market trends, pricing changes
  - Writes research notes to work_artifacts (artifact_type='research')
  - Writes key intel to shared_memory under category='intel'
  - Feeds CEO with actionable signals

ANALYTICS AGENT (runs every 6 hours):
  - Aggregates data from business_metrics and agent_runs
  - Generates weekly performance report as work_artifacts (artifact_type='report')
  - Writes metric summaries to shared_memory
  - Identifies trends and anomalies, surfaces them to CEO

═══════════════════════════════════════════════════════════
PART 8: TOOL IMPLEMENTATIONS
═══════════════════════════════════════════════════════════

Implement all tools as async Python functions. All agents get the base set. Specialist tools gated per agent.

BASE TOOLS (all agents):
  read_memory(key: str = None, category: str = None) — read shared_memory, optionally filtered
  write_memory(key: str, value: dict, category: str, summary: str) — upsert to shared_memory
  post_task(to_agent: str, task_type: str, payload: dict, priority: int = 5) — insert to task_bus
  get_my_tasks(status: str = 'pending') — get tasks assigned to this agent from task_bus
  complete_task(task_id: str, result: dict) — mark task complete in task_bus
  log_decision(decision: str, reasoning: str, confidence: int) — write to agent_actions as decision type
  request_approval(action_type: str, title: str, description: str, reasoning: str, payload: dict, urgency: str = 'normal') — insert to pending_approvals, pause that action
  save_artifact(artifact_type: str, title: str, content: str, metadata: dict = {}) — insert to work_artifacts
  read_artifacts(agent_name: str = None, artifact_type: str = None, limit: int = 10) — read work_artifacts

SEARCH TOOL (research, marketing, sales, ceo):
  search_web(query: str) — calls Brave Search API, returns top 5 results with title/url/snippet
  Graceful degradation if BRAVE_SEARCH_API_KEY not set: return a message saying search unavailable

EXPERIMENT TOOLS (ceo, vp_product):
  create_experiment(title: str, hypothesis: str, success_metric: str) — insert to experiment_log
  update_experiment(experiment_id: str, status: str, result: str = None, learnings: str = None) — update experiment_log
  read_experiments(status: str = None) — get experiments, optionally filtered by status

METRICS TOOLS (analytics, finance, ceo):
  write_metric(metric_name: str, metric_value: float, metric_unit: str) — insert to business_metrics
  read_metrics(metric_name: str, days: int = 30) — read historical metric data

TICKET TOOLS (vp_engineering, developer_frontend, developer_backend):
  create_ticket is just post_task with task_type='dev_ticket'
  get_tickets(assigned_to: str = None) is just get_my_tasks filtered appropriately

═══════════════════════════════════════════════════════════
PART 9: API ROUTES
═══════════════════════════════════════════════════════════

All routes prefixed /api. All require X-API-Key header.

GET  /api/health — no auth required, returns {"status": "ok", "agents_running": n}
GET  /api/agents — list all 13 agents with current status and today's costs
GET  /api/agents/{id} — single agent detail including last 20 actions
POST /api/agents/{id}/trigger — manually trigger an agent run (rate limited: 10/min)
PUT  /api/agents/{id} — update agent config (enabled, caps, schedule)

GET  /api/actions — paginated activity feed, supports ?agent=&type=&importance=&limit=&offset=
GET  /api/actions/stream — SSE endpoint for real-time feed (alternative to Supabase realtime)

GET  /api/approvals?status=pending — list approvals
POST /api/approvals/{id}/approve — approve action
POST /api/approvals/{id}/reject — reject action
POST /api/approvals/{id}/redirect — redirect with owner note (body: {"note": "..."})

GET  /api/experiments?status= — list experiments
POST /api/experiments — create experiment (owner-initiated)
PUT  /api/experiments/{id} — update experiment

GET  /api/artifacts?agent=&type=&limit=&offset= — list work artifacts
GET  /api/artifacts/{id} — single artifact full content

GET  /api/metrics?metric=&days= — metric history
GET  /api/metrics/summary — today's summary: total tokens, total cost, agents active

GET  /api/knowledge?category= — list knowledge base entries
POST /api/knowledge — owner adds knowledge entry
PUT  /api/knowledge/{id} — update entry

GET  /api/settings — get all agent configs and global settings
PUT  /api/settings/global — update global settings
POST /api/settings/pause-all — disable all agents
POST /api/settings/resume-all — enable all agents
POST /api/settings/reset-caps — reset all daily token counters

═══════════════════════════════════════════════════════════
PART 10: FRONTEND DASHBOARD
═══════════════════════════════════════════════════════════

DESIGN DIRECTION:
Professional dark-mode command centre. Mission control meets modern SaaS ops.
NOT generic AI aesthetics. NOT purple gradients. NOT Inter font.

Colour tokens (CSS variables):
  --bg-base: #080c14
  --bg-surface: #0d1420
  --bg-elevated: #131d2e
  --bg-hover: #1a2540
  --border: #1e2d45
  --border-active: #2a4070
  --text-primary: #e8eef8
  --text-secondary: #7a90b0
  --text-tertiary: #4a5f80
  --accent-blue: #3b82f6
  --accent-blue-dim: #1d3d7a
  --accent-amber: #f59e0b
  --accent-emerald: #10b981
  --accent-red: #ef4444
  --accent-purple: #8b5cf6

Department colours for agent tags:
  command: #8b5cf6
  product: #f97316
  engineering: #06b6d4
  gtm: #eab308
  ops: #10b981

Fonts: "DM Mono" for data/numbers/agent names. "Instrument Sans" for UI copy. Import from Google Fonts.

Framer Motion throughout:
  - Page transitions: fade + slide 0.2s
  - Feed items: stagger in from bottom, 0.05s delay each, push existing items up
  - Agent cards: green pulse animation on ACTIVE status
  - Approval items: slide in from right
  - Metric numbers: count-up animation on load
  - New approval badge: bounce on appearance

LAYOUT:
Collapsible sidebar: 64px collapsed, 220px expanded, smooth Framer Motion transition.
Top bar: "NovaCo AI" logo, global status dot, cost today (live), notification bell with pending count.

SIDEBAR NAVIGATION:
- Company Feed (home icon)
- Agent Board (grid icon)
- Work Product (folder icon)
- Experiments (flask icon)
- Financials (chart icon)
- Approval Inbox (inbox icon + amber badge count)
- Knowledge Base (brain icon)
- Settings (gear icon)

═══════════════════════════════════════════════════════════
COMPANY FEED PAGE (/)
═══════════════════════════════════════════════════════════

Real-time activity stream using Supabase Realtime on agent_actions table.

Each feed item:
- Coloured agent avatar circle (department colour) with initials
- Agent name + role in small text
- Action summary as main text
- Badge: DECISION / TOOL / ARTIFACT / ESCALATION / TASK
- Left border colour by importance: blue=normal, amber=high, red=critical
- Relative timestamp ("2 min ago")

New items animate in from bottom. List is virtualised for performance.

Filter bar: All | by department dropdown | by agent dropdown | by type | by importance
Empty state: "Agents are initialising..." with subtle pulse

═══════════════════════════════════════════════════════════
AGENT BOARD PAGE (/agents)
═══════════════════════════════════════════════════════════

Grid of 13 cards grouped by department with department section headers.

Each agent card:
- Agent name (DM Mono)
- Role subtitle
- Status badge with animated indicator:
    ACTIVE: green pulsing dot
    IDLE: gray static dot
    WAITING: amber pulsing dot + "AWAITING APPROVAL"
    ERROR: red dot
    PAUSED: gray dot + "CAP REACHED"
- Current task text (truncated, tooltip on hover)
- Token progress bar (goes amber at 80%, red at 95%)
- Cost today (DM Mono, small)
- "Last run 3 min ago"

Click card → Framer Motion slide-over from right (480px wide):
  - Full agent info
  - System prompt (collapsible code block)
  - Recent actions (last 20, scrollable)
  - Work artifacts by this agent (clickable list)
  - Run Now button (disabled for 60s after use)
  - Enable / Disable toggle

═══════════════════════════════════════════════════════════
WORK PRODUCT PAGE (/work)
═══════════════════════════════════════════════════════════

Everything every agent has ever produced. This is a core feature — make it excellent.

Two-panel layout:

LEFT PANEL (340px): filterable artifact list
- Search input
- Filter by agent (dropdown)
- Filter by type (prd / spec / code / report / content / research / analysis)
- Filter by date range
- Each list item: title, agent name coloured badge, type icon, date
- Selected item highlighted

RIGHT PANEL: artifact viewer
- Title + agent + type + date header
- Content rendered by type:
    code → syntax highlighted with Shiki (dark theme)
    prd/report/research → rendered markdown
    content → styled content preview
    analysis → formatted text
- Copy button
- Download as .txt button
- Linked experiment badge (if applicable)

Make this feel like a proper document viewer, not a text dump.

═══════════════════════════════════════════════════════════
EXPERIMENTS PAGE (/experiments)
═══════════════════════════════════════════════════════════

Kanban board. Four columns: PROPOSED | ACTIVE | MEASURING | CLOSED

Each experiment card:
- Title
- Hypothesis (2 lines truncated)
- Owner agent badge (coloured)
- Effort / Revenue score bars (if set)
- Days running (for ACTIVE)
- Outcome badge: WINNER (emerald) or KILLED (red) in CLOSED column

Click card → modal with full details, learnings, linked artifacts list.

"Suggest Experiment" button posts a task to CEO's queue.
Owner can also create experiments directly.

Cards animate in with stagger. Smooth transitions between columns.

═══════════════════════════════════════════════════════════
FINANCIALS PAGE (/financials)
═══════════════════════════════════════════════════════════

Top row metric cards with count-up animation:
- MRR (mocked $0 initially)
- Spend today (live, updates every 30s)
- Spend this month (live)
- Tokens used today (live)
- Active experiments count

Main chart: Revenue vs AI Costs dual line, last 30 days. Recharts, dark theme.

Per-agent cost breakdown: horizontal bar chart showing each agent's % of total spend.

Cost projection card: "At current daily rate: ~$X/month"

All costs sourced from agent_runs table aggregated server-side.

═══════════════════════════════════════════════════════════
APPROVAL INBOX PAGE (/approvals)
═══════════════════════════════════════════════════════════

Sorted by urgency: critical → high → normal → low.

Each approval item:
- Agent avatar + name
- Action type badge: PUBLISH / EMAIL / DEPLOY / SPEND / PIVOT / OTHER
- Title (what agent wants to do)
- Reasoning (expandable, full agent explanation)
- Urgency badge
- "Waiting 14 min" timer
- Three buttons:
    APPROVE (emerald) — marks approved, logs resolution
    REJECT (red) — marks rejected
    REDIRECT (blue) — opens text input, sends owner note back to agent as a task

Tabs: Pending (default) | Resolved (audit history)

Empty pending state: "Your team is running independently — nothing needs your attention."

═══════════════════════════════════════════════════════════
KNOWLEDGE BASE PAGE (/knowledge)
═══════════════════════════════════════════════════════════

Two-panel: category sidebar + content list + content viewer.

Categories: Company | Product | Customers | Competitors | Market | Decisions | All

Each entry: title, written_by badge, date, tags.
Click → full content rendered.
"Add Entry" button for owner to manually contribute.
Search across all entries.

═══════════════════════════════════════════════════════════
SETTINGS PAGE (/settings)
═══════════════════════════════════════════════════════════

Three tabs: Agents | Business | Controls

AGENTS TAB:
Table of all 13 agents:
- Name, role
- Enable/disable toggle
- Daily token cap (editable input)
- Monthly token cap (editable input)
- Schedule interval in seconds (editable)
- Reset spend button (per agent)

BUSINESS TAB:
Edit company context (writes to knowledge_base):
- Company name
- Company description
- Target customer (ICP)
- Current product focus
- Revenue model

CONTROLS TAB:
- PAUSE ALL AGENTS — large red button, requires confirmation dialog
- RESUME ALL button
- Reset all daily caps
- API key display (masked with reveal button)

═══════════════════════════════════════════════════════════
PART 11: FRONTEND PROJECT STRUCTURE
═══════════════════════════════════════════════════════════

frontend/
  app/
    layout.tsx
    page.tsx
    feed/page.tsx
    agents/page.tsx
    work/page.tsx
    experiments/page.tsx
    financials/page.tsx
    approvals/page.tsx
    knowledge/page.tsx
    settings/page.tsx
  components/
    layout/
      Sidebar.tsx
      TopBar.tsx
      PageContainer.tsx
    agents/
      AgentCard.tsx
      AgentSlideOver.tsx
      StatusBadge.tsx
      TokenProgressBar.tsx
    feed/
      FeedItem.tsx
      FeedFilter.tsx
      RealtimeFeed.tsx
    work/
      ArtifactList.tsx
      ArtifactViewer.tsx
      CodeViewer.tsx
    experiments/
      KanbanBoard.tsx
      ExperimentCard.tsx
      ExperimentModal.tsx
    approvals/
      ApprovalItem.tsx
      RedirectModal.tsx
    financials/
      MetricCard.tsx
      CostChart.tsx
      AgentCostBar.tsx
    knowledge/
      KnowledgeEntry.tsx
    ui/
  lib/
    api.ts
    supabase.ts
    utils.ts
    types.ts
  hooks/
    useAgents.ts
    useFeed.ts
    useApprovals.ts
    useArtifacts.ts
    useMetrics.ts

═══════════════════════════════════════════════════════════
PART 12: SEED DATA (backend/seed.py)
═══════════════════════════════════════════════════════════

Seed script that populates:

1. All 13 agents in agents table with full system prompts, correct schedules, and default caps

2. knowledge_base:
   - Company: "NovaCo is an AI-native micro-SaaS studio. We build and launch small profitable software products using a fully autonomous AI team. Our mission is to find underserved niches and ship fast."
   - ICP: "Solo founders, indie hackers, and small teams (2-10 people) who want to automate repetitive work and will pay $29-99/month for tools that save them hours per week."
   - Market: "The AI tools market in 2026 has opportunity in vertical niches. Distribution via communities, newsletters, and product-led growth outperforms paid ads for our segment."

3. shared_memory:
   - company_stage: "pre-revenue, exploring first product"
   - weekly_priorities: "Validate top experiment, write first PRD, set up landing page"

4. experiment_log (3 experiments, status='proposed'):
   - "AI Newsletter Summariser" — hypothesis: "Busy founders pay $19/month for their newsletter subscriptions summarised into a 5-minute daily digest", success_metric: "10 paying users in 30 days"
   - "Cold Outreach Personaliser" — hypothesis: "SDRs pay $49/month for AI that writes hyper-personalised cold emails using live prospect research", success_metric: "5 paying users in 30 days"
   - "Meeting Notes to Action Items" — hypothesis: "Teams pay $29/month for AI that turns meeting transcripts into structured action items sent to their PM tool", success_metric: "8 paying users in 30 days"

5. One sample work_artifact per major agent type so the Work Product page renders from day one

═══════════════════════════════════════════════════════════
PART 13: TESTS (backend/tests/)
═══════════════════════════════════════════════════════════

Use pytest + pytest-asyncio. Mock Supabase and Anthropic clients.

test_security.py:
- Missing API key returns 401
- Wrong API key returns 401
- Correct key returns 200
- 61st request in a minute returns 429
- Agent over daily cap is skipped on run

test_agents.py:
- Agent base loop completes without error (mocked Claude)
- Tool execution works for each tool type
- Cost tracking increments correctly after a run
- Cap enforcement stops run before calling Claude

test_tools.py:
- write_memory then read_memory returns same value
- post_task then get_my_tasks returns the task
- request_approval creates a pending record

test_api.py:
- GET /api/agents returns 13 agents
- GET /api/actions returns paginated results
- POST /api/approvals/{id}/approve changes status
- GET /api/artifacts returns results

═══════════════════════════════════════════════════════════
PART 14: DEPLOYMENT FILES
═══════════════════════════════════════════════════════════

backend/Dockerfile:
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

backend/railway.toml:
[build]
builder = "dockerfile"
[deploy]
startCommand = "uvicorn main:app --host 0.0.0.0 --port $PORT"
healthcheckPath = "/health"
restartPolicyType = "on_failure"

frontend/vercel.json:
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next"
}

backend/requirements.txt:
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
anthropic>=0.20.0
supabase>=2.0.0
apscheduler>=3.10.0
slowapi>=0.1.9
pydantic>=2.0.0
pydantic-settings>=2.0.0
httpx>=0.25.0
python-dotenv>=1.0.0
pytest>=7.4.0
pytest-asyncio>=0.21.0

backend/.env.example:
ANTHROPIC_API_KEY=sk-ant-your-key-here
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ-service-role-key-here
SUPABASE_ANON_KEY=eyJ-anon-key-here
DASHBOARD_API_KEY=generate-a-long-random-string-here
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8000
BRAVE_SEARCH_API_KEY=BSA-your-key-here-optional
ENVIRONMENT=development

═══════════════════════════════════════════════════════════
PART 15: BUILD ORDER — FOLLOW THIS EXACTLY
═══════════════════════════════════════════════════════════

Build in this exact order. Complete each fully before moving on.

1.  supabase/migrations/001_initial.sql — complete schema with indexes and RLS
2.  backend/config.py — all settings loaded from env
3.  backend/database.py — Supabase client singleton
4.  backend/security.py — rate limiting, API key auth, CORS middleware
5.  backend/tools/ — all tool implementations (memory, task, decision, artifact, search, metrics, experiment)
6.  backend/agents/base.py — the reusable agent loop class
7.  backend/agents/ — all 13 agent classes with full system prompts embedded
8.  backend/routers/ — all API route files
9.  backend/scheduler.py — APScheduler with all 13 agents on their schedules
10. backend/main.py — FastAPI app assembly, middleware registration, router inclusion
11. backend/seed.py — complete seed data script
12. backend/tests/ — all four test files
13. backend/Dockerfile + railway.toml + requirements.txt + .env.example
14. frontend/lib/types.ts — TypeScript types matching every DB table
15. frontend/lib/api.ts — typed fetch wrapper for all API endpoints
16. frontend/lib/supabase.ts — Supabase browser client with realtime
17. frontend/hooks/ — all data hooks
18. frontend/components/ — every component listed in the structure
19. frontend/app/ — all 8 pages
20. frontend/package.json + vercel.json + tailwind.config.ts
21. README.md at repo root

Do not skip steps. Do not write placeholder comments. Every file must be complete working code. This is production-ready software, not a prototype.
