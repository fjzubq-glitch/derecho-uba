import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL!;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET = process.env.R2_BUCKET_NAME!;

const client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
  requestHandler: {
    requestTimeout: 30000,
  },
});

export function getAudioPublicUrl(key: string): string {
  return `${R2_PUBLIC_URL}/${key}`;
}

export async function getSignedAudioUrl(key: string): Promise<string> {
  return getAudioPublicUrl(key);
}

export async function uploadToR2(
  key: string,
  file: Buffer,
  contentType: string
): Promise<string> {
  await client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: file,
      ContentType: contentType,
    })
  );
  return getAudioPublicUrl(key);
}

export async function deleteFromR2(key: string): Promise<void> {
  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
      })
    );
  } catch (e: any) {
    if (e.name !== "NoSuchKey") throw e;
  }
}

export async function getObjectBuffer(key: string): Promise<Buffer> {
  const response = await client.send(
    new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    })
  );
  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as any) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
