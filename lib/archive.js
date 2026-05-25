import * as archiverModule from 'archiver';
const archiver = archiverModule.default || archiverModule;
import { r2Client, getPresignedUploadUrl, getPublicUrl } from './r2.js';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createAdminClient } from './supabase/admin.js';
import { sendArchiveReady } from './resend.js';

export async function generateAndUploadArchive(eventId, userEmail) {
  const supabase = createAdminClient();

  // 1. Fetch all uploads for event
  const { data: uploads } = await supabase
    .from('uploads')
    .select('*')
    .eq('event_id', eventId);

  // 2. Fetch all wishes for event
  const { data: wishes } = await supabase
    .from('wishes')
    .select('*')
    .eq('event_id', eventId);

  // 3. Create archive stream
  const archive = archiver('zip', { zlib: { level: 5 } });
  const chunks = [];

  archive.on('data', (chunk) => chunks.push(chunk));

  // 4. Add each file from R2
  if (uploads && uploads.length > 0) {
    for (const upload of uploads) {
      try {
        const command = new GetObjectCommand({
          Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
          Key: upload.r2_key,
        });
        const response = await r2Client.send(command);
        const streamToBuffer = async (stream) => {
          const chunks = [];
          for await (const chunk of stream) {
            chunks.push(chunk);
          }
          return Buffer.concat(chunks);
        };
        const buffer = await streamToBuffer(response.Body);
        const folder = upload.file_type === 'photo' ? 'poze' : 'clipuri';
        const filename = upload.original_name || upload.r2_key.split('/').pop();
        archive.append(buffer, { name: `${folder}/${filename}` });
      } catch (err) {
        console.error(`Error fetching file ${upload.r2_key}:`, err);
      }
    }
  }

  // 5. Add wishes as CSV
  if (wishes && wishes.length > 0) {
    const csvHeader = 'Prenume,Nume,Email,Mesaj,Data\n';
    const csvRows = wishes.map(
      (w) =>
        `"${w.first_name}","${w.last_name}","${w.email || ''}","${w.message.replace(/"/g, '""')}","${w.created_at}"`
    );
    archive.append(csvHeader + csvRows.join('\n'), { name: 'urari.csv' });
  }

  await archive.finalize();

  // 6. Upload ZIP to R2
  const zipBuffer = Buffer.concat(chunks);
  const timestamp = Date.now();
  const zipKey = `archives/${eventId}/${timestamp}.zip`;

  const putCommand = new PutObjectCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
    Key: zipKey,
    Body: zipBuffer,
    ContentType: 'application/zip',
  });
  await r2Client.send(putCommand);

  // 7. Generate presigned URL valid for 7 days
  const getCommand = new GetObjectCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
    Key: zipKey,
  });
  const downloadUrl = await getSignedUrl(r2Client, getCommand, {
    expiresIn: 7 * 24 * 60 * 60,
  });

  // 8. Send email
  await sendArchiveReady(userEmail, downloadUrl);

  return { zipKey, downloadUrl };
}
