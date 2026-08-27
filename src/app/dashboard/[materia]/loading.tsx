export default function MateriaLoading() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-ink)" }}>
      <section className="border-b" style={{ borderColor: "var(--color-line-soft)" }}>
        <div className="pad-lateral" style={{ padding: "40px 48px 36px" }}>
          <div className="flex items-start justify-between gap-10">
            <div>
              <div style={{ width: "80px", height: "11px", marginBottom: "16px" }} className="skeleton" />
              <div style={{ width: "360px", height: "40px", marginBottom: "12px" }} className="skeleton" />
              <div style={{ width: "200px", height: "14px", marginBottom: "24px" }} className="skeleton" />
              <div style={{ width: "140px", height: "12px" }} className="skeleton" />
            </div>
            <div className="hidden md:block flex-shrink-0">
              <div style={{ width: "150px", height: "150px" }} className="skeleton" />
            </div>
          </div>
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
