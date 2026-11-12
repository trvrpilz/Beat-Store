import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { resolveDelivery } from './order-access.mjs';

let client;
export function deliveryFiles(beatId, licenseName) {
  const manifest = JSON.parse(process.env.BEAT_DELIVERY_MANIFEST || '{}');
  return resolveDelivery(manifest, beatId, licenseName);
}
export function storageConfigured() {
  return ['S3_ENDPOINT', 'S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY']
    .every(key => Boolean(process.env[key]));
}
export async function signedDownloads(files) {
  if (!storageConfigured()) throw new Error('Private storage is not configured');
  client ||= new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || 'auto',
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY }
  });
  return Promise.all(files.map(async file => ({
    name: file.name,
    kind: file.kind,
    url: await getSignedUrl(client, new GetObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: file.key,
      ResponseContentDisposition: `attachment; filename="${file.name}"`
    }), { expiresIn: 300 })
  })));
}
