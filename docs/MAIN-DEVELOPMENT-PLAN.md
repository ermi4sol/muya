# MUYA — Main Development Plan

*The single authoritative plan. Finalized 2026-08-09. Supersedes all earlier plan versions.*

This plan builds the full MUYA platform as specified in the project docs (`development-prompt.md`, `technical-development-prompt.md`, `ui-design-prompt.md`), with these founder-confirmed adjustments:

1. **Chapa is deferred** (KYC + business registration pending). Until then MUYA uses the **order-request model** (below): the customer pays nothing through the site; the admin approves or rejects every order. `CHAPA-INTEGRATION-GUIDE.md` is written after deployment.
2. **Cloudflare (R2 + Queues) is deferred entirely.** Storage runs on Supabase Storage; background work runs on Netlify functions + a scheduled retry sweep with a `failed_jobs` table. `R2-MIGRATION-GUIDE.md` (switching storage if Supabase fills up) is written after deployment.
3. **All features are free for now.** Every creator gets the complete feature set — email marketing, discount codes, affiliates, branding removal, automations, unlimited products, everything. The three-tier structure (Free/Growth/Business) stays in the database and code as a feature-flag layer that is currently switched fully open, so activating tiers later is configuration, not a rebuild. `TIER-CUSTOMIZATION-GUIDE.md` (activating and pricing the three tiers exactly as the project docs specify) is written after deployment.
4. **Phase 0 is an interactive, guided setup session** done together in chat, step by step — Claude guides, the founder does the sign-ins Claude isn't permitted to do (account creation, passwords), Claude does all configuration after each sign-in. Any problem gets resolved in chat before moving to the next step.

---

## The order-request model (how "payments" work until Chapa)

**No money moves through the site.**

1. **Customer checks out normally** — picks the product (variant/quantity/shipping details for physical goods), enters their email, and taps the final **Place order** button. There is no payment step and no payment instructions. They immediately see an **"Order pending"** screen and get a "we received your order" email. The order is created with `payment_status = 'pending'`.
2. **The admin instantly receives the order request** in the admin panel's Orders queue (and by email) with **full information**: the product (title, type, variant, quantity, price), the customer (name, email, shipping details if physical), the creator (store name, email), and the complete order record (reference, totals, date).
3. **Admin approves or rejects:**
   - **Approve** → the order shows successful to **both sides**: the customer's order-status page flips to success, the customer receives the product (download link, course access, booking, community invite, or shipping flow — per product type), and both customer and creator get success emails ("your order is confirmed" / "you made a sale"). The 7% commission is computed and the creator's ledger credited per the spec — payouts and income reporting work from day one.
   - **Reject** → the customer's order-status page shows **"Order rejected"** (with the admin's reason if given) plus an email; the creator sees the rejected order in their dashboard. Nothing is fulfilled; no ledger entry.
4. **Free products** (lead magnets, free communities, free webinars) skip the queue and fulfill instantly.
5. Every order has a persistent **order-status page** (linked from the pending screen and all emails) that live-updates: pending → approved/rejected.

When Chapa is approved later, its payment webhook becomes an automatic caller of the same approve pipeline (payment confirmed = auto-approve). Nothing downstream changes.

---

# Phase 0 — Guided setup (done together, step by step, in chat)

Rules of the session: **(You)** = founder action — sign-ins, account creation, passwords, verification codes. **(Claude)** = done by Claude in your Chrome browser or from the workspace. We do the steps in order; if anything goes wrong we solve it in chat before continuing. Each step ends with a ✅ check.

**Already done ✔:** Supabase org **Muya** / project **Muya Project** created; keys received and wired into the local `.env.local`; session secrets generated.

### Step 0.1 — GitHub: get the code into your repo
- **(You)** Sign in to github.com as `ermi4sol` in Chrome. Then create a fine-grained personal access token for the `muya` repo (Claude navigates you to the exact page and tells you exactly what to click; you press the final Generate button and paste the token into chat).
- **(Claude)** Push the Phase 1 codebase to `github.com/ermi4sol/muya`.
- ✅ The repo shows the code on GitHub.

### Step 0.2 — Netlify: create the account and site
- **(You)** Create the Netlify account with **jemi4jo@gmail.com** (email sign-up + the verification email click).
- **(Claude)** In your browser: import the `muya` GitHub repo as a new site (you click the one GitHub-authorization approval when it appears), confirm Next.js build settings, set the site name (target: `muya.netlify.app`, with fallbacks if taken), and record the final URL as `NEXT_PUBLIC_APP_URL`.
- ✅ The Phase 1 landing page is live on the Netlify URL.

### Step 0.3 — Supabase: dashboard configuration
- **(You)** Sign in to supabase.com with **jemi4jo@gmail.com** in Chrome. Also (recommended) reconnect the Claude Supabase connector to this account so Claude can run database migrations directly in later phases.
- **(Claude)** In the dashboard: set Authentication → URL Configuration (Site URL = the Netlify URL, redirect URLs for local + production), create storage buckets `product-files` (private) and `store-images` (public) with 50 MB limits.
- ✅ Auth URLs saved; both buckets exist.

### Step 0.4 — Resend: transactional email
- **(You)** Create the Resend account (sign-up + email verification).
- **(Claude)** Create the API key `muya-production`, save it to the env vars. Development uses the test sender (`onboarding@resend.dev` — delivers only to your own address); buying + verifying a real domain is a pre-launch item, not needed now.
- ✅ `RESEND_API_KEY` captured.

### Step 0.5 — Google Calendar API
- **(You)** Make sure Chrome is signed into **ermiyas4solomon@gmail.com**; sign in to console.cloud.google.com and accept Google Cloud's terms if prompted.
- **(Claude)** Create the `MUYA` project, enable the Google Calendar API, configure the OAuth consent screen (External; you + test creators as test users), add scope `calendar.events`, create the OAuth Web client with local + Netlify redirect URIs.
- ✅ `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` captured.

### Step 0.6 — Zoom API
- **(You)** Create/sign in to the Zoom account with **ermiyas4solomon@gmail.com** at marketplace.zoom.us.
- **(Claude)** Create the **Server-to-Server OAuth** app `MUYA`, add meeting (and if available, webinar) scopes, activate the app.
- ✅ `ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET` captured. *(Note: true Zoom Webinars need a paid add-on; MUYA runs webinars on Zoom Meetings until then — same customer experience.)*

### Step 0.7 — Environment variables: final entry + verification
- **(Claude)** Enter the complete variable set in Netlify (Site configuration → Environment variables): app URL, Supabase keys, session/cron secrets, Resend, Google, Zoom. Reserved Chapa/R2 variables stay unset. Trigger a redeploy.
- ✅ Redeployed site loads correctly; every variable in the Setup Guide §6 master list is set. **Phase 0 complete — development proceeds uninterrupted from here.**

---

# Development phases

## Phase 1 — Foundations ✔ COMPLETE

Next.js (App Router) scaffold with the spec's repo structure, MUYA design system (teal/amber, mobile-first, Ethiopic-compatible self-hosted fonts), `next-intl` with all five locales (en/am/om/ti/so), shared UI primitives, `.env.example`, Netlify config. Verified: production build passes, all locales pre-render, screenshots approved.

## Phase 2 — Database: full schema, RLS, migrations

Every table from the technical spec as versioned SQL migrations (identity, subscriptions, products/attributes/variants, orders, entitlements, ledger, payouts, bookings, webinars, communities, physical orders, magic-link tokens, affiliates, audit log), plus launch adjustments: order approval fields (`approved_by`/`approved_at`/`rejection_reason`), the feature-flag/tier-config layer (fully open), and a `failed_jobs` table. All spec indexes; RLS on every table; typed query helpers in `/lib/db`; seed script (first admin user, demo creator). Applied to the live Supabase project.
**Done when:** migrations run cleanly, RLS verified (one creator can never read another's data), seed data visible.

## Phase 3 — Authentication (all three roles)

Passwordless magic-link auth for customers and creators (hashed tokens, 15–30 min expiry, Resend delivery, signed httpOnly session cookies, 30–90 days, silent refresh); admin auth at the unlinked `/admin/login` with email + password + **mandatory TOTP MFA**; role-based routing after sign-in; rate limiting on auth endpoints; restore-access page.
**Done when:** all three roles sign in end to end on the live deploy; MFA-less admins are blocked; rate limits trip.

## Phase 4 — Landing page

Full marketing page per the UI spec — header (logo, language switcher, Sign In/Up), hero, how-it-works, ten-product-type showcase, pricing section (showing "free while we launch" until tiers are activated), footer — translated, mobile-first. Sign-up creates the creator + subscription rows and routes into onboarding.
**Done when:** a stranger can understand MUYA in English or Amharic and sign up as a creator on the live URL.

## Phase 5 — Creator dashboard core + store editor

Dashboard shell (top bar, language switcher, profile menu), onboarding (store name → slug, profile, first-product prompt), dashboard home (revenue snapshot, recent orders, quick actions), My Store (profile editor, theme/design picker, drag-and-drop product list with sections, visibility toggles), full-screen store preview, settings. Image uploads to Supabase Storage.
**Done when:** a creator can fully set up their store and preview it live.

## Phase 6 — Product builders (all ten types)

The Add Product type picker and one builder per type per the UI spec: digital download, course (modules/lessons, YouTube unlisted embeds, attachments), coaching call (duration, price, availability grid, Calendar connect status), webinar (date/time, Zoom status, reminders), membership, lead magnet, custom product, external link, community, and **physical product with the full attribute → auto-generated variant matrix** (per-variant SKU/stock/price-override/image, shipping fee, COD toggle). All features open to every creator.
**Done when:** all ten types can be created, edited, published; the variant matrix generates correctly for any attribute combination.

## Phase 7 — Storefront + checkout (order-request model)

Public storefront at `/[slug]` — static generation with per-creator on-demand revalidation on publish; storefront home; all product page layouts (variant selectors, stock indicators, quantity stepper, cart for physical goods); bottom-sheet checkout ending in **Place order** (no payment step); "Order pending" confirmation + persistent live order-status page; "order received" email to the customer and instant order alert to the admin. Live stock/price fetched client-side so static pages never go stale. Storefront language switcher (visitor cookie, defaults to creator's locale).
**Done when:** a customer can order any product type into `pending` on the live deploy and watch its status page update.

## Phase 8 — Order approval + fulfillment engine + integrations

The **admin approve/reject pipeline** (the same pipeline Chapa's webhook will call later) and idempotent per-type fulfillment handlers in `/lib/fulfillment`: digital download/lead magnet (short-lived signed URLs by email + access page), course (viewer with modules/video/attachments), coaching call (per-creator Google Calendar OAuth, event + Meet link, slot booking), webinar (Zoom S2S, per-registrant join links, scheduled reminders), custom product (creator task queue), physical (stock decrement per variant, `physical_orders`, pending → shipped (tracking + email) → delivered). Approve credits the 7%-commission ledger; reject notifies both sides. Failed fulfillment lands in `failed_jobs` with scheduled retry + admin visibility.
**Done when:** approving a test order of each type delivers the right access/emails; double-approval is a no-op; rejection displays correctly; a killed job retries.

## Phase 9 — Community + realtime

First-party community feed per community on Supabase Realtime — posts (text/image), likes/comments, members tab, join-on-approval/free-join, live entitlement check on every access, creator moderation, post reporting into the admin trust & safety queue, access revocation on entitlement loss.
**Done when:** two browsers see each other's posts live; a revoked member is locked out immediately; reports reach the queue.

## Phase 10 — Money: ledger, income tab, payouts

The ledger engine (sale/refund/payout/adjustment entries with running `balance_after` + a reconciliation check that flags drift), creator Income tab (available + pending balance, transaction history, **Request Payout** sheet with bank/telebirr details), refund flow (reverses commission exactly, revokes entitlement), affiliate system (open to all while flags are open). Tier structure remains present but dormant.
**Done when:** commission math is unit-tested and provably correct; a full payout cycle works (request → admin approve → ledger debited).

## Phase 11 — Admin panel (full)

The complete MFA-protected `/admin` area with server-side role enforcement (superadmin/finance/support/trust_safety): dashboard home (GMV, commission revenue, active creators, signups, trend chart), **Orders queue** (the heart of the order-request model — full product/customer/creator/order detail, approve/reject with automatic emails), creator management (search/filter, drill-in stats, suspend/reinstate/verify), payout queue (approve → processing → paid / reject with reason), platform-wide transaction ledger with CSV export, revenue reporting, trust & safety (moderation queue, freeze community/storefront), support lookup (read-only), failed-jobs viewer — and `admin_audit_log` writes on **every** money/status action.
**Done when:** each admin role sees exactly (and only) its permitted surface; every consequential action lands in the audit log.

## Phase 12 — Polish: full i18n, emails, analytics, security hardening

Complete translations for all five locales across landing/storefront/dashboard/admin and **all** email templates (sent in the recipient's preferred locale, English fallback); the full Resend email set (magic links, order pending/approved/rejected, receipts, access links, shipping updates, booking/webinar confirmations + reminders, payout status, sale notifications); creator Analytics tab (visitors, leads, conversion, chart) + admin trend charts; security hardening (rate limits per spec, upload MIME validation + executable blocking, signed-URL expiry checks, CORS, secrets audit); structured JSON logging tagged with creator/customer/order ids.
**Done when:** no raw translation keys render anywhere in any locale; every lifecycle email sends; the spec's security checklist passes.

## Phase 13 — Testing, go-live + the three hand-off guides

The test suite from the technical spec — unit tests (commission/ledger math, entitlement resolution, magic-link tokens), integration tests (order → approve → entitlement → ledger; duplicate-approval idempotency; last-unit stock race) — plus the manual QA checklist: all ten product types end to end, a full payout cycle, a rejected order, language switch on all three surfaces, admin suspend/reinstate. Final verification on the live URL.

**Then the three step-by-step hand-off guides (written after full development + deployment, as promised):**
1. **`CHAPA-INTEGRATION-GUIDE.md`** — completing Chapa KYC/business registration, API keys, webhook registration, sandbox testing, and switching checkout from order-request to real Chapa payment (the webhook auto-calls the existing approve pipeline; the manual queue remains for COD and edge cases).
2. **`R2-MIGRATION-GUIDE.md`** — recognizing when Supabase Storage is running out, creating Cloudflare R2, credentials, migrating existing files, and flipping MUYA's storage adapter to R2 with zero downtime.
3. **`TIER-CUSTOMIZATION-GUIDE.md`** — activating the three-tier system exactly as the project docs specify: setting each tier's feature flags and product limits, pricing Growth/Business, the upgrade flow, and (post-Chapa) automatic subscription billing.

**Done when:** the definition-of-done lists in both spec docs pass on the live deployment, and all three guides are delivered.

---

## Working rhythm

Each development phase ends with a working deploy pushed live, a short progress note saved to the project, and anything needed from the founder clearly flagged in chat. Phase 0 runs interactively in chat, step by step, resolving problems as they appear. If anything discovered mid-phase changes the plan, this document gets updated — no silent drift.
