import Stripe from 'stripe';

export const runtime = 'nodejs';

function getStripe() {
  const restrictedKey = process.env.STRIPE_RESTRICTED_KEY || process.env.STRIPE_SECRET_KEY;
  return restrictedKey ? new Stripe(restrictedKey) : null;
}

export async function POST(request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get('stripe-signature');

  if (!stripe || !webhookSecret) {
    return new Response('Stripe webhook is not configured.', { status: 503 });
  }

  if (!signature) {
    return new Response('Missing Stripe signature.', { status: 400 });
  }

  const payload = await request.text();
  let event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch {
    return new Response('Invalid Stripe signature.', { status: 400 });
  }

  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const session = event.data.object;

    if (session.payment_status !== 'unpaid') {
      console.log(JSON.stringify({
        type: 'beat_store_payment_confirmed',
        sessionId: session.id,
        beatId: session.metadata?.beatId || null,
        licenseName: session.metadata?.licenseName || null
      }));

      // Fulfillment is intentionally driven from this verified webhook.
      // The next milestone persists the order and issues protected downloads/license documents.
    }
  }

  if (event.type === 'checkout.session.async_payment_failed') {
    const session = event.data.object;
    console.warn(JSON.stringify({
      type: 'beat_store_payment_failed',
      sessionId: session.id
    }));
  }

  return Response.json({ received: true });
}
