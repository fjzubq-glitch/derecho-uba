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
        height: "100vh",
        background: "var(--color-ink)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "12px 16px",
          borderBottom: "1px solid var(--color-line-soft)",
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
              fontSize: "11px",
              color: "var(--color-text-faint)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {nombre}
          </span>
        ) : null}
      </div>
      <iframe
        src={`/api/stream/${archivoId}`}
        title={nombre || "Web interactiva"}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
        style={{
          width: "100%",
          flex: 1,
          border: "none",
          background: "#ffffff",
        }}
      />
    </div>
  );
}
