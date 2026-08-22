import VolverBoton from "@/components/VolverBoton";

export default async function VisorPage({
  params,
  searchParams,
}: {
  params: Promise<{ archivoId: string }>;
  searchParams: Promise<{ back?: string; nombre?: string }>;
}) {
  const { archivoId } = await params;
  const { nombre } = await searchParams;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        background: "var(--color-ink)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          padding: "14px 20px",
          borderBottom: "1px solid var(--color-gold-dim)",
          flexShrink: 0,
          background: "var(--color-card)",
        }}
      >
        <VolverBoton />
        {nombre ? (
          <span
            style={{
              marginLeft: "auto",
              fontFamily: "var(--font-ibm-plex-mono)",
              fontSize: "12px",
              letterSpacing: "0.08em",
              color: "var(--color-text-muted)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {nombre}
          </span>
        ) : null}
      </div>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          background: "#ffffff",
        }}
      >
        <iframe
          src={`/api/stream/${archivoId}`}
          title={nombre || "Web interactiva"}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            display: "block",
            background: "#ffffff",
          }}
        />
      </div>
    </div>
  );
}
