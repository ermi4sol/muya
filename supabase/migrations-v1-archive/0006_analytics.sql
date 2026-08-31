-- Phase 12: lightweight storefront analytics
create table store_visits (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references creators(id) on delete cascade,
  path text,
  created_at timestamptz default now()
);
create index idx_visits_creator_time on store_visits (creator_id, created_at desc);
alter table store_visits enable row level security;
