// =============================================================
// Cloudflare R2 client (SERVER ONLY — never import in 'use client')
// R2 is S3-compatible, accessed with the official AWS SDK v3.
//
// Required env vars (Vercel → Project → Settings → Environment Variables):
//   R2_ACCOUNT_ID            Cloudflare account id
//   R2_ACCESS_KEY_ID         R2 API token access key
//   R2_SECRET_ACCESS_KEY     R2 API token secret
//   R2_BUCKET_NAME           e.g. luxor-smart-mall
//   NEXT_PUBLIC_R2_PUBLIC_URL  Public base URL of the bucket, e.g.
//                              https://pub-xxxx.r2.dev  OR a custom
//                              domain like https://cdn.yoursite.com
// =============================================================
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';

let _client: S3Client | null = null;

export function r2Client(): S3Client {
  if (_client) return _client;
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('R2 is not configured: set R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY');
  }
  _client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return _client;
}

export function r2Bucket(): string {
  const b = process.env.R2_BUCKET_NAME;
  if (!b) throw new Error('R2_BUCKET_NAME is not set');
  return b;
}

export function r2PublicBase(): string {
  const u = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  if (!u) throw new Error('NEXT_PUBLIC_R2_PUBLIC_URL is not set');
  return u.replace(/\/+$/, '');
}

/** Public URL for an object key */
export function r2PublicUrl(key: string): string {
  return `${r2PublicBase()}/${key.split('/').map(encodeURIComponent).join('/')}`;
}

/** Extract the object key from one of OUR public R2 URLs (null otherwise) */
export function r2KeyFromUrl(url?: string | null): string | null {
  if (!url) return null;
  let base: string;
  try {
    base = r2PublicBase();
  } catch {
    return null;
  }
  if (!url.startsWith(base + '/')) return null;
  try {
    return decodeURIComponent(url.slice(base.length + 1).split('?')[0]);
  } catch {
    return url.slice(base.length + 1).split('?')[0];
  }
}

/**
 * Upload a blob. Unique filenames + long immutable cache = images are
 * served straight from Cloudflare's edge cache → excellent performance.
 */
export async function r2Upload(key: string, body: Buffer | Uint8Array, contentType: string): Promise<void> {
  await r2Client().send(
    new PutObjectCommand({
      Bucket: r2Bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    })
  );
}

/** Batch-delete up to 1000 keys per request (best-effort) */
export async function r2DeleteKeys(keys: string[]): Promise<void> {
  if (!keys.length) return;
  const client = r2Client();
  for (let i = 0; i < keys.length; i += 1000) {
    const chunk = keys.slice(i, i + 1000);
    try {
      await client.send(
        new DeleteObjectsCommand({
          Bucket: r2Bucket(),
          Delete: { Objects: chunk.map((Key) => ({ Key })), Quiet: true },
        })
      );
    } catch {
      /* best-effort cleanup — never block the main operation */
    }
  }
}

/** List every object key under a prefix (paginates automatically) */
export async function r2ListKeys(prefix: string): Promise<string[]> {
  const client = r2Client();
  const keys: string[] = [];
  let token: string | undefined;
  for (let page = 0; page < 50; page++) {
    const res = await client.send(
      new ListObjectsV2Command({
        Bucket: r2Bucket(),
        Prefix: prefix,
        ContinuationToken: token,
        MaxKeys: 1000,
      })
    );
    for (const o of res.Contents ?? []) {
      if (o.Key) keys.push(o.Key);
    }
    if (!res.IsTruncated || !res.NextContinuationToken) break;
    token = res.NextContinuationToken;
  }
  return keys;
}
