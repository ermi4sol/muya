# MUYA

**Sell anything. Get paid. One link.**

MUYA is a creator-commerce platform for Ethiopian creators — one storefront link that sells nine product types (digital products, lead magnets, coaching calls, courses, webinars, affiliate links, links/media, physical goods, and custom products), fully multilingual (English, Amharic, Afaan Oromoo, Tigrinya, Somali). **v2 is Telegram-native**: customers and creators sign in with Telegram, and every delivery and notification arrives through @MuyaOfficialBot.

**Live:** https://mymuya.netlify.app

## How it works (launch model)

- Customers place orders with **no online payment** (order-request model): checkout with Telegram identity → order shows *pending* → the MUYA admin reviews and **approves or rejects** → the bot notifies both sides and delivers the product (files sent with forwarding protection, Meet/Zoom links, shipping updates).
- Commission per sale is **admin-configurable** (default 7%, with per-type exclusions) and credited to a creator ledger; creators request payouts (bank/telebirr) which the admin processes.
- **All features are currently free for every creator.** The three-tier system exists underneath for later activation.
- Chapa online payments and Cloudflare R2 storage are planned post-launch (guides in `/docs`).

## Tech stack

| Role | Service |
|---|---|
| Frontend + serverless backend | Next.js (App Router) on Netlify |
| Database / Storage | Supabase (Postgres) |
| Identity | Better Auth — Telegram Login Widget (creators/customers), email+password+TOTP (admin) |
| Messaging & delivery | Telegram Bot API (@MuyaOfficialBot), protect_content |
| Transactional email | Resend (admin alerts only) |
| Calendar (coaching) | Google Calendar API (per-creator OAuth, Meet links) |
| Video (webinars) | Zoom API (Server-to-Server OAuth) |
| Internationalization | next-intl — `en`, `am`, `om`, `ti`, `so` |

## v2 development (the Telegram rework)

| Phase | Scope | Status |
|---|---|---|
| R0 | Setup: connectors, @MuyaOfficialBot, env | ✅ 2026-08-31 |
| R1 | v2 schema rebuild, Better Auth, Telegram identity + bot webhook | ✅ 2026-08-31 |
| R2 | Product engine v2: 9 types, three-tab builder with live preview | ✅ 2026-08-31 |
| R3 | Storefront v2: card styles, no list prices, Shop hub + cart | ✅ 2026-08-31 |
| R4 | Checkout (Telegram identity, cart groups), commission engine, bot fulfillment | ✅ 2026-08-31 |
| R5 | PC-first creator dashboard (live preview, Shop/Income/Appointments/Settings) | ✅ 2026-08-31 |
| R6 | Growth: Analytics, Audience, Referrals, Funnels, Telegram Flows | ✅ 2026-08-31 |
| R7 | Admin v2 (Dashboard-first, commission controls, TG alerts), hardening, docs | ✅ 2026-08-31 |

Plan: [docs/MUYA-V2-PLAN.md](docs/MUYA-V2-PLAN.md) · Database: [docs/DATABASE-STRUCTURE.md](docs/DATABASE-STRUCTURE.md) · Testing: [docs/TESTING-CHECKLIST-V2.md](docs/TESTING-CHECKLIST-V2.md)

## Repository structure

```
/app                 → Next.js App Router routes ([locale]/ marketing, auth, storefront, shop/cart, dashboard, admin)
/components          → shared UI (MUYA design system, storefront, dashboard, admin)
/lib                 → server logic: auth (Better Auth + Telegram), db, fulfillment, commission, telegram, integrations
/locales             → translation files (en, am, om, ti, so)
/supabase/migrations → versioned SQL migrations (applied to the live project)
/docs                → plans, guides, database documentation, testing checklists
/i18n                → next-intl routing/request configuration
```

## Local development

```bash
npm install
cp .env.example .env.local   # fill in values (see docs/SETUP-AND-DEPLOYMENT-GUIDE.md)
npm run dev
```

Deploys on push to `main` (commits marked `[skip netlify]` are not built).
