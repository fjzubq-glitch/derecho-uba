const ALLOWED_AUDIO_TYPES = new Set(["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/aac", "audio/m4a", "audio/mp4", "video/mp4", "video/webm", "audio/webm", "audio/x-m4a"]);
const ALLOWED_AUDIO_EXT = /\.(mp3|wav|ogg|aac|m4a|mp4|webm)$/i;
const ALLOWED_DOC_EXT = /\.(pdf|doc|docx|txt|md|xls|xlsx|ppt|pptx)$/i;

export const MAX_AUDIO_SIZE = 300 * 1024 * 1024; // 300 MB
export const MAX_DOC_SIZE = 50 * 1024 * 1024; // 50 MB

export interface FileValidation {
  ok: boolean;
  error?: string;
}

export function validateAudioFile(file: { name: string; size: number; type?: string }): FileValidation {
  if (file.size <= 0) {
    return { ok: false, error: "El archivo está vacío" };
  }
  if (file.size > MAX_AUDIO_SIZE) {
    return { ok: false, error: `El archivo supera el máximo de ${MAX_AUDIO_SIZE / (1024 * 1024)} MB` };
  }
  if (!ALLOWED_AUDIO_EXT.test(file.name)) {
    return { ok: false, error: "Formato de audio no soportado (usa mp3, wav, ogg, m4a, mp4 o webm)" };
  }
  if (file.type && !ALLOWED_AUDIO_TYPES.has(file.type)) {
    return { ok: false, error: "Tipo MIME de audio no soportado" };
  }
  return { ok: true };
}

export function validateDocumentFile(file: { name: string; size: number }): FileValidation {
  if (file.size <= 0) {
    return { ok: false, error: "El archivo está vacío" };
  }
  if (file.size > MAX_DOC_SIZE) {
    return { ok: false, error: `El archivo supera el máximo de ${MAX_DOC_SIZE / (1024 * 1024)} MB` };
  }
  if (!ALLOWED_DOC_EXT.test(file.name)) {
    return { ok: false, error: "Formato de archivo no soportado (usa pdf, doc, txt, xls o ppt)" };
  }
  return { ok: true };
}
