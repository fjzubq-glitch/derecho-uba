export default function DashboardLoading() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-ink)" }}>
      <section className="border-b" style={{ borderColor: "var(--color-line-soft)" }}>
        <div className="pad-lateral" style={{ padding: "40px 48px 36px" }}>
          <div style={{ width: "80px", height: "11px", marginBottom: "16px" }} className="skeleton" />
          <div style={{ width: "320px", height: "36px", marginBottom: "12px" }} className="skeleton" />
          <div style={{ width: "180px", height: "14px" }} className="skeleton" />
        </div>
      </section>
      <main className="flex-1">
        <div className="pad-lateral" style={{ padding: "40px 48px 80px" }}>
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 overflow-hidden"
            style={{ background: "var(--color-line-soft)", gap: "1px" }}
          >
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="skeleton h-52" />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
