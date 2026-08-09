# MUYA — Setup & Deployment Guide

This guide walks you through creating every service account MUYA needs, in the right order, and collecting every key and secret into environment variables. Do these steps once, before (or in parallel with) development. Each section ends with a checklist of the exact values you'll have collected.

**Services covered now:** Supabase, Netlify, Google Calendar API, Zoom API, Resend, environment variables.

**Deferred on purpose (separate guides will be written after full development + deployment):**
- **Cloudflare R2** — only needed if/when Supabase Storage runs out. You'll get `R2-MIGRATION-GUIDE.md`.
- **Chapa** — needs KYC + business registration. Until then, MUYA uses a built-in manual purchase-approval flow (customer submits purchase → admin approves → emails go out to customer and creator). You'll get `CHAPA-INTEGRATION-GUIDE.md`.

---

## 0. Prerequisites (10 minutes)

1. **A Google account** (Gmail) — used for Google Cloud, and handy for signing up to the other services.
2. **A GitHub account** — Netlify deploys directly from a GitHub repository. If you don't have one: https://github.com → Sign up → verify email.
3. **Create an empty GitHub repository** for MUYA:
   1. On GitHub, click **New repository**.
   2. Name: `muya` (or anything you like). Visibility: **Private**.
   3. Do NOT initialize with a README (the code will be pushed into it).
   4. Note the repository URL, e.g. `https://github.com/YOUR-USERNAME/muya`.
4. **A dedicated email address** for service accounts is a good idea (you can use your normal one, but keeping all MUYA infrastructure under one email makes handover/recovery easier).

> **Tip:** as you go through this guide, keep a private note (not in the repo!) where you paste each key/secret as you get it. Section 6 shows the full final list.

---

## 1. Supabase (database, auth, storage, realtime)

Supabase gives MUYA its Postgres database, file storage, auth, and the realtime engine for the community feed — all on one free project.

### 1.1 Create the account and project

1. Go to https://supabase.com → **Start your project** → sign up (GitHub sign-in is easiest).
2. You'll land in the dashboard. If asked to create an **organization**, create one (name: `MUYA`, plan: **Free**).
3. Click **New project**:
   - **Name:** `muya-production`
   - **Database password:** click **Generate a password**, then **copy it and save it** in your notes. You rarely need it day-to-day, but you cannot easily recover it.
   - **Region:** choose **Central EU (Frankfurt)** — the closest region to Ethiopia with reliably good routing.
   - Click **Create new project** and wait ~2 minutes while it provisions.

### 1.2 Collect the API keys

1. In the project, go to **Settings (gear icon) → API** (on newer dashboards: **Settings → API Keys** / **Data API**).
2. Copy these three values:
   - **Project URL** — looks like `https://abcdefghijk.supabase.co` → this is `NEXT_PUBLIC_SUPABASE_URL`.
   - **anon / public key** (newer dashboards call this the **publishable key**, starts with `sb_publishable_` or `eyJ...`) → `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Safe to ship to browsers.
   - **service_role key** (newer dashboards: **secret key**, `sb_secret_...` or `eyJ...`) → `SUPABASE_SERVICE_ROLE_KEY`. **This bypasses all row-level security. Treat it like a bank password: server-side environment variable only, never in client code, never committed to git.**

### 1.3 Configure authentication

1. Go to **Authentication → Sign In / Providers** (older dashboards: **Authentication → Providers**).
2. Make sure **Email** is enabled. Disable "Confirm email" double-opt-in if it's on — MUYA's magic-link flow is itself the verification.
3. Go to **Authentication → URL Configuration**:
   - **Site URL:** for now put `http://localhost:3000`. **You will come back and change this to your Netlify URL after Section 2** (e.g. `https://muya.netlify.app`).
   - **Redirect URLs:** add both `http://localhost:3000/**` and (later) `https://YOUR-SITE.netlify.app/**`.
4. (Optional but recommended once Resend is set up, Section 5): **Authentication → Emails → SMTP Settings** → enable custom SMTP using Resend, so auth emails come from your own sender address with good deliverability:
   - Host: `smtp.resend.com`, Port: `465`, Username: `resend`, Password: your Resend API key, Sender: your verified sender address.

### 1.4 Create the storage buckets

1. Go to **Storage** → **New bucket**. Create two buckets:
   - `product-files` — **Private** bucket. Holds digital downloads, lead magnets, course attachments. Files here are only ever served through short-lived signed URLs after an entitlement check.
   - `store-images` — **Public** bucket. Holds product images, profile photos, storefront banners (these are meant to be publicly viewable anyway).
2. In each bucket's settings, set an upload file-size limit (e.g. 50 MB) — this protects your free-tier quota (1 GB total storage, 5 GB egress/month on the free plan). When you approach the storage cap, that's when the R2 migration guide comes into play.

### 1.5 Database schema

**Nothing to do manually.** The database tables, indexes, and row-level-security policies are created by versioned migration files in the repository (`/supabase/migrations`). During development I'll give you a single copy-paste step (or run them via the Supabase SQL editor) once the project exists. Just have the project created and the keys collected.

### ✅ Section 1 checklist
| Value | Env var name |
|---|---|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| anon/publishable key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| service_role/secret key | `SUPABASE_SERVICE_ROLE_KEY` |
| Database password | (keep in your notes only) |

---

## 2. Netlify (hosting + serverless backend)

Netlify hosts the Next.js frontend, runs all API routes as serverless functions, and holds every secret as environment variables. Its free tier allows commercial use.

### 2.1 Create the account and site

1. Go to https://www.netlify.com → **Sign up** → choose **Sign up with GitHub** (this also grants repo access in one step).
2. In the Netlify dashboard: **Add new project** (older UI: *Add new site*) **→ Import an existing project → GitHub**.
3. Authorize Netlify for your GitHub account and pick the `muya` repository.
   - *If the repo is still empty at this point, that's fine — you can also do this step after the first code push. Netlify will just show a failed/empty first build until code exists.*
4. Build settings (Netlify auto-detects Next.js; confirm these):
   - **Build command:** `npm run build`
   - **Publish directory:** leave what Netlify suggests (`.next` handled via its Next.js runtime plugin — do not override).
5. Click **Deploy**. Your site gets a random name like `wonderful-otter-123abc.netlify.app`.

### 2.2 Pick your subdomain

1. Go to **Site configuration → Site details → Change site name**.
2. Set it to something clean, e.g. `muya` → your live URL becomes `https://muya.netlify.app` (first come, first served — try variants like `muya-store` if taken).
3. This URL is your `NEXT_PUBLIC_APP_URL`. **Now go back to Supabase → Authentication → URL Configuration and set the Site URL + Redirect URL to this domain (Section 1.3).**

### 2.3 Add environment variables

1. Go to **Site configuration → Environment variables → Add a variable**.
2. Add every variable from the master table in **Section 6** (add them as you collect them through this guide — you can add/edit any time; redeploy after changes for them to take effect).
3. Scope: **All scopes / All deploy contexts** is fine for now.

### 2.4 Deploys from now on

- Every `git push` to the main branch triggers an automatic build and deploy. There is no separate "upload" step, ever.
- **Deploys → Trigger deploy → Deploy site** re-deploys manually (needed after changing environment variables).
- Free-tier limits to be aware of: 100 GB bandwidth/month, 125k serverless function invocations/month, 300 build minutes/month — plenty for launch.

### ✅ Section 2 checklist
| Value | Env var name |
|---|---|
| Your live URL, e.g. `https://muya.netlify.app` | `NEXT_PUBLIC_APP_URL` |
| Supabase Site URL updated to Netlify URL | (Supabase dashboard setting) |

---

## 3. Google Calendar API (coaching-call bookings)

When a customer books a coaching call, MUYA creates a calendar event (with a Google Meet link) on the **creator's** Google Calendar. Creators connect their own Google account from the dashboard, so MUYA needs an OAuth application.

### 3.1 Create the Google Cloud project

1. Go to https://console.cloud.google.com (sign in with your Google account).
2. Top bar → project selector → **New project**. Name: `MUYA`. Create, then make sure it's selected.

### 3.2 Enable the Calendar API

1. Left menu → **APIs & Services → Library**.
2. Search **Google Calendar API** → open it → **Enable**.

### 3.3 Configure the OAuth consent screen

1. **APIs & Services → OAuth consent screen** (newer consoles: **Google Auth Platform → Branding**).
2. User type: **External** → Create.
3. Fill in: App name `MUYA`, support email (yours), developer contact email (yours). App domain fields can be your Netlify URL. Save.
4. **Scopes** step: click **Add or remove scopes**, and add:
   - `https://www.googleapis.com/auth/calendar.events` (create/edit events)
   - Save and continue.
5. **Test users** step: add your own Gmail address, and the Gmail address of any creator who will test coaching calls. Save.
   > While the app is in **Testing** mode, only listed test users can connect their calendar — perfect for development. Before real public launch you'll click **Publish app**; Google may show an "unverified app" warning screen until you complete their (optional, later) verification, but the connection still works.

### 3.4 Create the OAuth credentials

1. **APIs & Services → Credentials → Create credentials → OAuth client ID**.
2. Application type: **Web application**. Name: `MUYA Web`.
3. **Authorized redirect URIs** — add BOTH:
   - `http://localhost:3000/api/integrations/google/callback`
   - `https://YOUR-SITE.netlify.app/api/integrations/google/callback`
4. Create. Copy the **Client ID** → `GOOGLE_CLIENT_ID` and **Client secret** → `GOOGLE_CLIENT_SECRET`.

### ✅ Section 3 checklist
| Value | Env var name |
|---|---|
| OAuth Client ID | `GOOGLE_CLIENT_ID` |
| OAuth Client secret | `GOOGLE_CLIENT_SECRET` |
| Redirect URI (must match exactly) | `GOOGLE_REDIRECT_URI` = `https://YOUR-SITE.netlify.app/api/integrations/google/callback` |

---

## 4. Zoom API (webinars)

MUYA registers webinar buyers via Zoom's API so each registrant gets their own join link. The cleanest setup is a **Server-to-Server OAuth app** on the MUYA Zoom account.

### 4.1 Create the Zoom account and app

1. Sign up / sign in at https://zoom.us (a free account is enough to build and test with **meetings**; see the note below about webinars).
2. Go to the Zoom App Marketplace: https://marketplace.zoom.us → sign in → top right **Develop → Build App**.
3. Choose **Server-to-Server OAuth** → Create. Name: `MUYA`.
4. On the **App Credentials** page, copy:
   - **Account ID** → `ZOOM_ACCOUNT_ID`
   - **Client ID** → `ZOOM_CLIENT_ID`
   - **Client Secret** → `ZOOM_CLIENT_SECRET`
5. Fill in the required **Information** fields (app name, short description, your email).
6. **Scopes** tab → **Add scopes** → add:
   - `meeting:write:admin` (create meetings)
   - `meeting:read:admin`
   - `webinar:write:admin` and `webinar:read:admin` (if available on your account — see note)
   - `user:read:admin`
7. **Activation** tab → **Activate your app**.

> **Important licensing note:** Zoom **Webinars** are a paid add-on — a free Zoom account cannot host true webinars. MUYA handles this gracefully: the webinar product type will run on **Zoom Meetings** (free) by default, which behaves the same for your use case (scheduled session + unique join links + reminder emails), and can switch to true Zoom Webinars later if you buy the add-on. Nothing else in the setup changes.

### ✅ Section 4 checklist
| Value | Env var name |
|---|---|
| Account ID | `ZOOM_ACCOUNT_ID` |
| Client ID | `ZOOM_CLIENT_ID` |
| Client Secret | `ZOOM_CLIENT_SECRET` |

---

## 5. Resend (transactional email)

Every email MUYA sends — magic links, purchase confirmations, "your order shipped", payout notifications, admin alerts — goes through Resend.

### 5.1 Create the account and API key

1. Go to https://resend.com → **Sign up** (GitHub sign-in works).
2. Dashboard → **API Keys → Create API Key**. Name: `muya-production`, permission: **Full access** (it needs to send). Copy the key (`re_...`) **immediately — it's shown only once** → `RESEND_API_KEY`.

### 5.2 Sender address — two stages

**Stage A — development/testing (works today, zero setup):**
- Resend lets every account send from `onboarding@resend.dev` **but only to your own account email address**. Good enough for early testing.
- Set `EMAIL_FROM` = `MUYA <onboarding@resend.dev>` for now.

**Stage B — sending to real customers (needs a domain):**
- To email arbitrary addresses (your customers/creators), Resend requires a **verified domain you own**. A `netlify.app` subdomain cannot be used for email. The cheapest path: buy an inexpensive domain (e.g. `muya.et`, `getmuya.com` — roughly $3–12/year at registrars like Namecheap or Porkbun).
- Then: Resend dashboard → **Domains → Add Domain** → enter e.g. `muya.com` (or a subdomain like `mail.muya.com`) → Resend shows 3–4 DNS records (SPF, DKIM, MX) → add those records at your domain registrar's DNS panel → back in Resend click **Verify** (takes minutes to a few hours).
- Once verified: `EMAIL_FROM` = `MUYA <hello@muya.com>` (any address at the verified domain works, it doesn't need an inbox).
- Free tier: 3,000 emails/month, 100/day — fine for launch.

### ✅ Section 5 checklist
| Value | Env var name |
|---|---|
| API key (`re_...`) | `RESEND_API_KEY` |
| Sender address | `EMAIL_FROM` |

---

## 6. Environment variables — the master list

These are **all** the environment variables MUYA uses. Set them in **two places**:
1. **Netlify** → Site configuration → Environment variables (this is what production uses — the single source of truth for secrets, per the spec).
2. A local file `.env.local` in the repo root **for local development only**. This file is listed in `.gitignore` and must never be committed. The repo will include a `.env.example` file with this exact list and empty values as a template.

| Variable | Where it came from | Notes |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Section 2.2 | e.g. `https://muya.netlify.app` (use `http://localhost:3000` in `.env.local`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Section 1.2 | Safe for browser |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Section 1.2 | Safe for browser |
| `SUPABASE_SERVICE_ROLE_KEY` | Section 1.2 | **Secret. Server only.** |
| `SESSION_SECRET` | You generate it | Signs session cookies. Generate a long random string: run `openssl rand -base64 48` or use any password generator (40+ chars). |
| `RESEND_API_KEY` | Section 5.1 | **Secret** |
| `EMAIL_FROM` | Section 5.2 | e.g. `MUYA <hello@yourdomain.com>` |
| `GOOGLE_CLIENT_ID` | Section 3.4 | |
| `GOOGLE_CLIENT_SECRET` | Section 3.4 | **Secret** |
| `GOOGLE_REDIRECT_URI` | Section 3.4 | Must exactly match a URI registered in Google Cloud |
| `ZOOM_ACCOUNT_ID` | Section 4.1 | |
| `ZOOM_CLIENT_ID` | Section 4.1 | |
| `ZOOM_CLIENT_SECRET` | Section 4.1 | **Secret** |
| `CRON_SECRET` | You generate it | Protects the internal retry/reconciliation endpoint (same generation method as `SESSION_SECRET`) |

**Reserved for later (leave unset until their guides are written):**

| Variable | Activated by |
|---|---|
| `CHAPA_SECRET_KEY`, `CHAPA_PUBLIC_KEY`, `CHAPA_WEBHOOK_SECRET` | `CHAPA-INTEGRATION-GUIDE.md` (after KYC approval) |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | `R2-MIGRATION-GUIDE.md` (if Supabase Storage fills up) |

**Golden rules:**
- Anything prefixed `NEXT_PUBLIC_` is visible to browsers — never put a secret in a `NEXT_PUBLIC_` variable.
- After changing a variable in Netlify, trigger a redeploy (Section 2.4) — running functions don't pick up changes until then.
- Never paste secrets into the repo, into client code, or into chat/screenshots you share publicly.

---

## 7. Deployment workflow (how code goes live)

1. Code lives in the GitHub repo. `main` branch = production.
2. `git push` to `main` → Netlify builds → deploys automatically to `https://muya.netlify.app` in ~2–4 minutes.
3. Database changes ship as numbered migration files in `/supabase/migrations`; each new migration is applied to Supabase (via the SQL editor or CLI) **before** the code that depends on it goes live.
4. Rollback: Netlify keeps every previous deploy — **Deploys → (pick an old one) → Publish deploy** instantly reverts the site.

## 8. Go-live order (summary)

1. ☐ GitHub repo created (Section 0)
2. ☐ Supabase project created, keys collected, buckets created (Section 1)
3. ☐ Netlify site created from the repo, site name set, Supabase Site URL updated (Section 2)
4. ☐ Google Cloud OAuth app created, redirect URIs registered (Section 3)
5. ☐ Zoom Server-to-Server app created and activated (Section 4)
6. ☐ Resend key created; domain verification when ready for real customers (Section 5)
7. ☐ All environment variables entered in Netlify + local `.env.local` (Section 6)
8. ☐ Database migrations applied (done during development — Phase 2 of the development plan)
9. ☐ First real deploy verified: landing page loads at your Netlify URL

Once items 1–7 are done, everything on the infrastructure side is ready — the rest is development, which proceeds phase by phase per `DEVELOPMENT-PLAN.md`.
