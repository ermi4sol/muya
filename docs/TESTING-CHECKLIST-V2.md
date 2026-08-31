# MUYA v2 — Full Testing Checklist (Telegram edition)

Tick each box as you go. Collect failures in one list (what you did → what you expected → what happened + screenshot) and send them to Claude in one batch — everything gets fixed together in one deploy.

**Setup before you start:**
- [ ] Window A (normal browser): the **creator/admin** side
- [ ] Window B (private/incognito): the **customer** side
- [ ] Telegram open (phone or desktop) — signed into YOUR Telegram account
- [ ] A second Telegram account (family member's phone works) for the customer role — *optional but ideal; you can also play both roles with one account*
- [ ] Authenticator app ready (admin MFA)

> ⚠️ One-time first steps (do these before anything else):
> - [ ] 0.1 Open mymuya.netlify.app/api/health → `missingEnv` is empty, `supabase` ok, `postgres` says ok
> - [ ] 0.2 Open /admin/setup → enter the setup key (Claude will give it to you), your admin email, and a NEW password (12+ chars) → account created
> - [ ] 0.3 /admin/login → email + password → set up authenticator (scan QR, enter code) → admin Dashboard opens
> - [ ] 0.4 In Telegram, open @MuyaOfficialBot → send /start → friendly welcome arrives (proves the webhook is live)

## 1. Landing page — mymuya.netlify.app

- [ ] 1.1 Hero, phone mockup, "How it works" (mentions Telegram, not email), NINE product types grid, pricing, footer
- [ ] 1.2 Language switcher EN → አማ → EN, fast, no raw keys anywhere
- [ ] 1.3 All five languages spot-checked
- [ ] 1.4 "Get started" buttons open the signup page

## 2. Authentication (Telegram)

- [ ] 2.1 /signup shows "Continue with Telegram" widget (blue Telegram button renders)
- [ ] 2.2 Complete the Telegram login → lands in dashboard onboarding (first time) with your Telegram name pre-filled
- [ ] 2.3 Sign out → /signin → Telegram login again → straight to dashboard (no second account created)
- [ ] 2.4 Logged out, open /dashboard directly → redirected to signin
- [ ] 2.5 /admin/login with wrong password → error; with wrong TOTP code → error
- [ ] 2.6 Logged out, open /admin directly → redirected to admin login
- [ ] 2.7 In Telegram: send "my purchases" to the bot → sensible "no purchases yet" reply
- [ ] 2.8 Send /id to the bot → replies with your numeric ID

## 3. Creator dashboard — shell & home

- [ ] 3.1 PC: left sidebar shows all 12 tabs; mobile: bottom nav (Home, Store, Shop, Income, More) and More opens the full grid
- [ ] 3.2 Home: date-range chips (7/30/90) change the numbers; Site Views / Revenue / Leads cards; trend chart renders
- [ ] 3.3 My Store on PC: the phone-frame live preview shows your real storefront beside the editor
- [ ] 3.4 Profile: change bio + social link → Save → refresh → kept; change store slug → old URL 404s, new works
- [ ] 3.5 Design: switch all 4 themes → preview matches
- [ ] 3.6 Products: visibility toggle + ▲▼ reorder reflected on the storefront
- [ ] 3.7 Settings → tabs: Profile shows your @telegram handle; language change flips the dashboard; Payout tab saves account details; Telegram alerts toggles save

## 4. Product builder — the three tabs

Create one of each (9 total). For each: **Thumbnail tab** (pick a card style, upload 400×400, title+subtitle+button text) → **Checkout Page tab** (hero image, description, price + discount, custom field, type step) → **Options tab** → Publish. Watch the live preview update as you type.

- [ ] 4.1 Digital product: file upload → "File attached ✓"; discount price shows strikethrough in preview
- [ ] 4.2 Lead magnet: file + capture-method choice (try Telegram on one, create a second with Email)
- [ ] 4.3 Coaching call: duration + availability days/times
- [ ] 4.4 Course: modules/lessons; the gold "How to add your lesson video" box expands
- [ ] 4.5 Webinar: date/time + duration
- [ ] 4.6 Affiliate link: URL + note that sales happen off-MUYA
- [ ] 4.7 Link/media: URL only
- [ ] 4.8 Physical: comma attribute values (`S, M, L, XL`) work; variant table with stock/SKU/price-override; shipping fee + COD toggle
- [ ] 4.9 Custom product: prompt question + turnaround days
- [ ] 4.10 Options tab on any product: add a review, an order bump (pick another product), enable affiliate share, write a Telegram confirmation template with the merge-tag chips
- [ ] 4.11 Card styles: set one product to each style (Button / Callout / Preview) — storefront renders all three differently
- [ ] 4.12 Save as draft → hidden from storefront; delete a throwaway product → gone

## 5. Storefront (Window B — not signed in)

- [ ] 5.1 Store page: profile, socials, product cards in your order — **NO prices anywhere in the list**
- [ ] 5.2 The three card styles render correctly; PC stays a centered single column
- [ ] 5.3 Physical products do NOT appear individually — one "Shop" card instead
- [ ] 5.4 Product page: price appears HERE (discount strikethrough if set), description, bottom title, reviews from Options
- [ ] 5.5 Affiliate link + Link/media cards open their URL in a new tab directly
- [ ] 5.6 Coaching: slot picker shows only your available days/times
- [ ] 5.7 Shop hub: grid with starting prices + cart badge; physical detail: pills update price/stock, "Sold out" blocks 0-stock, quantity caps at stock
- [ ] 5.8 Add 2 different items to cart → cart page: steppers, remove, subtotal + shipping + total correct
- [ ] 5.9 Language switcher works on the storefront

## 6. Checkout — Telegram identity

- [ ] 6.1 Open a paid digital product → Buy → checkout sheet asks to Connect Telegram (widget)
- [ ] 6.2 Connect Telegram (customer account) → sheet flips to "Telegram connected"
- [ ] 6.3 Place order → order-status page shows "pending"; Telegram receives "🧾 Order received" from the bot
- [ ] 6.4 Lead magnet (Telegram mode) → instant: bot sends the FILE with forwarding blocked (try to forward it — Telegram should say saving/forwarding restricted) + confirmation
- [ ] 6.5 Lead magnet (Email mode) → name+email form, instant download link on the page, NO account needed
- [ ] 6.6 Custom product → your prompt question appears and is required
- [ ] 6.7 Product with custom fields → the fields appear and are required
- [ ] 6.8 Coaching with a slot, webinar, course → each places a pending order
- [ ] 6.9 Cart checkout (2 physical items): one shipping form, COD toggle → both orders created together; status page notes the group
- [ ] 6.10 Admin: email alert arrived for each paid order (and Telegram alert if you linked your ID in test 9.1)

## 7. Admin approval → Telegram delivery

- [ ] 7.1 /admin/orders: every pending order with full info (product, buyer's @handle, variant, slot, answers, shipping + COD)
- [ ] 7.2 Approve the digital product → within seconds the CUSTOMER's Telegram gets the confirmation + the actual file (protected); the open status page flips to confirmed
- [ ] 7.3 The CREATOR's Telegram gets "💰 You made a sale" with the net amount
- [ ] 7.4 If you set a custom confirmation template → the customer message uses it with merge tags filled
- [ ] 7.5 Reject one order with a reason → customer's bot message shows the reason; status page shows rejected
- [ ] 7.6 Approve the rest: coaching (calendar event + Meet link in the bot message — connect Google Calendar first in Settings → Integrations), webinar (Zoom join button), course (Open the course button), custom (creator gets the buyer's answers + Telegram handle), physical (stock decreased; both sides notified)
- [ ] 7.7 "my purchases" to the bot now lists everything with access buttons

## 8. Physical fulfillment + money

- [ ] 8.1 Dashboard → Shop: inventory table shows correct stock after the sale; shipment card shows the order
- [ ] 8.2 Mark shipped with tracking → customer's Telegram gets "📦 on its way" with tracking; mark delivered → "delivered" message
- [ ] 8.3 Income: chart + Available for Cashout (net after commission — spot-check: 1000 ETB at 7% → 930) + Available Soon (your still-pending orders)
- [ ] 8.4 Orders table filter chips (pending/paid/rejected) work
- [ ] 8.5 Request payout more than balance → blocked; valid payout → admin email + Telegram alert; admin marks paid → creator's bot message + balance drops
- [ ] 8.6 Admin → Ledger: refund one order → customer bot message, access revoked (download link stops working), balance reduced

## 9. Admin panel v2

- [ ] 9.1 /admin lands on DASHBOARD (not orders): GMV, commission revenue, creators, signups, chart; link your Telegram ID (from /id) → test message arrives
- [ ] 9.2 Commission tab: change rate to 10% → Save → approve a new test order → creator net reflects 10%; set it back to 7%
- [ ] 9.3 Commission tab: exclude one type (e.g. lead magnet) → approve an order of that type → 0 commission
- [ ] 9.4 Creators: tier dropdown changes tier; Suspend → storefront offline; Reinstate → back
- [ ] 9.5 Lookup: search your Telegram handle → creator + customer summaries
- [ ] 9.6 Safety: suspended list + newest creators render
- [ ] 9.7 Ledger: totals + commission column correct; Export CSV opens

## 10. Growth features

- [ ] 10.1 Analytics: range chips; tiles consistent with your testing; visits trend + top products render
- [ ] 10.2 Audience: your customer (Telegram) + both lead captures (one Telegram, one Email) with source products
- [ ] 10.3 Referrals: invite an affiliate (20%) → copy link → open it in Window B → buy something → referral appears with earnings after approval
- [ ] 10.4 Funnels: create funnel (2 steps: delay 0h then 24h), set active, trigger = any purchase → buy + approve something → within ~1 hour the customer's Telegram gets step 1 (the hourly sweep sends it)
- [ ] 10.5 Telegram Flows: build a broadcast (text + button), check the Telegram-style preview, Send now → arrives to your customer accounts; recipients count recorded
- [ ] 10.6 Schedule a second flow a few minutes ahead → arrives on the next hourly sweep after that time

## 11. Final sweeps

- [ ] 11.1 Whole dashboard in Amharic — no raw keys
- [ ] 11.2 Storefront + checkout in Amharic (Window B)
- [ ] 11.3 Storefront + checkout on your actual phone
- [ ] 11.4 Made-up order URL (/order/00000000-0000-0000-0000-000000000000) → not found, no crash
- [ ] 11.5 Another creator's product edit URL with a random id → not found
- [ ] 11.6 Sign out of everything; bot still answers /start and "my purchases"

---

**When done:** send the failure list in one batch, numbered like the checklist (e.g. "6.4: file arrived but forwarding was not blocked, screenshot attached").
