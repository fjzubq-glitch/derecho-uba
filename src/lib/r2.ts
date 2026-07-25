import { createHmac } from "crypto";

export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL!;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET = process.env.R2_BUCKET_NAME!;

export function getAudioPublicUrl(key: string): string {
  return `${R2_PUBLIC_URL}/${key}`;
}

export async function uploadToR2(
  key: string,
  file: Buffer,
  contentType: string
): Promise<string> {
  const url = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}/${key}`;
  const date = new Date().toUTCString();

  const stringToSign = `PUT\n\n${contentType}\n${date}\n/${R2_BUCKET}/${key}`;
  const signature = createHmac("sha1", R2_SECRET_ACCESS_KEY)
    .update(stringToSign)
    .digest("base64");

  const auth = `AWS ${R2_ACCESS_KEY_ID}:${signature}`;

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Date: date,
      Authorization: auth,
      "Content-Type": contentType,
    },
    body: new Uint8Array(file),
  });

  if (!res.ok) {
    throw new Error(`R2 upload failed: ${res.status}`);
  }

  return getAudioPublicUrl(key);
}

export async function getSignedAudioUrl(key: string): Promise<string> {
  return getAudioPublicUrl(key);
}

export async function deleteFromR2(key: string): Promise<void> {
  const url = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}/${key}`;
  const date = new Date().toUTCString();

  const stringToSign = `DELETE\n\n\n${date}\n/${R2_BUCKET}/${key}`;
  const signature = createHmac("sha1", R2_SECRET_ACCESS_KEY)
    .update(stringToSign)
    .digest("base64");

  const auth = `AWS ${R2_ACCESS_KEY_ID}:${signature}`;

  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      Date: date,
      Authorization: auth,
    },
  });

  if (!res.ok && res.status !== 404) {
    throw new Error(`R2 delete failed: ${res.status}`);
  }
}
