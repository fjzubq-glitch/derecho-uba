import { createHash, createHmac } from "crypto";

interface R2Config {
  publicUrl: string;
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

function getR2Config(): R2Config {
  const publicUrl = (process.env.R2_PUBLIC_URL || "").trim();
  const accountId = (process.env.R2_ACCOUNT_ID || "").trim();
  const accessKeyId = (process.env.R2_ACCESS_KEY_ID || "").trim();
  const secretAccessKey = (process.env.R2_SECRET_ACCESS_KEY || "").trim();
  const bucket = (process.env.R2_BUCKET_NAME || "").trim();

  if (!publicUrl || !accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error("Faltan variables de entorno de R2 (R2_PUBLIC_URL, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME)");
  }

  return { publicUrl, accountId, accessKeyId, secretAccessKey, bucket };
}

const REGION = "auto";
const SERVICE = "s3";
const ALGORITHM = "AWS4-HMAC-SHA256";

function sha256(msg: string | Buffer): string {
  return createHash("sha256").update(msg).digest("hex");
}

function hmacSha256(key: Buffer | string, msg: string): Buffer {
  return createHmac("sha256", key).update(msg).digest();
}

function nowAmzDate(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

function signV4(
  config: R2Config,
  method: string,
  path: string,
  queryString: string,
  headers: Record<string, string>,
  payloadHash: string,
  amzDate: string
): string {
  const dateStr = amzDate.slice(0, 8);
  const host = `${config.accountId}.r2.cloudflarestorage.com`;

  const allHeaders: Record<string, string> = {
    host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };
  for (const [k, v] of Object.entries(headers)) {
    allHeaders[k.toLowerCase()] = v;
  }

  const headerNames = Object.keys(allHeaders).sort();
  const canonicalHeaders = headerNames.map((n) => n + ":" + allHeaders[n].trim() + "\n").join("");
  const signedHeaders = headerNames.join(";");

  const canonicalRequest =
    method + "\n" + path + "\n" + queryString + "\n" +
    canonicalHeaders + "\n" + signedHeaders + "\n" + payloadHash;

  const credentialScope = dateStr + "/" + REGION + "/" + SERVICE + "/aws4_request";
  const stringToSign =
    ALGORITHM + "\n" + amzDate + "\n" + credentialScope + "\n" + sha256(canonicalRequest);

  const kDate = hmacSha256("AWS4" + config.secretAccessKey, dateStr);
  const kRegion = hmacSha256(kDate, REGION);
  const kService = hmacSha256(kRegion, SERVICE);
  const kSigning = hmacSha256(kService, "aws4_request");
  const signature = hmacSha256(kSigning, stringToSign).toString("hex");

  return `${ALGORITHM} Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

export function getAudioPublicUrl(key: string): string {
  return `${getR2Config().publicUrl}/${key}`;
}

const host = (config: R2Config) => `${config.accountId}.r2.cloudflarestorage.com`;

function encodePath(p: string): string {
  return p.split("/").map(seg => encodeURIComponent(seg)).join("/");
}

async function r2Request(
  method: string,
  key: string,
  options?: { body?: Buffer; contentType?: string; queryString?: string }
): Promise<Response> {
  const config = getR2Config();
  const path = "/" + encodePath(config.bucket) + "/" + encodePath(key);
  const qs = options?.queryString || "";
  const amzDate = nowAmzDate();
  const payloadHash = options?.body
    ? sha256(options.body)
    : "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

  const extraHeaders: Record<string, string> = {};
  if (options?.contentType) extraHeaders["content-type"] = options.contentType;

  const auth = signV4(config, method, path, qs, extraHeaders, payloadHash, amzDate);

  const fetchHeaders: Record<string, string> = {
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
    Authorization: auth,
  };
  if (options?.contentType) fetchHeaders["Content-Type"] = options.contentType;

  const url = `https://${host(config)}${path}${qs ? "?" + qs : ""}`;
  return fetch(url, {
    method,
    headers: fetchHeaders,
    body: options?.body ? new Uint8Array(options.body) : undefined,
  });
}

export async function uploadToR2(key: string, file: Buffer, contentType: string): Promise<string> {
  const res = await r2Request("PUT", key, { body: file, contentType });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`R2 upload failed: ${res.status} ${text}`);
  }
  return getAudioPublicUrl(key);
}

export async function deleteFromR2(key: string): Promise<void> {
  const res = await r2Request("DELETE", key);
  if (!res.ok && res.status !== 404) {
    throw new Error(`R2 delete failed: ${res.status} ${await res.text()}`);
  }
}

export async function getObjectBuffer(key: string): Promise<Buffer> {
  const res = await r2Request("GET", key);
  if (!res.ok) throw new Error(`R2 get failed: ${res.status} ${await res.text()}`);
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

export async function getObjectStream(key: string, range?: string): Promise<Response> {
  const config = getR2Config();
  const extraHeaders: Record<string, string> = {};
  if (range) extraHeaders["range"] = range;

  const path = "/" + encodePath(config.bucket) + "/" + encodePath(key);
  const amzDate = nowAmzDate();
  const payloadHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

  const auth = signV4(config, "GET", path, "", extraHeaders, payloadHash, amzDate);

  const fetchHeaders: Record<string, string> = {
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
    Authorization: auth,
  };
  if (range) fetchHeaders["Range"] = range;

  const url = `https://${host(config)}${path}`;
  const res = await fetch(url, { method: "GET", headers: fetchHeaders });
  if (!res.ok) throw new Error(`R2 get failed: ${res.status} ${await res.text()}`);
  return res;
}
