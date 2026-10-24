# Trevor Pilz Beat Store

A responsive beat-licensing storefront deployed on Railway with Stripe-hosted Checkout integration.

## Current milestone
- Responsive storefront and beat catalog
- Four configurable license tiers
- Server-side price validation
- Stripe Checkout Sessions endpoint
- Signed Stripe webhook handler for payment confirmation
- Persistent paid-order storage code with idempotent Stripe session handling
- Safe `PAYMENTS_ENABLED` launch gate
- Railway deployment

## Environment variables
- `PUBLIC_URL` — deployed public URL
- `PAYMENTS_ENABLED` — must be exactly `true` to permit checkout; keep `false` until the real catalog and fulfillment are ready
- `STRIPE_RESTRICTED_KEY` — preferred least-privilege Stripe restricted key; store only in Railway
- `STRIPE_WEBHOOK_SECRET` — Stripe endpoint signing secret; store only in Railway
- `STRIPE_SECRET_KEY` — legacy fallback only; prefer `STRIPE_RESTRICTED_KEY`
- `DATABASE_URL` — PostgreSQL connection string used by the verified webhook to persist paid orders

Never commit Stripe or database credentials to GitHub.

## Paid-order persistence
The verified Stripe webhook stores paid Checkout Sessions in `beat_store_orders`. `stripe_session_id` is unique, so Stripe webhook retries are safe and do not create duplicate orders.

The webhook returns a non-2xx response if a verified paid event cannot be persisted. This intentionally tells Stripe to retry later instead of silently acknowledging a paid order that was not recorded.

## Required launch milestone
Before enabling payments:
1. Provision PostgreSQL and expose `DATABASE_URL` to the `beat-store` service.
2. Provision private object storage for beat files and stems.
3. Replace the sample catalog and provisional prices with confirmed sellable beats.
4. Generate the appropriate personalized license document after verified payment.
5. Issue protected, expiring download links from private storage.
6. Deliver purchase confirmation and license/download access.
7. Exercise the full purchase flow before changing `PAYMENTS_ENABLED=true`.

Fulfillment must be driven from the verified webhook, not from the browser success page.
