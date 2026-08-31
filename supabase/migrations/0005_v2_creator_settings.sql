-- ===== v2 creator settings (R5) =====
-- Applied live as migration "v2_creator_settings" via Supabase MCP.
-- payout_details: saved default payout account (method, account name/number, bank)
-- notification_prefs: Telegram notification toggles (e.g. {"sales": true, "orders": true})

alter table creators add column if not exists payout_details jsonb default '{}';
alter table creators add column if not exists notification_prefs jsonb default '{}';
