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

## Protected purchase access (implemented, not launch-ready)

New checkouts generate a random 256-bit purchase token. Only its SHA-256 hash is
stored in Stripe metadata and PostgreSQL. The success redirect carries the secret
in its URL fragment (not the server query string); the browser moves it into tab
session storage and removes the fragment. Treat this token as a bearer credential.
It is intentionally not enough to know a Stripe session ID.

`POST /api/orders/access` requires the session ID and purchase token. It reads only
paid orders already persisted by the signed webhook. It never creates an order or
marks a browser visit as a payment. Access expires seven days after the order is
recorded; private S3 download URLs expire in five minutes. Responses use no-store
and no-referrer headers. Legacy orders without a token require manual support.
The purchase page polls for about one minute and offers a manual retry afterward.

### Private storage configuration

Set in Railway, never in source control:

- `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`
- `S3_REGION` (defaults to `auto`)
- `BEAT_DELIVERY_MANIFEST` — JSON mapping exact beat IDs and license names to approved files

Example structure only (no real assets or approval implied):

```json
{
  "beat-id": {
    "MP3 Lease": {
      "approved": true,
      "files": [
        { "kind": "audio", "key": "beat-id/audio.mp3", "name": "Beat.mp3" },
        { "kind": "license", "key": "beat-id/license.pdf", "name": "License.pdf" }
      ]
    }
  }
}
```

Only mark a mapping approved after uploading and checking every object and the
corresponding license. Each mapping must contain audio and a license document.
Use distinct object keys for versioned releases; do not replace a sold file or
change a sold tier's mapping. The service needs read-only object permissions.
Checkout refuses sales without database, webhook, storage, and approved mappings,
even if `PAYMENTS_ENABLED` is mistakenly switched on. This checks configuration,
not object existence or the legal suitability of uploaded license documents.

### Remaining launch work

- Apply the staged PostgreSQL, volume, and private bucket deployment; connect the app.
- Upload confirmed beat files and agree final prices and license terms.
- Add personalized license generation and email delivery/recovery of purchase access.
- Test real private storage downloads and a complete Stripe sandbox purchase,
  delayed payment, webhook retries, and failed database writes.
- Keep `PAYMENTS_ENABLED=false` until the complete flow passes.

Run `npm ci`, `npm test`, and `npm run build` before deploying changes.
