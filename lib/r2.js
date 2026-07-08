import {
  S3Client, PutObjectCommand, DeleteObjectCommand,
  CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand, ListPartsCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Mărimea unei bucăți la upload multipart. R2 cere min 5 MiB și toate bucățile
// egale, mai puțin ultima. 50 MiB → un clip de 1GB = 20 bucăți (max R2 = 10.000).
export const R2_PART_SIZE = 50 * 1024 * 1024;

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
  // R2 compat: nu adăuga checksum-uri CRC32 implicite (ar strica URL-urile presemnate,
  // mai ales bucățile multipart). Checksum-ul e opțional pt. PutObject/UploadPart.
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
});

export async function getPresignedUploadUrl(key, contentType, expiresIn = 3600) {
  const command = new PutObjectCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(r2Client, command, { expiresIn });
}

export async function deleteObject(key) {
  const command = new DeleteObjectCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
    Key: key,
  });
  return r2Client.send(command);
}

export function getPublicUrl(key) {
  return `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`;
}

// ─── Upload multipart (fișiere mari, bucăți în paralel) ──────────────────────

// Deschide un upload multipart și întoarce UploadId-ul.
export async function createMultipartUpload(key, contentType) {
  const res = await r2Client.send(new CreateMultipartUploadCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  }));
  return res.UploadId;
}

// URL presemnat pentru o singură bucată (browser → R2, fără să treacă prin Vercel).
export async function getPresignedPartUrl(key, uploadId, partNumber, expiresIn = 3600) {
  const command = new UploadPartCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
    Key: key,
    UploadId: uploadId,
    PartNumber: partNumber,
  });
  return getSignedUrl(r2Client, command, { expiresIn });
}

// Listăm bucățile urcate (cu ETag) — serverul finalizează, clientul NU trebuie
// să citească ETag-uri din răspuns (deci fără modificări CORS). Gestionăm paginarea.
export async function listAllParts(key, uploadId) {
  const parts = [];
  let marker;
  do {
    const res = await r2Client.send(new ListPartsCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
      PartNumberMarker: marker,
    }));
    for (const p of res.Parts || []) parts.push({ PartNumber: p.PartNumber, ETag: p.ETag });
    marker = res.IsTruncated ? res.NextPartNumberMarker : undefined;
  } while (marker);
  parts.sort((a, b) => a.PartNumber - b.PartNumber);
  return parts;
}

export async function completeMultipartUpload(key, uploadId, parts) {
  return r2Client.send(new CompleteMultipartUploadCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
    Key: key,
    UploadId: uploadId,
    MultipartUpload: { Parts: parts },
  }));
}

export async function abortMultipartUpload(key, uploadId) {
  return r2Client.send(new AbortMultipartUploadCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
    Key: key,
    UploadId: uploadId,
  }));
}
