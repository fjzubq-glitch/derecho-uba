export default function ClaseLoading() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-ink)" }}>
      <main className="flex-1">
        <div className="pad-lateral" style={{ padding: "60px 48px 120px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "32px" }}>
            <div style={{ width: "34px", height: "34px", borderRadius: "50%", border: "1px solid var(--color-line)" }} />
            <div style={{ width: "160px", height: "12px" }} className="skeleton" />
          </div>

          <div style={{ marginBottom: "40px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <div style={{ width: "120px", height: "11px" }} className="skeleton" />
              <div style={{ width: "80px", height: "10px" }} className="skeleton" />
            </div>
            <div style={{ width: "480px", maxWidth: "100%", height: "36px", marginBottom: "12px" }} className="skeleton" />
            <div style={{ width: "160px", height: "12px" }} className="skeleton" />
          </div>

          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 overflow-hidden"
            style={{ background: "var(--color-line-soft)", gap: "1px" }}
          >
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-40" />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
