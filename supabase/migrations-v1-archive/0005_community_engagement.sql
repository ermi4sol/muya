-- Phase 9: community likes + comments
create table community_post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references community_posts(id) on delete cascade,
  customer_id uuid references customers(id),
  created_at timestamptz default now(),
  unique (post_id, customer_id)
);
create table community_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references community_posts(id) on delete cascade,
  author_customer_id uuid references customers(id),
  body text not null,
  removed boolean default false,
  created_at timestamptz default now()
);
create index idx_comments_post on community_post_comments (post_id, created_at);
alter table community_post_likes enable row level security;
alter table community_post_comments enable row level security;
