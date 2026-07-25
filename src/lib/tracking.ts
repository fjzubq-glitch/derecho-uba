export async function trackActivity(data: {
  tipo: string;
  pagina?: string;
  materia_slug?: string;
  clase_id?: string;
  archivo_id?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch {
    // Silently fail - tracking should never break the app
  }
}
