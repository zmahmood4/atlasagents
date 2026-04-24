-- NovaCo autonomous AI company — initial schema (Part 3 of the spec)
-- Postgres 15+ with Supabase extensions.

create extension if not exists "pgcrypto";

-- =====================================================================
-- agents
-- =====================================================================
create table if not exists agents (
    id                  uuid primary key default gen_random_uuid(),
    name                text not null,
    role                text not null,
    department          text not null,
    status              text default 'idle',
    current_task        text,
    system_prompt       text not null,
    schedule_seconds    integer not null,
    daily_token_cap     integer default 50000,
    monthly_token_cap   integer default 500000,
    tokens_used_today   integer default 0,
    tokens_used_month   integer default 0,
    cost_usd_today      numeric(10,4) default 0,
    cost_usd_month      numeric(10,4) default 0,
    last_run_at         timestamptz,
    enabled             boolean default true,
    created_at          timestamptz default now(),
    unique (name)
);

-- =====================================================================
-- agent_runs
-- =====================================================================
create table if not exists agent_runs (
    id              uuid primary key default gen_random_uuid(),
    agent_id        uuid references agents(id) on delete cascade,
    agent_name      text not null,
    started_at      timestamptz default now(),
    completed_at    timestamptz,
    status          text,
    input_tokens    integer default 0,
    output_tokens   integer default 0,
    cost_usd        numeric(10,6) default 0,
    actions_taken   jsonb default '[]'::jsonb,
    summary         text,
    error           text
);

-- =====================================================================
-- agent_actions (live feed)
-- =====================================================================
create table if not exists agent_actions (
    id              uuid primary key default gen_random_uuid(),
    agent_id        uuid references agents(id) on delete cascade,
    agent_name      text not null,
    run_id          uuid references agent_runs(id) on delete cascade,
    action_type     text not null,
    tool_name       text,
    tool_input      jsonb,
    tool_output     jsonb,
    summary         text not null,
    importance      text default 'normal',
    created_at      timestamptz default now()
);

-- =====================================================================
-- task_bus (inter-agent work)
-- =====================================================================
create table if not exists task_bus (
    id              uuid primary key default gen_random_uuid(),
    from_agent      text not null,
    to_agent        text not null,
    task_type       text not null,
    payload         jsonb not null,
    priority        integer default 5,
    status          text default 'pending',
    result          jsonb,
    created_at      timestamptz default now(),
    claimed_at      timestamptz,
    completed_at    timestamptz
);

-- =====================================================================
-- shared_memory (collaborative state)
-- =====================================================================
create table if not exists shared_memory (
    id              uuid primary key default gen_random_uuid(),
    key             text not null unique,
    value           jsonb not null,
    category        text not null,
    written_by      text not null,
    summary         text,
    updated_at      timestamptz default now(),
    created_at      timestamptz default now()
);

-- =====================================================================
-- experiment_log
-- =====================================================================
create table if not exists experiment_log (
    id              uuid primary key default gen_random_uuid(),
    title           text not null,
    hypothesis      text not null,
    success_metric  text not null,
    owner_agent     text not null,
    status          text default 'proposed',
    effort_score    integer,
    revenue_score   integer,
    result          text,
    learnings       text,
    created_at      timestamptz default now(),
    updated_at      timestamptz default now()
);

-- =====================================================================
-- pending_approvals
-- =====================================================================
create table if not exists pending_approvals (
    id              uuid primary key default gen_random_uuid(),
    agent_id        uuid references agents(id) on delete cascade,
    agent_name      text not null,
    action_type     text not null,
    title           text not null,
    description     text not null,
    reasoning       text not null,
    payload         jsonb,
    urgency         text default 'normal',
    status          text default 'pending',
    owner_note      text,
    created_at      timestamptz default now(),
    resolved_at     timestamptz
);

-- =====================================================================
-- business_metrics
-- =====================================================================
create table if not exists business_metrics (
    id              uuid primary key default gen_random_uuid(),
    metric_name     text not null,
    metric_value    numeric not null,
    metric_unit     text,
    period_date     date not null,
    written_by      text not null,
    created_at      timestamptz default now()
);

-- =====================================================================
-- knowledge_base
-- =====================================================================
create table if not exists knowledge_base (
    id              uuid primary key default gen_random_uuid(),
    category        text not null,
    title           text not null,
    content         text not null,
    written_by      text not null,
    tags            text[],
    updated_at      timestamptz default now(),
    created_at      timestamptz default now()
);

-- =====================================================================
-- work_artifacts
-- =====================================================================
create table if not exists work_artifacts (
    id              uuid primary key default gen_random_uuid(),
    agent_name      text not null,
    artifact_type   text not null,
    title           text not null,
    content         text not null,
    metadata        jsonb default '{}'::jsonb,
    experiment_id   uuid references experiment_log(id) on delete set null,
    created_at      timestamptz default now()
);

-- =====================================================================
-- api_rate_limits
-- =====================================================================
create table if not exists api_rate_limits (
    id              uuid primary key default gen_random_uuid(),
    identifier      text not null,
    endpoint        text not null,
    requests_count  integer default 0,
    window_start    timestamptz default now(),
    created_at      timestamptz default now(),
    unique (identifier, endpoint)
);

-- =====================================================================
-- Indexes (Part 3)
-- =====================================================================
create index if not exists idx_agent_actions_agent_created
    on agent_actions (agent_name, created_at desc);
create index if not exists idx_agent_actions_created
    on agent_actions (created_at desc);
create index if not exists idx_task_bus_to_status
    on task_bus (to_agent, status);
create index if not exists idx_shared_memory_category
    on shared_memory (category);
create index if not exists idx_pending_approvals_status
    on pending_approvals (status);
create index if not exists idx_business_metrics_name_date
    on business_metrics (metric_name, period_date);
create index if not exists idx_work_artifacts_agent_type
    on work_artifacts (agent_name, artifact_type);
create index if not exists idx_agents_enabled on agents (enabled);
create index if not exists idx_agent_runs_agent on agent_runs (agent_id, started_at desc);
create index if not exists idx_experiments_status on experiment_log (status);

-- =====================================================================
-- updated_at triggers
-- =====================================================================
create or replace function set_updated_at() returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists trg_shared_memory_updated on shared_memory;
create trigger trg_shared_memory_updated before update on shared_memory
for each row execute procedure set_updated_at();

drop trigger if exists trg_knowledge_updated on knowledge_base;
create trigger trg_knowledge_updated before update on knowledge_base
for each row execute procedure set_updated_at();

drop trigger if exists trg_experiments_updated on experiment_log;
create trigger trg_experiments_updated before update on experiment_log
for each row execute procedure set_updated_at();

-- =====================================================================
-- Row Level Security
-- Backend uses service_role and bypasses RLS.
-- Dashboard clients authenticate via Supabase Auth; authenticated role has
-- full read/write. Anon role is locked down.
-- =====================================================================
alter table agents               enable row level security;
alter table agent_runs           enable row level security;
alter table agent_actions        enable row level security;
alter table task_bus             enable row level security;
alter table shared_memory        enable row level security;
alter table experiment_log       enable row level security;
alter table pending_approvals    enable row level security;
alter table business_metrics     enable row level security;
alter table knowledge_base       enable row level security;
alter table work_artifacts       enable row level security;
alter table api_rate_limits      enable row level security;

do $$ declare t text;
begin
    foreach t in array array[
        'agents','agent_runs','agent_actions','task_bus','shared_memory',
        'experiment_log','pending_approvals','business_metrics','knowledge_base',
        'work_artifacts','api_rate_limits'
    ] loop
        execute format('drop policy if exists %I_auth_rw on %I', t||'_auth_rw', t);
        execute format(
            'create policy %I on %I for all to authenticated using (true) with check (true)',
            t||'_auth_rw', t
        );
    end loop;
end $$;

-- Enable realtime on user-facing tables
alter publication supabase_realtime add table agent_actions;
alter publication supabase_realtime add table pending_approvals;
alter publication supabase_realtime add table work_artifacts;
alter publication supabase_realtime add table agents;
alter publication supabase_realtime add table experiment_log;
alter publication supabase_realtime add table agent_runs;
