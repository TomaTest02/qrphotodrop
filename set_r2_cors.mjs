import { S3Client, GetBucketCorsCommand, PutBucketCorsCommand } from '@aws-sdk/client-s3';
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

const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;

async function checkAndSetCors() {
  console.log("Verificam CORS pe bucket-ul:", bucketName);

  // Verificam setarile CORS curente
  try {
    const { CORSRules } = await r2Client.send(new GetBucketCorsCommand({ Bucket: bucketName }));
    console.log("CORS actual:", JSON.stringify(CORSRules, null, 2));
  } catch {
    console.log("Nu exista reguli CORS configurate. Adaugam acum...");
  }

  // Setam CORS corect pentru upload din browser
  const corsConfig = {
    Bucket: bucketName,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedOrigins: ['*'],
          AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
          AllowedHeaders: ['*'],
          ExposeHeaders: ['ETag'],
          MaxAgeSeconds: 3600,
        },
      ],
    },
  };

  try {
    await r2Client.send(new PutBucketCorsCommand(corsConfig));
    console.log("✅ Reguli CORS setate cu succes!");
  } catch (err) {
    console.error("❌ Eroare la setarea CORS:", err.message);
  }
}

checkAndSetCors();
