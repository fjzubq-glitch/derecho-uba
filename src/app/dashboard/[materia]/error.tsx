"use client";

export default function MateriaError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-ink)" }}>
      <main className="flex-1 flex items-center justify-center">
        <div style={{ textAlign: "center", padding: "48px 24px", maxWidth: "420px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              margin: "0 auto 24px",
              borderRadius: "50%",
              border: "1px solid var(--color-stamp)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-fraunces), Georgia, serif",
              fontSize: "20px",
              color: "var(--color-stamp)",
            }}
          >
            !
          </div>
          <h2
            style={{
              fontFamily: "var(--font-fraunces), Georgia, serif",
              fontWeight: 400,
              fontSize: "24px",
              color: "var(--color-text)",
              marginBottom: "8px",
            }}
          >
            No se pudo cargar la materia
          </h2>
          <p
            style={{
              fontFamily: "var(--font-ibm-plex-mono)",
              fontSize: "13px",
              color: "var(--color-text-muted)",
              lineHeight: 1.6,
              marginBottom: "24px",
            }}
          >
            Ocurrió un error al cargar el contenido. Intentá de nuevo.
          </p>
          <button
            onClick={reset}
            style={{
              padding: "10px 28px",
              border: "1px solid var(--color-gold)",
              background: "none",
              color: "var(--color-gold)",
              fontFamily: "var(--font-ibm-plex-mono)",
              fontSize: "11px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              cursor: "pointer",
              transition: "background 0.2s ease, color 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--color-gold)";
              e.currentTarget.style.color = "var(--color-ink)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "none";
              e.currentTarget.style.color = "var(--color-gold)";
            }}
          >
            Reintentar
          </button>
          {error.digest && (
            <p
              style={{
                marginTop: "16px",
                fontFamily: "var(--font-ibm-plex-mono)",
                fontSize: "10px",
                color: "var(--color-text-faint)",
              }}
            >
              Error: {error.digest}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
