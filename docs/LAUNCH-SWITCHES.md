# MUYA — Launch Switches (things that depend on the outside world)

*Everything in this file is OPTIONAL for launch and blocked only by external accounts, approvals, or business decisions — never by missing code. Each switch says: what it is, when to flip it, what YOU do outside MUYA, and what Claude does inside it. Detailed step-by-step guides already exist in `/docs` where noted.*

---

## Switch 1 — Chapa online payments

**What it changes:** customers pay online at checkout (telebirr, cards, banks via Chapa) instead of the manual order-request flow; approval becomes automatic on payment confirmation; admin queue workload drops to near zero.

**Flip it when:** you have a registered business (your own license or the 360Ground/Eldix umbrella) — Chapa's merchant onboarding requires business KYC.

**You do (outside):**
1. Register the business / finalize the 360Ground arrangement.
2. Create a Chapa merchant account at chapa.co and complete KYC with the business documents.
3. Hand Claude the Chapa secret key + webhook secret (paste in chat; they go only into Netlify env).

**Claude does (inside):** follows `docs/CHAPA-INTEGRATION-GUIDE.md` — checkout gains the "Pay now" path, the Chapa webhook calls the exact same `approveOrder` pipeline the admin button uses today, order-request stays available as a fallback option per product. One build phase, one deploy.

---

## Switch 2 — Subscription tiers (start charging creators)

**What it changes:** Free / Growth / Business stop being all-free; Growth/Business gate the premium growth tools (broadcasts, funnels, affiliates, branding removal) at your prices.

**Flip it when:** commission revenue proves creators stick around — this is a business decision, not a technical one. Recommended: announce a date in advance and grandfather your first creators with free Growth months.

**You do (outside):** decide the tier table (prices + what each tier includes) and the announcement plan.

**Claude does (inside):** follows `docs/TIER-CUSTOMIZATION-GUIDE.md` — one settings change plus a short enforcement pass (product limits, feature gates, upgrade-request flow in the dashboard, real prices on the landing page). With Chapa live (Switch 1), tier billing becomes automatic; without it, upgrades run through the same manual-approval pattern as orders.

---

## Switch 3 — Cloudflare R2 storage

**What it changes:** product files and images move from Supabase Storage (1 GB free) to Cloudflare R2 (10 GB free, zero egress fees).

**Flip it when:** Supabase dashboard → Settings → Usage shows storage above ~800 MB or egress warnings arrive. **Not a today problem** — check monthly.

**You do (outside):** create the Cloudflare account + R2 buckets and API token (15 minutes, card required but free tier costs nothing).

**Claude does (inside):** follows `docs/R2-MIGRATION-GUIDE.md` — env vars, the four storage touchpoints switch to R2 with Supabase fallback for old files, zero downtime.

---

## Switch 4 — Custom domain (goodbye mymuya.netlify.app)

**What it changes:** the platform lives at your own domain (e.g. muya.et or getmuya.com); every link, bot button, and login widget uses it.

**Flip it when:** whenever you want — it's about an hour end-to-end. Natural moment: alongside a company rename or the marketing push.

**You do (outside):**
1. Buy the domain (for `.et`: through Ethiotelecom/EthioNIC registrars; for `.com`: any registrar).
2. Netlify → Domain management → add the custom domain, and set the DNS records Netlify shows you at your registrar (HTTPS is automatic).
3. BotFather → `/setdomain` → @MuyaOfficialBot → the new domain (Login Widget requirement).
4. Google Cloud Console → OAuth credentials → add the new redirect URI (Claude will give the exact URL).

**Claude does (inside):** updates `NEXT_PUBLIC_APP_URL` + `GOOGLE_REDIRECT_URI` in Netlify env, redeploys once, verifies the webhook self-heals to the new URL and the widget renders.

---

## Switch 5 — Company rename (external half)

**What it changes:** with v2.2's admin "Company name" field, every page, bot message and email rebrands instantly. Two identifiers live outside the platform and are yours to change manually — exactly as you decided:

**You do (outside):**
1. **Bot:** BotFather → `/setname` (display name) and optionally `/setusername` (the @handle) → then re-run `/setdomain` for the site.
2. **Site address:** either rename the Netlify site (Site settings → Change site name) or do the full custom domain (Switch 4).

**Claude does (inside):** if the address changed, same env update + single redeploy as Switch 4. The in-platform name you already changed yourself in the admin card.

---

## Backlog (parked deliberately — not blocking anything)

- **Hosted course video** (Bunny/Mux/own YouTube channel): today creators paste unlisted YouTube links, which works. Revisit as a premium feature when a paying creator asks for it.
- **Cross-creator discovery/marketplace page**: a growth feature for when there are dozens of active stores worth browsing.

---

### Suggested order

1. Finish testing → fix batch → **v2.2 build** → final checklist ✅
2. 360Ground outcome → business registration → **Chapa (Switch 1)**
3. **Custom domain (Switch 4)** with the marketing launch
4. **Tiers (Switch 2)** once retention is proven
5. **R2 (Switch 3)** only when the storage meter says so
