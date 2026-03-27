import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

// Lazy-initialized: read env vars at call time (after dotenv.config() has run)
let _s3: S3Client | null = null;

function getS3(): S3Client {
  if (!_s3) {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error('R2 credentials not configured (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)');
    }
    _s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return _s3;
}

function getBucket(): string {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error('R2_BUCKET_NAME not configured');
  return bucket;
}

function getPublicUrl(): string {
  return (process.env.R2_PUBLIC_URL ?? '').replace(/\/$/, '');
}

/**
 * Upload a file buffer to R2.
 */
export async function uploadToR2(
  buffer: Buffer,
  originalName: string,
  contentType: string,
  folder = 'documents'
): Promise<{ url: string; key: string }> {
  const ext = path.extname(originalName).toLowerCase().replace(/[^.a-z0-9]/g, '');
  const key = `${folder}/${uuidv4()}${ext}`;

  await getS3().send(
    new PutObjectCommand({
      Bucket:      getBucket(),
      Key:         key,
      Body:        buffer,
      ContentType: contentType,
    })
  );

  const url = `${getPublicUrl()}/${key}`;
  return { url, key };
}

/**
 * Delete a file from R2 by its key.
 */
export async function deleteFromR2(key: string): Promise<void> {
  await getS3().send(new DeleteObjectCommand({ Bucket: getBucket(), Key: key }));
}

/**
 * Extract the R2 object key from a stored URL.
 */
export function keyFromUrl(url: string): string {
  const publicUrl = getPublicUrl();
  if (!publicUrl || !url.startsWith(publicUrl)) return url;
  return url.slice(publicUrl.length + 1);
}

/**
 * Generate a short-lived signed URL for a private object.
 */
export async function getPresignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
  return getSignedUrl(
    getS3(),
    new GetObjectCommand({ Bucket: getBucket(), Key: key }),
    { expiresIn: expiresInSeconds }
  );
}
