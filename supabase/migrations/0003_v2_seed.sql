-- ===== MUYA v2 seed =====
-- Applied live via Supabase MCP execute_sql (idempotent).

insert into platform_settings (commission_percent) select 7.00
where not exists (select 1 from platform_settings);

insert into commission_type_exclusions (product_type, is_excluded)
values
  ('digital_product', false), ('lead_magnet', false), ('coaching_call', false),
  ('course', false), ('webinar', false), ('affiliate_link', false),
  ('url_media', false), ('physical', false), ('custom_product', false)
on conflict (product_type) do nothing;

insert into admin_users (email, role, mfa_enabled)
select 'ermiyas4solomon@gmail.com', 'superadmin', false
where not exists (select 1 from admin_users where email = 'ermiyas4solomon@gmail.com');
