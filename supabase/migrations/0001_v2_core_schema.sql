-- ===== MUYA v2 schema (per PDR, 2026-08-31) =====
-- Applied live as migration "v2_core_schema" (20260831165726) via Supabase MCP.

-- Identity (Telegram-first)
create table creators (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id text unique not null,
  telegram_username text,
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
  telegram_user_id text unique not null,
  telegram_username text,
  name text,
  preferred_locale text default 'en',
  created_at timestamptz default now()
);

create table admin_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  role text not null default 'support' check (role in ('superadmin','finance','support','trust_safety')),
  telegram_user_id text,
  auth_user_id text,                 -- Better Auth user id
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

-- Platform settings + commission management
create table platform_settings (
  id uuid primary key default gen_random_uuid(),
  commission_percent numeric(5,2) not null default 7.00,
  updated_by uuid references admin_users(id),
  updated_at timestamptz default now()
);

create table commission_type_exclusions (
  product_type text primary key check (product_type in (
    'digital_product','lead_magnet','coaching_call','course','webinar',
    'affiliate_link','url_media','physical','custom_product'
  )),
  is_excluded boolean not null default false,
  updated_by uuid references admin_users(id),
  updated_at timestamptz default now()
);

-- Creator's own MUYA tier
create table creator_subscriptions (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references creators(id) unique,
  tier text not null default 'free' check (tier in ('free','premium_growth','premium_business')),
  status text default 'active' check (status in ('active','past_due','canceled')),
  chapa_subscription_ref text,
  current_period_end timestamptz,
  created_at timestamptz default now()
);

-- Products (9 types, v2 fields)
create table products (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references creators(id) on delete cascade,
  type text not null check (type in (
    'digital_product','lead_magnet','coaching_call','course','webinar',
    'affiliate_link','url_media','physical','custom_product'
  )),
  title text,
  subtitle text,
  card_style text default 'callout' check (card_style in ('button','callout','preview')),
  thumbnail_url text,
  hero_image_url text,
  description_body text,
  bottom_title text,
  cta_button_text text default 'Buy Now',
  price numeric(10,2) default 0,
  discount_price numeric(10,2),
  currency text default 'ETB',
  is_recurring boolean default false,
  billing_interval text,
  config jsonb default '{}',
  status text default 'draft' check (status in ('draft','active','archived')),
  sort_order int default 0,
  created_at timestamptz default now()
);

create table product_custom_fields (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  label text not null,
  field_type text default 'text',
  sort_order int default 0
);

-- Physical attribute/variant system
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

-- Lead capture (marketing contacts, separate from identity)
create table lead_captures (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references creators(id),
  product_id uuid references products(id),
  customer_id uuid references customers(id),
  captured_email text,
  captured_telegram_username text,
  created_at timestamptz default now()
);

-- Orders (single product per row; carts share checkout_group_id)
create table orders (
  id uuid primary key default gen_random_uuid(),
  checkout_group_id uuid,
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
  approved_by uuid references admin_users(id),
  approved_at timestamptz,
  rejection_reason text,
  chapa_tx_ref text unique,
  metadata jsonb default '{}',
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

-- Bookings and webinars
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

-- Physical fulfillment
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

-- Affiliates / referrals
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

-- Operational tables kept from v1
create table rate_limits (
  key text primary key,
  count int not null default 1,
  window_start timestamptz not null default now()
);

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

create table store_visits (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references creators(id) on delete cascade,
  path text,
  created_at timestamptz default now()
);
