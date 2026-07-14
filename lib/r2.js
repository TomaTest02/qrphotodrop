import {
  S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, DeleteObjectsCommand,
  ListObjectsV2Command,
  CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand, ListPartsCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Bucată la upload multipart. R2 cere min 5 MiB și toate bucățile egale (mai puțin
// ultima), max 10.000 bucăți. 16 MiB → un clip de 1.5GB ≈ 96 bucăți.
export const R2_PART_SIZE = 16 * 1024 * 1024;

// MIME → extensie CORECTĂ (ex. video/quicktime → mov, nu „quicktime")
const MIME_EXT = {
  'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  'image/gif': 'gif', 'image/heic': 'heic', 'image/heif': 'heif',
  'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/x-msvideo': 'avi',
  'video/webm': 'webm', 'video/mov': 'mov',
};
export function extForMime(contentType) {
  return MIME_EXT[contentType] || 'bin';
}

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
  // OBLIGATORIU pentru R2: SDK-ul AWS ≥3.729 adaugă implicit checksum-uri CRC32 care
  // STRICĂ URL-urile presemnate PutObject/UploadPart pe R2. WHEN_REQUIRED le dezactivează.
  // Ref: community.cloudflare.com + github aws/aws-sdk-js-v3#6810
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

// Download direct din R2: Vercel autorizează și semnează, dar nu transportă
// conținutul fișierului. URL-ul este scurt-lived și nu se persistă în DB.
export async function getPresignedDownloadUrl(key, contentDisposition, expiresIn = 300) {
  const command = new GetObjectCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
    Key: key,
    ...(contentDisposition ? { ResponseContentDisposition: contentDisposition } : {}),
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

const DELETABLE_PREFIX = /^(events|archives)\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/$/i;

export function assertDeletablePrefix(prefix) {
  if (typeof prefix !== 'string' || !DELETABLE_PREFIX.test(prefix)) {
    throw new Error('Prefix R2 nepermis pentru ștergere');
  }
}

export function isNoSuchUploadError(error) {
  return error?.name === 'NoSuchUpload'
    || error?.Code === 'NoSuchUpload'
    || error?.$metadata?.httpStatusCode === 404;
}

// Șterge TOATE obiectele de sub un prefix (ex. `events/<id>/`). Folosit la ștergerea
// completă a unui eveniment/cont — prinde și fișierele orfane (nu doar cele din DB).
// Paginat + ștergere în loturi de max 1000. Prefixul e OBLIGATORIU (protecție anti-golire).
export async function deleteByPrefix(prefix) {
  assertDeletablePrefix(prefix);
  const Bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME;
  let deleted = 0;

  // Cerem mereu prima pagină. ContinuationToken-ul descrie lista dinaintea
  // ștergerii și poate sări obiecte când pagina anterioară tocmai a dispărut.
  while (true) {
    const list = await r2Client.send(new ListObjectsV2Command({
      Bucket,
      Prefix: prefix,
      MaxKeys: 1000,
    }));
    const objects = (list.Contents || []).map((o) => ({ Key: o.Key }));
    if (!objects.length) break;

    const res = await r2Client.send(new DeleteObjectsCommand({
      Bucket, Delete: { Objects: objects, Quiet: true },
    }));
    if (res.Errors && res.Errors.length) {
      throw new Error(`DeleteObjects: ${res.Errors.length} erori (ex: ${res.Errors[0]?.Key} ${res.Errors[0]?.Code})`);
    }
    deleted += objects.length;
  }

  return deleted;
}

// Verifică dacă un prefix nu mai are niciun obiect (după o ștergere).
export async function prefixIsEmpty(prefix) {
  assertDeletablePrefix(prefix);
  const res = await r2Client.send(new ListObjectsV2Command({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
    Prefix: prefix,
    MaxKeys: 1,
  }));
  return !(res.Contents && res.Contents.length);
}

export function getPublicUrl(key) {
  return `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`;
}

// ─── Upload multipart (fișiere mari, bucăți în paralel, fără expirare) ────────

export async function createMultipartUpload(key, contentType) {
  const res = await r2Client.send(new CreateMultipartUploadCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  }));
  return res.UploadId;
}

// URL presemnat pentru o singură bucată. Semnat LA CERERE, chiar înainte de folosire,
// cu expirare generoasă → nu apucă să expire în timpul uploadului (și se re-semnează la retry).
export async function getPresignedPartUrl(key, uploadId, partNumber, expiresIn = 7200) {
  const command = new UploadPartCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
    Key: key,
    UploadId: uploadId,
    PartNumber: partNumber,
  });
  return getSignedUrl(r2Client, command, { expiresIn });
}

// Serverul citește ETag-urile prin ListParts → clientul NU trebuie să le citească
// din browser, deci NU e nevoie de modificări CORS (ExposeHeaders ETag). Cu paginare.
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
    for (const p of res.Parts || []) parts.push({ PartNumber: p.PartNumber, ETag: p.ETag, Size: p.Size });
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
