"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PortalFooter from "@/components/PortalFooter";
import AdminUpload from "@/components/AdminUpload";
import AdminManage from "@/components/AdminManage";
import AdminMaterias from "@/components/AdminMaterias";
import { ArrowLeft, BarChart3, Headphones, FileText, Shield } from "@/components/icons";
import { setAdminSession } from "@/lib/utils";

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

interface ContenidoPorTipo {
  tipo: string;
  accesos: number;
  personas: number;
}

interface Estudiante {
  nombre: string;
  visitas: number;
  ultima_actividad: string;
  materias: number;
  porTipo: Record<string, number>;
  total: number;
}

interface MateriaStats {
  id: string;
  nombre: string;
  total_clases: number;
  visitas: number;
  estudiantes: number;
  reproducciones: number;
}

type Periodo = "7" | "30" | "all";

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
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"upload" | "manage" | "analytics">("upload");
  const [claseEditar, setClaseEditar] = useState<{ claseId: string; materiaId: string } | null>(null);
  const [visitantesUnicos, setVisitantesUnicos] = useState(0);
  const [totalVisitas, setTotalVisitas] = useState(0);
  const [alumnosActivos, setAlumnosActivos] = useState(0);
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [contenidoPorTipo, setContenidoPorTipo] = useState<ContenidoPorTipo[]>([]);
  const [materiasStats, setMateriasStats] = useState<MateriaStats[]>([]);
  const [contenidoPopular, setContenidoPopular] = useState<ContenidoPopular[]>([]);
  const [periodo, setPeriodo] = useState<Periodo>("7");
  const [busquedaEstudiante, setBusquedaEstudiante] = useState("");

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordError("");

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.status === 429) {
        const data = await res.json().catch(() => null);
        setPasswordError(data?.error || "Demasiados intentos. Probá de nuevo más tarde.");
        setPasswordLoading(false);
        return;
      }
      const data = await res.json();
      if (data.ok) {
        setAuthenticated(true);
        setAdminSession();
      } else {
        setPasswordError("Contraseña incorrecta");
      }
    } catch {
      setPasswordError("Error al verificar la contraseña");
    } finally {
      setPasswordLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/session");
        const data = await res.json();
        if (data.ok) {
          setAuthenticated(true);
          setAdminSession();
        }
      } catch {
        // Sin sesión válida — mostrar login
      }
    })();
  }, []);

  useEffect(() => {
    if (authenticated) {
      loadAdminData();
    }
  }, [authenticated]);

  async function loadAdminData(periodoActivo: Periodo = periodo) {
    try {
      setAnalyticsLoading(true);
      const res = await fetch(`/api/admin/dashboard?dias=${periodoActivo}`);
      const data = await res.json();
      if (data.materias) setMaterias(data.materias);
      if (data.stats) setStats(data.stats);
      setVisitantesUnicos(data.visitantesUnicos || 0);
      setTotalVisitas(data.totalVisitas || 0);
      setAlumnosActivos(data.alumnosActivos || 0);
      if (data.contenidoPorTipo) setContenidoPorTipo(data.contenidoPorTipo);
      if (data.estudiantes) setEstudiantes(data.estudiantes);
      if (data.materiasStats) setMateriasStats(data.materiasStats);
      if (data.contenidoPopular) setContenidoPopular(data.contenidoPopular);
    } catch (e) {
      console.error("Error loading admin data:", e);
    }
    setAnalyticsLoading(false);
  }

  function cambiarPeriodo(p: Periodo) {
    setPeriodo(p);
    loadAdminData(p);
  }

  async function handleUpload(
    materiaId: string,
    claseNumero: number,
    claseTitulo: string,
    claseFecha: string,
    items: Array<{
      tipo: "audio_clase" | "clase_youtube" | "podcast" | "transcripcion" | "archivo" | "enlace";
      nombre: string;
      archivo?: File;
      driveLink?: string;
      cloudinaryUrl?: string;
      textoContenido?: string;
    }>,
    claseId?: string
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
        } else if (item.cloudinaryUrl) {
          processedItems.push({
            tipo: item.tipo,
            nombre: item.nombre,
            cloudinaryUrl: item.cloudinaryUrl,
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
              reader.onerror = () => resolve("");
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
              fileType: item.tipo,
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
          claseId: claseId || null,
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

  const TAB_LABELS: Record<string, string> = {
    upload: "Subir contenido",
    manage: "Gestionar contenido",
    analytics: "Analytics",
  };

  const POR_TIPO_LABELS: Record<string, string> = {
    audio_clase: "Audio de clase",
    clase_youtube: "Clase grabada (YouTube)",
    podcast: "Podcast",
    transcripcion: "Transcripción",
    archivo: "Punteos / apuntes",
    enlace: "Enlaces",
  };

  const POR_TIPO_ORDER = ["audio_clase", "clase_youtube", "podcast", "transcripcion", "archivo", "enlace"];

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
            <AdminUpload materias={materias} onSubmit={handleUpload} claseInicial={claseEditar} />
          )}

          {/* Manage Tab */}
          {activeTab === "manage" && (
            <>
              <h3
                style={{
                  fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
                  fontWeight: 400,
                  fontSize: "18px",
                  color: "var(--color-text)",
                  marginBottom: "16px",
                }}
              >
                Materias
              </h3>
              <AdminMaterias />
              <h3
                style={{
                  fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
                  fontWeight: 400,
                  fontSize: "18px",
                  color: "var(--color-text)",
                  margin: "32px 0 16px",
                }}
              >
                Clases
              </h3>
              <AdminManage
                onEditarClase={(claseId, materiaId) => {
                  setClaseEditar({ claseId, materiaId });
                  setActiveTab("upload");
                }}
              />
            </>
          )}

          {/* Analytics Tab */}
          {activeTab === "analytics" && (
            <div className="space-y-6">
              {analyticsLoading ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 overflow-hidden" style={{ background: "var(--color-line-soft)", gap: "1px" }}>
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="skeleton" style={{ padding: "48px 30px" }} />
                    ))}
                  </div>
                  <div className="skeleton" style={{ height: "180px" }} />
                  <div className="skeleton" style={{ height: "260px" }} />
                </div>
              ) : (
                <>
                  {/* Selector de período */}
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div
                      className="flex items-center"
                      style={{ border: "1px solid var(--color-line)", overflow: "hidden" }}
                    >
                      {([["7", "7 días"], ["30", "30 días"], ["all", "Total"]] as Array<[Periodo, string]>).map(([val, label], i) => (
                        <button
                          key={val}
                          onClick={() => cambiarPeriodo(val)}
                          style={{
                            background: periodo === val ? "var(--color-ink-2)" : "transparent",
                            border: "none",
                            borderRight: i < 2 ? "1px solid var(--color-line)" : "none",
                            padding: "9px 18px",
                            cursor: "pointer",
                            fontFamily: "var(--font-ibm-plex-mono)",
                            fontSize: "11px",
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            color: periodo === val ? "var(--color-gold)" : "var(--color-text-muted)",
                            transition: "background 0.2s ease, color 0.2s ease",
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <span
                      style={{
                        fontFamily: "var(--font-ibm-plex-mono)",
                        fontSize: "10px",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: "var(--color-text-faint)",
                      }}
                    >
                      {periodo === "all" ? "Todo el historial" : `Últimos ${periodo} días`}
                    </span>
                  </div>

                  {/* Métricas generales */}
                  <div
                    className="grid grid-cols-2 lg:grid-cols-4 overflow-hidden"
                    style={{
                      background: "var(--color-line-soft)",
                      gap: "1px",
                      borderRadius: 0,
                    }}
                  >
                    <div style={{ background: "var(--color-card)", padding: "24px 26px" }}>
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
                      <div
                        style={{
                          fontFamily: "var(--font-ibm-plex-mono)",
                          fontSize: "36px",
                          fontWeight: 500,
                          lineHeight: 1.1,
                          color: "var(--color-gold)",
                          margin: "10px 0 6px",
                        }}
                      >
                        {String(visitantesUnicos).padStart(2, "0")}
                      </div>
                      <p style={{ fontSize: "11px", color: "var(--color-text-muted)", lineHeight: 1.5 }}>
                        Personas distintas que entraron al portal
                      </p>
                    </div>

                    <div style={{ background: "var(--color-card)", padding: "24px 26px" }}>
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
                      <div
                        style={{
                          fontFamily: "var(--font-ibm-plex-mono)",
                          fontSize: "36px",
                          fontWeight: 500,
                          lineHeight: 1.1,
                          color: "var(--color-text)",
                          margin: "10px 0 6px",
                        }}
                      >
                        {String(totalVisitas).padStart(2, "0")}
                      </div>
                      <p style={{ fontSize: "11px", color: "var(--color-text-muted)", lineHeight: 1.5 }}>
                        Entradas a páginas del portal
                      </p>
                    </div>

                    <div style={{ background: "var(--color-card)", padding: "24px 26px" }}>
                      <span
                        style={{
                          fontFamily: "var(--font-ibm-plex-mono)",
                          fontSize: "9px",
                          letterSpacing: "0.14em",
                          textTransform: "uppercase",
                          color: "var(--color-text-faint)",
                        }}
                      >
                        Reproducciones
                      </span>
                      <div
                        style={{
                          fontFamily: "var(--font-ibm-plex-mono)",
                          fontSize: "36px",
                          fontWeight: 500,
                          lineHeight: 1.1,
                          color: "var(--color-text)",
                          margin: "10px 0 6px",
                        }}
                      >
                        {String(stats.totalReproducciones).padStart(2, "0")}
                      </div>
                      <p style={{ fontSize: "11px", color: "var(--color-text-muted)", lineHeight: 1.5 }}>
                        Veces que se reprodujo audio, video o podcast
                      </p>
                    </div>

                    <div style={{ background: "var(--color-card)", padding: "24px 26px" }}>
                      <span
                        style={{
                          fontFamily: "var(--font-ibm-plex-mono)",
                          fontSize: "9px",
                          letterSpacing: "0.14em",
                          textTransform: "uppercase",
                          color: "var(--color-text-faint)",
                        }}
                      >
                        Alumnos activos
                      </span>
                      <div
                        style={{
                          fontFamily: "var(--font-ibm-plex-mono)",
                          fontSize: "36px",
                          fontWeight: 500,
                          lineHeight: 1.1,
                          color: "var(--color-gold)",
                          margin: "10px 0 6px",
                        }}
                      >
                        {String(alumnosActivos).padStart(2, "0")}
                      </div>
                      <p style={{ fontSize: "11px", color: "var(--color-text-muted)", lineHeight: 1.5 }}>
                        Con nombre, de {estudiantes.length} que entraron
                      </p>
                    </div>
                  </div>

                  {/* Contenido consumido por tipo */}
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
                        marginBottom: "4px",
                      }}
                    >
                      Contenido consumido
                    </h3>
                    <p style={{ fontSize: "12px", color: "var(--color-text-muted)", marginBottom: "20px", lineHeight: 1.6 }}>
                      Veces que se abrió o reprodujo cada tipo de material.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ gap: "1px", background: "var(--color-line-soft)" }}>
                      {POR_TIPO_ORDER.map((tipo) => {
                        const item = contenidoPorTipo.find((c) => c.tipo === tipo);
                        return (
                          <div key={tipo} style={{ background: "var(--color-card)", padding: "20px 24px" }}>
                            <p
                              style={{
                                fontFamily: "var(--font-ibm-plex-mono)",
                                fontSize: "9px",
                                letterSpacing: "0.14em",
                                textTransform: "uppercase",
                                color: "var(--color-gold)",
                                marginBottom: "10px",
                              }}
                            >
                              {POR_TIPO_LABELS[tipo]}
                            </p>
                            <div
                              style={{
                                fontFamily: "var(--font-ibm-plex-mono)",
                                fontSize: "28px",
                                fontWeight: 500,
                                lineHeight: 1,
                                color: "var(--color-text)",
                              }}
                            >
                              {item?.accesos || 0}
                            </div>
                            <div
                              style={{
                                fontFamily: "var(--font-ibm-plex-mono)",
                                fontSize: "10px",
                                color: "var(--color-text-faint)",
                                marginTop: "8px",
                              }}
                            >
                              {item?.personas || 0} personas
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </article>

                  {/* Desglose por materia */}
                  {materiasStats.length > 0 && (
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
                        Actividad por materia
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
                          {materiasStats.length} materias
                        </span>
                      </h3>
                      <div>
                        {materiasStats.map((mat, i) => (
                            <div
                              key={mat.id}
                              className="flex items-center gap-4"
                              style={{
                                padding: "12px 0",
                                borderBottom:
                                  i < materiasStats.length - 1 ? "1px solid var(--color-line-soft)" : "none",
                              }}
                            >
                              <span
                                style={{
                                  fontFamily: "var(--font-ibm-plex-mono)",
                                  fontSize: "13px",
                                  fontWeight: 500,
                                  color: i === 0 ? "var(--color-gold)" : "var(--color-text-faint)",
                                  width: "28px",
                                  flexShrink: 0,
                                }}
                              >
                                {String(i + 1).padStart(2, "0")}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p
                                  style={{
                                    fontSize: "14px",
                                    fontWeight: 500,
                                    color: "var(--color-text)",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {mat.nombre}
                                </p>
                                <span
                                  style={{
                                    fontFamily: "var(--font-ibm-plex-mono)",
                                    fontSize: "9px",
                                    color: "var(--color-text-faint)",
                                  }}
                                >
                                  {mat.total_clases} clases
                                </span>
                              </div>
                              <div
                                className="flex items-center gap-3 flex-shrink-0"
                                style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "11px", textAlign: "right" }}
                              >
                                <span style={{ color: "var(--color-text-muted)", minWidth: "44px" }}>
                                  {mat.visitas} <span style={{ color: "var(--color-text-faint)" }}>visitas</span>
                                </span>
                                <span style={{ color: "var(--color-text-muted)", minWidth: "54px" }}>
                                  {mat.estudiantes} <span style={{ color: "var(--color-text-faint)" }}>alumnos</span>
                                </span>
                                <span style={{ color: "var(--color-text-muted)", minWidth: "70px" }}>
                                  {mat.reproducciones} <span style={{ color: "var(--color-text-faint)" }}>reproducciones</span>
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </article>
                  )}

                  {/* Estudiantes registrados */}
                  {estudiantes.length > 0 && (
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
                        Estudiantes registrados
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
                          {estudiantes.length} personas
                        </span>
                      </h3>
                      <input
                        type="search"
                        value={busquedaEstudiante}
                        onChange={(e) => setBusquedaEstudiante(e.target.value)}
                        placeholder="Buscar por nombre…"
                        aria-label="Buscar estudiante"
                        style={{
                          width: "100%",
                          background: "var(--color-ink)",
                          border: "1px solid var(--color-line)",
                          color: "var(--color-text)",
                          padding: "10px 14px",
                          fontSize: "13px",
                          outline: "none",
                          marginBottom: "16px",
                          borderRadius: 0,
                        }}
                      />
                      <div className="space-y-1">
                        {estudiantes.filter((est) =>
                            est.nombre.toLowerCase().includes(busquedaEstudiante.trim().toLowerCase())
                          ).length === 0 ? (
                          <p style={{ color: "var(--color-text-muted)", fontSize: "13px", padding: "16px 0" }}>
                            No se encontró ningún estudiante con ese nombre.
                          </p>
                        ) : (
                        estudiantes
                          .filter((est) =>
                            est.nombre.toLowerCase().includes(busquedaEstudiante.trim().toLowerCase())
                          )
                          .slice(0, 15)
                          .map((est, i) => (
                          <div
                            key={est.nombre}
                            className="flex items-center gap-4"
                            style={{
                              padding: "10px 0",
                              borderBottom: i < Math.min(estudiantes.length, 15) - 1 ? "1px solid var(--color-line-soft)" : "none",
                            }}
                          >
                            <span
                              style={{
                                fontFamily: "var(--font-ibm-plex-mono)",
                                fontSize: "13px",
                                fontWeight: 500,
                                color: "var(--color-gold)",
                                width: "28px",
                                flexShrink: 0,
                              }}
                            >
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p
                                style={{
                                  fontSize: "14px",
                                  fontWeight: 500,
                                  color: "var(--color-text)",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {est.nombre}
                              </p>
                              <p
                                style={{
                                  fontFamily: "var(--font-ibm-plex-mono)",
                                  fontSize: "10px",
                                  color: "var(--color-text-faint)",
                                  marginTop: "2px",
                                }}
                              >
                                Última actividad: {est.ultima_actividad ? new Date(est.ultima_actividad).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }) : "—"}
                              </p>
                            </div>
                            <div
                              className="flex items-center gap-3 flex-shrink-0"
                              style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "11px" }}
                            >
                              <span style={{ color: "var(--color-text-muted)", minWidth: "44px", textAlign: "right" }}>
                                {est.visitas} <span style={{ color: "var(--color-text-faint)" }}>visitas</span>
                              </span>
                              <span style={{ color: "var(--color-text-muted)", minWidth: "36px", textAlign: "right" }}>
                                {est.porTipo.audio_clase || 0} <span style={{ color: "var(--color-text-faint)" }}>audio</span>
                              </span>
                              <span style={{ color: "var(--color-text-muted)", minWidth: "44px", textAlign: "right" }}>
                                {est.porTipo.clase_youtube || 0} <span style={{ color: "var(--color-text-faint)" }}>video</span>
                              </span>
                              <span style={{ color: "var(--color-text-muted)", minWidth: "50px", textAlign: "right" }}>
                                {est.porTipo.podcast || 0} <span style={{ color: "var(--color-text-faint)" }}>podcast</span>
                              </span>
                              <span style={{ color: "var(--color-text-muted)", minWidth: "70px", textAlign: "right" }}>
                                {est.porTipo.transcripcion || 0} <span style={{ color: "var(--color-text-faint)" }}>transcripción</span>
                              </span>
                              <span style={{ color: "var(--color-text-muted)", minWidth: "48px", textAlign: "right" }}>
                                {est.porTipo.archivo || 0} <span style={{ color: "var(--color-text-faint)" }}>punteos</span>
                              </span>
                              <span
                                style={{
                                  color: "var(--color-gold)",
                                  fontWeight: 500,
                                  minWidth: "40px",
                                  textAlign: "right",
                                }}
                              >
                                {est.total}
                              </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </article>
                  )}

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
                        {contenidoPopular.slice(0, 5).map((item, i) => (
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
                                <div className="flex items-center gap-3 mb-1">
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
                                    {POR_TIPO_LABELS[item.tipo] || item.tipo.replace("_", " ")}
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
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
                                      fontSize: "13px",
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
                          ))}
                      </div>
                    </article>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ═══════════ FOOTER ═══════════ */}
      <PortalFooter />
    </div>
  );
}
