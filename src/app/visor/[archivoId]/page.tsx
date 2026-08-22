import { ArrowLeft } from "@/components/icons";

export default async function VisorPage({
  params,
  searchParams,
}: {
  params: Promise<{ archivoId: string }>;
  searchParams: Promise<{ back?: string; nombre?: string }>;
}) {
  const { archivoId } = await params;
  const { back, nombre } = await searchParams;
  const backUrl = back || "/";

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
        <a
          href={backUrl}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            textDecoration: "none",
            fontFamily: "var(--font-ibm-plex-mono)",
            fontSize: "11px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--color-gold)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          <ArrowLeft style={{ width: "16px", height: "16px" }} />
          Volver a la clase
        </a>
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
