import pg from 'pg';
import { S3Client } from '@aws-sdk/client-s3';
let pool, ready, s3;
export async function db() {
  if (!process.env.DATABASE_URL) throw new Error('Database unavailable');
  pool ||= new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 4, connectionTimeoutMillis: 5000 });
  ready ||= pool.query(`CREATE TABLE IF NOT EXISTS studio_beats (
    id UUID PRIMARY KEY, title TEXT NOT NULL, bpm INTEGER, musical_key TEXT,
    tags TEXT, price_cents INTEGER, files JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`).catch(e => { ready = null; throw e; });
  await ready;
  return pool;
}
export function storage() {
  if (!['S3_ENDPOINT','S3_BUCKET','S3_ACCESS_KEY_ID','S3_SECRET_ACCESS_KEY'].every(k => process.env[k])) throw new Error('Storage unavailable');
  s3 ||= new S3Client({ endpoint: process.env.S3_ENDPOINT, region: process.env.S3_REGION || 'auto', requestChecksumCalculation: 'WHEN_REQUIRED', credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY } });
  return s3;
}
