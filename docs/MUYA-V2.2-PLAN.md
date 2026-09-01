# MUYA v2.2 — Shop, Branding, Store Sections, Webinar Rework & Cleanup Pass

*Planned 2026-09-01. Status: **NOT built yet** — build starts only when the founder reviews this file and says go. Everything ships as ONE build phase → ONE deploy (intermediate commits `[skip netlify]`).*

Five parts: **(1)** the e-commerce Shop, **(2)** the changeable company name, **(3)** My Store → Products cleanup + storefront sections, **(4)** creator-owned webinar links with protected registration, **(5)** the small-debts cleanup pass.

---

## Part 0 — One migration for everything (`0008_v2_2.sql`, applied live via MCP)

```sql
-- Part 1: shop
create table shop_categories (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references creators(id) on delete cascade,
  name text not null,
  sort_order int default 0,
  created_at timestamptz default now()
);
alter table products add column shop_category_id uuid references shop_categories(id) on delete set null;
-- gallery images + low-stock threshold live in products.config (jsonb): {"gallery":[urls], "low_stock_threshold":3}

-- Part 2: branding
alter table platform_settings add column company_name text not null default 'MUYA';

-- Part 3: storefront sections
create table storefront_sections (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references creators(id) on delete cascade,
  title text not null,
  sort_order int default 0
);
alter table products add column section_id uuid references storefront_sections(id) on delete set null;
alter table creators add column shop_card_sort int default 9999;  -- where the Shop card sits in the storefront list

-- Part 4: webinar access
create table webinar_access (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) unique,
  product_id uuid references products(id),
  customer_id uuid references customers(id),
  token text unique not null,            -- 32-hex, generated at approval
  used_at timestamptz,                   -- first successful open (for the creator's registrant list)
  created_at timestamptz default now()
);
```
Indexes on every FK; RLS enabled, zero policies (same pattern as everything else).

---

## Part 1 — The e-commerce Shop

### 1.1 Customer side — Shop hub `/[slug]/shop` (rework)

**File:** `app/[locale]/[slug]/shop/page.tsx` (server: loads physicals + categories + sales counts) + **new** `components/storefront/ShopBrowser.tsx` (client — all browsing is instant, no reloads).

- **Sticky top bar**: search box (matches title + subtitle as you type) + the cart badge.
- **Category chips** under it: `All` + the creator's categories, in their order. Tapping filters the grid.
- **Sort dropdown**: Newest · Price low→high · Price high→low · Best-selling (paid-order counts computed server-side and passed in).
- **Filters row**: price min/max inputs + "In stock only" toggle.
- **Grid** (2-col mobile / 4-col PC): image, name, starting price, and badges — `SALE` (has discount_price), `NEW` (created <14 days), `LOW STOCK` (total stock ≤ threshold, default 3), `SOLD OUT` (0 everywhere).
- Product count line ("8 products") + friendly empty state when filters match nothing.

### 1.2 Customer side — physical detail `/[slug]/shop/[id]` (upgrade)

**Files:** `app/[locale]/[slug]/shop/[id]/page.tsx` + **new** `components/storefront/ProductGallery.tsx`.

- **Real gallery**: hero + thumbnail + up to 6 extra images from `config.gallery` — swipeable main image with a thumbnail strip (tap to switch), arrows on PC.
- **"More from this shop"** row at the bottom: up to 4 other physicals (same category first).

### 1.3 Builder — physical products (additions)

**File:** `components/dashboard/ProductBuilder.tsx` (physical TypeStep) + **new API** `app/api/creator/shop-categories/route.ts` (GET/POST/PATCH/DELETE).

- **Category select** with "+ new category" inline (creates via API, no page leave).
- **Gallery uploader**: add up to 6 extra images (reuses `/api/creator/upload`), thumbnails with remove ✕, order preserved.
- **Low-stock threshold** number field (default 3) → `config.low_stock_threshold`.

### 1.4 Creator side — Shop tab `/dashboard/shop` (rework into 3 sub-tabs)

**Files:** `app/[locale]/dashboard/shop/page.tsx` + **new** `components/dashboard/ShopInventory.tsx`, `components/dashboard/CategoryManager.tsx` + **new API** `app/api/creator/variants/[id]/route.ts` (PATCH stock).

- **Inventory** (default): search box + category filter + stock filter (All / Low / Out). Table rows: image, name, category, variants, total stock (red when low/out), price, status — **stock editable inline** per variant (expand row → variant list with steppers, saves immediately). Low-stock rows flagged ⚠️.
- **Categories**: create, rename, reorder (▲▼), delete (products fall back to uncategorized). Shows product count per category.
- **Shipments**: the current shipment cards, now with filter chips **To ship / Shipped / Delivered** and the buyer's info laid out print-friendly.

---

## Part 2 — Changeable company name

> Founder handles the two external identifiers himself when renaming: the bot handle (BotFather → /setname + /setusername, then /setdomain again) and the site address (Netlify → change site name, then I update `NEXT_PUBLIC_APP_URL` + `GOOGLE_REDIRECT_URI` env vars). Everything below is what the platform changes automatically.

### 2.1 Admin UI

**Files:** `app/[locale]/admin/page.tsx` + **new** `components/admin/CompanyNameCard.tsx` + **new API** `app/api/admin/settings/route.ts`.

- New card directly **under the Telegram alerts card**: "Company name" — free-text input (letters, numbers, symbols, emoji, spaces — anything, 1–40 chars) + Save. Audited in `admin_audit_log`.

### 2.2 The brand helper

**New file:** `lib/branding.ts` — `getCompanyName()` reads `platform_settings.company_name` (React `cache()` per request, safe fallback "MUYA").

### 2.3 Every place the name changes automatically

| Surface | Files touched |
|---|---|
| Landing page: header logo, hero, "How it works", footer, `<title>`/OG metadata | `app/[locale]/(marketing)/page.tsx`, root layout metadata |
| Auth pages: logo, "welcome to X" copy | `components/auth/AuthShell.tsx`, signin/signup pages |
| Storefront: "Powered by X" footer, order/access/checkout copy | storefront pages — the locale strings that hard-code "MUYA" become `{company}` parameters (keys: `shop.poweredBy`, `shop.pendingBody`, `shop.statusTelegram`, `auth.telegramHint`, and every other key containing "MUYA" — full sweep of all 5 locale files) |
| Creator dashboard: header logo, onboarding copy | `app/[locale]/dashboard/layout.tsx`, onboarding page |
| Admin: "X administration" header | `components/admin/AdminNav.tsx`, admin login/setup pages |
| Telegram bot: welcome, purchases list, order messages, creator sale alerts, admin alerts, funnel/broadcast signatures | `app/api/telegram/webhook/route.ts`, `lib/telegram/notify.ts`, `lib/telegram/admin.ts`, `lib/telegram/growth.ts` |
| Admin emails: subject lines + branded header/footer | `lib/email/send.ts`, `lib/email/orders.ts` |
| Course viewer, learn/access pages | headers referencing MUYA |

The name is fetched server-side per request — a change in the admin card is live everywhere on the next page load / next bot message, no redeploy.

---

## Part 3 — My Store → Products cleanup + storefront sections

### 3.1 Physical products leave the My Store list

**File:** `components/dashboard/MyStoreEditor.tsx` (products tab).

- The Products list shows **only non-physical products**. A small note card at the bottom: "🛍️ Physical products are managed in the **Shop tab**" (links there) — so nothing looks lost.
- Reordering/visibility there affects only non-physical items.

### 3.2 Sections (storefront grouping)

**Files:** `MyStoreEditor.tsx` (products tab), `app/[locale]/[slug]/page.tsx` (render), **new API** `app/api/creator/sections/route.ts`.

- In the Products tab, next to "+ Add product": **"+ Add section"** — creates a titled section (e.g. "Courses", "Free stuff", "Work with me").
- Each product row gets a small section dropdown; sections can be renamed, reordered (▲▼), deleted (products fall back to the top, unsectioned).
- **Storefront render**: unsectioned products first, then each section as a heading in the creator's theme with its products under it. The **Shop card** gets its own position control ("Shop card position" row in the list, movable like a product → saves `creators.shop_card_sort`).

---

## Part 4 — Webinars: creator's own link + protected registration

### 4.0 The answer to "whose Zoom account?"

In v2.0/2.1 the platform creates the Zoom meeting on **MUYA's own Zoom account** (the server-to-server credentials in the env) — every webinar for every creator lands on our account. v2.2 removes that entirely: **the creator brings their own link** (their Zoom, Google Meet, StreamYard, anything), and MUYA's job becomes protecting who gets it.

### 4.1 Builder change

**File:** `ProductBuilder.tsx` (webinar TypeStep).

- Replace the "Zoom is created automatically" note with a **"Your webinar link"** URL field (`config.webinar_url`) + the existing date/time + duration. Help text: "Paste your Zoom/Meet registration or join link — buyers never see it directly; each buyer gets their own protected MUYA link."

### 4.2 Protected delivery — how the link works

**New route:** `app/[locale]/w/[token]/page.tsx` (+ `w` added to RESERVED_SLUGS in `lib/auth/provision.ts`).

At **approval**, fulfillment (`lib/fulfillment/index.ts`) creates a `webinar_access` row with a random 32-hex token for THAT buyer, and the bot's confirmation button becomes `mymuya.netlify.app/w/<token>` — never the raw link.

Opening `/w/<token>`:
1. **Not signed in with Telegram** → "Continue with Telegram" prompt (customer intent, returns here).
2. **Signed in but a different person than the buyer** → blocked: "This access link belongs to someone else's purchase. Buy the webinar to get your own." (+ button to the product page). *A forwarded link is dead on arrival — even before it's ever used.*
3. **Signed in as the buyer** → first open stamps `used_at` (this is how the creator's registrant list knows who actually registered), then shows a "You're in 🎉" page revealing the creator's real link / redirecting to it. The buyer can re-open their own link anytime (phone → laptop, before the event, etc.) — it only ever works for *their* Telegram account.

This is strictly stronger than plain one-time-use: a one-time link dies for the buyer too if they mis-click, while identity-binding keeps it alive for the buyer and dead for everyone else, forever. Every later buyer gets their own token, so purchase #2, #3, … always work.

### 4.3 What gets removed / kept

- **Removed:** Zoom meeting creation in `fulfillOrder` (webinar case), `config.zoom_join_url` logic. `lib/integrations/zoom.ts` + the three ZOOM_* env vars are retired (file kept, unused, for a possible future "auto-create" premium option).
- **Kept:** webinar date/time (storefront display + bot messages) and the **24h cron reminder** — the reminder button now also points to the buyer's own `/w/<token>` link.
- `webinar_registrants` keeps working as the creator-facing registration record (a row is completed when `used_at` stamps).

---

## Part 5 — Cleanup pass (small known debts)

### 5.1 Separate admin session (fixes the one-browser collision)

*The bug you hit: signing in as a creator replaces the admin session, because both share one auth cookie.*

**Files:** **new** `lib/auth/admin-auth.ts` (a second Better Auth instance on the same database with `cookiePrefix: "muya-admin"` and `basePath: "/api/admin-auth"`), **new** `app/api/admin-auth/[...all]/route.ts`, **new** `lib/auth/admin-client.ts` (auth client pointed at `/api/admin-auth`); `app/[locale]/admin/login/page.tsx` + `admin/setup` + the bootstrap route switch to it; `getAdminSession()` in `lib/auth/session.ts` reads the admin instance.

- Result: admin and creator sessions live in **different cookies** — you can be signed into /admin and /dashboard in the same browser at the same time, no more seesaw.
- The admin sign-out shim (`/api/auth/logout?admin=1`) signs out the admin cookie only.

### 5.2 Admin session duration back to 12 hours

On the new admin auth instance: `session.expiresIn: 12h`, no long cookie cache — matching v1's stricter posture. Creator/customer sessions stay 60 days.

### 5.3 Dead locale-key pruning

A sweep script compares every key in the 5 locale files against actual `t("…")` usage in code, and deletes orphans (v1 leftovers: magic-link auth strings, `restore*`, `checkEmail*`, community/membership strings, `statusEmailed`, etc.). Same keys removed from all 5 languages so the files stay mirrored.

### 5.4 Health endpoint lockdown

`/api/health` becomes two-mode: public call returns only `{ ok: true }`; the full env/DB detail requires the `x-setup-key: CRON_SECRET` header. (Deferred from R7 hardening.)

### 5.5 Retire dead v1 modules

Remove modules nothing imports anymore after Part 4 (`lib/integrations/zoom.ts` retirement per 4.3, `lib/payments` remnants, unused queue helpers if orphaned) — verified by typecheck + grep before deletion.

---

## Build order (single phase → single deploy)

1. Migration `0008_v2_2` via MCP (+ local file).
2. Part 2 branding helper first (small, touches everything — get it in before the rest so new UI is written against `getCompanyName()`).
3. Part 4 webinar rework (fulfillment + route + builder).
4. Part 3 sections + My Store cleanup.
5. Part 1 Shop (biggest chunk last).
6. Locale keys for all new UI in all 5 languages.
7. Part 5 cleanup pass (admin session split last — it touches login flows; re-test admin sign-in immediately).
8. Build + typecheck → ONE deploy → test from **docs/TESTING-CHECKLIST-V2.2.md** (the consolidated final checklist):
   - shop search/chips/sort/filters/badges, gallery swipe, inline stock edit, category CRUD
   - company rename end-to-end (page loads + a bot message + an admin email)
   - sections render on storefront; physical absent from My Store list; Shop card position moves
   - webinar: buy → bot button → /w/ link works for buyer (twice, two devices), forwarded link blocked, second buyer's link works, reminder button works

**Not in v2.2** (unchanged): payments model, commission engine, funnels/flows, admin panel core, Chapa/R2 guides — external-world switches live in docs/LAUNCH-SWITCHES.md.
