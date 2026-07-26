"use client";

import React, { useEffect, useState } from "react";
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
          const presignRes = await fetch("/api/presign", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filename: item.archivo.name, contentType: item.archivo.type || "audio/mpeg" }),
          });
          const presignData = await presignRes.json();
          if (!presignData.uploadUrl) {
            return { ok: false, error: "Failed to get upload URL" };
          }
          const uploadRes = await fetch(presignData.uploadUrl, {
            method: "PUT",
            body: item.archivo,
          });
          if (!uploadRes.ok) {
            return { ok: false, error: `Upload to storage failed (${uploadRes.status})` };
          }
          processedItems.push({
            tipo: item.tipo,
            nombre: item.nombre,
            storageKey: presignData.storageKey,
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

  if (!authenticated) {
    return (
      <div
        className="min-h-screen flex items-center justify-center pad-lateral"
        style={{ background: "var(--color-ink)" }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "420px",
            padding: "48px 40px",
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
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoFocus
              style={{
                width: "100%",
                background: "var(--color-ink)",
                border: "1px solid var(--color-line)",
                borderRadius: 0,
                padding: "14px 16px",
                color: "var(--color-text)",
                textAlign: "center",
                fontSize: "18px",
                letterSpacing: "0.2em",
                fontFamily: "var(--font-ibm-plex-mono)",
                outline: "none",
                marginBottom: "16px",
              }}
            />

            {passwordError && (
              <p
                style={{
                  fontSize: "13px",
                  color: "#E05555",
                  marginBottom: "16px",
                  textAlign: "center",
                  fontFamily: "var(--font-ibm-plex-mono)",
                }}
              >
                {passwordError}
              </p>
            )}

            <button
              type="submit"
              disabled={passwordLoading || !password}
              style={{
                width: "100%",
                padding: "14px",
                background: "var(--color-gold)",
                color: "var(--color-ink)",
                border: "none",
                borderRadius: 0,
                fontSize: "14px",
                fontWeight: 600,
                cursor: passwordLoading || !password ? "not-allowed" : "pointer",
                opacity: passwordLoading || !password ? 0.5 : 1,
                transition: "opacity 0.2s ease",
                fontFamily: "var(--font-inter)",
              }}
            >
              {passwordLoading ? "Verificando..." : "Acceder"}
            </button>
          </form>

          <div className="text-center mt-6">
            <button
              onClick={() => router.push("/dashboard")}
              style={{
                fontSize: "12px",
                color: "var(--color-text-faint)",
                fontFamily: "var(--font-ibm-plex-mono)",
                letterSpacing: "0.04em",
                background: "none",
                border: "none",
                cursor: "pointer",
                transition: "color 0.2s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-text)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-faint)")}
            >
              ← Volver al dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const maxVisitas = Math.max(...visitasPorDia.map((d) => d.total_visitas), 1);

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
        <div className="flex items-center justify-between pad-lateral" style={{ padding: "22px 48px" }}>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center justify-center"
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
            <div>
              <h1
                style={{
                  fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
                  fontWeight: 500,
                  fontSize: "20px",
                  lineHeight: 1.2,
                  color: "var(--color-text)",
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
                }}
              >
                Gestión de contenido y analytics
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div
            className="flex items-center"
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
          {/* Stats */}
          <div
            className="grid grid-cols-3 overflow-hidden mb-8"
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
                  {/* Visitantes + Visitas */}
                  <div
                    className="grid grid-cols-2 overflow-hidden"
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
                  </div>

                  {/* Visitas por día */}
                  {visitasPorDia.length > 0 && (
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
                      <div className="space-y-3">
                        {visitasPorDia.map((dia) => (
                          <div key={dia.fecha} className="flex items-center gap-4">
                            <span
                              style={{
                                fontFamily: "var(--font-ibm-plex-mono)",
                                fontSize: "12px",
                                color: "var(--color-text-muted)",
                                width: "120px",
                              }}
                            >
                              {dia.fecha}
                            </span>
                            <div
                              style={{
                                flex: 1,
                                height: "24px",
                                background: "var(--color-ink)",
                                borderRadius: 0,
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  height: "100%",
                                  background: "var(--color-gold)",
                                  width: `${(dia.total_visitas / maxVisitas) * 100}%`,
                                  transition: "width 0.3s ease",
                                }}
                              />
                            </div>
                            <span
                              style={{
                                fontFamily: "var(--font-ibm-plex-mono)",
                                fontSize: "13px",
                                fontWeight: 500,
                                color: "var(--color-text)",
                                width: "40px",
                                textAlign: "right",
                              }}
                            >
                              {dia.total_visitas}
                            </span>
                            <span
                              style={{
                                fontFamily: "var(--font-ibm-plex-mono)",
                                fontSize: "11px",
                                color: "var(--color-text-faint)",
                                width: "80px",
                                textAlign: "right",
                              }}
                            >
                              {dia.visitantes_unicos} únicos
                            </span>
                          </div>
                        ))}
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
                      <div className="space-y-3">
                        {contenidoPopular.map((item, i) => (
                          <div
                            key={item.archivo_id}
                            className="flex items-center gap-4"
                            style={{
                              padding: "12px 0",
                            }}
                          >
                            <span
                              style={{
                                fontFamily: "var(--font-ibm-plex-mono)",
                                fontSize: "16px",
                                fontWeight: 500,
                                color: "var(--color-text-faint)",
                                width: "32px",
                              }}
                            >
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p
                                style={{
                                  fontSize: "13px",
                                  fontWeight: 500,
                                  color: "var(--color-text)",
                                  marginBottom: "2px",
                                }}
                              >
                                {item.nombre_display}
                              </p>
                              <p
                                style={{
                                  fontFamily: "var(--font-ibm-plex-mono)",
                                  fontSize: "11px",
                                  color: "var(--color-text-faint)",
                                }}
                              >
                                {item.materia} — Clase {item.clase_numero.toString().padStart(2, "0")}
                              </p>
                            </div>
                            <div
                              style={{
                                padding: "3px 8px",
                                border: "1px solid var(--color-gold-dim)",
                                fontFamily: "var(--font-ibm-plex-mono)",
                                fontSize: "9px",
                                letterSpacing: "0.1em",
                                textTransform: "uppercase",
                                color: "var(--color-gold)",
                              }}
                            >
                              {item.tipo.replace("_", " ")}
                            </div>
                            <div style={{ textAlign: "right", width: "100px" }}>
                              <p
                                style={{
                                  fontFamily: "var(--font-ibm-plex-mono)",
                                  fontSize: "16px",
                                  fontWeight: 500,
                                  color: "var(--color-text)",
                                }}
                              >
                                {item.total_reproducciones}
                              </p>
                              <p
                                style={{
                                  fontFamily: "var(--font-ibm-plex-mono)",
                                  fontSize: "9px",
                                  letterSpacing: "0.08em",
                                  textTransform: "uppercase",
                                  color: "var(--color-text-faint)",
                                }}
                              >
                                Reproducciones
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </article>
                  )}

                  {/* Actividad reciente */}
                  {actividadReciente.length > 0 && (
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
                      </h3>
                      <div className="space-y-2">
                        {actividadReciente.map((act, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-4"
                            style={{
                              padding: "8px 0",
                              borderBottom: i < actividadReciente.length - 1 ? "1px solid var(--color-line-soft)" : "none",
                              transition: "background 0.2s ease",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                          >
                            <div
                              style={{
                                padding: "2px 8px",
                                border: "1px solid var(--color-line)",
                                fontFamily: "var(--font-ibm-plex-mono)",
                                fontSize: "9px",
                                letterSpacing: "0.08em",
                                textTransform: "uppercase",
                                color: "var(--color-text-muted)",
                              }}
                            >
                              {TIPO_LABELS[act.tipo] || act.tipo}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p
                                style={{
                                  fontSize: "13px",
                                  color: "var(--color-text)",
                                  marginBottom: "1px",
                                }}
                              >
                                {act.archivo_nombre || act.pagina || act.tipo}
                              </p>
                              {act.materia && (
                                <p
                                  style={{
                                    fontFamily: "var(--font-ibm-plex-mono)",
                                    fontSize: "10px",
                                    color: "var(--color-text-faint)",
                                  }}
                                >
                                  {act.materia}
                                  {act.clase_numero ? ` — Clase ${act.clase_numero.toString().padStart(2, "0")}` : ""}
                                </p>
                              )}
                            </div>
                            <span
                              style={{
                                fontFamily: "var(--font-ibm-plex-mono)",
                                fontSize: "10px",
                                color: "var(--color-text-faint)",
                              }}
                            >
                              {new Date(act.created_at).toLocaleString("es-AR", {
                                day: "2-digit",
                                month: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
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
      <footer className="border-t" style={{ borderColor: "var(--color-line-soft)" }}>
        <div
          className="flex items-center justify-between pad-lateral"
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
          <span>v0.2 — Prototipo</span>
        </div>
      </footer>
    </div>
  );
}
