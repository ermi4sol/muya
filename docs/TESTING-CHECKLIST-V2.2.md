# MUYA — Final Testing Checklist (v2.2)

*The one consolidated checklist. Use it after the v2.2 build deploys — it covers everything: the v2 platform, the v2.1 additions, all of v2.2, and the cleanup-pass fixes. Supersedes TESTING-CHECKLIST-V2.md.*

Tick as you go. Collect every failure in ONE numbered list (what you did → what you expected → what happened + screenshot) and send it in a single batch — all fixes ship together in one deploy.

**Setup:**
- [ ] Browser window A: **admin** (email + password + authenticator)
- [ ] Browser window B (or second browser): **creator** (second Telegram account) — *after the cleanup pass, admin + creator can even share one browser; verify that in 1.4*
- [ ] Incognito window C: **customer** (main Telegram account)
- [ ] Telegram open for both accounts

---

## 1. Foundations & auth

- [ ] 1.1 /api/health without any key → returns only `ok: true` (no env/DB details)
- [ ] 1.2 Landing page: NINE types grid, Telegram-first copy, five languages clean, company name renders from settings
- [ ] 1.3 Creator Telegram sign-in works; customer Telegram sign-in works; /dashboard and /admin redirect when signed out
- [ ] 1.4 **Session split (cleanup 5.1):** sign into /admin AND /dashboard (creator) in the SAME browser — both stay signed in; signing out of one leaves the other alone
- [ ] 1.5 **Admin session (5.2):** after ~12h idle the admin is asked to sign in again (spot-check next day); creator session survives
- [ ] 1.6 Bot answers /start, /id, and "my purchases"

## 2. Product builder — all 9 types, three tabs

- [ ] 2.1 One pass per type: Thumbnail (style, 400×400, texts) → Checkout Page (hero, description, price+discount, custom field, type step) → Options → Publish; live preview updates while typing
- [ ] 2.2 Digital product: file upload ✓; Course: modules/lessons, **per-lesson attachment (📎)** uploads and removes
- [ ] 2.3 Lead magnet: Telegram-capture AND email-capture variants
- [ ] 2.4 **Webinar (v2.2): builder asks for YOUR meeting link** (no Zoom auto-create note); date/time + duration save
- [ ] 2.5 **Physical (v2.2):** category select with "+ new category" inline; gallery uploader (up to 6 images, remove ✕); low-stock threshold; comma attribute values; variant table stock/SKU/price-override
- [ ] 2.6 Options tab: review, order bump, affiliate share, Telegram template with merge tags
- [ ] 2.7 Draft hides from storefront; delete removes

## 3. My Store & sections (v2.2)

- [ ] 3.1 Products list shows NO physical products; the note links to the Shop tab
- [ ] 3.2 "+ Add section" creates a titled section; rename, reorder ▲▼, delete all work
- [ ] 3.3 Assign products to sections via the dropdown → storefront shows section headings with their products
- [ ] 3.4 "Shop card position" moves where the Shop card sits in the storefront list
- [ ] 3.5 PC live preview panel reflects sections and ordering

## 4. Storefront (window C, signed out)

- [ ] 4.1 Card styles render consistently (button/callout/preview); no prices in the list; preview cards without an image show the compact icon band
- [ ] 4.2 Sections render as headings; Shop card at its chosen position; "Powered by <company name>"
- [ ] 4.3 Product page: price reveal + discount strikethrough, reviews, bottom title; affiliate/link cards open URLs in new tab
- [ ] 4.4 Coaching slot picker matches availability

## 5. The Shop (v2.2 e-commerce)

- [ ] 5.1 Shop hub: sticky search + cart badge; typing filters instantly
- [ ] 5.2 Category chips filter; sort works (newest, price both ways, best-selling)
- [ ] 5.3 Price min/max + in-stock-only filters; product count + empty state
- [ ] 5.4 Badges correct: SALE, NEW (<14 days), LOW STOCK (≤ threshold), SOLD OUT
- [ ] 5.5 Detail page gallery: swipe/tap through hero + thumbnail + gallery images; thumbnail strip; "More from this shop" row
- [ ] 5.6 Variant pills update price/stock; sold-out variant blocked; qty caps at stock; add to cart
- [ ] 5.7 Cart: steppers, remove, totals; checkout with one shipping form + COD; two items → grouped orders

## 6. Checkout & Telegram identity

- [ ] 6.1 Paid checkout requires Telegram; sheet flips to "connected" after widget
- [ ] 6.2 Lead magnet Telegram-mode: instant bot file (forwarding blocked) + capture in Audience
- [ ] 6.3 Lead magnet email-mode: name+email form → instant download link, no account
- [ ] 6.4 Custom fields + custom-product prompt required and stored
- [ ] 6.5 Order status page live-updates on approval

## 7. Approval → fulfillment (window A approves, window C's Telegram receives)

- [ ] 7.1 Orders queue shows full context (variant, answers, shipping, COD, @handles)
- [ ] 7.2 Digital: confirmation + protected file in chat; custom template with merge tags when set
- [ ] 7.3 Course: "Open the course" → viewer plays video, shows notes, **lesson attachment downloads (and 📎 marker in list)**
- [ ] 7.4 Coaching: calendar event + Meet link in bot message (Google connected in Settings → Integrations)
- [ ] 7.5 **Webinar (v2.2):** bot button is a `/w/…` link — works for the buyer (open twice, and from a second device); **forwarded to the other Telegram account → blocked**; a SECOND buyer's own link works; reminder (≤24h before start) uses the same protected link
- [ ] 7.6 Physical: stock decremented; ship + deliver updates arrive in chat with tracking
- [ ] 7.7 Reject with reason → customer notified; refund → access revoked + bot message
- [ ] 7.8 "my purchases" lists everything with access buttons

## 8. Money

- [ ] 8.1 Income: available = net after commission (spot-check the math at the current rate)
- [ ] 8.2 Available Soon reflects pending orders; order table filters work
- [ ] 8.3 Payout request → admin email + Telegram alert → mark paid → creator bot message + ledger entry
- [ ] 8.4 Admin Commission tab: change rate → next approval uses it; exclude a type → 0 commission on it; revert

## 9. Growth features

- [ ] 9.1 Analytics ranges + charts consistent with your testing
- [ ] 9.2 Audience shows buyers + both capture types with sources
- [ ] 9.3 Referrals: invite → copy link → buy through it in window C → referral + earnings appear after approval
- [ ] 9.4 Funnel (active, 0h first step) fires on the hourly sweep after an approved purchase
- [ ] 9.5 Broadcast: editor preview matches what arrives; send-now reaches your customer accounts; scheduled flow fires on the sweep

## 10. Admin panel

- [ ] 10.1 Dashboard-first landing with metrics + chart; Telegram alerts card works
- [ ] 10.2 **Company name (v2.2):** change it in the admin card → landing, storefront footer, dashboard header, admin header, a bot message, and an admin email all show the new name (no redeploy); change it back
- [ ] 10.3 Creators: tier dropdown; suspend/reinstate flips the storefront
- [ ] 10.4 Lookup by @handle; Ledger totals + CSV export; Safety lists render
- [ ] 10.5 Admin Telegram alerts arrive with full context: new order (product/variant/total/creator/customer/ref), payout (creator + account), new product (creator + price), new creator signup

## 11. Final sweeps

- [ ] 11.1 Dashboard fully in Amharic — no raw keys (locale pruning shouldn't have removed anything live)
- [ ] 11.2 Storefront + Shop + checkout in Amharic (window C)
- [ ] 11.3 Everything on a real phone
- [ ] 11.4 Garbage URLs (/order/000…, foreign product-edit id, /w/wrongtoken) → clean not-found/blocked pages, no crashes

---

**When done:** one numbered failure batch → one fix deploy → re-check just the failed items. Then the system is DONE, and only the external-world switches remain (see docs/LAUNCH-SWITCHES.md).
