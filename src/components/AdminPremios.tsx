"use client";

import React, { useEffect, useState } from "react";
import { BookOpen, Check, ChevronDown, Loader2, Lock, X } from "@/components/icons";

interface Privado {
  archivo_id: string;
  archivo_nombre: string;
  archivo_tipo: string;
  clase_numero: number | null;
  clase_titulo: string;
  conGrant: number;
}

interface Grant {
  id: string;
  archivo_id: string;
  nombre: string;
  archivo_nombre: string;
  clase_numero: number | null;
}

interface RankRow {
  nombre: string;
  visitas: number;
  reproducciones: number;
  total: number;
  ultima: string;
  conGrant: boolean;
}

const MATERIAS = [
  { slug: "derecho-comercial", label: "Derecho Comercial" },
  { slug: "contratos-ii", label: "Contratos II" },
  { slug: "contratos-i", label: "Contratos I" },
];

const TIPO_LABEL: Record<string, string> = {
  cuestionario: "Cuestionario",
  material_privado: "Material privado",
  ficha: "Ficha",
};

export default function AdminPremios() {
  const [slug, setSlug] = useState("derecho-comercial");
  const [dias, setDias] = useState("30");
  const [privados, setPrivados] = useState<Privado[]>([]);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [ranking, setRanking] = useState<RankRow[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [tiposAbiertos, setTiposAbiertos] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [nombreManual, setNombreManual] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const cargar = async (s: string, d: string) => {
    setLoading(true);
    setMsg("");
    try {
      const [r1, r2] = await Promise.all([
        fetch(`/api/admin/accesos-archivo?materia_slug=${encodeURIComponent(s)}`).then((r) => r.json()),
        fetch(`/api/admin/ranking?slug=${encodeURIComponent(s)}&dias=${encodeURIComponent(d)}`).then((r) => r.json()),
      ]);
      if (r1.ok) {
        setPrivados(r1.privados || []);
        setGrants(r1.grants || []);
        // Sin preselección: el detalle solo aparece al elegir un archivo.
        // Si había uno elegido y sigue existiendo, se mantiene.
        if (selected && !(r1.privados || []).some((p: Privado) => p.archivo_id === selected)) {
          setSelected(null);
        }
      }
      if (r2.ok) setRanking(r2.ranking || []);
      if (!r1.ok) setMsg(r1.error || "Error al cargar");
    } catch {
      setMsg("No se pudo cargar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar(slug, dias);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, dias]);

  const otorgar = async (archivo_id: string, nombre: string) => {
    const nom = nombre.trim();
    if (!nom) return;
    setBusy(`g-${archivo_id}-${nom}`);
    setMsg("");
    try {
      const res = await fetch("/api/admin/accesos-archivo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archivo_id, nombre: nom }),
      });
      const data = await res.json();
      if (data.ok) {
        await cargar(slug, dias);
        setMsg(`Acceso otorgado a ${nom}`);
      } else {
        setMsg(data.error || "No se pudo otorgar");
      }
    } catch {
      setMsg("Error de red");
    } finally {
      setBusy(null);
    }
  };

  const revocar = async (id: string, nombre: string) => {
    setBusy(`r-${id}`);
    try {
      const res = await fetch(`/api/admin/accesos-archivo?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) {
        await cargar(slug, dias);
        setMsg(`Acceso revocado a ${nombre}`);
      } else {
        setMsg(data.error || "No se pudo revocar");
      }
    } catch {
      setMsg("Error de red");
    } finally {
      setBusy(null);
    }
  };

  const sel = privados.find((p) => p.archivo_id === selected) || null;
  const grantsSel = grants.filter((g) => g.archivo_id === selected);
  const grantedNames = new Set(grantsSel.map((g) => g.nombre.trim().toLowerCase()));

  return (
    <div className="space-y-6" style={{ marginTop: "32px" }}>
      <div className="flex items-center gap-3 flex-wrap">
        <span
          className="flex items-center justify-center"
          style={{ width: "38px", height: "38px", borderRadius: "50%", border: "1px solid var(--color-gold-dim)", color: "var(--color-gold)" }}
        >
          <Lock style={{ width: "15px", height: "15px" }} />
        </span>
        <div>
          <h3 style={{ fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif", fontWeight: 400, fontSize: "20px", color: "var(--color-text)" }}>
            Premios por archivo
          </h3>
          <p style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-text-faint)" }}>
            Habilitá UN privado a alumnos puntuales · sin dar la clave
          </p>
        </div>
      </div>

      {/* Selector materia + período */}
      <div className="flex items-center gap-2 flex-wrap">
        {MATERIAS.map((m) => (
          <button
            key={m.slug}
            onClick={() => setSlug(m.slug)}
            style={{
              padding: "7px 14px",
              fontSize: "11px",
              fontFamily: "var(--font-ibm-plex-mono)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              background: slug === m.slug ? "var(--color-gold)" : "transparent",
              color: slug === m.slug ? "var(--color-ink)" : "var(--color-text-muted)",
              border: "1px solid var(--color-line)",
              cursor: "pointer",
            }}
          >
            {m.label}
          </button>
        ))}
        <span style={{ color: "var(--color-line)", margin: "0 4px" }}>·</span>
        {(["7", "30", "all"] as const).map((d) => (
          <button
            key={d}
            onClick={() => setDias(d)}
            style={{
              padding: "7px 12px",
              fontSize: "11px",
              fontFamily: "var(--font-ibm-plex-mono)",
              background: dias === d ? "var(--color-ink-2)" : "transparent",
              color: dias === d ? "var(--color-gold)" : "var(--color-text-muted)",
              border: "1px solid var(--color-line)",
              cursor: "pointer",
            }}
          >
            {d === "all" ? "Todo" : `${d}d`}
          </button>
        ))}
      </div>

      {msg && (
        <div style={{ padding: "10px 14px", background: "rgba(185,154,98,0.08)", border: "1px solid var(--color-gold-dim)" }}>
          <p style={{ fontSize: "12px", color: "var(--color-gold)" }}>{msg}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2" style={{ padding: "24px 0", color: "var(--color-text-muted)", fontFamily: "var(--font-ibm-plex-mono)", fontSize: "12px" }}>
          <Loader2 style={{ width: "16px", height: "16px", animation: "spin 1s linear infinite" }} /> Cargando…
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Archivos privados */}
          <section style={{ background: "var(--color-card)", border: "1px solid var(--color-line-soft)" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--color-line-soft)", background: "var(--color-ink-2)" }}>
              <span style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-text-faint)" }}>
                Archivos privados · {privados.length}
              </span>
            </div>
            {privados.length === 0 ? (
              <p style={{ padding: "16px", fontSize: "13px", color: "var(--color-text-muted)" }}>No hay archivos privados en esta materia.</p>
            ) : (
              (["cuestionario", "material_privado", "ficha"] as const)
                .map((tipo) => ({ tipo, items: privados.filter((p) => p.archivo_tipo === tipo) }))
                .filter((g) => g.items.length > 0)
                .map((g) => {
                  const abierto = tiposAbiertos.has(g.tipo);
                  return (
                    <div key={g.tipo} style={{ borderBottom: "1px solid var(--color-line-soft)" }}>
                      <button
                        onClick={() => setTiposAbiertos((prev) => { const n = new Set(prev); if (n.has(g.tipo)) n.delete(g.tipo); else n.add(g.tipo); return n; })}
                        className="flex items-center justify-between w-full"
                        style={{ padding: "10px 16px", background: "transparent", border: "none", cursor: "pointer", width: "100%" }}
                      >
                        <span style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-gold)" }}>
                          {TIPO_LABEL[g.tipo]} · {g.items.length}
                        </span>
                        <ChevronDown style={{ width: "13px", height: "13px", color: "var(--color-text-muted)", transform: abierto ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }} />
                      </button>
                      {abierto && g.items.map((p) => (
                        <button
                          key={p.archivo_id}
                          onClick={() => setSelected(p.archivo_id)}
                          className="flex items-center gap-3 w-full text-left"
                          style={{
                            padding: "8px 16px 8px 20px",
                            background: selected === p.archivo_id ? "rgba(185,154,98,0.07)" : "transparent",
                            border: "none",
                            borderTop: "1px solid var(--color-line-soft)",
                            cursor: "pointer",
                            width: "100%",
                          }}
                        >
                          <BookOpen style={{ width: "13px", height: "13px", color: "var(--color-gold)", flexShrink: 0 }} />
                          <span className="flex-1 min-w-0">
                            <span style={{ display: "block", fontSize: "13px", color: "var(--color-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              Clase {p.clase_numero} — {p.archivo_nombre}
                            </span>
                            {p.conGrant > 0 && (
                              <span style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "10px", color: "#00FF55" }}>
                                {p.conGrant} con acceso
                              </span>
                            )}
                          </span>
                        </button>
                      ))}
                    </div>
                  );
                })
            )}
          </section>

          {/* Detalle: grants + ranking */}
          <section style={{ background: "var(--color-card)", border: "1px solid var(--color-line-soft)" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--color-line-soft)", background: "var(--color-ink-2)" }}>
              <span style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-text-faint)" }}>
                {sel ? `Clase ${sel.clase_numero} — ${sel.archivo_nombre}` : "Elegí un archivo"}
              </span>
            </div>
            {!sel ? (
              <p style={{ padding: "16px", fontSize: "13px", color: "var(--color-text-muted)" }}>Seleccioná un archivo privado a la izquierda.</p>
            ) : (
              <div style={{ padding: "14px 16px" }}>
                {/* Con acceso */}
                <p style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-text-faint)", marginBottom: "8px" }}>
                  Con acceso ({grantsSel.length})
                </p>
                {grantsSel.length === 0 ? (
                  <p style={{ fontSize: "12px", color: "var(--color-text-muted)", marginBottom: "12px" }}>Nadie todavía.</p>
                ) : (
                  <div className="space-y-1" style={{ marginBottom: "12px" }}>
                    {grantsSel.map((g) => (
                      <div key={g.id} className="flex items-center justify-between gap-2" style={{ padding: "6px 10px", background: "rgba(0,255,85,0.05)", border: "1px solid rgba(0,255,85,0.2)" }}>
                        <span style={{ fontSize: "13px", color: "var(--color-text)" }}>{g.nombre}</span>
                        <button
                          onClick={() => revocar(g.id, g.nombre)}
                          disabled={busy === `r-${g.id}`}
                          title="Revocar acceso"
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#E05555", padding: "2px" }}
                        >
                          <X style={{ width: "12px", height: "12px" }} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Agregar manual */}
                <div className="flex gap-2" style={{ marginBottom: "16px" }}>
                  <input
                    type="text"
                    value={nombreManual}
                    onChange={(e) => setNombreManual(e.target.value)}
                    placeholder="Nombre del alumno"
                    onKeyDown={(e) => { if (e.key === "Enter" && selected) { otorgar(selected, nombreManual); setNombreManual(""); } }}
                    style={{ flex: 1, background: "var(--color-ink)", border: "1px solid var(--color-line-soft)", padding: "7px 10px", fontSize: "13px", color: "var(--color-text)" }}
                  />
                  <button
                    onClick={() => { if (selected) { otorgar(selected, nombreManual); setNombreManual(""); } }}
                    disabled={!nombreManual.trim() || busy !== null}
                    style={{ padding: "7px 12px", background: "var(--color-gold)", color: "var(--color-ink)", border: "none", cursor: "pointer", fontSize: "11px", fontFamily: "var(--font-ibm-plex-mono)", textTransform: "uppercase" }}
                  >
                    Otorgar
                  </button>
                </div>

                {/* Ranking propuesto */}
                <p style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-text-faint)", marginBottom: "8px" }}>
                  Ranking de interacción · top
                </p>
                {ranking.length === 0 ? (
                  <p style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Sin actividad en el período.</p>
                ) : (
                  ranking.slice(0, 10).map((r, i) => {
                    const yaTiene = grantedNames.has(r.nombre.trim().toLowerCase());
                    return (
                      <div key={r.nombre} className="flex items-center gap-3" style={{ padding: "7px 0", borderBottom: "1px solid var(--color-line-soft)" }}>
                        <span style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "11px", color: i < 3 ? "var(--color-gold)" : "var(--color-text-faint)", width: "18px" }}>
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="flex-1 min-w-0" style={{ fontSize: "13px", color: "var(--color-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {r.nombre}
                        </span>
                        <span style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "10px", color: "var(--color-text-faint)" }}>
                          {r.reproducciones} rep · {r.visitas} vis
                        </span>
                        {yaTiene ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#00FF55" }}>
                            <Check style={{ width: "11px", height: "11px" }} /> Tiene
                          </span>
                        ) : (
                          <button
                            onClick={() => selected && otorgar(selected, r.nombre)}
                            disabled={busy !== null}
                            style={{ padding: "4px 10px", background: "transparent", border: "1px solid var(--color-gold-dim)", color: "var(--color-gold)", cursor: "pointer", fontSize: "10px", fontFamily: "var(--font-ibm-plex-mono)", textTransform: "uppercase" }}
                          >
                            Otorgar
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
