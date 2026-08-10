# MUYA — Chapa Integration Guide (activate when your KYC is approved)

MUYA launched with the **order-request model**: customers pay nothing online, and you approve each order in the admin panel. This guide is the step-by-step path to switching on real online payments with **Chapa** (telebirr, CBE, bank cards) once your business registration and KYC are ready. The system was built for this from day one — Chapa's webhook simply becomes an automatic caller of the same approve pipeline you use manually today, so nothing downstream changes.

## Part 1 — What you need before starting

1. **Business registration** (trade license) for the entity that will receive the money.
2. **TIN** (tax identification number).
3. **A business bank account** in the entity's name (settlement destination).
4. The owner's **ID document** (national ID or passport).

## Part 2 — Create and verify the Chapa account

1. Go to **dashboard.chapa.co** → Create account (use a business email you control long-term).
2. Verify your email and log in.
3. Complete the **compliance/KYC form**: business details, license upload, TIN, ID, bank account. Submit and wait for approval (typically days; they may email follow-up questions).
4. While waiting you can already use **Test Mode** — the dashboard gives you test API keys that work immediately.

## Part 3 — Get the keys

1. In the Chapa dashboard: **Settings → API Keys**.
2. Copy the **Secret key** (`CHASECK_...`) and **Public key** (`CHAPUBK_...`) — test versions now, live versions after approval.
3. In **Settings → Webhooks**: set the webhook URL to `https://mymuya.netlify.app/api/webhooks/chapa` and copy/set the **webhook secret hash**.

## Part 4 — Enter the environment variables

In Netlify → mymuya → Environment variables, add:

| Variable | Value |
|---|---|
| `CHAPA_SECRET_KEY` | `CHASECK_...` |
| `CHAPA_PUBLIC_KEY` | `CHAPUBK_...` |
| `CHAPA_WEBHOOK_SECRET` | the webhook secret hash you set |

Then trigger a redeploy.

## Part 5 — What changes in the code (tell Claude "activate Chapa" and it does this)

The activation is deliberately small because everything was pre-built:

1. **Checkout** (`/api/checkout`): for paid orders, instead of stopping at "pending", it calls Chapa's *initialize transaction* API (`POST https://api.chapa.co/v1/transaction/initialize`) with `tx_ref = the order id`, the amount, currency ETB, and the customer email — Chapa returns a `checkout_url`, and the customer is redirected there to pay (telebirr, card, etc.). The order stays `pending` until money arrives.
2. **Webhook** (`/api/webhooks/chapa` — new small route): verifies the `x-chapa-signature` HMAC against `CHAPA_WEBHOOK_SECRET`, and on a successful charge event calls the **existing `approveOrder()` pipeline** — the same function your admin Approve button uses. Commission, ledger, fulfillment, and emails all run unchanged. The webhook also double-checks the payment by calling Chapa's *verify* endpoint (`GET /v1/transaction/verify/{tx_ref}`) before approving — never trust the webhook body alone.
3. **Admin queue**: stays exactly as it is — it keeps handling cash-on-delivery physical orders and becomes your fallback if a webhook ever fails (you can still approve manually; approval is idempotent, so a webhook + manual double-approve is harmless).
4. **Storefront copy**: the checkout sheet's "you won't pay now" note switches to the payment-methods flow.

## Part 6 — Test before going live

1. With **test keys** set, buy a product using Chapa's test telebirr number (the dashboard's Test Mode page lists test credentials).
2. Confirm: payment succeeds → webhook fires → order auto-approves → customer gets access email → ledger credited.
3. Reject-path: abandon a payment and confirm the order stays pending.
4. Swap test keys for **live keys**, make one small real purchase, and refund it via the admin panel.

## Part 7 — After activation

- **Creator subscriptions (paid tiers):** once Chapa is live you can also bill Growth/Business tiers automatically — see `TIER-CUSTOMIZATION-GUIDE.md`.
- **Settlement:** Chapa settles to your bank account per their schedule; MUYA's ledger tracks what portion belongs to creators — your payout queue continues to work exactly as today.
- Keep the manual queue mindset for disputes: Chapa's dashboard shows every transaction with references matching MUYA's order IDs (`tx_ref`).
