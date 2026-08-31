# MUYA v2 — Database Structure

Postgres on Supabase (project `nrfeyoqixygjkydtmepi`). All tables have RLS **enabled with zero policies** — every read/write goes through server code using the service-role key (or, for Better Auth tables, the direct Postgres connection). Migrations live in `/supabase/migrations` (v1 history archived in `/supabase/migrations-v1-archive`).

## Identity

v2 identity is **Telegram-first**, managed by Better Auth.

| Table | Purpose |
|---|---|
| `"user"`, `"session"`, `"account"`, `"verification"`, `"twoFactor"` | Better Auth tables (camelCase columns, text ids). `user.telegramId` links a Telegram account; the admin's user row has a `credential` account (password) + TOTP row. |
| `creators` | One row per seller. Keyed by `telegram_user_id` (unique). Also: `store_slug` (unique), display/bio/photo, `social_links`, `theme`, `payout_details` (saved payout account), `notification_prefs` (bot alert toggles), `status` active/suspended. |
| `customers` | One row per buyer, keyed by `telegram_user_id`. Creators automatically get a customers row too (they can buy). |
| `admin_users` | Admin accounts: email, role (superadmin/finance/support/trust_safety), `auth_user_id` (Better Auth link), `telegram_user_id` (bot alerts). |
| `admin_audit_log` | Every consequential admin action. |

## Platform settings & commission

| Table | Purpose |
|---|---|
| `platform_settings` | Single row: `commission_percent` (default 7.00), editable in Admin → Commission. |
| `commission_type_exclusions` | One row per product type; `is_excluded = true` → that type pays NO commission. |
| `creator_subscriptions` | Creator's MUYA tier (free / premium_growth / premium_business) — all features free at launch. |

## Products (9 types)

`digital_product · lead_magnet · coaching_call · course · webinar · affiliate_link · url_media · physical · custom_product`

| Table | Purpose |
|---|---|
| `products` | v2 fields: `type`, `title`, `subtitle`, `card_style` (button/callout/preview), `thumbnail_url` (400×400), `hero_image_url` (1920×1080), `description_body`, `bottom_title`, `cta_button_text`, `price`, `discount_price`, `config` (jsonb — per-type: file, modules, availability, starts_at, url, prompt, shipping_fee, cod_enabled, capture_method, reviews, order bump, affiliate share, tg_confirmation_template), `status` draft/active/archived, `sort_order`. |
| `product_custom_fields` | Creator-defined checkout questions (label + field_type), replaced wholesale on save. |
| `product_attributes` / `product_attribute_values` / `product_variants` | Physical variant system: attributes (Size, Color…) × values → variants with stock/SKU/price-override. |

## Orders & fulfillment

| Table | Purpose |
|---|---|
| `orders` | One row per product; a cart checkout creates several rows sharing `checkout_group_id`. Money: `item_amount`, `shipping_fee`, `total_charged`, `commission_amount` + `creator_net_amount` (computed at approval from the commission engine). `payment_status`: pending → paid / rejected / refunded. Approval fields: `approved_by/approved_at/rejection_reason`. `metadata` jsonb: locale, variant summary, slot, custom answers/fields, COD flag, stock guard. `chapa_tx_ref` reserved for Chapa later. |
| `entitlements` | Access grants (order → customer → product), revoked on refund. |
| `bookings` | Coaching bookings: slot, duration, Google Calendar event id, Meet link. |
| `webinar_registrants` | Zoom join links per registrant. |
| `physical_orders` | Shipping address, payment_method (order_request/chapa/cash_on_delivery), shipment_status, tracking. |
| `lead_captures` | Marketing contacts from lead magnets: `captured_email` OR `captured_telegram_username` (+customer link), per source product. |

## Money

| Table | Purpose |
|---|---|
| `creator_ledger_entries` | Append-only ledger: sale/payout/refund/adjustment with running `balance_after`. |
| `payout_requests` | Creator payout requests (bank/telebirr) processed by the admin. |
| `subscriptions` | Recurring entitlements (reserved for Chapa). |

## Growth (R6)

| Table | Purpose |
|---|---|
| `affiliates` | Invited partners: `name`, `referral_code`, `commission_percent`. Storefront `?ref=code` sets a cookie; checkout records referrals. |
| `affiliate_referrals` | Order-level referral records with `commission_amount`, payout_status held/paid. |
| `funnels` | Linear Telegram sequences: `steps` jsonb `[{message, delay_hours}]`, optional `trigger_product_id`, status draft/active. |
| `funnel_enrollments` | Per-person progress through a funnel; the hourly cron sends due steps. |
| `telegram_flows` | Broadcasts: `blocks` jsonb (text/button), draft → scheduled → sent, recipients_count. |

## Integrations & operations

| Table | Purpose |
|---|---|
| `creator_integrations` | Per-creator OAuth (google_calendar) tokens. Zoom is server-to-server (env only). |
| `rate_limits` | Fixed-window rate limiting shared across serverless instances. |
| `failed_jobs` | Dead-letter queue; the hourly Netlify scheduled function retries with backoff. |
| `store_visits` | Storefront visit beacons for analytics. |

## The hourly sweep (`netlify/functions/cron.mjs` → `/api/cron/run`)

1. Retries failed fulfillment jobs (backoff, max 5 attempts).
2. Sends webinar reminders via the bot (~24h before start).
3. Sends due funnel steps and scheduled flow broadcasts.
4. Self-heals the Telegram webhook registration.
