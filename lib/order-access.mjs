import { createHash, randomBytes } from 'node:crypto';

export const ACCESS_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
export function newAccessToken() { return randomBytes(32).toString('hex'); }
export function hashAccessToken(token) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return null;
  return createHash('sha256').update(token).digest('hex');
}
export function validSessionId(value) {
  return typeof value === 'string' && /^cs_[A-Za-z0-9_]{10,250}$/.test(value);
}
export function orderAccessState(order, now = Date.now()) {
  if (!order || order.payment_status !== 'paid') return 'pending';
  const created = new Date(order.created_at).getTime();
  if (!Number.isFinite(created) || now >= created + ACCESS_WINDOW_MS) return 'expired';
  return 'paid';
}

// Explicitly configured entitlements only. Never derive an object key from request input.
export function resolveDelivery(manifest, beatId, licenseName) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) return null;
  const entry = Object.hasOwn(manifest, beatId) && manifest[beatId];
  const delivery = entry && Object.hasOwn(entry, licenseName) && entry[licenseName];
  if (!delivery || delivery.approved !== true || !Array.isArray(delivery.files) || !delivery.files.length) return null;
  if (!delivery.files.some(file => file?.kind === 'license')) return null;
  if (!delivery.files.some(file => file?.kind === 'audio')) return null;
  if (delivery.files.some(file => !file || !['audio', 'license'].includes(file.kind) ||
    typeof file.key !== 'string' || !file.key.length || file.key.startsWith('/') ||
    file.key.split('/').includes('..') || typeof file.name !== 'string' ||
    !/^[\w .()-]{1,120}$/.test(file.name))) return null;
  return delivery.files.map(({ key, name, kind }) => ({ key, name, kind }));
}
