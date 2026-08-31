# MUYA — Full Testing Checklist

Tick each box (`[ ]` → `[x]`) as you go. Collect every failure in a list (what you did → what you expected → what happened + screenshot) and send them to Claude in one batch.

**Setup before you start:**
- [ ] Window A (normal): you'll use this as **creator/admin** — signed into the dashboard
- [ ] Window B (private/incognito): you'll use this as a **customer** — never signed in
- [ ] Gmail inbox for ermiyas4solomon@gmail.com open (all test emails land there)
- [ ] Authenticator app on your phone ready (admin login)

---

## 1. Landing page — mymuya.netlify.app

- [ ] 1.1 Page loads: hero, phone mockup, "How it works", ten product types grid, pricing (with free-launch banner), footer
- [ ] 1.2 Switch language EN → አማ → back to EN — fast, both header and footer switchers
- [ ] 1.3 Try all five languages — no untranslated codes like "landing.heroTitle" anywhere
- [ ] 1.4 All three "Get started" buttons and the hero button open the signup page
- [ ] 1.5 Footer Terms and Support pages open
- [ ] 1.6 On your phone (or narrow window): layout stays clean, nothing overflows

## 2. Authentication

- [ ] 2.1 Sign out, then /signin → enter your email → "Check your email" screen appears
- [ ] 2.2 Magic-link email arrives, button signs you into the dashboard
- [ ] 2.3 Click the SAME magic link again → rejected as invalid/used
- [ ] 2.4 "Resend link" is disabled for a cooldown after sending
- [ ] 2.5 /admin/login → email + password → 6-digit code → admin panel opens
- [ ] 2.6 Admin with wrong code → error, not logged in
- [ ] 2.7 Logged out, open /dashboard directly → redirected to signin
- [ ] 2.8 Logged out, open /admin directly → redirected to admin login

## 3. Creator dashboard — core

- [ ] 3.1 Home shows revenue cards (today/week/month), balance, quick actions, recent orders
- [ ] 3.2 My Store → Profile: change bio, add a social link → Save → refresh → kept
- [ ] 3.3 Change store link (slug) → storefront opens at the new address; old address 404s
- [ ] 3.4 Change profile photo → replaces everywhere (dashboard, storefront)
- [ ] 3.5 Design tab: switch through all 4 themes → Preview shows each correctly
- [ ] 3.6 Products tab: visibility toggle hides a product from the public storefront
- [ ] 3.7 Products tab: ▲▼ reorder is reflected on the storefront order
- [ ] 3.8 Settings: change dashboard language → whole dashboard switches; change back
- [ ] 3.9 Bottom nav (mobile width): all five tabs work

## 4. Product builders — one pass each

- [ ] 4.1 Digital download: edit, upload a real PDF → "File attached ✓" → save
- [ ] 4.2 Course: open Masterclass → the gold "📹 How to add your lesson video" box expands with 5 steps; add a lesson; save
- [ ] 4.3 Coaching: change availability days/times → save → storefront slot list matches
- [ ] 4.4 Webinar: date/time and duration save correctly
- [ ] 4.5 Membership: edit included list items → save
- [ ] 4.6 Lead magnet: upload a file, email-only toggle saves
- [ ] 4.7 Custom product: prompt question + turnaround days save
- [ ] 4.8 External link: URL saves
- [ ] 4.9 Community: title/description save
- [ ] 4.10 Physical: type values with commas (e.g. `S, M, L, XL`) — commas work, variant table regenerates; per-variant stock/SKU/price-override save after reopening
- [ ] 4.11 Create a throwaway product → Delete it → gone from list and storefront
- [ ] 4.12 Save as draft → product hidden from storefront but in your list

## 5. Public storefront (Window B — customer)

- [ ] 5.1 Store page: photo, name, bio, social pills (they open your real profiles), all visible products, "Powered by MUYA"
- [ ] 5.2 Theme matches what you picked in Design
- [ ] 5.3 Language switcher works on the storefront
- [ ] 5.4 Each product opens its correct page layout (10 types)
- [ ] 5.5 External link product opens its URL in a new tab directly
- [ ] 5.6 Physical: picking Size+Color updates price (XL costs more) and stock text; "Sold out" pill blocks a 0-stock variant; quantity stepper caps at stock
- [ ] 5.7 Coaching: slot picker only shows your available days/times, next 14 days

## 6. Checkout — place one order per type (Window B)

For each: checkout sheet opens → totals correct → email field works → "Place order" → lands on order-status page.

- [ ] 6.1 Digital download (paid) → status "pending"
- [ ] 6.2 Lead magnet (free) → status flips to confirmed INSTANTLY, access email arrives
- [ ] 6.3 Course (paid) → pending
- [ ] 6.4 Coaching with a chosen slot → pending
- [ ] 6.5 Webinar → pending
- [ ] 6.6 Membership → pending
- [ ] 6.7 Custom product → the prompt question appears and requires an answer → pending
- [ ] 6.8 Community (free) → instant confirm
- [ ] 6.9 Physical: variant + qty 2 + shipping form + COD ticked → pending; totals = price×2 + shipping
- [ ] 6.10 "We received your order" email arrived for every PAID order; admin alert email too
- [ ] 6.11 Keep a pending order's status page open — you'll watch it in test 7

## 7. Admin approval (Window A — /admin)

- [ ] 7.1 Orders queue shows every pending order with full info (product, customer, creator, variant, slot, buyer answer, shipping + COD)
- [ ] 7.2 Approve the digital download → the open status page in Window B flips to "confirmed" by itself within ~10s and shows the access button
- [ ] 7.3 Customer "Order confirmed ✅" email + creator "💰 You made a sale" email arrive
- [ ] 7.4 Reject one order with a reason → Window B status page shows "rejected" + your reason; rejection email arrives
- [ ] 7.5 Approve the rest (coaching, webinar, membership, custom, physical, course)
- [ ] 7.6 Approved/rejected orders move to "Recently decided"

## 8. Fulfillment — check every delivery

- [ ] 8.1 Digital: access page → Download button → the actual PDF downloads
- [ ] 8.2 Lead magnet: same, from its instant email
- [ ] 8.3 Course: "Open the course" → course viewer: module list, lesson switch, YouTube plays, lesson notes show
- [ ] 8.4 Coaching (BEFORE approving one: Settings → Integrations → Connect Google Calendar with ermiyas4solomon@gmail.com — expect Google's "unverified app" warning: Advanced → continue): after approval, calendar event with Meet link appears in your Google Calendar; customer email contains the Meet link
- [ ] 8.5 Webinar: approval email contains a real Zoom join link that opens Zoom
- [ ] 8.6 Membership: access page shows the included list
- [ ] 8.7 Custom: creator email contains the buyer's answer + turnaround
- [ ] 8.8 Physical: hoodie stock decreased by the ordered quantity (check the variant table)
- [ ] 8.9 Community: access page → "Open the community" → feed loads

## 9. Creator orders + shipping (Window A)

- [ ] 9.1 Dashboard → Orders: every order listed with correct statuses
- [ ] 9.2 Physical order: enter tracking number → Mark shipped → customer gets "shipped 📦" email with tracking
- [ ] 9.3 Mark delivered → status updates
- [ ] 9.4 COD badge visible on the COD order

## 10. Money — income and payouts

- [ ] 10.1 Income tab: available balance = sum of your approved orders minus 7% (spot-check one: 1000 ETB order → +930)
- [ ] 10.2 History lists every sale with running balance
- [ ] 10.3 Request payout MORE than balance → blocked with error
- [ ] 10.4 Request a small valid payout (telebirr) → "requested" ✓; admin alert email arrives; balance shows held amount
- [ ] 10.5 Admin → Payouts: request visible with account details → "Money sent — mark paid" → creator "payout sent" email; Income history shows the −payout entry and lower balance
- [ ] 10.6 Make + reject a second payout request with reason → creator email; balance released back
- [ ] 10.7 Admin → Ledger: Refund one small approved order → Income balance drops by the creator-net amount; the customer's download link stops working; refund email arrives

## 11. Community

- [ ] 11.1 Window B: post something → appears
- [ ] 11.2 Like, unlike, comment
- [ ] 11.3 Second post from Window A's own community order (buy/join in Window A too if needed) appears in Window B within ~10s without refreshing
- [ ] 11.4 Report a post → "Reported ✓"
- [ ] 11.5 Delete your own post → disappears
- [ ] 11.6 Creator: My Store → Products → 💬 on the community → reported post highlighted → Remove → gone from the member feed; Restore brings it back
- [ ] 11.7 Admin → Safety: reported post appears → "Keep (clear report)" works; Freeze community → member feed becomes inaccessible; Unfreeze → back

## 12. Admin panel — remaining tabs

- [ ] 12.1 Dashboard: GMV, commission, creators, customers, pending counts look correct; 14-day chart renders
- [ ] 12.2 Creators: list with tier/balance/status; Suspend the DEMO creator → /demo storefront stops loading; Reinstate → back
- [ ] 12.3 Ledger: all orders with correct totals and 7% column; Export CSV downloads and opens
- [ ] 12.4 Lookup: search your email → creator + customer summaries with order history; nonsense query → "no match"

## 13. Analytics

- [ ] 13.1 Visit your storefront from Window B (fresh incognito) → Dashboard → 📊 Analytics: visitors count increased
- [ ] 13.2 Orders / leads / conversion numbers are consistent with your testing

## 14. Final sweeps

- [ ] 14.1 Whole dashboard in Amharic — no raw keys anywhere
- [ ] 14.2 Whole storefront + checkout in Amharic (Window B)
- [ ] 14.3 Storefront + checkout on your actual phone
- [ ] 14.4 Settings → Integrations → Disconnect Google Calendar → reconnect works
- [ ] 14.5 Paste a made-up order URL (/order/00000000-0000-0000-0000-000000000000) → not found, no crash
- [ ] 14.6 Open someone else's product edit URL pattern with a random id → not found

---

**When done:** send Claude the failure list in one batch — numbered like the checklist (e.g. "6.9: shipping fee not added to total, screenshot attached"). Everything gets fixed together in one deploy.
