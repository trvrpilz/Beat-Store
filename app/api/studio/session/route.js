import { NextResponse } from 'next/server';
import { authorized, cookieName, same, sameOrigin, session } from '../../../../lib/studio-auth.mjs';
export const runtime = 'nodejs';
export async function GET(request) {
  return NextResponse.json({ authenticated: authorized(request) }, { headers: { 'Cache-Control': 'no-store' } });
}
export async function POST(request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  if (Number(request.headers.get('content-length')) > 2048) return new Response(null, { status: 413 });
  const secret = process.env.STUDIO_PASSWORD;
  if (!secret || secret.length < 32) return NextResponse.json({ error: 'Studio access is not configured yet.' }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  if (!same(body.password || '', secret)) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return NextResponse.json({ error: 'Incorrect access password.' }, { status: 401 });
  }
  const response = NextResponse.json({ authenticated: true });
  response.cookies.set(cookieName, session(secret), { httpOnly: true, secure: true, sameSite: 'strict', path: '/', maxAge: 28800 });
  return response;
}
export async function DELETE(request) {
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(cookieName, '', { httpOnly: true, secure: true, sameSite: 'strict', path: '/', maxAge: 0 });
  return response;
}
