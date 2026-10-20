import Stripe from 'stripe';

const catalog = {
  'midnight-run': 'MIDNIGHT RUN',
  'deep-shadows': 'DEEP SHADOWS',
  poolside: 'POOLSIDE'
};

const licensePrices = {
  'MP3 Lease': 2900,
  'WAV Lease': 4900,
  'Trackout / Stems': 9900,
  Unlimited: 19900
};

export async function POST(request) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return Response.json({ error: 'Stripe setup is pending.' }, { status: 503 });
    }

    const { beatId, licenseName } = await request.json();
    const beatTitle = catalog[beatId];
    const unitAmount = licensePrices[licenseName];
    if (!beatTitle || !unitAmount) {
      return Response.json({ error: 'Invalid beat or license.' }, { status: 400 });
    }

    const stripe = new Stripe(secretKey);
    const origin = process.env.PUBLIC_URL || new URL(request.url).origin;
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: unitAmount,
            product_data: {
              name: `${beatTitle} — ${licenseName}`,
              description: 'Trevor Pilz beat license'
            }
          }
        }
      ],
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/#beats`,
      metadata: { beatId, beatTitle, licenseName }
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Checkout could not be started.' }, { status: 500 });
  }
}
