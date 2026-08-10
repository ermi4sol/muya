# MUYA — Tier Customization Guide (switching on Free / Growth / Business)

MUYA launched with **every feature free for every creator**. The three-tier structure exists underneath: each creator has a `creator_subscriptions` row (tier: `free` / `premium_growth` / `premium_business`), and the platform reads one configuration row that currently says "everything open". This guide is how to activate real tiers when you're ready.

## Part 1 — Decide your tier design first

Write down, per tier (the spec's original design, adjust as you like):

| | Free | Growth | Business |
|---|---|---|---|
| Price (ETB/month) | 0 | e.g. 400 | e.g. 1,200 |
| Product limit | e.g. 3 | unlimited | unlimited |
| Email marketing | — | ✓ | ✓ |
| Discount codes | — | ✓ | ✓ |
| Affiliate program | — | ✓ | ✓ |
| Remove MUYA branding | — | — | ✓ |
| AutoDM automations | — | — | ✓ |
| Priority payouts | — | — | ✓ |
| Staff logins | — | — | ✓ |

## Part 2 — The configuration row

All gating reads `platform_settings` → key `tier_config`. Today it is:

```json
{ "mode": "all_free", "tiers": { ... all unlimited ... } }
```

Activating tiers = updating this one row (Supabase → SQL editor, or ask Claude):

```sql
update platform_settings set value = '{
  "mode": "enforced",
  "tiers": {
    "free":             { "max_products": 3,    "features": ["core"] },
    "premium_growth":   { "max_products": null, "features": ["core","email_marketing","discounts","affiliates"] },
    "premium_business": { "max_products": null, "features": ["core","email_marketing","discounts","affiliates","no_branding","autodm","priority_payout","staff"] }
  },
  "prices": { "premium_growth": 400, "premium_business": 1200 }
}' where key = 'tier_config';
```

## Part 3 — Turn on enforcement (a short dev pass by Claude)

Because everything has been free, the enforcement *checks* are dormant. When you decide to activate, tell Claude **"activate tier enforcement"** with your Part 1 table, and it will:

1. Enforce `max_products` in the product-creation API (server-side).
2. Gate the tier-marked features (branding removal on storefronts, affiliates, etc.) by reading the config + the creator's tier.
3. Update the landing-page pricing section from "free while we launch" to your real prices.
4. Add the **upgrade request flow**: creator taps Upgrade in Settings → Plan → pays you (bank/telebirr — or Chapa if already integrated) → you approve in the admin panel → tier flips instantly. (With Chapa live, this becomes automatic subscription billing instead.)

## Part 4 — Manual tier management (works already, today)

You can change any creator's tier right now without any of the above — useful for early supporters or comps:

```sql
update creator_subscriptions set tier = 'premium_business'
where creator_id = (select id from creators where store_slug = 'adonay');
```

The admin panel's Creators tab shows each creator's tier; a tier-change button there is part of the enforcement dev pass.

## Part 5 — Rollout advice

1. **Grandfather your first creators**: give everyone who joined before the switch 1–3 months of Growth free (one SQL update + an email announcement) — goodwill matters more than early subscription revenue.
2. Announce the date in advance; enforcement suddenly hiding features feels like theft.
3. Watch the numbers in the admin dashboard: if Growth uptake stalls, tune the Free product limit (it's the single most powerful lever).
