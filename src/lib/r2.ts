import { createHash, createHmac } from "crypto";

export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL!;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET = process.env.R2_BUCKET_NAME!;

const REGION = "auto";
const SERVICE = "s3";
const ALGORITHM = "AWS4-HMAC-SHA256";

function sha256(msg: string): string {
  return createHash("sha256").update(msg).digest("hex");
}

function hmacSha256(key: Buffer | string, msg: string): Buffer {
  return createHmac("sha256", key).update(msg).digest();
}

function deriveSigningKey(dateStr: string): Buffer {
  const kDate = hmacSha256("AWS4" + R2_SECRET_ACCESS_KEY, dateStr);
  const kRegion = hmacSha256(kDate, REGION);
  const kService = hmacSha256(kRegion, SERVICE);
  return hmacSha256(kService, "aws4_request");
}

export function getAudioPublicUrl(key: string): string {
  return `${R2_PUBLIC_URL}/${key}`;
}

async function r2Fetch(
  method: string,
  key: string,
  options?: { body?: Buffer; contentType?: string }
): Promise<Response> {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]/g, "").replace(/\.\d{3}/, "");
  const dateStr = amzDate.slice(0, 8);
  const host = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const canonicalUri = "/" + R2_BUCKET + "/" + key;

  // Build canonical headers (sorted alphabetically)
  const allHeaders: Record<string, string> = { host };
  if (options?.contentType) allHeaders["content-type"] = options.contentType;
  allHeaders["x-amz-content-sha256"] = "UNSIGNED-PAYLOAD";
  allHeaders["x-amz-date"] = amzDate;

  const headerNames = Object.keys(allHeaders).sort();
  const canonicalHeaders = headerNames.map((n) => n + ":" + allHeaders[n].trim() + "\n").join("");
  const signedHeaders = headerNames.join(";");

  const canonicalRequest =
    method + "\n" +
    canonicalUri + "\n" +
    "\n" + // empty query string
    canonicalHeaders + "\n" +
    signedHeaders + "\n" +
    "UNSIGNED-PAYLOAD";

  const credentialScope = dateStr + "/" + REGION + "/" + SERVICE + "/aws4_request";
  const stringToSign =
    ALGORITHM + "\n" +
    amzDate + "\n" +
    credentialScope + "\n" +
    sha256(canonicalRequest);

  const signingKey = deriveSigningKey(dateStr);
  const signature = hmacSha256(signingKey, stringToSign).toString("hex");

  const authHeader = `${ALGORITHM} Credential=${R2_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const fetchHeaders: Record<string, string> = {
    "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
    "x-amz-date": amzDate,
    Authorization: authHeader,
  };
  if (options?.contentType) fetchHeaders["Content-Type"] = options.contentType;

  const url = `https://${host}${canonicalUri}`;
  return fetch(url, {
    method,
    headers: fetchHeaders,
    body: options?.body ? new Uint8Array(options.body) : undefined,
  });
}

export async function uploadToR2(
  key: string,
  file: Buffer,
  contentType: string
): Promise<string> {
  const res = await r2Fetch("PUT", key, { body: file, contentType });
  if (!res.ok) {
    throw new Error(`R2 upload failed: ${res.status} ${await res.text()}`);
  }
  return getAudioPublicUrl(key);
}

export async function getSignedAudioUrl(key: string): Promise<string> {
  return getAudioPublicUrl(key);
}

// --- Multipart upload support ---

async function r2FetchCustom(
  method: string,
  path: string,
  queryString: string,
  options?: { body?: Buffer; contentType?: string; payloadHash?: string }
): Promise<Response> {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]/g, "").replace(/\.\d{3}/, "");
  const dateStr = amzDate.slice(0, 8);
  const host = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

  const payloadHash = options?.payloadHash || (options?.body ? sha256(options.body.toString("binary")) : "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");

  const allHeaders: Record<string, string> = { host };
  if (options?.contentType) allHeaders["content-type"] = options.contentType;
  allHeaders["x-amz-content-sha256"] = payloadHash;
  allHeaders["x-amz-date"] = amzDate;

  const headerNames = Object.keys(allHeaders).sort();
  const canonicalHeaders = headerNames.map((n) => n + ":" + allHeaders[n].trim() + "\n").join("");
  const signedHeaders = headerNames.join(";");

  const canonicalRequest =
    method + "\n" +
    path + "\n" +
    queryString + "\n" +
    canonicalHeaders + "\n" +
    signedHeaders + "\n" +
    payloadHash;

  const credentialScope = dateStr + "/" + REGION + "/" + SERVICE + "/aws4_request";
  const stringToSign =
    ALGORITHM + "\n" +
    amzDate + "\n" +
    credentialScope + "\n" +
    sha256(canonicalRequest);

  const signingKey = deriveSigningKey(dateStr);
  const signature = hmacSha256(signingKey, stringToSign).toString("hex");

  const authHeader = `${ALGORITHM} Credential=${R2_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const fetchHeaders: Record<string, string> = {
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
    Authorization: authHeader,
  };
  if (options?.contentType) fetchHeaders["Content-Type"] = options.contentType;

  const url = `https://${host}${path}${queryString ? "?" + queryString : ""}`;
  return fetch(url, {
    method,
    headers: fetchHeaders,
    body: options?.body ? new Uint8Array(options.body) : undefined,
  });
}

export async function initiateMultipartUpload(
  key: string,
  contentType: string
): Promise<string> {
  const path = "/" + R2_BUCKET + "/" + key;
  const emptyHash = sha256("");
  const res = await r2FetchCustom("POST", path, "uploads=", {
    contentType,
    payloadHash: emptyHash,
  });
  if (!res.ok) {
    throw new Error(`Init MPU failed: ${res.status} ${await res.text()}`);
  }
  const xml = await res.text();
  const match = xml.match(/<UploadId>([^<]+)<\/UploadId>/);
  if (!match) throw new Error("No UploadId in response");
  return match[1];
}

export async function uploadPart(
  key: string,
  uploadId: string,
  partNumber: number,
  body: Buffer
): Promise<string> {
  const path = "/" + R2_BUCKET + "/" + key;
  const qs = `partNumber=${partNumber}&uploadId=${uploadId}`;
  const res = await r2FetchCustom(
    "PUT",
    path,
    qs,
    { body, payloadHash: "UNSIGNED-PAYLOAD" }
  );
  if (!res.ok) {
    throw new Error(`Upload part ${partNumber} failed: ${res.status} ${await res.text()}`);
  }
  const etag = res.headers.get("ETag");
  if (!etag) throw new Error("No ETag in response");
  return etag.replace(/"/g, "");
}

export async function completeMultipartUpload(
  key: string,
  uploadId: string,
  parts: { PartNumber: number; ETag: string }[]
): Promise<void> {
  const path = "/" + R2_BUCKET + "/" + key;
  const qs = `uploadId=${uploadId}`;

  const bodyXml =
    "<CompleteMultipartUpload>" +
    parts.map((p) => `<Part><PartNumber>${p.PartNumber}</PartNumber><ETag>"${p.ETag}"</ETag></Part>`).join("") +
    "</CompleteMultipartUpload>";

  const bodyBuf = Buffer.from(bodyXml, "utf-8");
  const res = await r2FetchCustom(
    "POST",
    path,
    qs,
    { body: bodyBuf, contentType: "application/xml" }
  );
  if (!res.ok) {
    throw new Error(`Complete MPU failed: ${res.status} ${await res.text()}`);
  }
}

export async function abortMultipartUpload(
  key: string,
  uploadId: string
): Promise<void> {
  const path = "/" + R2_BUCKET + "/" + key;
  const qs = `uploadId=${uploadId}`;
  const res = await r2FetchCustom("DELETE", path, qs);
  if (!res.ok && res.status !== 404) {
    throw new Error(`Abort MPU failed: ${res.status} ${await res.text()}`);
  }
}

export async function deleteFromR2(key: string): Promise<void> {
  const res = await r2Fetch("DELETE", key);
  if (!res.ok && res.status !== 404) {
    throw new Error(`R2 delete failed: ${res.status} ${await res.text()}`);
  }
}

export function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresSeconds = 300
): string {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]/g, "").replace(/\.\d{3}/, "");
  const dateStr = amzDate.slice(0, 8);
  const host = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const canonicalUri = "/" + R2_BUCKET + "/" + key;
  const credential = `${R2_ACCESS_KEY_ID}/${dateStr}/${REGION}/${SERVICE}/aws4_request`;

  const qsParams: Record<string, string> = {
    "X-Amz-Algorithm": ALGORITHM,
    "X-Amz-Credential": credential,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expiresSeconds),
    "X-Amz-SignedHeaders": "host",
  };

  const canonicalQueryString = Object.entries(qsParams)
    .map(([n, v]) => encodeURIComponent(n) + "=" + encodeURIComponent(v))
    .join("&");

  // For presigned URLs, only host is signed
  const canonicalHeaders = "host:" + host + "\n";
  const signedHeaders = "host";

  const canonicalRequest =
    "PUT\n" +
    canonicalUri + "\n" +
    canonicalQueryString + "\n" +
    canonicalHeaders + "\n" +
    signedHeaders + "\n" +
    "UNSIGNED-PAYLOAD";

  const credentialScope = dateStr + "/" + REGION + "/" + SERVICE + "/aws4_request";
  const stringToSign =
    ALGORITHM + "\n" +
    amzDate + "\n" +
    credentialScope + "\n" +
    sha256(canonicalRequest);

  const signingKey = deriveSigningKey(dateStr);
  const signature = hmacSha256(signingKey, stringToSign).toString("hex");

  return `https://${host}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
}
