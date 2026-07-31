"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminUpload from "@/components/AdminUpload";
import AdminManage from "@/components/AdminManage";
import { ArrowLeft, BarChart3, Headphones, FileText, Users, Lock, Loader2, Calendar, TrendingUp, Eye, Shield, Upload } from "@/components/icons";

interface Materia {
  id: string;
  nombre: string;
  slug: string;
}

interface Stats {
  totalClases: number;
  totalArchivos: number;
  totalReproducciones: number;
}

interface ActividadReciente {
  tipo: string;
  pagina: string;
  materia_slug: string | null;
  archivo_nombre: string | null;
  materia: string | null;
  clase_numero: number | null;
  created_at: string;
  ip_hash: string;
}

interface ContenidoPopular {
  archivo_id: string;
  nombre_display: string;
  tipo: string;
  materia: string;
  clase_numero: number;
  clase_titulo: string;
  total_reproducciones: number;
  usuarios_unicos: number;
}

interface VisitaDia {
  fecha: string;
  visitantes_unicos: number;
  total_visitas: number;
}

export default function AdminPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [materias, setMaterias] = useState<Materia[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalClases: 0,
    totalArchivos: 0,
    totalReproducciones: 0,
  });
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<"upload" | "manage" | "analytics">("upload");
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [visitantesUnicos, setVisitantesUnicos] = useState(0);
  const [totalVisitas, setTotalVisitas] = useState(0);
  const [actividadReciente, setActividadReciente] = useState<ActividadReciente[]>([]);
  const [contenidoPopular, setContenidoPopular] = useState<ContenidoPopular[]>([]);
  const [visitasPorDia, setVisitasPorDia] = useState<VisitaDia[]>([]);
  const [maximoBarras, setMaximoBarras] = useState<Record<string, number>>({});
  const [expandedActividad, setExpandedActividad] = useState(false);

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordError("");

    setTimeout(() => {
      if (password === "Soyapango503") {
        setAuthenticated(true);
      } else {
        setPasswordError("Contraseña incorrecta");
      }
      setPasswordLoading(false);
    }, 500);
  }

  useEffect(() => {
    if (authenticated) {
      loadAdminData();
    }
  }, [authenticated]);

  async function loadAdminData() {
    try {
      const res = await fetch("/api/admin/dashboard");
      const data = await res.json();
      if (data.materias) setMaterias(data.materias);
      if (data.stats) setStats(data.stats);
      setVisitantesUnicos(data.visitantesUnicos || 0);
      setTotalVisitas(data.totalVisitas || 0);
      if (data.actividadReciente) setActividadReciente(data.actividadReciente);
      if (data.contenidoPopular) setContenidoPopular(data.contenidoPopular);
      if (data.visitasPorDia) setVisitasPorDia(data.visitasPorDia);
    } catch (e) {
      console.error("Error loading admin data:", e);
    }
    setLoading(false);
    setAnalyticsLoading(false);
  }

  async function handleUpload(
    materiaId: string,
    claseNumero: number,
    claseTitulo: string,
    claseFecha: string,
    items: Array<{
      tipo: "audio_clase" | "podcast" | "transcripcion";
      nombre: string;
      archivo?: File;
      driveLink?: string;
      textoContenido?: string;
    }>
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const processedItems = [];

      for (const item of items) {
        if (item.tipo === "transcripcion" && item.textoContenido) {
          processedItems.push({
            tipo: item.tipo,
            nombre: item.nombre,
            contenidoTexto: item.textoContenido,
          });
        } else if (item.tipo === "transcripcion" && item.driveLink) {
          processedItems.push({
            tipo: item.tipo,
            nombre: item.nombre,
            youtubeUrl: item.driveLink,
          });
        } else if (item.archivo) {
          const CHUNK_SIZE = 1024 * 1024;
          const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          const totalParts = Math.ceil(item.archivo.size / CHUNK_SIZE);

          for (let i = 0; i < totalParts; i++) {
            const start = i * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, item.archivo.size);
            const slice = item.archivo.slice(start, end);
            const base64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve((reader.result as string).split(",")[1]);
              reader.readAsDataURL(slice);
            });

            const partRes = await fetch("/api/upload-chunk", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sessionId, partNumber: i + 1, data: base64 }),
            });
            if (!partRes.ok) {
              const errBody = await partRes.text();
              throw new Error(`Part ${i + 1}/${totalParts} failed: ${errBody}`);
            }
          }

          const finalKey = `uploads/${Date.now()}-${item.archivo.name}`;
          const assemRes = await fetch("/api/upload-assemble", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId,
              totalParts,
              finalKey,
              contentType: item.archivo.type || "audio/mpeg",
            }),
          });
          if (!assemRes.ok) {
            const errBody = await assemRes.text();
            throw new Error(`Assembly failed: ${errBody}`);
          }

          processedItems.push({
            tipo: item.tipo,
            nombre: item.nombre,
            storageKey: finalKey,
            fileSize: item.archivo.size,
          });
        } else if (item.driveLink) {
          processedItems.push({
            tipo: item.tipo,
            nombre: item.nombre,
            youtubeUrl: item.driveLink,
          });
        }
      }

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materiaId,
          claseNumero,
          claseTitulo,
          claseFecha,
          items: processedItems,
        }),
      });

      const data = await res.json();

      if (data.ok) {
        return { ok: true };
      } else {
        return { ok: false, error: data.error || "Error desconocido" };
      }
    } catch (err) {
      return { ok: false, error: "Error al subir: " + String(err) };
    }
  }

  const TIPO_LABELS: Record<string, string> = {
    page_view: "Visita",
    play_start: "Reproducción",
    play_pause: "Pausa",
    play_complete: "Completado",
    youtube_open: "YouTube",
    transcription_view: "Transcripción",
  };

  const TAB_LABELS: Record<string, string> = {
    upload: "Subir Contenido",
    manage: "Gestionar",
    analytics: "Analytics",
  };

  const promedioReproducciones = stats.totalClases > 0 ? Math.round((stats.totalReproducciones / stats.totalClases) * 10) / 10 : 0;

  // Construir los 7 días consecutivos, rellenando con 0 los días sin actividad
  const visitasUltimos7 = useMemo(() => {
    const mapa = new Map(visitasPorDia.map((d) => [d.fecha, d]));
    const dias: Array<{ fecha: string; label: string; total_visitas: number; visitantes_unicos: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const fechaKey = d.toLocaleDateString("es-AR");
      const data = mapa.get(fechaKey);
      dias.push({
        fecha: fechaKey,
        label: d.toLocaleDateString("es-AR", { day: "numeric", month: "short" }).replace(".", ""),
        total_visitas: data?.total_visitas || 0,
        visitantes_unicos: data?.visitantes_unicos || 0,
      });
    }
    return dias;
  }, [visitasPorDia]);

  const maxVisitasDia = Math.max(...visitasUltimos7.map((d) => d.total_visitas), 1);

  // Agrupar actividad reciente por tipo + página en rangos consecutivos
  const actividadAgrupada = useMemo(() => {
    const grupos: Array<{
      tipo: string;
      pagina: string;
      materia_slug: string | null;
      archivo_nombre: string | null;
      materia: string | null;
      clase_numero: number | null;
      count: number;
      inicio: number;
      fin: number;
    }> = [];

    for (const act of [...actividadReciente].reverse()) {
      const t = new Date(act.created_at).getTime();
      const ultimo = grupos[grupos.length - 1];
      if (
        ultimo &&
        ultimo.tipo === act.tipo &&
        ultimo.pagina === act.pagina &&
        ultimo.materia_slug === act.materia_slug &&
        t - ultimo.fin < 15 * 60 * 1000
      ) {
        ultimo.count += 1;
        ultimo.fin = t;
      } else {
        grupos.push({
          tipo: act.tipo,
          pagina: act.pagina,
          materia_slug: act.materia_slug,
          archivo_nombre: act.archivo_nombre,
          materia: act.materia,
          clase_numero: act.clase_numero,
          count: 1,
          inicio: t,
          fin: t,
        });
      }
    }

    return grupos.reverse();
  }, [actividadReciente]);

  const ACTIVIDAD_VISIBLE = expandedActividad ? actividadAgrupada : actividadAgrupada.slice(0, 8);

  function fmtHora(ms: number) {
    return new Date(ms).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  }

  function fmtFecha(ms: number) {
    return new Date(ms).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
  }

  const esReproduccion = (tipo: string) =>
    tipo === "play_start" || tipo === "play_complete" || tipo === "youtube_open";

  if (!authenticated) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center pad-lateral"
        style={{ background: "var(--color-ink)" }}
      >
        <div style={{ width: "100%", maxWidth: "420px" }}>
          <div
            style={{
              padding: "clamp(28px, 6vw, 48px) clamp(24px, 5vw, 40px)",
              background: "var(--color-card)",
              border: "1px solid var(--color-line-soft)",
              borderRadius: 0,
            }}
          >
            <div className="text-center mb-8">
              <div
                className="flex items-center justify-center mx-auto mb-6"
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  border: "1px solid var(--color-gold-dim)",
                }}
              >
                <Shield style={{ width: "24px", height: "24px", color: "var(--color-gold)" }} />
              </div>
              <h2
                style={{
                  fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
                  fontWeight: 400,
                  fontSize: "24px",
                  color: "var(--color-text)",
                  marginBottom: "8px",
                }}
              >
                Panel de administración
              </h2>
              <p style={{ fontSize: "13px", color: "var(--color-text-faint)" }}>
                Ingresá la contraseña para continuar
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit}>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError("");
                }}
                placeholder="••••••••"
                autoFocus
                style={{
                  width: "100%",
                  background: "var(--color-card)",
                  border: `1px solid ${passwordError ? "rgba(196, 117, 107, 0.5)" : "var(--color-line-soft)"}`,
                  borderRadius: 0,
                  padding: "12px 14px",
                  color: "var(--color-text)",
                  textAlign: "center",
                  fontSize: "16px",
                  letterSpacing: "0.1em",
                  fontFamily: "var(--font-inter)",
                  outline: "none",
                  marginBottom: "16px",
                  transition: "border-color 0.2s ease",
                }}
                onFocus={(e) => {
                  if (!passwordError) e.currentTarget.style.borderColor = "var(--color-gold-dim)";
                }}
                onBlur={(e) => {
                  if (!passwordError) e.currentTarget.style.borderColor = "var(--color-line-soft)";
                }}
              />

              {passwordError && (
                <div
                  style={{
                    padding: "12px 16px",
                    marginBottom: "16px",
                    background: "rgba(196, 117, 107, 0.08)",
                    border: "1px solid rgba(196, 117, 107, 0.3)",
                    borderRadius: 0,
                  }}
                >
                  <p style={{ fontSize: "13px", color: "#C4756B", fontFamily: "var(--font-inter)" }}>
                    {passwordError}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={passwordLoading || !password}
                style={{
                  width: "100%",
                  padding: "14px",
                  background: passwordLoading || !password ? "var(--color-gold-dim)" : "var(--color-gold)",
                  color: "var(--color-ink)",
                  border: "none",
                  borderRadius: 0,
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: passwordLoading || !password ? "not-allowed" : "pointer",
                  transition: "background 0.2s ease",
                  fontFamily: "var(--font-inter)",
                }}
                onMouseEnter={(e) => {
                  if (!passwordLoading && password) e.currentTarget.style.background = "var(--color-gold-dim)";
                }}
                onMouseLeave={(e) => {
                  if (!passwordLoading && password) e.currentTarget.style.background = "var(--color-gold)";
                }}
              >
                {passwordLoading ? "Verificando..." : "Acceder"}
              </button>
            </form>
          </div>

          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 mt-5"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "6px 0",
              fontSize: "13px",
              color: "var(--color-text-muted)",
              fontFamily: "var(--font-inter)",
              transition: "color 0.25s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-gold)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-muted)")}
          >
            <ArrowLeft style={{ width: "13px", height: "13px" }} />
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-ink)" }}>
      {/* ═══════════ HEADER ═══════════ */}
      <header
        className="border-b"
        style={{
          borderColor: "var(--color-line-soft)",
          background: "linear-gradient(180deg, var(--color-ink-2) 0%, var(--color-ink) 100%)",
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 pad-lateral" style={{ padding: "22px 48px" }}>
          <div className="flex items-center gap-4 min-w-0">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center justify-center flex-shrink-0"
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "50%",
                border: "1px solid var(--color-line)",
                color: "var(--color-gold)",
                transition: "border-color 0.25s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--color-gold-dim)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--color-line)")}
            >
              <ArrowLeft style={{ width: "15px", height: "15px" }} />
            </button>
            <div className="min-w-0">
              <h1
                style={{
                  fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
                  fontWeight: 500,
                  fontSize: "20px",
                  lineHeight: 1.2,
                  color: "var(--color-text)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                Panel de administración
              </h1>
              <div
                style={{
                  fontFamily: "var(--font-ibm-plex-mono)",
                  fontSize: "10px",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--color-text-faint)",
                  marginTop: "3px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                Gestión de contenido y analytics
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div
            className="flex w-full sm:w-auto"
            style={{
              border: "1px solid var(--color-line-soft)",
              borderRadius: 0,
            }}
          >
            {(["upload", "manage", "analytics"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  fontSize: "12px",
                  fontWeight: 500,
                  fontFamily: "var(--font-inter)",
                  cursor: "pointer",
                  border: "none",
                  borderRight: tab !== "analytics" ? "1px solid var(--color-line-soft)" : "none",
                  background: activeTab === tab ? "var(--color-gold)" : "transparent",
                  color: activeTab === tab ? "var(--color-ink)" : "var(--color-text-muted)",
                  transition: "color 0.2s ease, background 0.2s ease",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab) e.currentTarget.style.color = "var(--color-text)";
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab) e.currentTarget.style.color = "var(--color-text-muted)";
                }}
              >
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ═══════════ MAIN ═══════════ */}
      <main className="flex-1">
        <div className="pad-lateral" style={{ padding: "48px 48px 80px" }}>
          {/* Stats — solo en tabs de contenido */}
          {activeTab !== "analytics" && (
          <div
            className="grid grid-cols-1 md:grid-cols-3 overflow-hidden mb-8"
            style={{
              background: "var(--color-line-soft)",
              gap: "1px",
              borderRadius: 0,
            }}
          >
            {[
              { label: "Clases", value: stats.totalClases, icon: <Headphones style={{ width: "16px", height: "16px" }} /> },
              { label: "Archivos", value: stats.totalArchivos, icon: <FileText style={{ width: "16px", height: "16px" }} /> },
              { label: "Reproducciones", value: stats.totalReproducciones, icon: <BarChart3 style={{ width: "16px", height: "16px" }} /> },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  background: "var(--color-card)",
                  padding: "24px 28px",
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="flex items-center justify-center"
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      border: "1px solid var(--color-gold-dim)",
                    }}
                  >
                    <span style={{ color: "var(--color-gold)" }}>{stat.icon}</span>
                  </div>
                  <span
                    style={{
                      fontFamily: "var(--font-ibm-plex-mono)",
                      fontSize: "9px",
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: "var(--color-text-faint)",
                    }}
                  >
                    {stat.label}
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-ibm-plex-mono)",
                    fontSize: "32px",
                    fontWeight: 500,
                    lineHeight: 1,
                    color: "var(--color-text)",
                  }}
                >
                  {String(stat.value).padStart(2, "0")}
                </div>
              </div>
            ))}
          </div>
          )}

          {/* Upload Tab */}
          {activeTab === "upload" && (
            <AdminUpload materias={materias} onSubmit={handleUpload} />
          )}

          {/* Manage Tab */}
          {activeTab === "manage" && <AdminManage />}

          {/* Analytics Tab */}
          {activeTab === "analytics" && (
            <div className="space-y-6">
              {analyticsLoading ? (
                <div
                  className="flex items-center justify-center"
                  style={{ padding: "80px 0" }}
                >
                  <div
                    className="animate-spin"
                    style={{
                      width: "32px",
                      height: "32px",
                      border: "2px solid var(--color-line)",
                      borderTopColor: "var(--color-gold)",
                      borderRadius: "50%",
                    }}
                  />
                </div>
              ) : (
                <>
                  {/* Métricas generales */}
                  <div
                    className="grid grid-cols-1 md:grid-cols-3 overflow-hidden"
                    style={{
                      background: "var(--color-line-soft)",
                      gap: "1px",
                      borderRadius: 0,
                    }}
                  >
                    <div style={{ background: "var(--color-card)", padding: "28px 30px" }}>
                      <div className="flex items-center gap-3 mb-4">
                        <div
                          className="flex items-center justify-center"
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "50%",
                            border: "1px solid var(--color-gold-dim)",
                          }}
                        >
                          <Users style={{ width: "16px", height: "16px", color: "var(--color-gold)" }} />
                        </div>
                        <span
                          style={{
                            fontFamily: "var(--font-ibm-plex-mono)",
                            fontSize: "9px",
                            letterSpacing: "0.14em",
                            textTransform: "uppercase",
                            color: "var(--color-text-faint)",
                          }}
                        >
                          Visitantes únicos
                        </span>
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-ibm-plex-mono)",
                          fontSize: "36px",
                          fontWeight: 500,
                          lineHeight: 1,
                          color: "var(--color-gold)",
                        }}
                      >
                        {String(visitantesUnicos).padStart(2, "0")}
                      </div>
                    </div>

                    <div style={{ background: "var(--color-card)", padding: "28px 30px" }}>
                      <div className="flex items-center gap-3 mb-4">
                        <div
                          className="flex items-center justify-center"
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "50%",
                            border: "1px solid var(--color-gold-dim)",
                          }}
                        >
                          <Eye style={{ width: "16px", height: "16px", color: "var(--color-gold)" }} />
                        </div>
                        <span
                          style={{
                            fontFamily: "var(--font-ibm-plex-mono)",
                            fontSize: "9px",
                            letterSpacing: "0.14em",
                            textTransform: "uppercase",
                            color: "var(--color-text-faint)",
                          }}
                        >
                          Total visitas
                        </span>
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-ibm-plex-mono)",
                          fontSize: "36px",
                          fontWeight: 500,
                          lineHeight: 1,
                          color: "var(--color-text)",
                        }}
                      >
                        {String(totalVisitas).padStart(2, "0")}
                      </div>
                    </div>

                    <div style={{ background: "var(--color-card)", padding: "28px 30px" }}>
                      <div className="flex items-center gap-3 mb-4">
                        <div
                          className="flex items-center justify-center"
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "50%",
                            border: "1px solid var(--color-gold-dim)",
                          }}
                        >
                          <TrendingUp style={{ width: "16px", height: "16px", color: "var(--color-gold)" }} />
                        </div>
                        <span
                          style={{
                            fontFamily: "var(--font-ibm-plex-mono)",
                            fontSize: "9px",
                            letterSpacing: "0.14em",
                            textTransform: "uppercase",
                            color: "var(--color-text-faint)",
                          }}
                        >
                          Reproducciones / clase
                        </span>
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-ibm-plex-mono)",
                          fontSize: "36px",
                          fontWeight: 500,
                          lineHeight: 1,
                          color: "var(--color-text)",
                        }}
                      >
                        {promedioReproducciones.toFixed(1).padStart(2, "0")}
                      </div>
                    </div>
                  </div>

                  {/* Visitas por día — gráfico de barras */}
                  <article
                    style={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-line-soft)",
                      padding: "28px 30px",
                      borderRadius: 0,
                    }}
                  >
                    <h3
                      style={{
                        fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
                        fontWeight: 400,
                        fontSize: "20px",
                        color: "var(--color-text)",
                        marginBottom: "24px",
                      }}
                    >
                      Visitas por día
                      <span
                        style={{
                          fontFamily: "var(--font-ibm-plex-mono)",
                          fontSize: "10px",
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          color: "var(--color-text-faint)",
                          marginLeft: "12px",
                        }}
                      >
                        Últimos 7 días
                      </span>
                    </h3>

                    <div className="flex gap-6">
                      {/* Eje Y */}
                      <div
                        className="flex flex-col justify-between"
                        style={{
                          paddingBottom: "28px",
                          fontFamily: "var(--font-ibm-plex-mono)",
                          fontSize: "10px",
                          color: "var(--color-text-faint)",
                          minHeight: "200px",
                        }}
                      >
                        <span>{maxVisitasDia}</span>
                        <span>{Math.round(maxVisitasDia / 2)}</span>
                        <span>0</span>
                      </div>

                      {/* Barras */}
                      <div
                        className="flex-1"
                        style={{
                          display: "flex",
                          alignItems: "flex-end",
                          justifyContent: "space-between",
                          gap: "8px",
                          minHeight: "200px",
                        }}
                      >
                        {visitasUltimos7.map((dia, idx) => {
                          const pct = (dia.total_visitas / maxVisitasDia) * 100;
                          const altura = dia.total_visitas === 0 ? 3 : Math.max(Math.round(pct * 1.6), 6);
                          return (
                            <div
                              key={dia.fecha}
                              className="relative flex-1 flex flex-col items-center justify-end group"
                              style={{ minHeight: "200px" }}
                            >
                              {/* Tooltip */}
                              <div
                                className="pointer-events-none absolute"
                                style={{
                                  bottom: "calc(100% + 8px)",
                                  left: "50%",
                                  transform: "translateX(-50%)",
                                  opacity: maximoBarras[dia.fecha] ? 1 : 0,
                                  transition: "opacity 0.2s ease",
                                  background: "var(--color-ink)",
                                  border: "1px solid var(--color-line)",
                                  borderRadius: 0,
                                  padding: "8px 12px",
                                  zIndex: 30,
                                  whiteSpace: "nowrap",
                                  textAlign: "center",
                                }}
                              >
                                <p
                                  style={{
                                    fontFamily: "var(--font-ibm-plex-mono)",
                                    fontSize: "13px",
                                    fontWeight: 500,
                                    color: "var(--color-gold)",
                                    marginBottom: "2px",
                                  }}
                                >
                                  {dia.total_visitas} visitas
                                </p>
                                <p
                                  style={{
                                    fontFamily: "var(--font-ibm-plex-mono)",
                                    fontSize: "10px",
                                    color: "var(--color-text-muted)",
                                  }}
                                >
                                  {dia.visitantes_unicos} únicos · {dia.label}
                                </p>
                              </div>

                              <div
                                className="w-full flex items-end justify-center"
                                style={{ height: "172px" }}
                                onMouseEnter={() => setMaximoBarras((prev) => ({ ...prev, [dia.fecha]: 1 }))}
                                onMouseLeave={() => setMaximoBarras((prev) => ({ ...prev, [dia.fecha]: 0 }))}
                              >
                                <div
                                  style={{
                                    width: "60%",
                                    maxWidth: "40px",
                                    height: `${altura}px`,
                                    background:
                                      dia.total_visitas === 0
                                        ? "var(--color-line-soft)"
                                        : "var(--color-gold)",
                                    transition: "height 0.3s ease, background 0.2s ease",
                                    cursor: "pointer",
                                  }}
                                />
                              </div>
                              <span
                                style={{
                                  marginTop: "8px",
                                  fontFamily: "var(--font-ibm-plex-mono)",
                                  fontSize: "10px",
                                  color: "var(--color-text-faint)",
                                  textTransform: "capitalize",
                                }}
                              >
                                {dia.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </article>

                  {/* Contenido más popular */}
                  {contenidoPopular.length > 0 && (
                    <article
                      style={{
                        background: "var(--color-card)",
                        border: "1px solid var(--color-line-soft)",
                        padding: "28px 30px",
                        borderRadius: 0,
                      }}
                    >
                      <h3
                        style={{
                          fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
                          fontWeight: 400,
                          fontSize: "20px",
                          color: "var(--color-text)",
                          marginBottom: "20px",
                        }}
                      >
                        Contenido más popular
                      </h3>
                      <div className="space-y-1">
                        {contenidoPopular.slice(0, 5).map((item, i) => {
                          const maxRep = contenidoPopular[0]?.total_reproducciones || 1;
                          const pct = Math.max((item.total_reproducciones / maxRep) * 100, 4);
                          return (
                            <div
                              key={item.archivo_id}
                              className="flex items-center gap-4"
                              style={{
                                padding: "10px 0",
                                borderBottom: i < Math.min(contenidoPopular.length, 5) - 1 ? "1px solid var(--color-line-soft)" : "none",
                              }}
                            >
                              <span
                                style={{
                                  fontFamily: "var(--font-ibm-plex-mono)",
                                  fontSize: "18px",
                                  fontWeight: 500,
                                  color: i === 0 ? "var(--color-gold)" : "var(--color-text-faint)",
                                  width: "34px",
                                }}
                              >
                                {String(i + 1).padStart(2, "0")}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-2">
                                  <p
                                    style={{
                                      fontSize: "13px",
                                      fontWeight: 500,
                                      color: "var(--color-text)",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {item.clase_titulo || item.nombre_display}
                                  </p>
                                  <div
                                    style={{
                                      padding: "2px 8px",
                                      border: "1px solid var(--color-gold-dim)",
                                      fontFamily: "var(--font-ibm-plex-mono)",
                                      fontSize: "9px",
                                      letterSpacing: "0.1em",
                                      textTransform: "uppercase",
                                      color: "var(--color-gold)",
                                      flexShrink: 0,
                                    }}
                                  >
                                    {item.tipo.replace("_", " ")}
                                  </div>
                                </div>
                                <div
                                  style={{
                                    height: "4px",
                                    background: "var(--color-line-soft)",
                                    overflow: "hidden",
                                    borderRadius: 0,
                                  }}
                                >
                                  <div
                                    style={{
                                      height: "100%",
                                      background: "var(--color-gold)",
                                      width: `${pct}%`,
                                      transition: "width 0.3s ease",
                                    }}
                                  />
                                </div>
                                <div className="flex items-center gap-3 mt-1.5">
                                  <span
                                    style={{
                                      fontFamily: "var(--font-ibm-plex-mono)",
                                      fontSize: "10px",
                                      color: "var(--color-text-faint)",
                                    }}
                                  >
                                    {item.materia} — Clase {String(item.clase_numero).padStart(2, "0")}
                                  </span>
                                  <span
                                    style={{
                                      fontFamily: "var(--font-ibm-plex-mono)",
                                      fontSize: "11px",
                                      fontWeight: 500,
                                      color: "var(--color-text)",
                                      marginLeft: "auto",
                                    }}
                                  >
                                    {item.total_reproducciones} <span style={{ color: "var(--color-text-faint)", fontWeight: 400 }}>reproducciones</span>
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </article>
                  )}

                  {/* Actividad reciente — resumida */}
                  {actividadAgrupada.length > 0 && (
                    <article
                      style={{
                        background: "var(--color-card)",
                        border: "1px solid var(--color-line-soft)",
                        padding: "28px 30px",
                        borderRadius: 0,
                      }}
                    >
                      <h3
                        style={{
                          fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
                          fontWeight: 400,
                          fontSize: "20px",
                          color: "var(--color-text)",
                          marginBottom: "20px",
                        }}
                      >
                        Actividad reciente
                        <span
                          style={{
                            fontFamily: "var(--font-ibm-plex-mono)",
                            fontSize: "10px",
                            letterSpacing: "0.12em",
                            textTransform: "uppercase",
                            color: "var(--color-text-faint)",
                            marginLeft: "12px",
                          }}
                        >
                          Resumen de eventos
                        </span>
                      </h3>
                      <div className="space-y-1">
                        {ACTIVIDAD_VISIBLE.map((grupo, i) => {
                          const esRep = esReproduccion(grupo.tipo);
                          const rangoHorario =
                            grupo.count > 1
                              ? `${fmtHora(grupo.inicio)}–${fmtHora(grupo.fin)}`
                              : fmtHora(grupo.inicio);
                          const detalle = grupo.count > 1
                            ? `${rangoHorario}, ${fmtFecha(grupo.inicio)}`
                            : `${rangoHorario} · ${fmtFecha(grupo.inicio)}`;
                          return (
                            <div
                              key={i}
                              className="flex items-center gap-4"
                              style={{
                                padding: "10px 0",
                                borderBottom: i < ACTIVIDAD_VISIBLE.length - 1 ? "1px solid var(--color-line-soft)" : "none",
                              }}
                            >
                              <div
                                style={{
                                  padding: "3px 8px",
                                  border: `1px solid ${esRep ? "var(--color-gold-dim)" : "var(--color-line)"}`,
                                  fontFamily: "var(--font-ibm-plex-mono)",
                                  fontSize: "9px",
                                  letterSpacing: "0.08em",
                                  textTransform: "uppercase",
                                  color: esRep ? "var(--color-gold)" : "var(--color-text-muted)",
                                  flexShrink: 0,
                                }}
                              >
                                {TIPO_LABELS[grupo.tipo] || grupo.tipo}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p
                                  style={{
                                    fontSize: "13px",
                                    color: "var(--color-text)",
                                    marginBottom: "1px",
                                  }}
                                >
                                  {grupo.count > 1 ? (
                                    <>
                                      <span style={{ color: "var(--color-gold)" }}>
                                        {grupo.count} {grupo.count === 1 ? "evento" : "eventos"}
                                      </span>{" "}
                                      en {grupo.archivo_nombre || grupo.pagina || grupo.tipo}
                                    </>
                                  ) : (
                                    grupo.archivo_nombre || grupo.pagina || grupo.tipo
                                  )}
                                </p>
                                {grupo.materia && (
                                  <p
                                    style={{
                                      fontFamily: "var(--font-ibm-plex-mono)",
                                      fontSize: "10px",
                                      color: "var(--color-text-faint)",
                                    }}
                                  >
                                    {grupo.materia}
                                    {grupo.clase_numero ? ` — Clase ${grupo.clase_numero.toString().padStart(2, "0")}` : ""}
                                  </p>
                                )}
                              </div>
                              <span
                                style={{
                                  fontFamily: "var(--font-ibm-plex-mono)",
                                  fontSize: "10px",
                                  color: "var(--color-text-faint)",
                                  textAlign: "right",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {detalle}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {actividadAgrupada.length > 8 && (
                        <button
                          onClick={() => setExpandedActividad((prev) => !prev)}
                          style={{
                            marginTop: "12px",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            fontFamily: "var(--font-ibm-plex-mono)",
                            fontSize: "11px",
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: "var(--color-gold)",
                            padding: "8px 0",
                            textAlign: "left",
                          }}
                        >
                          {expandedActividad ? "— Mostrar menos" : "Ver historial completo"}
                        </button>
                      )}
                    </article>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="border-t" style={{ borderColor: "var(--color-line-soft)" }}>
        <div
          className="footer-inner flex items-center justify-between pad-lateral"
          style={{
            padding: "28px 48px",
            fontFamily: "var(--font-ibm-plex-mono)",
            fontSize: "10px",
            letterSpacing: "0.08em",
            color: "var(--color-text-faint)",
            textTransform: "uppercase",
          }}
        >
          <span>Derecho UBA — Sistema de gestión de clases</span>
          <span>© 2026 — Designed & developed by <span style={{ color: "var(--color-gold)" }}>Franklin</span></span>
        </div>
      </footer>
    </div>
  );
}
