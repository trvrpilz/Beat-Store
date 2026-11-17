import { findVerifiedOrder } from '../../../../lib/orders';
import { hashAccessToken, validSessionId, orderAccessState } from '../../../../lib/order-access.mjs';
import { deliveryFiles, signedDownloads, storageConfigured } from '../../../../lib/delivery';

export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'no-store, private', 'Referrer-Policy': 'no-referrer' };
export async function POST(request) {
  let input;
  try { input = await request.json(); } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400, headers });
  }
  const tokenHash = hashAccessToken(input?.token);
  if (!tokenHash || !validSessionId(input?.sessionId)) {
    return Response.json({ error: 'Invalid purchase access.' }, { status: 400, headers });
  }
  try {
    const order = await findVerifiedOrder(input.sessionId, tokenHash);
    const state = orderAccessState(order);
    // Wrong tokens and unconfirmed sessions have the same response.
    if (state === 'pending') return Response.json({ status: 'pending' }, { headers });
    if (state === 'expired') return Response.json({ status: 'expired' }, { headers });
    const files = deliveryFiles(order.beat_id, order.license_name);
    if (!files || !storageConfigured()) {
      return Response.json({ status: 'preparing', beatTitle: order.beat_title, licenseName: order.license_name }, { headers });
    }
    return Response.json({
      status: 'ready', beatTitle: order.beat_title, licenseName: order.license_name,
      downloads: await signedDownloads(files), expiresIn: 300
    }, { headers });
  } catch {
    console.error('beat_store_purchase_access_unavailable');
    return Response.json({ error: 'Purchase access is temporarily unavailable. Please try again.' }, { status: 503, headers });
  }
}
