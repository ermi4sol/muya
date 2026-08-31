-- ===== creator_integrations (kept from v1 — Google Calendar per-creator OAuth) =====
-- Applied live as migration "v2_creator_integrations" via Supabase MCP.

create table if not exists creator_integrations (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references creators(id) on delete cascade,
  provider text not null check (provider in ('google_calendar','zoom')),
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  external_account_email text,
  config jsonb default '{}',
  created_at timestamptz default now(),
  unique (creator_id, provider)
);
create index if not exists idx_creator_integrations_creator on creator_integrations(creator_id);
alter table creator_integrations enable row level security;
