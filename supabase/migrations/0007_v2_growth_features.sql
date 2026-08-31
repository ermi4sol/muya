-- ===== R6 growth features: funnels + telegram flows =====
-- Applied live as migration "v2_growth_features" via Supabase MCP.

-- Funnels: linear Telegram message sequences
create table funnels (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references creators(id) on delete cascade,
  name text not null,
  status text default 'draft' check (status in ('draft','active','archived')),
  trigger_product_id uuid references products(id),
  steps jsonb default '[]',        -- [{ message, delay_hours }]
  created_at timestamptz default now()
);

create table funnel_enrollments (
  id uuid primary key default gen_random_uuid(),
  funnel_id uuid references funnels(id) on delete cascade,
  telegram_user_id text not null,
  step_index int default 0,
  next_send_at timestamptz,
  completed boolean default false,
  created_at timestamptz default now(),
  unique (funnel_id, telegram_user_id)
);

-- Telegram Flows: broadcasts/automations with block content
create table telegram_flows (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references creators(id) on delete cascade,
  name text not null,
  kind text default 'broadcast' check (kind in ('broadcast','automation')),
  status text default 'draft' check (status in ('draft','scheduled','sent')),
  blocks jsonb default '[]',       -- [{ type: 'text'|'button', text, url? }]
  scheduled_at timestamptz,
  sent_at timestamptz,
  recipients_count int default 0,
  created_at timestamptz default now()
);

create index idx_funnels_creator on funnels(creator_id);
create index idx_funnel_enrollments_due on funnel_enrollments(completed, next_send_at);
create index idx_telegram_flows_creator on telegram_flows(creator_id);
create index idx_telegram_flows_scheduled on telegram_flows(status, scheduled_at);

alter table funnels enable row level security;
alter table funnel_enrollments enable row level security;
alter table telegram_flows enable row level security;

-- Affiliates get a display name for invited partners (v2_affiliate_name)
alter table affiliates add column if not exists name text;
