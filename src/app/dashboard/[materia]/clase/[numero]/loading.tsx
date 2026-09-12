export default function ClaseLoading() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--color-ink)" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "24px" }}>
        {/* Header skeleton */}
        <div style={{ marginBottom: "24px" }}>
          <div
            className="skeleton"
            style={{
              height: "36px",
              width: "50%",
              borderRadius: "var(--radius-card)",
              marginBottom: "8px",
            }}
          />
          <div
            className="skeleton"
            style={{
              height: "14px",
              width: "30%",
              borderRadius: "var(--radius-card)",
            }}
          />
        </div>

        {/* Cards skeleton */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="skeleton"
              style={{
                height: "100px",
                borderRadius: "var(--radius-card)",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
