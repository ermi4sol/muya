-- ===== MUYA v2 indexes + RLS =====
-- Applied live as migration "v2_indexes_rls" (20260831170126) via Supabase MCP.

create index if not exists idx_creators_slug on creators(store_slug);
create index if not exists idx_creators_telegram on creators(telegram_user_id);
create index if not exists idx_customers_telegram on customers(telegram_user_id);
create index if not exists idx_products_creator on products(creator_id);
create index if not exists idx_products_creator_status on products(creator_id, status);
create index if not exists idx_products_type on products(type);
create index if not exists idx_product_custom_fields_product on product_custom_fields(product_id);
create index if not exists idx_product_attributes_product on product_attributes(product_id);
create index if not exists idx_product_attribute_values_attr on product_attribute_values(attribute_id);
create index if not exists idx_product_variants_product on product_variants(product_id);
create index if not exists idx_lead_captures_product on lead_captures(product_id);
create index if not exists idx_lead_captures_creator on lead_captures(creator_id);
create index if not exists idx_orders_creator on orders(creator_id);
create index if not exists idx_orders_customer on orders(customer_id);
create index if not exists idx_orders_product on orders(product_id);
create index if not exists idx_orders_status on orders(payment_status);
create index if not exists idx_orders_checkout_group on orders(checkout_group_id);
create index if not exists idx_orders_created on orders(created_at desc);
create index if not exists idx_entitlements_customer on entitlements(customer_id);
create index if not exists idx_entitlements_order on entitlements(order_id);
create index if not exists idx_entitlements_product on entitlements(product_id);
create index if not exists idx_subscriptions_entitlement on subscriptions(entitlement_id);
create index if not exists idx_creator_subscriptions_creator on creator_subscriptions(creator_id);
create index if not exists idx_ledger_creator on creator_ledger_entries(creator_id, created_at desc);
create index if not exists idx_payout_requests_creator on payout_requests(creator_id);
create index if not exists idx_payout_requests_status on payout_requests(status);
create index if not exists idx_bookings_product on bookings(product_id);
create index if not exists idx_bookings_entitlement on bookings(entitlement_id);
create index if not exists idx_webinar_registrants_product on webinar_registrants(product_id);
create index if not exists idx_physical_orders_order on physical_orders(order_id);
create index if not exists idx_affiliates_creator on affiliates(creator_id);
create index if not exists idx_affiliates_code on affiliates(referral_code);
create index if not exists idx_affiliate_referrals_affiliate on affiliate_referrals(affiliate_id);
create index if not exists idx_admin_audit_admin on admin_audit_log(admin_user_id, created_at desc);
create index if not exists idx_failed_jobs_status on failed_jobs(status, next_retry_at);
create index if not exists idx_store_visits_creator on store_visits(creator_id, created_at desc);

-- RLS: enable on every public table, zero policies (all access through server code with service role)
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end $$;
