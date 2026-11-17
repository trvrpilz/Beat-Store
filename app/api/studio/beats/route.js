import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { db, storage } from '../../../../lib/studio';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { authorized, sameOrigin } from '../../../../lib/studio-auth.mjs';
export const runtime = 'nodejs';
export async function DELETE(request) {
  if (!authorized(request)) return new Response(null, { status: 401 });
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  const id = request.nextUrl.searchParams.get('id');
  if (!/^[a-f0-9-]{36}$/.test(id || '')) return new Response(null, { status: 400 });
  try {
    const database = await db();
    const result = await database.query('SELECT files FROM studio_beats WHERE id=$1', [id]);
    if (!result.rowCount) return new Response(null, { status: 404 });
    for (const file of result.rows[0].files) await storage().send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: file.key }));
    await database.query('DELETE FROM studio_beats WHERE id=$1', [id]);
    return NextResponse.json({ deleted: true });
  } catch { return NextResponse.json({ error: 'Could not delete this draft. Retry shortly.' }, { status: 503 }); }
}
export async function GET(request) {
  if (!authorized(request)) return new Response(null, { status: 401 });
  try { return NextResponse.json({ beats: (await (await db()).query('SELECT * FROM studio_beats ORDER BY created_at DESC LIMIT 500')).rows }, { headers: { 'Cache-Control': 'no-store' } }); }
  catch { return NextResponse.json({ error: 'Unable to load your library. Please retry.' }, { status: 503 }); }
}
export async function POST(request) {
  if (!authorized(request)) return new Response(null, { status: 401 });
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  if (Number(request.headers.get('content-length')) > 8192) return new Response(null, { status: 413 });
  const b = await request.json().catch(() => ({}));
  if (typeof b.title !== 'string' || !b.title.trim() || b.title.length > 150 || (b.bpm != null && (!Number.isInteger(b.bpm) || b.bpm < 20 || b.bpm > 300)) || (b.price_cents != null && (!Number.isInteger(b.price_cents) || b.price_cents < 0 || b.price_cents > 10000000))) return NextResponse.json({ error: 'Check the title, tempo and price.' }, { status: 400 });
  try {
    const result = await (await db()).query('INSERT INTO studio_beats(id,title,bpm,musical_key,tags,price_cents) VALUES($1,$2,$3,$4,$5,$6) RETURNING *', [randomUUID(),b.title.trim(),b.bpm,String(b.musical_key || '').slice(0,40),String(b.tags || '').slice(0,300),b.price_cents]);
    return NextResponse.json({ beat: result.rows[0] });
  } catch { return NextResponse.json({ error: 'Could not save this beat. Please retry.' }, { status: 503 }); }
}
