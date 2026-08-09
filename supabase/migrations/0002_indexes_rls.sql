-- MUYA indexes + row-level security (Phase 2)

-- Hot-path indexes ------------------------------------------------------------
create index idx_products_creator on products (creator_id);
create index idx_products_creator_status on products (creator_id, status, sort_order);
create index idx_orders_creator_created on orders (creator_id, created_at desc);
create index idx_orders_customer on orders (customer_id);
create index idx_orders_status on orders (payment_status, created_at);
create index idx_entitlements_customer_product on entitlements (customer_id, product_id);
create index idx_community_posts_feed on community_posts (community_id, created_at desc);
create index idx_payout_requests_queue on payout_requests (status, requested_at);
create index idx_ledger_creator on creator_ledger_entries (creator_id, created_at desc);
create index idx_magic_tokens_hash on magic_link_tokens (token_hash);
create index idx_variants_product on product_variants (product_id);
create index idx_attributes_product on product_attributes (product_id);
create index idx_bookings_product_time on bookings (product_id, scheduled_at);
create index idx_failed_jobs_retry on failed_jobs (status, next_retry_at);
create index idx_community_members_lookup on community_members (community_id, customer_id);
create index idx_audit_log_admin on admin_audit_log (admin_user_id, created_at desc);

-- Row-level security ----------------------------------------------------------
-- MUYA's application uses custom signed-cookie sessions (not Supabase Auth JWTs)
-- for creators and customers, so ALL data access flows through server-side API
-- routes using the service-role key AFTER app-layer authorization checks.
-- RLS here is defense-in-depth: every table is locked so the anon/publishable
-- key can read and write NOTHING directly. No policies = no access.

alter table creators enable row level security;
alter table customers enable row level security;
alter table admin_users enable row level security;
alter table admin_audit_log enable row level security;
alter table creator_subscriptions enable row level security;
alter table platform_settings enable row level security;
alter table products enable row level security;
alter table product_attributes enable row level security;
alter table product_attribute_values enable row level security;
alter table product_variants enable row level security;
alter table orders enable row level security;
alter table entitlements enable row level security;
alter table subscriptions enable row level security;
alter table creator_ledger_entries enable row level security;
alter table payout_requests enable row level security;
alter table bookings enable row level security;
alter table webinar_registrants enable row level security;
alter table communities enable row level security;
alter table community_members enable row level security;
alter table community_posts enable row level security;
alter table physical_orders enable row level security;
alter table magic_link_tokens enable row level security;
alter table creator_integrations enable row level security;
alter table affiliates enable row level security;
alter table affiliate_referrals enable row level security;
alter table failed_jobs enable row level security;
