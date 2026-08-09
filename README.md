# MUYA

**Sell anything. Get paid. One link.**

MUYA is a creator-commerce platform for Ethiopian creators — one storefront link that sells ten product types (digital downloads, courses, coaching calls, webinars, memberships, lead magnets, custom products, external links, communities, and physical goods), fully multilingual (English, Amharic, Afaan Oromoo, Tigrinya, Somali), with customers buying through passwordless email access.

**Live:** https://mymuya.netlify.app

## How it works (current launch model)

- Customers place orders with **no online payment** (order-request model): checkout → order shows *pending* → the MUYA admin reviews the full order details and **approves or rejects** it → both customer and creator are notified by email, and approved customers receive their product automatically.
- MUYA computes a **7% commission** per sale into a creator ledger; creators request payouts (bank/telebirr) which admins process.
- **All features are currently free for every creator.** The three-tier system (Free / Growth / Business) exists in the platform config and will be activated later.
- Chapa online payments and Cloudflare R2 storage are planned post-launch integrations (guides in `/docs` when delivered).

## Tech stack

| Role | Service |
|---|---|
| Frontend + serverless backend | Next.js (App Router) on Netlify |
| Database / Auth / Storage / Realtime | Supabase (Postgres) |
| Transactional email | Resend |
| Calendar (coaching calls) | Google Calendar API (per-creator OAuth) |
| Video sessions (webinars) | Zoom API (Server-to-Server OAuth) |
| Internationalization | next-intl — `en`, `am`, `om`, `ti`, `so` |

## Development progress

| Phase | Scope | Status |
|---|---|---|
| 0 | Setup: Netlify, Supabase, GitHub, Resend, Google Calendar API, Zoom API, env vars | ✅ Done — 2026-08-09 |
| 1 | Foundations: Next.js scaffold, MUYA design system, i18n (5 locales), repo structure | ✅ Done — 2026-08-09 |
| 2 | Database: 26-table schema, indexes, RLS lockdown, seed (see [docs/DATABASE-STRUCTURE.md](docs/DATABASE-STRUCTURE.md)) | ✅ Done — 2026-08-09 |
| 3 | Authentication: magic links (creators/customers), admin password + TOTP MFA | ✅ Done — 2026-08-09 |
| 4 | Landing page (full marketing site) | ✅ Done — 2026-08-09 |
| 5 | Creator dashboard core + store editor | ✅ Done — 2026-08-09 |
| 6 | Product builders (all ten types) | ✅ Done — 2026-08-09 |
| 7 | Storefront + checkout (order-request model) | ✅ Done — 2026-08-09 |
| 8 | Order approval + fulfillment engine + Calendar/Zoom integrations | ⏳ Next |
| 9 | Community + realtime | Planned |
| 10 | Money: ledger, income tab, payouts | Planned |
| 11 | Admin panel (full) | Planned |
| 12 | Polish: full i18n, emails, analytics, security hardening | Planned |
| 13 | Testing, go-live + Chapa/R2/tier hand-off guides | Planned |

Full plan: [docs/MAIN-DEVELOPMENT-PLAN.md](docs/MAIN-DEVELOPMENT-PLAN.md) · Setup guide: [docs/SETUP-AND-DEPLOYMENT-GUIDE.md](docs/SETUP-AND-DEPLOYMENT-GUIDE.md)

## Repository structure

```
/app                 → Next.js App Router routes ([locale]/ marketing, auth, storefront, dashboard, admin)
/components          → shared UI components (MUYA design system)
/lib                 → server logic: db, auth, payments, integrations, fulfillment, queue, i18n
/locales             → translation files (en, am, om, ti, so)
/supabase/migrations → versioned SQL migrations (applied to the live project)
/docs                → plans, guides, database documentation
/i18n                → next-intl routing/request configuration
```

## Local development

```bash
npm install
cp .env.example .env.local   # fill in values (see docs/SETUP-AND-DEPLOYMENT-GUIDE.md §6)
npm run dev
```

Deploys automatically on push to `main`.
