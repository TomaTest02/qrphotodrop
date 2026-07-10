import {
  S3Client, PutObjectCommand, DeleteObjectCommand,
  CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand, ListPartsCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Bucată la upload multipart. R2 cere min 5 MiB și toate bucățile egale (mai puțin
// ultima), max 10.000 bucăți. 16 MiB → un clip de 1.5GB ≈ 96 bucăți.
export const R2_PART_SIZE = 16 * 1024 * 1024;

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
