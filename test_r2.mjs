import { S3Client, ListObjectsV2Command, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
});

async function testR2Connection() {
  console.log("Verificăm conexiunea la Cloudflare R2...");
  try {
    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;
    
    // 1. Încercăm să scriem un fișier de test
    console.log(`Încercăm să scriem un fișier în bucket-ul: ${bucketName}`);
    const putCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: 'test-connection.txt',
      Body: 'Acesta este un fisier de test generat automat.',
      ContentType: 'text/plain'
    });
    await r2Client.send(putCommand);
    console.log("✅ Fișier de test încărcat cu succes!");

    // 2. Încercăm să citim fișierele din bucket
    const listCommand = new ListObjectsV2Command({
      Bucket: bucketName,
      MaxKeys: 5
    });
    const { Contents } = await r2Client.send(listCommand);
    console.log("✅ Bucket-ul a putut fi citit. Fișiere găsite:", Contents ? Contents.length : 0);

    // 3. Ștergem fișierul de test
    const delCommand = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: 'test-connection.txt'
    });
    await r2Client.send(delCommand);
    console.log("✅ Fișier de test șters cu succes!");

    console.log("🚀 CONEXIUNEA LA R2 ESTE 100% FUNCȚIONALĂ!");
  } catch (error) {
    console.error("❌ Eroare la conectarea la R2:");
    console.error(error.message);
  }
}

testR2Connection();
