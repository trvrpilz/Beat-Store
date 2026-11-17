import { NextResponse } from 'next/server';
import { Readable, Transform } from 'node:stream';
import { randomUUID } from 'node:crypto';
import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { db, storage } from '../../../../lib/studio';
import { authorized, sameOrigin, validFile } from '../../../../lib/studio-auth.mjs';
export const runtime = 'nodejs';
export async function PUT(request) {
  if (!authorized(request)) return new Response(null, { status: 401 });
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  const p = request.nextUrl.searchParams;
  const id = p.get('id'), kind = p.get('kind'), name = (p.get('name') || '').replace(/[^a-zA-Z0-9._ -]/g, '_').slice(-160);
  const size = Number(request.headers.get('content-length'));
  if (!/^[a-f0-9-]{36}$/.test(id || '') || !validFile(kind, name, size) || !request.body) return NextResponse.json({ error: 'Use MP3/WAV audio, ZIP stems, or JPG/PNG/WebP artwork. Maximum 250 MB per file; artwork 10 MB.' }, { status: 400 });
  let key, client;
  try {
    const database = await db();
    if (!(await database.query('SELECT id FROM studio_beats WHERE id=$1', [id])).rowCount) return new Response(null, { status: 404 });
    client = storage(); key = 'studio/' + id + '/' + randomUUID() + '/' + name;
    let received = 0;
    const limiter = new Transform({ transform(chunk, encoding, cb) { received += chunk.length; cb(received > size ? new Error('Too large') : null, chunk); }, flush(cb) { cb(received === size ? null : new Error('Incomplete upload')); } });
    const source = Readable.fromWeb(request.body);
    source.on('error', e => limiter.destroy(e));
    const body = source.pipe(limiter);
    try { await client.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, Body: body, ContentLength: size, ContentType: 'application/octet-stream' })); }
    finally { source.destroy(); limiter.destroy(); }
    const file = { key, name, kind, size };
    await database.query("UPDATE studio_beats SET files = files || $2::jsonb WHERE id=$1", [id, JSON.stringify([file])]);
    return NextResponse.json({ file });
  } catch {
    if (key && client) await client.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key })).catch(() => {});
    return NextResponse.json({ error: 'Upload failed. Your beat draft is saved; retry adding the file.' }, { status: 503 });
  }
}
export async function GET(request) {
  if (!authorized(request)) return new Response(null, { status: 401 });
  const key = request.nextUrl.searchParams.get('key');
  if (!key || !key.startsWith('studio/')) return new Response(null, { status: 400 });
  try {
    const result = await (await db()).query('SELECT id FROM studio_beats WHERE files @> $1::jsonb', [JSON.stringify([{ key }])]);
    if (!result.rowCount) return new Response(null, { status: 404 });
    const url = await getSignedUrl(storage(), new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, ResponseContentDisposition: 'attachment' }), { expiresIn: 60 });
    return NextResponse.json({ url }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return new Response(null, { status: 503 }); }
}
