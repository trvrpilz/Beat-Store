# Trevor Pilz Beat Store

A responsive beat-licensing storefront deployed on Railway with Stripe-hosted Checkout integration.

## Current milestone
- Responsive storefront and beat catalog
- Four configurable license tiers
- Server-side price validation
- Stripe Checkout Sessions endpoint
- Signed Stripe webhook handler for payment confirmation
- Safe `PAYMENTS_ENABLED` launch gate
- Railway deployment

## Environment variables
- `PUBLIC_URL` — deployed public URL
- `PAYMENTS_ENABLED` — must be exactly `true` to permit checkout; keep `false` until the real catalog and fulfillment are ready
- `STRIPE_RESTRICTED_KEY` — preferred least-privilege Stripe restricted key; store only in Railway
- `STRIPE_WEBHOOK_SECRET` — Stripe endpoint signing secret; store only in Railway
- `STRIPE_SECRET_KEY` — legacy fallback only; prefer `STRIPE_RESTRICTED_KEY`

Never commit Stripe credentials to GitHub.

## Required launch milestone
Before enabling payments, add the real beat files/catalog and complete webhook-driven fulfillment: persist paid orders, generate the appropriate license document, issue protected downloads, and deliver purchase confirmation. Fulfillment must not depend on the success page.
