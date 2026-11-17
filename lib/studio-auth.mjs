import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
export const cookieName = '__Host-beat-studio';
export function same(a, b) {
  return timingSafeEqual(createHash('sha256').update(String(a)).digest(), createHash('sha256').update(String(b)).digest());
}
export function session(secret, now = Date.now()) {
  const expires = String(now + 8 * 60 * 60 * 1000);
  return expires + '.' + createHmac('sha256', secret).update(expires).digest('hex');
}
export function validSession(value, secret, now = Date.now()) {
  if (!secret || secret.length < 32 || !value) return false;
  const [expires, signature] = value.split('.');
  return /^\d+$/.test(expires) && Number(expires) > now && Number(expires) <= now + 8 * 60 * 60 * 1000 && same(signature, createHmac('sha256', secret).update(expires).digest('hex'));
}
export function authorized(request) {
  return validSession(request.cookies.get(cookieName)?.value, process.env.STUDIO_PASSWORD);
}
export function sameOrigin(request) {
  return !!process.env.PUBLIC_URL && request.headers.get('origin') === new URL(process.env.PUBLIC_URL).origin;
}
export const kinds = { audio: ['mp3','wav'], stems: ['zip'], artwork: ['jpg','jpeg','png','webp'], preview: ['mp3'] };
export function validFile(kind, name, size) {
  return !!kinds[kind]?.includes(String(name).split('.').pop().toLowerCase()) && Number.isSafeInteger(size) && size > 0 && size <= (kind === 'artwork' ? 10 : 250) * 1024 * 1024;
}
