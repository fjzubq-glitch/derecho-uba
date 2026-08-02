const DB_NAME = "derecho-uba-offline";
const STORE_AUDIOS = "audios";
const STORE_CLASES = "clases";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_AUDIOS)) {
        db.createObjectStore(STORE_AUDIOS);
      }
      if (!db.objectStoreNames.contains(STORE_CLASES)) {
        db.createObjectStore(STORE_CLASES);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function putBlob(archivoId: string, blob: Blob): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_AUDIOS, "readwrite");
        tx.objectStore(STORE_AUDIOS).put(blob, archivoId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      })
  );
}

export async function saveAudioOffline(archivoId: string, url: string, onProgress?: (p: number) => void): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Error al descargar el audio");

  const contentType = res.headers.get("content-type") || "audio/mpeg";
  const contentLength = Number(res.headers.get("content-length") || 0);

  const reader = res.body?.getReader();
  if (!reader) {
    const blob = await res.blob();
    await putBlob(archivoId, blob);
    return;
  }

  const chunks: BlobPart[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    if (onProgress && contentLength > 0) {
      onProgress(Math.min(1, received / contentLength));
    }
  }

  const blob = new Blob(chunks, { type: contentType });
  await putBlob(archivoId, blob);
}

export function getAudioOffline(archivoId: string): Promise<Blob | null> {
  return openDb().then(
    (db) =>
      new Promise<Blob | null>((resolve) => {
        const tx = db.transaction(STORE_AUDIOS, "readonly");
        const req = tx.objectStore(STORE_AUDIOS).get(archivoId);
        req.onsuccess = () => resolve((req.result as Blob) || null);
        req.onerror = () => resolve(null);
      })
  );
}

export async function isAudioOffline(archivoId: string): Promise<boolean> {
  try {
    return (await getAudioOffline(archivoId)) !== null;
  } catch {
    return false;
  }
}

export async function deleteAudioOffline(archivoId: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_AUDIOS, "readwrite");
      tx.objectStore(STORE_AUDIOS).delete(archivoId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    /* noop */
  }
}

function putJson(key: string, value: unknown): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_CLASES, "readwrite");
        tx.objectStore(STORE_CLASES).put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      })
  );
}

export async function saveClaseOffline(key: string, data: unknown): Promise<void> {
  try {
    await putJson(key, data);
  } catch {
    /* noop */
  }
}

export function getClaseOffline(key: string): Promise<unknown | null> {
  return openDb().then(
    (db) =>
      new Promise<unknown | null>((resolve) => {
        const tx = db.transaction(STORE_CLASES, "readonly");
        const req = tx.objectStore(STORE_CLASES).get(key);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => resolve(null);
      })
  );
}
