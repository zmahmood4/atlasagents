-- ATLAS conversations: owner ↔ agent 1-1 chat history
-- Apply in Supabase SQL editor after 001_initial.sql

create table if not exists conversations (
    id          uuid primary key default gen_random_uuid(),
    agent_name  text not null,
    role        text not null check (role in ('owner', 'agent', 'system')),
    content     text not null,
    metadata    jsonb not null default '{}'::jsonb,
    created_at  timestamptz not null default now()
);

create index if not exists idx_conversations_agent_created
    on conversations (agent_name, created_at desc);

-- RLS: same pattern as other tables
alter table conversations enable row level security;

drop policy if exists conversations_auth_rw on conversations;
create policy conversations_auth_rw on conversations
    for all to authenticated using (true) with check (true);

-- Realtime — owner sees agent responses instantly
alter publication supabase_realtime add table conversations;
