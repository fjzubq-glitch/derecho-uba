"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PortalHeader from "@/components/PortalHeader";
import PortalFooter from "@/components/PortalFooter";
import WelcomeGate from "@/components/WelcomeGate";
import { trackActivity } from "@/lib/tracking";
import { formatFechaLocal } from "@/lib/utils";
import { ArrowLeft, ArrowRight, Calendar, Headphones, FileText, Volume2, Link2, Play } from "@/components/icons";

interface Archivo {
  id: string;
  tipo: string;
  nombre_display: string;
  storage_key: string | null;
  youtube_url: string | null;
  duration_seconds: number | null;
}

interface Clase {
  id: string;
  numero: number;
  titulo: string;
  fecha: string;
  archivos: Archivo[];
}

type Filtro = "todas" | "audio_clase" | "clase_youtube" | "transcripcion" | "podcast" | "archivo" | "enlace";

const FILTRO_LABELS: Record<Filtro, string> = {
  todas: "Todas",
  audio_clase: "Audio",
  clase_youtube: "Virtual",
  transcripcion: "Transcripción",
  podcast: "Podcast",
  archivo: "Archivos",
  enlace: "Enlaces",
};

export default function MateriaPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.materia as string;

  const [materia, setMateria] = useState<{ id: string; nombre: string; estado?: string } | null>(null);
  const [clases, setClases] = useState<Clase[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>("todas");

  useEffect(() => {
    loadData();
    trackActivity({ tipo: "page_view", pagina: "materia", materia_slug: slug });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function loadData() {
    try {
      const res = await fetch(`/api/materias/${slug}`);
      const data = await res.json();
      if (data.materia) setMateria(data.materia);
      if (data.clases) setClases(data.clases);
    } catch (e) {
      console.error("Error loading materia:", e);
    }
    setLoading(false);
  }

  const splitName = (n: string) => {
    const p = n.split(",");
    return { title: p[0]?.trim() || n, meta: p.slice(1).map((s) => s.trim()).join(", ") || null };
  };

  const { title: materiaTitle, meta: materiaMeta } = materia ? splitName(materia.nombre) : { title: "", meta: null };

  const tieneRecurso = (c: Clase, tipo: string) => c.archivos.some((a) => a.tipo === tipo);

  const clasesFiltradas = clases.filter((c) => {
    if (filtro === "todas") return true;
    return tieneRecurso(c, filtro);
  });

  const FILTRO_COUNT: Record<Filtro, number> = {
    todas: clases.length,
    audio_clase: clases.filter((c) => tieneRecurso(c, "audio_clase")).length,
    clase_youtube: clases.filter((c) => tieneRecurso(c, "clase_youtube")).length,
    transcripcion: clases.filter((c) => tieneRecurso(c, "transcripcion")).length,
    podcast: clases.filter((c) => tieneRecurso(c, "podcast")).length,
    archivo: clases.filter((c) => tieneRecurso(c, "archivo")).length,
    enlace: clases.filter((c) => tieneRecurso(c, "enlace")).length,
  };

  // Podcasts y enlaces de toda la materia
  const podcasts = clases.flatMap((c) =>
    c.archivos.filter((a) => a.tipo === "podcast").map((a) => ({ ...a, clase: c }))
  );
  const enlaces = clases.flatMap((c) =>
    c.archivos.filter((a) => a.tipo === "enlace").map((a) => ({ ...a, clase: c }))
  );

  const claseHref = (numero: number) => `/dashboard/${slug}/clase/${numero}`;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-ink)" }}>
      <WelcomeGate materiaSlug={slug} />
      <PortalHeader
        nav={
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "8px 0",
              fontFamily: "var(--font-ibm-plex-mono)",
              fontSize: "11px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--color-text-muted)",
              transition: "color 0.25s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-gold)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-muted)")}
          >
            <ArrowLeft style={{ width: "13px", height: "13px" }} />
            <span className="hidden sm:inline">Volver a materias</span>
          </button>
        }
      />

      {/* ═══════════ HEADER MATERIA ═══════════ */}
      <section className="relative overflow-hidden border-b" style={{ borderColor: "var(--color-line-soft)" }}>
        <div className="relative z-10 pad-lateral" style={{ padding: "40px 48px 36px" }}>
          <div
            className="flex items-center gap-3 mb-6"
            style={{
              fontFamily: "var(--font-ibm-plex-mono)",
              fontSize: "11px",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--color-gold)",
            }}
          >
            <span style={{ width: "24px", height: "1px", background: "var(--color-gold-dim)" }} />
            Materia
          </div>
          <h1
            style={{
              fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
              fontWeight: 400,
              fontSize: "clamp(34px, 4.5vw, 52px)",
              lineHeight: 1.08,
              letterSpacing: "-0.02em",
              maxWidth: "760px",
              overflowWrap: "break-word",
            }}
          >
            {materiaTitle}
          </h1>
          {materiaMeta && (
            <p
              className="mt-4"
              style={{
                fontFamily: "var(--font-ibm-plex-mono)",
                fontSize: "12px",
                color: "var(--color-text-muted)",
                overflowWrap: "break-word",
              }}
            >
              {materiaMeta}
            </p>
          )}
          {!loading && clases.length > 0 && (
            <div
              className="flex items-center gap-3 mt-6"
              style={{
                fontFamily: "var(--font-ibm-plex-mono)",
                fontSize: "11px",
                letterSpacing: "0.08em",
                color: "var(--color-text-faint)",
              }}
            >
              <span>{clases.length} clases</span>
              <span style={{ color: "var(--color-line)" }}>·</span>
              <span style={{ color: materia?.estado === "finalizada" ? "var(--color-gold)" : "var(--color-text-muted)" }}>
                {materia?.estado === "finalizada" ? "Finalizada" : "En curso"}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* ═══════════ MAIN ═══════════ */}
      <main className="flex-1">
        <div className="pad-lateral" style={{ padding: "40px 48px 80px" }}>
          {/* Filtros */}
          {!loading && clases.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-8">
              {(Object.keys(FILTRO_LABELS) as Filtro[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFiltro(f)}
                  className="flex items-center gap-1.5 whitespace-nowrap touch-target px-3 py-1.5"
                  style={{
                    fontSize: "10px",
                    fontFamily: "var(--font-ibm-plex-mono)",
                    letterSpacing: "0.06em",
                    cursor: "pointer",
                    borderRadius: "2px",
                    border: `1px solid ${filtro === f ? "var(--color-gold)" : "var(--color-line)"}`,
                    background: filtro === f ? "rgba(199, 168, 106, 0.12)" : "transparent",
                    color: filtro === f ? "var(--color-gold)" : "var(--color-text-muted)",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (filtro !== f) {
                      e.currentTarget.style.borderColor = "var(--color-gold-dim)";
                      e.currentTarget.style.color = "var(--color-text)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (filtro !== f) {
                      e.currentTarget.style.borderColor = "var(--color-line)";
                      e.currentTarget.style.color = "var(--color-text-muted)";
                    }
                  }}
                >
                  {FILTRO_LABELS[f]}
                  <span style={{ color: "var(--color-text-faint)" }}>{FILTRO_COUNT[f]}</span>
                </button>
              ))}
            </div>
          )}

          {/* Clases */}
          {loading ? (
            <div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 overflow-hidden"
              style={{ background: "var(--color-line-soft)", gap: "1px" }}
            >
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="skeleton h-52" />
              ))}
            </div>
          ) : clasesFiltradas.length === 0 ? (
            <div
              style={{
                padding: "80px 48px",
                textAlign: "center",
                background: "var(--color-card)",
                border: "1px solid var(--color-line-soft)",
              }}
            >
              <p style={{ color: "var(--color-text-muted)", fontSize: "15px", lineHeight: 1.7 }}>
                {clases.length === 0
                  ? "Todavía no hay clases publicadas en esta materia."
                  : "No hay clases con ese tipo de contenido."}
                <br />
                <span style={{ color: "var(--color-text-faint)", fontSize: "13px" }}>
                  {clases.length === 0
                    ? "Volvé más tarde, el material de cursada se publica acá."
                    : "Probá con otro filtro de contenido."}
                </span>
              </p>
            </div>
          ) : (
            <div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 overflow-hidden"
              style={{ background: "var(--color-line-soft)", gap: "1px" }}
            >
              {clasesFiltradas.map((clase, i) => (
                <article
                  key={clase.id}
                  onClick={() => {
                    trackActivity({ tipo: "class_view", pagina: "materia", materia_slug: slug, clase_id: clase.id });
                    router.push(claseHref(clase.numero));
                  }}
                  className="group card-reveal card-hover flex flex-col cursor-pointer"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      trackActivity({ tipo: "class_view", pagina: "materia", materia_slug: slug, clase_id: clase.id });
                      router.push(claseHref(clase.numero));
                    }
                  }}
                  style={{
                    background: "var(--color-card)",
                    padding: "28px 24px",
                    animationDelay: `${i * 50}ms`,
                    transition: "background 0.25s ease, transform 0.25s ease, opacity 0.25s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-card-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-card)")}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-ibm-plex-mono)",
                      fontSize: "10px",
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: "var(--color-gold)",
                      marginBottom: "8px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span>Clase {clase.numero.toString().padStart(2, "0")}</span>
                  </div>
                  <div className="flex-1">
                    <h3
                      style={{
                        fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
                        fontWeight: 500,
                        fontSize: "20px",
                        lineHeight: 1.2,
                        color: "var(--color-text)",
                        marginBottom: "12px",
                      }}
                    >
                      {clase.titulo}
                    </h3>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {clase.fecha ? (
                        <div
                          className="flex items-center gap-2"
                          style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "11px", color: "var(--color-text-faint)" }}
                        >
                          <Calendar style={{ width: "14px", height: "14px" }} />
                          {formatFechaLocal(clase.fecha)}
                        </div>
                      ) : (
                        <div />
                      )}
                      {clase.archivos.length > 0 && (
                        <div className="flex items-center gap-2" style={{ color: "var(--color-text-muted)" }}>
                          {tieneRecurso(clase, "audio_clase") && <Headphones style={{ width: "12px", height: "12px" }} />}
                          {tieneRecurso(clase, "clase_youtube") && <Play style={{ width: "12px", height: "12px" }} />}
                          {tieneRecurso(clase, "transcripcion") && <FileText style={{ width: "12px", height: "12px" }} />}
                          {tieneRecurso(clase, "podcast") && <Volume2 style={{ width: "12px", height: "12px" }} />}
                          {(tieneRecurso(clase, "archivo") || tieneRecurso(clase, "enlace")) && (
                            <Link2 style={{ width: "12px", height: "12px" }} />
                          )}
                        </div>
                      )}
                    </div>
                    <ArrowRight style={{ width: "16px", height: "16px", color: "var(--color-gold)", flexShrink: 0 }} />
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* Podcasts de la materia */}
          {!loading && podcasts.length > 0 && (
            <section style={{ marginTop: "56px" }}>
              <div className="flex items-center gap-3 mb-6">
                <Volume2 style={{ width: "16px", height: "16px", color: "var(--color-gold)" }} />
                <h2 style={{ fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif", fontWeight: 400, fontSize: "24px" }}>
                  Podcasts
                </h2>
              </div>
              <div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 overflow-hidden"
                style={{ background: "var(--color-line-soft)", gap: "1px" }}
              >
                {podcasts.map((p, i) => (
                  <article
                    key={p.id}
                    onClick={() => router.push(claseHref(p.clase.numero))}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); router.push(claseHref(p.clase.numero)); } }}
                    className="card-reveal card-hover flex items-center gap-4 cursor-pointer focus-visible"
                    style={{ background: "var(--color-card)", padding: "20px 22px", animationDelay: `${i * 45}ms`, transition: "background 0.25s ease, transform 0.25s ease, opacity 0.25s ease" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-card-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-card)")}
                  >
                    <div
                      className="flex items-center justify-center flex-shrink-0"
                      style={{ width: "36px", height: "36px", borderRadius: "50%", border: "1px solid var(--color-gold-dim)" }}
                    >
                      <Volume2 style={{ width: "14px", height: "14px", color: "var(--color-gold)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        style={{
                          fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
                          fontWeight: 500,
                          fontSize: "15px",
                          color: "var(--color-text)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {p.nombre_display}
                      </p>
                      <p style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "10px", color: "var(--color-gold)" }}>
                        Clase {p.clase.numero.toString().padStart(2, "0")}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* Enlaces útiles de la materia */}
          {!loading && enlaces.length > 0 && (
            <section style={{ marginTop: "56px" }}>
              <div className="flex items-center gap-3 mb-6">
                <Link2 style={{ width: "16px", height: "16px", color: "var(--color-gold)" }} />
                <h2 style={{ fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif", fontWeight: 400, fontSize: "24px" }}>
                  Enlaces útiles
                </h2>
              </div>
              <div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 overflow-hidden"
                style={{ background: "var(--color-line-soft)", gap: "1px" }}
              >
                {enlaces.map((e, i) => (
                  <article
                    key={e.id}
                    onClick={() => router.push(claseHref(e.clase.numero))}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); router.push(claseHref(e.clase.numero)); } }}
                    className="card-reveal card-hover flex items-center gap-4 cursor-pointer focus-visible"
                    style={{ background: "var(--color-card)", padding: "20px 22px", animationDelay: `${i * 45}ms`, transition: "background 0.25s ease, transform 0.25s ease, opacity 0.25s ease" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-card-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-card)")}
                  >
                    <div
                      className="flex items-center justify-center flex-shrink-0"
                      style={{ width: "36px", height: "36px", borderRadius: "50%", border: "1px solid var(--color-gold-dim)" }}
                    >
                      <Link2 style={{ width: "14px", height: "14px", color: "var(--color-gold)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        style={{
                          fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
                          fontWeight: 500,
                          fontSize: "15px",
                          color: "var(--color-text)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {e.nombre_display}
                      </p>
                      <p style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "10px", color: "var(--color-gold)" }}>
                        Clase {e.clase.numero.toString().padStart(2, "0")}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      <PortalFooter />
    </div>
  );
}
