-- MUYA development seed (applied 2026-08-09 to the live project)
-- Tier config: ALL FEATURES FREE at launch. Activating the 3-tier system later
-- is done by changing this row per TIER-CUSTOMIZATION-GUIDE.md (post-launch).
insert into platform_settings (key, value) values (
  'tier_config',
  '{"mode":"all_free","tiers":{"free":{"max_products":null,"features":"all"},"premium_growth":{"max_products":null,"features":"all"},"premium_business":{"max_products":null,"features":"all"}}}'
) on conflict (key) do nothing;

-- First superadmin (password + TOTP MFA enrollment happens in Phase 3)
insert into admin_users (email, role) values ('ermiyas4solomon@gmail.com','superadmin')
on conflict (email) do nothing;

-- Demo creator + product for development testing
with c as (
  insert into creators (email, store_slug, display_name, bio, preferred_locale)
  values ('demo-creator@muya.test','demo','Demo Creator','Testing storefront for MUYA development.','en')
  on conflict (email) do nothing
  returning id
)
insert into creator_subscriptions (creator_id, tier)
select id, 'free' from c
on conflict (creator_id) do nothing;

insert into products (creator_id, type, title, description, price, status, sort_order)
select id, 'digital_download', 'Sample Recipe eBook', 'A demo digital product used during development.', 250.00, 'active', 1
from creators where store_slug = 'demo'
and not exists (select 1 from products where title = 'Sample Recipe eBook');
