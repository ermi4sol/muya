# MUYA v2 — Development Plan (the Telegram rework)

*Finalized 2026-08-31 from the founder's PDR + UI Design Instructions. Supersedes the v1 Main Development Plan for all new work. The live v1 site keeps running and is replaced phase by phase.*

## Locked decisions (founder-confirmed)

1. **Payments stay on the manual order-request model** until Chapa KYC — the admin approves orders; commission engine is still built fully (admin-set rate, per-type exclusions) and applies at approval. Chapa activation later follows `CHAPA-INTEGRATION-GUIDE.md` unchanged.
2. **Better Auth** is the identity layer: custom Telegram credential strategy for creators + customers, email/password/TOTP MFA for the single admin.
3. **Background jobs stay on Netlify** (failed-jobs table + scheduled sweep) — no Cloudflare Queues, keeping infra at $0.
4. **Clean database rebuild** on the v2 schema (all v1 data was test data).
5. **Multi-item cart** is modeled as one order per item sharing a `checkout_group_id` (keeps the PDR's single-product order rows intact).
6. Telegram bot: **@MuyaOfficialBot** (token stored in env). Login Widget domain: mymuya.netlify.app.

## What v2 removes from v1

Email magic-link auth for creators/customers (Resend stays ONLY for the admin account), the restore-access page, the **membership** product type, the entire **community** feature (feed, likes, comments, moderation, safety-queue UI for posts), and customer-facing emails (all replaced by Telegram bot messages).

## The 9 product types

digital_product · lead_magnet · coaching_call · course · webinar · affiliate_link · url_media · physical · custom_product

---

## R0 — Setup ✅ (complete)

Connectors verified (Supabase "Muya Project", Netlify jemi4jo/mymuya, GitHub), Telegram bot created (@MuyaOfficialBot), token in Netlify + local env. Remaining founder to-do: confirm BotFather `/setdomain` → `mymuya.netlify.app` (required for the Login Widget).

## R1 — Foundation swap: v2 schema + Better Auth + Telegram identity

Wipe the database and apply the v2 schema (PDR data model: Telegram identity columns, 9 product types, new product fields, `product_custom_fields`, `platform_settings` with `commission_percent`, `commission_type_exclusions`, `lead_captures`, plus kept operational tables: `rate_limits`, `failed_jobs`, `store_visits`, and `orders.checkout_group_id`). Install Better Auth: admin email/password + TOTP plugin; custom Telegram credential provider that verifies the Login Widget's HMAC signature server-side and provisions creators/customers on first login. Telegram bot service: webhook endpoint (`/api/telegram/webhook`, secret-token-verified), message sender with `protect_content`, `/start` deep-linking, and a "my purchases" command resolving entitlements by Telegram ID. Auth pages rebuilt: "Continue with Telegram" (creator sign-up/sign-in per UI pages 7–8), admin login unchanged in look, re-wired to Better Auth. Landing page auth buttons updated.
**Done when:** creator signs in via Telegram end to end on the live site; bot replies to /start and "my purchases"; admin logs in through Better Auth with MFA.

## R2 — Product engine v2: 9 types, three-tab builder

Products get the v2 fields (subtitle, card_style, thumbnail/hero images, description body, bottom title, CTA text, discount price). The builder becomes the three-tab flow — **Thumbnail** (style picker Button/Callout/Preview, 400×400 image, card text), **Checkout Page / "Product"** (1920×1080 hero, description block, price + strikethrough discount, collect-info step with addable custom fields, type-specific final step), **Options** (collapsible: reviews, order bump, affiliate share, Telegram confirmation-message template with merge tags) — with live preview per UI pages 24–26. New types affiliate_link and url_media; membership/community builders removed; lead magnet gets the email-or-Telegram capture choice.
**Done when:** all 9 types can be created through the three tabs and drafts/publishing work.

## R3 — Storefront v2

Storefront list per UI page 10: card styles rendered, **no prices in the list**, single centered column even on PC, physical products collapsed into one **Shop** card. Shop hub (grid + persistent cart badge), physical detail page (gallery, attribute pills, stock, quantity, add-to-cart), cart page, and the checkout flow shell. Product pages per UI pages 11–13 (price revealed on the product page, PC max-width columns, coaching calendar, lead-magnet inline form). Confirmation pages say "delivery arrives via Telegram".
**Done when:** a visitor can browse every type, fill a cart, and reach checkout on mobile and PC widths.

## R4 — Checkout, commission engine, Telegram fulfillment

Checkout captures Telegram identity (widget or bot handoff) + shipping/COD for physical; cart checkout creates grouped orders. Orders stay `pending` → admin approves (manual model). At approval: commission computed from `platform_settings.commission_percent` **unless** the product's type is excluded in `commission_type_exclusions`; ledger credited; fulfillment dispatched — now **entirely via the bot**: digital files sent with `protect_content`, course access links, booking confirmations (Google Calendar + Meet kept), webinar join links (Zoom kept), custom-product two-stage notifications, physical status updates; creator sale notifications via bot; every message names the creator. Lead magnets capture into `lead_captures` and fulfill instantly.
**Done when:** each of the 9 types delivers correctly through Telegram after approval, and commission respects rate + exclusions.

## R5 — Creator dashboard v2 (PC-first)

Per UI pages 20–28 + 35: dashboard shell with the full tab set; Home (date-range filter, Site Views / Revenue / Leads cards, trend chart); My Store with the **persistent live mobile-preview panel** on PC (button-preview on mobile); Shop tab (inventory table, variant builder, shipment view); Income v2 (revenue chart, Available for Cashout / Available Soon, payout request, filterable orders table); Appointments tab; Settings as tabs (Profile, Integrations, Billing, Payout details, Telegram notification preferences).
**Done when:** a creator can run everything from a PC browser with the live preview, and mobile remains usable.

## R6 — Growth features

Analytics tab (multiple charts: trend, top products, traffic sources, repeat rate, with filters), Audience tab (customers + captured leads with source/method), Referrals tab (affiliates table, commission setting, invites), Funnels tab (linear Telegram message/offer sequences), Telegram Flows tab (broadcasts/automations with block editor + Telegram-style preview).
**Done when:** each tab works against real data from test purchases.

## R7 — Admin v2, hardening, launch

Admin lands on **Dashboard** first (GMV, commission revenue, subscription revenue, creators, signups, big chart); **commission management** UI (rate field + 9 per-type exclusion toggles) inside Commission & Revenue reporting; tier management; support lookup by Telegram handle/name; admin Telegram alerts (new products, payout requests) to the linked admin account; safety pared to storefront/creator actions (communities gone). Security pass on the Telegram/Better Auth chain, updated docs (database structure v2), and a **full v2 testing checklist**.
**Done when:** the PDR's requirements all pass on the live site and the v2 checklist is delivered.

---

## Working rhythm

Build each phase locally → one deploy per phase → founder tests from the checklist → fixes batched. Keys and tokens live only in Netlify env + the workspace. This document is updated whenever a decision changes — no silent drift.
