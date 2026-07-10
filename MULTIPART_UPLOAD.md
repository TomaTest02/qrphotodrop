# Multipart Upload — QRPhotoDrop (pentru review)

Document pentru revizuire tehnică. Conține **arhitectura, deciziile de design și tot codul**
legat de uploadul multipart al fișierelor mari (clipuri video) direct în Cloudflare R2.

Stack: **Next.js (App Router, Route Handlers, Node.js runtime) pe Vercel · Cloudflare R2 (S3 API) · Supabase (doar metadate) · @aws-sdk/client-s3 v3**.

---

## 1. Obiectiv

Upload fiabil pentru clipuri mari (până la 1.5 GB) de pe telefoanele invitaților, pe WiFi slab de sală, **fără**:
- ca fișierul să treacă prin Vercel/Supabase (doar direct browser → R2);
- ca URL-urile presemnate să expire în timpul uploadului;
- ca o pică de rețea să strice tot uploadul (retry pe bucată).

---

## 2. Flow (de la cap la coadă)

```
CLIENT (browser/telefon)                         SERVER (Vercel, Node runtime)         R2
──────────────────────────                       ─────────────────────────────        ──────────
1. POST /api/upload/multipart/create  ───────►    verifică event activ + MIME +
   { eventCode, contentType,                       plafon stocare (mărime declarată)
     fileType, sizeBytes }                          CreateMultipartUpload  ───────────► deschide sesiune
                                       ◄───────    { uploadId, r2Key, partSize,
                                                     totalParts }

2. pentru fiecare bucată (3 în paralel):
   POST /api/upload/multipart/sign     ───────►    presign UploadPart (expiry 2h)
     { r2Key, uploadId, partNumbers[] } ◄───────   { urls: { partNo: url } }
   PUT bucată (16 MiB) ───────────────────────────────────────────────────────────►  stochează bucata
   (retry ×3; la retry cere URL PROASPĂT → nu expiră niciodată)

3. POST /api/upload/multipart/complete ───────►   ListParts (citește ETag-urile) ────► listează bucățile
     { r2Key, uploadId, eventCode,                 CompleteMultipartUpload ──────────► asamblează obiectul
       fileType, originalName }                     HEAD (verifică mărimea reală) ────► confirmă existența
                                                    re-verifică plafon stocare
                                                    INSERT rând în Supabase (doar acum)
                                       ◄───────    { upload }

La orice eroare:
   POST /api/upload/multipart/abort    ───────►    AbortMultipartUpload ─────────────► eliberează spațiul
```

**Fișierul nu trece niciodată prin Vercel** — funcțiile doar semnează URL-uri și fac apeluri de metadate. Bucățile merg direct `browser → R2`.

---

## 3. Decizii de design (și de ce)

| Decizie | Motiv |
|---|---|
| **`requestChecksumCalculation: 'WHEN_REQUIRED'`** pe S3Client | AWS SDK ≥ 3.729 adaugă implicit checksum CRC32 care **strică URL-urile presemnate PutObject/UploadPart pe R2**. Fără asta, multipart-ul pică mut. (ref: [Cloudflare Community](https://community.cloudflare.com/t/aws-sdk-client-s3-v3-729-0-breaks-uploadpart-and-putobject-r2-s3-api-compatibility/758637), [aws-sdk-js-v3#6810](https://github.com/aws/aws-sdk-js-v3/issues/6810)) |
| **Semnare URL-uri LA CERERE + re-semnare la retry** | Elimină expirarea în timpul uploadului. Fiecare bucată se urcă în câteva secunde cu un URL proaspăt (expiry 2h). Uploadul total poate dura ore fără să expire nimic. |
| **Finalizare pe server via `ListParts`** | Serverul citește ETag-urile bucăților, nu clientul → **nu e nevoie de modificare CORS** (`ExposeHeaders: ETag`). Un punct de eșec în minus. |
| **16 MiB / bucată, 3 în paralel, retry ×3** | R2 cere min 5 MiB și bucăți egale (mai puțin ultima), max 10.000. 16 MiB → clip 1.5 GB ≈ 96 bucăți. Retry pe bucată = o pică nu strică tot. |
| **Semnare în loturi de 8** | Echilibru între „on-demand" și numărul de invocări Vercel (plan free). |
| **Rând în Supabase DOAR la `completed`** | Nu apare în galerie până nu e complet. Fără rânduri „orfane" de curățat. Doar metadate (event_id, r2_key, size, tip, nume). |
| **Verificare mărime reală (HEAD) + plafon la complete** | Clientul poate minți despre mărime; verificăm real din R2 și ștergem dacă depășește. |
| **Abort la eroare + auto-abort R2 la 7 zile** | Eliberează spațiul rezervat de bucăți neterminate. |
| **Prag 32 MB** | Sub 32 MB → single-PUT (mai simplu). Peste → multipart. Fallback la single-PUT dacă multipart dă rateu. |

**Parametri:** `PART_SIZE = 16 MiB`, `CONCURRENCY = 3`, `SIGN_BATCH = 8`, `MULTIPART_THRESHOLD = 32 MB`, `expiry presign = 2h`, `retry = 3`.

---

## 4. Cod

### 4.1 `lib/r2.js` — config S3Client + helpers multipart

```js
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
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
});

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
```

### 4.2 `app/api/upload/multipart/create/route.js` — inițiere + verificare plafon

```js
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createMultipartUpload, R2_PART_SIZE } from '@/lib/r2';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';

const STORAGE_FULL = 'Storage limit exceeded for this event';
const ALLOWED_MIME = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif',
  'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/mov',
];

export async function POST(request) {
  try {
    const { eventCode, contentType, fileType, sizeBytes = 0 } = await request.json();

    if (!eventCode || !contentType || !sizeBytes) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    if (!ALLOWED_MIME.includes(contentType)) {
      return NextResponse.json({ error: 'Tip de fișier nepermis' }, { status: 415 });
    }

    const supabase = createAdminClient();
    const { data: event } = await supabase
      .from('events')
      .select('id, status, max_storage_bytes')
      .eq('event_code', eventCode)
      .single();

    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    if (event.status !== 'active') return NextResponse.json({ error: 'Event is not active' }, { status: 403 });

    // Plafon per fișier (declarat; mărimea reală se verifică la complete)
    const isVideo = fileType === 'video';
    const perFileMax = isVideo ? 1536 * 1024 * 1024 : 20 * 1024 * 1024; // video 1.5GB / poză 20MB
    if (sizeBytes > perFileMax) return NextResponse.json({ error: 'File too large' }, { status: 413 });

    // Verificare plafon de stocare al evenimentului ÎNAINTE de inițiere
    const { data: usage } = await supabase.from('uploads').select('size_bytes').eq('event_id', event.id);
    const used = (usage || []).reduce((s, u) => s + (u.size_bytes || 0), 0);
    if (used + sizeBytes > event.max_storage_bytes) {
      return NextResponse.json({ error: STORAGE_FULL }, { status: 403 });
    }

    const partSize = R2_PART_SIZE;
    const totalParts = Math.max(1, Math.ceil(sizeBytes / partSize));
    if (totalParts > 10000) return NextResponse.json({ error: 'File too large' }, { status: 413 });

    const ext = contentType.split('/')[1] || 'bin';
    const folder = isVideo ? 'videos' : 'photos';
    const r2Key = `events/${event.id}/${folder}/${uuidv4()}.${ext}`;

    const uploadId = await createMultipartUpload(r2Key, contentType);

    return NextResponse.json({ uploadId, r2Key, partSize, totalParts });
  } catch (err) {
    console.error('Multipart create error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
```

### 4.3 `app/api/upload/multipart/sign/route.js` — presign bucăți la cerere (în loturi)

```js
import { NextResponse } from 'next/server';
import { getPresignedPartUrl } from '@/lib/r2';

export const runtime = 'nodejs';

// Semnează URL-uri pentru bucăți LA CERERE (în loturi). Clientul cere URL-urile pe
// măsură ce avansează și re-cere unul proaspăt la retry → nimic nu expiră în timpul uploadului.
export async function POST(request) {
  try {
    const { r2Key, uploadId, partNumbers } = await request.json();

    if (!r2Key || !uploadId || !Array.isArray(partNumbers) || !partNumbers.length) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    if (!r2Key.startsWith('events/') || r2Key.includes('..')) {
      return NextResponse.json({ error: 'Invalid r2Key format' }, { status: 400 });
    }
    // Limităm dimensiunea lotului și validăm numerele bucăților
    const nums = partNumbers
      .map((n) => Number(n))
      .filter((n) => Number.isInteger(n) && n >= 1 && n <= 10000)
      .slice(0, 20);
    if (!nums.length) return NextResponse.json({ error: 'Invalid part numbers' }, { status: 400 });

    const urls = {};
    await Promise.all(nums.map(async (n) => { urls[n] = await getPresignedPartUrl(r2Key, uploadId, n); }));

    return NextResponse.json({ urls });
  } catch (err) {
    console.error('Multipart sign error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
```

### 4.4 `app/api/upload/multipart/complete/route.js` — finalizare + verificare + insert

```js
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  getPublicUrl, deleteObject, r2Client,
  listAllParts, completeMultipartUpload, abortMultipartUpload,
} from '@/lib/r2';
import { HeadObjectCommand } from '@aws-sdk/client-s3';

export const runtime = 'nodejs';

const ALLOWED_FILE_TYPES = ['photo', 'video'];
const STORAGE_FULL = 'Storage limit exceeded for this event';

export async function POST(request) {
  try {
    const { r2Key, uploadId, eventCode, fileType, originalName } = await request.json();

    if (!r2Key || !uploadId || !eventCode) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    if (!r2Key.startsWith('events/') || r2Key.includes('..')) return NextResponse.json({ error: 'Invalid r2Key format' }, { status: 400 });
    if (fileType && !ALLOWED_FILE_TYPES.includes(fileType)) return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    if (!/^[a-zA-Z0-9]{6,12}$/.test(eventCode)) return NextResponse.json({ error: 'Invalid event code' }, { status: 400 });

    const supabase = createAdminClient();
    const { data: event } = await supabase
      .from('events')
      .select('id, status, max_storage_bytes')
      .eq('event_code', eventCode)
      .single();

    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    if (event.status !== 'active') return NextResponse.json({ error: 'Event is not active' }, { status: 403 });
    if (!r2Key.startsWith(`events/${event.id}/`)) return NextResponse.json({ error: 'r2Key does not belong to this event' }, { status: 403 });

    // Finalizăm citind ETag-urile pe server (fără CORS ETag pe client)
    const parts = await listAllParts(r2Key, uploadId);
    if (!parts.length) {
      await abortMultipartUpload(r2Key, uploadId).catch(() => {});
      return NextResponse.json({ error: 'No parts uploaded' }, { status: 400 });
    }
    await completeMultipartUpload(r2Key, uploadId, parts);

    // Verificăm prin backend că fișierul complet există + mărimea REALĂ
    let actualSize = 0;
    try {
      const head = await r2Client.send(new HeadObjectCommand({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
        Key: r2Key,
      }));
      actualSize = Number(head.ContentLength || 0);
    } catch {
      return NextResponse.json({ error: 'Object not found after complete' }, { status: 400 });
    }

    const isVideo = fileType === 'video';
    const MAX_SIZE = isVideo ? 2 * 1024 * 1024 * 1024 : 150 * 1024 * 1024;
    if (actualSize > MAX_SIZE) {
      await deleteObject(r2Key).catch(() => {});
      return NextResponse.json({ error: 'Fișierul depășește limita' }, { status: 413 });
    }

    const { data: usageRows } = await supabase.from('uploads').select('size_bytes').eq('event_id', event.id);
    const used = (usageRows || []).reduce((s, u) => s + (u.size_bytes || 0), 0);
    if (used + actualSize > event.max_storage_bytes) {
      await deleteObject(r2Key).catch(() => {});
      return NextResponse.json({ error: STORAGE_FULL }, { status: 403 });
    }

    const publicUrl = getPublicUrl(r2Key);
    const safeOriginalName = (originalName || r2Key.split('/').pop())
      .replace(/[^a-zA-Z0-9._\-\s]/g, '')
      .substring(0, 255);

    // Doar la final inserăm rândul → nu apare în galerie până nu e complet
    const { data, error } = await supabase.from('uploads').insert({
      event_id: event.id,
      r2_key: r2Key,
      public_url: publicUrl,
      file_type: fileType || 'video',
      size_bytes: actualSize,
      original_name: safeOriginalName,
    }).select().single();

    if (error) {
      console.error('Multipart complete DB error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ upload: data });
  } catch (err) {
    console.error('Multipart complete error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
```

### 4.5 `app/api/upload/multipart/abort/route.js` — anulare (eliberează spațiul)

```js
import { NextResponse } from 'next/server';
import { abortMultipartUpload } from '@/lib/r2';

export const runtime = 'nodejs';

// Curățare când clientul renunță/eșuează → eliberează bucățile rezervate în R2.
// (R2 abandonează oricum uploadurile neterminate automat după 7 zile.)
export async function POST(request) {
  try {
    const { r2Key, uploadId } = await request.json();
    if (!r2Key || !uploadId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    if (!r2Key.startsWith('events/') || r2Key.includes('..')) {
      return NextResponse.json({ error: 'Invalid r2Key format' }, { status: 400 });
    }
    await abortMultipartUpload(r2Key, uploadId).catch(() => {});
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Multipart abort error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
```

### 4.6 Client — `uploadMultipart` + `putPart` (în `app/upload/[eventCode]/page.js`)

```js
// ─── Upload multipart (fișiere mari) ─────────────────────────────────────────
const MULTIPART_THRESHOLD = 32 * 1024 * 1024; // peste 32MB → multipart
const MULTIPART_CONCURRENCY = 3;              // bucăți în paralel
const SIGN_BATCH = 8;                         // câte URL-uri cerem odată

// PUT o bucată. FĂRĂ Content-Type (URL-ul presemnat UploadPart nu-l semnează).
function putPart(url, blob, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error('part PUT ' + xhr.status)));
    xhr.onerror = () => reject(new Error('part PUT network error'));
    xhr.send(blob);
  });
}

// Upload multipart complet. Întoarce 'ok' | 'storageFull'; aruncă la alte erori.
async function uploadMultipart(eventCode, file, fileType, onProgress) {
  const createRes = await fetch('/api/upload/multipart/create', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventCode, contentType: file.type, fileType, sizeBytes: file.size }),
  });
  if (!createRes.ok) {
    const e = await createRes.json().catch(() => ({}));
    if (e.error === 'Storage limit exceeded for this event') return 'storageFull';
    throw new Error(e.error || 'multipart create failed');
  }
  const { uploadId, r2Key, partSize, totalParts } = await createRes.json();

  const urlCache = {};
  const signParts = async (nums) => {
    const need = nums.filter((n) => !urlCache[n]);
    if (!need.length) return;
    const res = await fetch('/api/upload/multipart/sign', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ r2Key, uploadId, partNumbers: need }),
    });
    if (!res.ok) throw new Error('sign failed');
    Object.assign(urlCache, (await res.json()).urls);
  };
  const signOne = async (n) => {
    const res = await fetch('/api/upload/multipart/sign', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ r2Key, uploadId, partNumbers: [n] }),
    });
    if (!res.ok) throw new Error('sign failed');
    const url = (await res.json()).urls[n];
    urlCache[n] = url;
    return url;
  };

  try {
    const frac = new Array(totalParts).fill(0);
    const report = () => onProgress(frac.reduce((a, b) => a + b, 0) / totalParts);
    let next = 1; // numerele bucăților: 1..totalParts

    const worker = async () => {
      while (next <= totalParts) {
        const partNumber = next++;
        const idx = partNumber - 1;
        const start = idx * partSize;
        const blob = file.slice(start, Math.min(start + partSize, file.size));
        // pre-semnăm un lot începând de la bucata curentă (economisim invocări)
        if (!urlCache[partNumber]) {
          const window = [];
          for (let p = partNumber; p < Math.min(partNumber + SIGN_BATCH, totalParts + 1); p++) window.push(p);
          await signParts(window);
        }
        let url = urlCache[partNumber];
        let done = false;
        for (let attempt = 0; attempt <= 3 && !done; attempt++) {
          try {
            if (attempt > 0) url = await signOne(partNumber); // URL proaspăt la retry → nu expiră
            await putPart(url, blob, (f) => { frac[idx] = f; report(); });
            done = true;
          } catch (err) {
            if (attempt === 3) throw err;
            frac[idx] = 0; report();
            await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
          }
        }
        frac[idx] = 1; report();
      }
    };

    await Promise.all(Array.from({ length: Math.min(MULTIPART_CONCURRENCY, totalParts) }, worker));

    const completeRes = await fetch('/api/upload/multipart/complete', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ r2Key, uploadId, eventCode, fileType, originalName: file.name }),
    });
    if (!completeRes.ok) {
      const e = await completeRes.json().catch(() => ({}));
      if (e.error === 'Storage limit exceeded for this event') return 'storageFull';
      throw new Error(e.error || 'multipart complete failed');
    }
    return 'ok';
  } catch (err) {
    // Anulăm sesiunea multipart → eliberăm spațiul rezervat în R2 (best-effort)
    fetch('/api/upload/multipart/abort', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ r2Key, uploadId }),
    }).catch(() => {});
    throw err;
  }
}
```

### 4.7 Integrare în bucla de upload (în `uploadFiles`, `app/upload/[eventCode]/page.js`)

```js
const fileType = file.type.startsWith('video/') ? 'video' : 'photo';
const onFrac = (frac) => setUploadProgress(Math.round(((i + frac) / filesToUpload.length) * 100));

// Fișiere mari → upload MULTIPART (bucăți paralele, retry, fără expirare).
// Dacă eșuează din orice motiv, cădem pe single-PUT (plasă de siguranță).
if (file.size > MULTIPART_THRESHOLD) {
  try {
    const res = await uploadMultipart(eventCode, file, fileType, onFrac);
    if (res === 'storageFull') { storageFull = true; break; }
    succeeded++;
    setUploadProgress(Math.round(((i + 1) / filesToUpload.length) * 100));
    continue;
  } catch (err) {
    console.error('Multipart failed, fallback to single PUT:', err);
  }
}

// ... aici urmează calea single-PUT existentă (presigned → PUT → confirm) ...
```

---

## 5. Ce am făcut diferit față de sugestia inițială (și de ce)

1. **Finalizare pe server (ListParts) în loc de citit ETag în browser** → evităm complet modificarea CORS (`ExposeHeaders: ETag`). Mai robust, un pas riscant în minus.
2. **Fără status-machine complet (pending/uploading/failed/aborted) în Supabase** → pentru scara noastră (nuntă, ~50 invitați, plan free) e over-engineering. Inserăm rândul doar la `completed`; bucățile abandonate le curăță R2 automat la 7 zile. (Se poate adăuga ușor dacă vrem upload „reluabil" sau vizibilitate admin pe upload-uri în curs.)
3. **Semnare în loturi (8), nu una câte una** → mai puține invocări Vercel (plan free), păstrând beneficiul „on-demand + fără expirare".

---

## 6. De verificat / întrebări pentru reviewer

- [ ] E ok pragul de 32 MB pentru multipart vs single-PUT? (bucată = 16 MiB)
- [ ] Concurență 3 — prea puțin/mult pentru WiFi de sală?
- [ ] Semnarea în loturi de 8 vs pur on-demand (1 request/bucată) — compromis ok pt. free tier?
- [ ] Lipsa status-machine în DB e acceptabilă (nu avem nevoie de resume/vizibilitate admin)?
- [ ] Validarea în ruta `sign` e suficientă (doar format r2Key), sau vrei și verificare că `r2Key` aparține event-ului la fiecare semnare?
- [ ] Fallback-ul la single-PUT pentru fișiere mari care eșuează multipart — util sau mai bine doar eroare clară?

**CORS R2:** nu necesită modificări (bucățile se urcă cu `PUT`, deja permis; ETag-urile se citesc pe server). **Env:** nicio variabilă nouă.
```
Ramura: `feat/multipart-upload` (nu e în producție încă).
```

---

## 7. Runda 2 — corecții aplicate după review

| # | Punct din review | Status |
|---|---|---|
| 4 | Verifică fișierul complet înainte de `complete` | ✅ **Aplicat** — `complete` verifică `mărime reală R2 === mărime așteptată`; dacă lipsesc bucăți (mărime mai mică), șterge obiectul + eroare „Upload incomplet — reîncearcă". |
| 5 | Fără fallback la single-PUT pentru fișiere mari | ✅ **Aplicat** — la eșec multipart NU mai reîncărcăm 1.5GB prin single-PUT; fișierul rămâne necontat și userul reîncearcă. |
| 7 | Fără fișier orfan dacă inserarea în DB eșuează | ✅ **Aplicat** — ștergem obiectul din R2 dacă `insert` în Supabase eșuează. |
| 8 | Index unic pe `uploads.r2_key` | ✅ **Migrare adăugată** (`supabase/migrations/20260710120000_uploads_r2key_unique.sql`) — de rulat în Supabase. |
| 10 | `fileType` validat față de MIME | ✅ **Aplicat** — tipul e derivat din **MIME** (la create) și din **cheia R2** `videos/`·`photos/` (la complete), niciodată din ce trimite clientul. |
| 11 | Mapare MIME → extensie | ✅ **Aplicat** — `extForMime()`: `video/quicktime → .mov`, `video/x-msvideo → .avi` etc. |
| 6 | CORS obligatoriu (PUT + origine), fără `ExposeHeaders: ETag` | ✅ **Deja configurat** — bucățile se urcă cu `PUT` (deja permis); ETag-urile se citesc pe server. Nimic de schimbat. |
| 1, 2, 3 | Tabel sesiuni + rezervare atomică + validare sesiune în rute | ⏸️ **De decis** — corect pentru un SaaS la scară, dar la scara noastră (1 eveniment, ~50 invitați, free tier) cursa de depășire a plafonului e foarte improbabilă (volum real ~16–20GB ≪ 75GB), iar cheile sunt UUID + `uploadId` secret. Necesită migrare nouă + logică de rezervare. Se implementează dacă vrei robustețe maximă / multi-tenant. |
| 9 | Galerie privată: URL semnat, nu `public_url` permanent | 🔷 **Separat** — ține de arhitectura de vizualizare a **întregii** aplicații (dashboard, download, galerie), nu doar de multipart. De tratat ca task separat. |
| 12 | Lifecycle R2: abort multipart abandonat la 1–2 zile | ⚙️ **Config Cloudflare** (nu cod) — de setat în panoul R2 → bucket → Settings. |

**Parametri (16 MiB / concurență 3 / loturi 8 / 3 retry)** — validați de reviewer, rămân neschimbați.

---

## 8. Runda 3 — sesiuni multipart + rezervare atomică + rute securizate

> ⚠️ Codul din secțiunea 4 (rute care primeau `r2Key`/`uploadId` de la client) este **înlocuit** de modelul de mai jos. Acum clientul primește doar un **`sessionId`** neutru; serverul ține r2_key/upload_id în DB.

### 8.1 Tabel + rezervare atomică (`supabase/migrations/20260710130000_multipart_sessions.sql`)

Tabel `multipart_sessions`: `id, event_id, r2_key (unique), upload_id, expected_size_bytes, part_size_bytes, total_parts, status (pending|uploading|completed|failed|aborted), created_at, expires_at`.

Rezervarea e o **funcție Postgres** cu `FOR UPDATE` pe rândul evenimentului (serializează cererile concurente):

```sql
create or replace function public.reserve_multipart_session(...) returns uuid language plpgsql as $$
declare v_max bigint; v_used bigint; v_reserved bigint; v_id uuid;
begin
  select max_storage_bytes into v_max from public.events where id = p_event_id for update;
  if v_max is null then return null; end if;
  select coalesce(sum(size_bytes),0) into v_used from public.uploads where event_id = p_event_id;
  select coalesce(sum(expected_size_bytes),0) into v_reserved
    from public.multipart_sessions
    where event_id = p_event_id and status in ('pending','uploading') and expires_at > now();
  if v_used + v_reserved + p_expected_size > v_max then return null; end if;   -- fără loc
  insert into public.multipart_sessions (...) values (..., 'pending', p_expires_at) returning id into v_id;
  return v_id;
end; $$;
```

`reserved` = suma sesiunilor `pending`/`uploading` neexpirate. La `completed` → iese din reserved, intră în `used` (rândul din `uploads`). La `aborted`/`failed`/expirat → iese din reserved. Fără coloană separată de „reserved".

### 8.2 Contractele rutelor (session-based)

| Rută | Primește | Face |
|---|---|---|
| `create` | `{ eventCode, contentType, sizeBytes }` | event activ + MIME + plafon per fișier → `CreateMultipartUpload` în R2 → **`reserve_multipart_session` (atomic)**; dacă nu e loc → abort R2 + 403. Întoarce `{ sessionId, partSize, totalParts }` (NU r2Key/uploadId). |
| `sign` | `{ sessionId, partNumbers[] }` | citește sesiunea; verifică `status ∈ {pending,uploading}`, neexpirată, `partNumber ∈ 1..totalParts`; semnează cu `r2_key`/`upload_id` **din sesiune**; marchează `uploading`. |
| `complete` | `{ sessionId, originalName }` | idempotent (dacă `completed` → întoarce rândul existent); `ListParts` → validează **exact `totalParts`, consecutive 1..N, toate egale cu `part_size` fără ultima, suma == `expected_size`** ÎNAINTE de asamblare; `CompleteMultipartUpload` → HEAD (`actualSize == expected`) → insert `uploads` → `status=completed`. Orfan-safe + tratează `23505` ca idempotent. |
| `abort` | `{ sessionId }` | citește sesiunea → `AbortMultipartUpload` → `status=aborted` (eliberează rezervarea). |

### 8.3 Status final al punctelor din review

| # | Punct | Status |
|---|---|---|
| 1 | Sesiune multipart în Supabase | ✅ Tabel `multipart_sessions` |
| 2 | Rute pe `sessionId`, nu pe r2Key/uploadId de la client | ✅ `sign`/`complete`/`abort` citesc totul din sesiune |
| 3 | Validări în `sign` (există, pending/uploading, neexpirată, partNumber ∈ 1..N) | ✅ |
| 4 | Validare bucăți ÎNAINTE de `complete` (count/consecutive/size/sumă) | ✅ |
| 5 | Rezervare atomică a spațiului | ✅ funcție Postgres cu `FOR UPDATE` |
| 6 | `complete` idempotent + index unic pe `r2_key` | ✅ |
| 7 | Fără orfan dacă DB eșuează după finalizare | ✅ ștergere obiect / idempotent pe 23505 |
| 8 | `abort` verifică sesiunea, marchează aborted, eliberează rezervarea | ✅ |
| — | fără fallback single-PUT, 16MiB/3/8/3-retry, MIME+ext, index unic | ✅ păstrate |
| 10 | Lifecycle R2 abort la 1–2 zile | ⚙️ **de setat în panoul Cloudflare** (nu cod) |
| (9) | Galerie privată: URL semnat în loc de `public_url` | 🔷 task separat (arhitectura de vizualizare a întregii aplicații) |

### 8.4 De rulat înainte ca ramura să funcționeze
1. Rulează în Supabase (SQL Editor) migrarea `20260710130000_multipart_sessions.sql` **și** `20260710120000_uploads_r2key_unique.sql`.
2. (Opțional, recomandat) În Cloudflare R2 → bucket → Settings, setează lifecycle „abort incomplete multipart uploads" la 1–2 zile.
3. CORS R2: neschimbat (PUT + originea site-ului, deja configurate).
