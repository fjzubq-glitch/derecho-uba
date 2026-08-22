import VolverBoton from "@/components/VolverBoton";

export default async function VisorPage({
  params,
}: {
  params: Promise<{ archivoId: string }>;
}) {
  const { archivoId } = await params;

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
          title="Web interactiva"
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
