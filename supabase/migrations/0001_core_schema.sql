-- MUYA core schema (Phase 2)
-- Identity ---------------------------------------------------------------

create table creators (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  store_slug text unique not null,
  display_name text,
  bio text,
  profile_image_url text,
  social_links jsonb default '{}',
  theme jsonb default '{}',
  currency text default 'ETB',
  preferred_locale text default 'en',
  status text default 'active' check (status in ('active','suspended')),
  created_at timestamptz default now()
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  preferred_locale text default 'en',
  created_at timestamptz default now()
);

create table admin_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  role text not null default 'support' check (role in ('superadmin','finance','support','trust_safety')),
  auth_user_id uuid,                        -- link to Supabase Auth user (password+MFA)
  mfa_enabled boolean default false,
  preferred_locale text default 'en',
  created_at timestamptz default now()
);

create table admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references admin_users(id),
  action text not null,
  target_type text,
  target_id uuid,
  notes text,
  created_at timestamptz default now()
);

-- Subscriptions (creator's own MUYA plan; dormant while all features are free)

create table creator_subscriptions (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references creators(id) unique,
  tier text not null default 'free' check (tier in ('free','premium_growth','premium_business')),
  status text default 'active' check (status in ('active','past_due','canceled')),
  chapa_subscription_ref text,
  current_period_end timestamptz,
  created_at timestamptz default now()
);

-- Platform configuration (tier feature flags — fully open at launch) ------

create table platform_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);

-- Products ----------------------------------------------------------------

create table products (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references creators(id) on delete cascade,
  type text not null check (type in (
    'digital_download','course','coaching_call','webinar','membership',
    'lead_magnet','custom_product','external_link','community','physical'
  )),
  title text not null,
  description text,
  price numeric(10,2) default 0,
  currency text default 'ETB',
  is_recurring boolean default false,
  billing_interval text,
  config jsonb default '{}',
  status text default 'active' check (status in ('active','draft','archived')),
  sort_order int default 0,
  created_at timestamptz default now()
);

create table product_attributes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  name text not null,
  sort_order int default 0
);

create table product_attribute_values (
  id uuid primary key default gen_random_uuid(),
  attribute_id uuid references product_attributes(id) on delete cascade,
  value text not null
);

create table product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  sku text,
  attribute_values jsonb default '{}',
  price_override numeric(10,2),
  stock_count int default 0,
  weight_grams int,
  image_url text
);

-- Orders, entitlements, ledger -------------------------------------------

create table orders (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references creators(id),
  customer_id uuid references customers(id),
  product_id uuid references products(id),
  variant_id uuid references product_variants(id),
  quantity int default 1,
  item_amount numeric(10,2) not null,
  chapa_fee_amount numeric(10,2) default 0,
  shipping_fee numeric(10,2) default 0,
  total_charged numeric(10,2) not null,
  commission_amount numeric(10,2),
  creator_net_amount numeric(10,2),
  currency text default 'ETB',
  payment_status text default 'pending' check (payment_status in ('pending','paid','failed','refunded','rejected')),
  -- order-request model (pre-Chapa): admin approval fields
  approved_by uuid references admin_users(id),
  approved_at timestamptz,
  rejection_reason text,
  chapa_tx_ref text unique,
  created_at timestamptz default now()
);

create table entitlements (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id),
  product_id uuid references products(id),
  order_id uuid references orders(id),
  status text default 'active' check (status in ('active','canceled','expired')),
  granted_at timestamptz default now(),
  revoked_at timestamptz
);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  entitlement_id uuid references entitlements(id),
  chapa_subscription_ref text,
  status text default 'active' check (status in ('active','past_due','canceled')),
  current_period_end timestamptz,
  created_at timestamptz default now()
);

create table creator_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references creators(id),
  order_id uuid references orders(id),
  payout_request_id uuid,
  entry_type text not null check (entry_type in ('sale','payout','refund','adjustment')),
  amount numeric(10,2) not null,
  balance_after numeric(10,2) not null,
  created_at timestamptz default now()
);

create table payout_requests (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references creators(id),
  amount numeric(10,2) not null,
  status text default 'pending' check (status in ('pending','processing','paid','rejected')),
  payout_method text check (payout_method in ('bank','telebirr')),
  payout_details jsonb default '{}',
  requested_at timestamptz default now(),
  processed_at timestamptz,
  processed_by uuid references admin_users(id),
  rejection_reason text
);

-- Bookings, webinars, community --------------------------------------------

create table bookings (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id),
  entitlement_id uuid references entitlements(id),
  scheduled_at timestamptz not null,
  duration_minutes int,
  calendar_event_id text,
  meeting_link text,
  status text default 'confirmed' check (status in ('confirmed','canceled','completed')),
  created_at timestamptz default now()
);

create table webinar_registrants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id),
  entitlement_id uuid references entitlements(id),
  join_url text,
  registered_at timestamptz default now()
);

create table communities (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) unique,
  name text,
  description text,
  frozen boolean default false,
  created_at timestamptz default now()
);

create table community_members (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references communities(id),
  customer_id uuid references customers(id),
  role text default 'member' check (role in ('member','moderator','admin')),
  joined_at timestamptz default now(),
  unique (community_id, customer_id)
);

create table community_posts (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references communities(id),
  author_customer_id uuid references customers(id),
  body text,
  image_url text,
  reported boolean default false,
  report_reason text,
  removed boolean default false,
  created_at timestamptz default now()
);

-- Physical fulfillment ------------------------------------------------------

create table physical_orders (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) unique,
  shipping_name text,
  shipping_phone text,
  shipping_address text,
  shipping_city text,
  shipping_notes text,
  payment_method text default 'order_request' check (payment_method in ('order_request','chapa','cash_on_delivery')),
  shipment_status text default 'pending' check (shipment_status in ('pending','shipped','delivered')),
  tracking_number text,
  created_at timestamptz default now()
);

-- Auth support ---------------------------------------------------------------

create table magic_link_tokens (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null check (owner_type in ('customer','creator')),
  owner_id uuid not null,
  token_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz default now()
);

-- Integrations (per-creator OAuth connections) -------------------------------

create table creator_integrations (
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

-- Affiliates ------------------------------------------------------------------

create table affiliates (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references creators(id),
  affiliate_customer_id uuid references customers(id),
  commission_percent numeric(5,2) default 20,
  referral_code text unique,
  created_at timestamptz default now()
);

create table affiliate_referrals (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid references affiliates(id),
  order_id uuid references orders(id),
  commission_amount numeric(10,2),
  payout_status text default 'held' check (payout_status in ('held','paid','canceled')),
  created_at timestamptz default now()
);

-- Background job dead-letter (Netlify-based retry model) ----------------------

create table failed_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null,
  payload jsonb not null,
  error text,
  attempts int default 0,
  max_attempts int default 5,
  next_retry_at timestamptz,
  status text default 'retrying' check (status in ('retrying','dead','resolved')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
