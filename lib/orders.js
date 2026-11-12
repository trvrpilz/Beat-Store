import pg from 'pg';

const { Pool } = pg;

let pool;
let schemaReady;

function getPool() {
  if (!process.env.DATABASE_URL) return null;

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    });
  }

  return pool;
}

async function ensureSchema(db) {
  if (!schemaReady) {
    schemaReady = db.query(`
      CREATE TABLE IF NOT EXISTS beat_store_orders (
        id BIGSERIAL PRIMARY KEY,
        stripe_session_id TEXT NOT NULL UNIQUE,
        payment_intent_id TEXT,
        customer_id TEXT,
        customer_email TEXT,
        beat_id TEXT NOT NULL,
        beat_title TEXT,
        license_name TEXT NOT NULL,
        amount_total INTEGER,
        currency TEXT,
        payment_status TEXT NOT NULL,
        fulfillment_status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `).then(() => db.query('ALTER TABLE beat_store_orders ADD COLUMN IF NOT EXISTS access_token_hash TEXT')).catch((error) => {
      schemaReady = null;
      throw error;
    });
  }

  await schemaReady;
}

function objectId(value) {
  if (!value) return null;
  return typeof value === 'string' ? value : value.id || null;
}

export async function persistVerifiedOrder(session) {
  if (session.payment_status !== 'paid') throw new Error('Only paid sessions can be persisted');
  const db = getPool();
  if (!db) {
    throw new Error('DATABASE_URL is not configured');
  }

  await ensureSchema(db);

  const beatId = session.metadata?.beatId;
  const licenseName = session.metadata?.licenseName;

  if (!beatId || !licenseName) {
    throw new Error('Paid session is missing fulfillment metadata');
  }

  const email = session.customer_details?.email || session.customer_email || null;

  const result = await db.query(
    `
      INSERT INTO beat_store_orders (
        stripe_session_id,
        payment_intent_id,
        customer_id,
        customer_email,
        beat_id,
        beat_title,
        license_name,
        amount_total,
        currency,
        payment_status,
        fulfillment_status,
        access_token_hash
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending',$11)
      ON CONFLICT (stripe_session_id)
      DO UPDATE SET
        payment_intent_id = EXCLUDED.payment_intent_id,
        customer_id = EXCLUDED.customer_id,
        customer_email = EXCLUDED.customer_email,
        beat_id = EXCLUDED.beat_id,
        beat_title = EXCLUDED.beat_title,
        license_name = EXCLUDED.license_name,
        amount_total = EXCLUDED.amount_total,
        currency = EXCLUDED.currency,
        payment_status = EXCLUDED.payment_status,
        access_token_hash = COALESCE(beat_store_orders.access_token_hash, EXCLUDED.access_token_hash),
        updated_at = NOW()
      RETURNING id, fulfillment_status
    `,
    [
      session.id,
      objectId(session.payment_intent),
      objectId(session.customer),
      email,
      beatId,
      session.metadata?.beatTitle || null,
      licenseName,
      session.amount_total ?? null,
      session.currency || null,
      session.payment_status,
      /^[a-f0-9]{64}$/.test(session.metadata?.accessTokenHash || '') ? session.metadata.accessTokenHash : null
    ]
  );

  return result.rows[0];
}

// The browser never creates orders; it can only read a webhook-persisted paid order.
export async function findVerifiedOrder(sessionId, tokenHash) {
  const db = getPool();
  if (!db) throw new Error('DATABASE_URL is not configured');
  await ensureSchema(db);
  const result = await db.query(
    `SELECT beat_id, beat_title, license_name, payment_status, created_at
     FROM beat_store_orders WHERE stripe_session_id = $1 AND access_token_hash = $2 AND payment_status = 'paid'`,
    [sessionId, tokenHash]
  );
  return result.rows[0] || null;
}
