"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
const AdminUpload = React.lazy(() => import("@/components/AdminUpload"));
const AdminManage = React.lazy(() => import("@/components/AdminManage"));
const AdminMaterias = React.lazy(() => import("@/components/AdminMaterias"));

import { ArrowLeft, BarChart3, Headphones, FileText, Shield, ChevronDown, Loader2 } from "@/components/icons";
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
  materias: Array<{ slug: string; materia: string; accesos: number; personas: number }>;
}

interface Estudiante {
  nombre: string;
  visitas: number;
  clasesVistas: number;
  ultima_actividad: string;
  materias: number;
  porTipo: Record<string, number>;
  total: number;
}

interface ElementoDia {
  fecha: string;
  veces: number;
}

interface ElementoEstudiante {
  archivo_id: string;
  nombre: string;
  tipo: string;
  clase_numero: number | null;
  clase_titulo: string | null;
  total: number;
  porDia: ElementoDia[];
}

interface MateriaEstudiante {
  materia_slug: string;
  materia_nombre: string;
  visitas: number;
  elementos: ElementoEstudiante[];
}

interface EstudianteDetalle {
  nombre: string;
  total: number;
  reproducciones: number;
  completados: number;
  materiasUnicas: number;
  materias: MateriaEstudiante[];
}

interface MateriaStats {
  id: string;
  nombre: string;
  total_clases: number;
  visitas: number;
  estudiantes: number;
  reproducciones: number;
  porTipo: Record<string, number>;
  consumo: number;
}

interface EnLinea {
  nombre: string;
  materia_slug: string | null;
  materia_nombre: string;
  pagina: string | null;
  ultimo: string;
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
  const [tasaRegistro, setTasaRegistro] = useState(0);
  const [totalVisitas, setTotalVisitas] = useState(0);
  const [alumnosActivos, setAlumnosActivos] = useState(0);
  const [alumnosNuevos, setAlumnosNuevos] = useState(0);
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [contenidoPorTipo, setContenidoPorTipo] = useState<ContenidoPorTipo[]>([]);
  const [materiasStats, setMateriasStats] = useState<MateriaStats[]>([]);
  const [contenidoPopular, setContenidoPopular] = useState<ContenidoPopular[]>([]);
  const [totalRegistradosAllTime, setTotalRegistradosAllTime] = useState(0);
  const [periodo, setPeriodo] = useState<Periodo>("7");
  const [busquedaEstudiante, setBusquedaEstudiante] = useState("");
  const [estudiantesAbiertos, setEstudiantesAbiertos] = useState(false);
  const [enLinea, setEnLinea] = useState<EnLinea[]>([]);
  const [enLineaCargando, setEnLineaCargando] = useState(true);
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState<string | null>(null);
  const [detalleEstudiante, setDetalleEstudiante] = useState<EstudianteDetalle | null>(null);
  const [detalleCargando, setDetalleCargando] = useState(false);
  const [detalleError, setDetalleError] = useState(false);

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

  // Presencia en vivo: polling mientras esté en la pestaña Analytics
  useEffect(() => {
    if (!authenticated || activeTab !== "analytics") return;
    let ok = true;
    const cargarPresencia = async () => {
      try {
        const res = await fetch("/api/admin/presence");
        const data = await res.json();
        if (!ok) return;
        if (data.enLinea) setEnLinea(data.enLinea);
      } catch {
        // Silencioso: no romper el panel
      }
      if (ok) setEnLineaCargando(false);
    };
    cargarPresencia();
    const id = setInterval(cargarPresencia, 12000);
    return () => {
      ok = false;
      clearInterval(id);
    };
  }, [authenticated, activeTab]);

  const loadAdminData = useCallback(async () => {
    try {
      setAnalyticsLoading(true);
      const res = await fetch(`/api/admin/dashboard?dias=${periodo}`);
      const data = await res.json();
      if (data.materias) setMaterias(data.materias);
      if (data.stats) setStats(data.stats);
      setVisitantesUnicos(data.visitantesUnicos || 0);
      setTasaRegistro(data.stats?.tasaRegistro || 0);
      setTotalVisitas(data.totalVisitas || 0);
      setAlumnosActivos(data.alumnosActivos || 0);
      setAlumnosNuevos(data.alumnosNuevos || 0);
      if (data.contenidoPorTipo) setContenidoPorTipo(data.contenidoPorTipo);
      if (data.estudiantes) setEstudiantes(data.estudiantes);
      if (data.materiasStats) setMateriasStats(data.materiasStats);
      if (data.contenidoPopular) setContenidoPopular(data.contenidoPopular);
      setTotalRegistradosAllTime(data.totalRegistradosAllTime || 0);
    } catch (e) {
      console.error("Error loading admin data:", e);
    }
    setAnalyticsLoading(false);
  }, [periodo]);

  useEffect(() => {
    if (authenticated) {
      loadAdminData();
    }
  }, [authenticated, loadAdminData]);

  function cambiarPeriodo(p: Periodo) {
    setPeriodo(p);
  }

  async function verEstudiante(nombre: string) {
    if (estudianteSeleccionado === nombre) {
      setEstudianteSeleccionado(null);
      setDetalleEstudiante(null);
      return;
    }
    setEstudianteSeleccionado(nombre);
    setDetalleEstudiante(null);
    setDetalleError(false);
    setDetalleCargando(true);
    try {
      const res = await fetch(`/api/admin/estudiante?nombre=${encodeURIComponent(nombre)}`);
      const data = await res.json();
      if (data.error) {
        setDetalleError(true);
      } else {
        setDetalleEstudiante(data);
      }
    } catch {
      setDetalleError(true);
    } finally {
      setDetalleCargando(false);
    }
  }

  function inferirContentType(file: File): string {
    const type = file.type;
    if (type && type !== "application/octet-stream") return type;
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    const map: Record<string, string> = {
      html: "text/html",
      htm: "text/html",
      pdf: "application/pdf",
      mp3: "audio/mpeg",
      wav: "audio/wav",
      m4a: "audio/mp4",
      aac: "audio/aac",
      mp4: "video/mp4",
      webm: "video/webm",
      ogg: "audio/ogg",
      txt: "text/plain",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ppt: "application/vnd.ms-powerpoint",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      xls: "application/vnd.ms-excel",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      zip: "application/zip",
      json: "application/json",
      js: "text/javascript",
      css: "text/css",
    };
    return map[ext] || type || "application/octet-stream";
  }

  async function handleUpload(
    materiaId: string,
    claseNumero: number,
    claseTitulo: string,
    claseFecha: string,
    items: Array<{
      tipo: "audio_clase" | "clase_youtube" | "transcripcion" | "archivo" | "enlace" | "cuestionario" | "material_privado" | "ficha";
      nombre: string;
      archivo?: File;
      driveLink?: string;
      cloudinaryUrl?: string;
      textoContenido?: string;
      contenido?: string;
      html?: string;
    }>,
    claseId?: string
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const processedItems = [];

      const subirArchivo = async (archivo: File, tipo: string): Promise<{ storageKey: string; fileSize: number }> => {
        const CHUNK_SIZE = 1024 * 1024;
        const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const totalParts = Math.ceil(archivo.size / CHUNK_SIZE);
        for (let i = 0; i < totalParts; i++) {
          const start = i * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, archivo.size);
          const slice = archivo.slice(start, end);
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
        const finalKey = `uploads/${Date.now()}-${archivo.name}`;
        const assemRes = await fetch("/api/upload-assemble", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            totalParts,
            finalKey,
            contentType: inferirContentType(archivo),
            fileType: tipo,
          }),
        });
        if (!assemRes.ok) {
          const errBody = await assemRes.text();
          throw new Error(`Assembly failed: ${errBody}`);
        }
        return { storageKey: finalKey, fileSize: archivo.size };
      };

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
          const up = await subirArchivo(item.archivo, item.tipo);
          processedItems.push({ tipo: item.tipo, nombre: item.nombre, storageKey: up.storageKey, fileSize: up.fileSize });
        } else if (item.contenido) {
          processedItems.push({ tipo: item.tipo, nombre: item.nombre, contenido: item.contenido });
        } else if (item.html) {
          processedItems.push({ tipo: item.tipo, nombre: item.nombre, html: item.html });
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
    transcripcion: "Transcripción",
    archivo: "Archivos",
    enlace: "Enlaces",
    material_privado: "Material privado",
  };

  const POR_TIPO_ORDER = ["audio_clase", "clase_youtube", "transcripcion", "archivo", "enlace", "material_privado"];

  const rankColor = (i: number) =>
    i === 0 ? "var(--color-gold)" : i === 1 ? "var(--color-text)" : i === 2 ? "var(--color-text-muted)" : "var(--color-text-faint)";

  const [regenerating, setRegenerating] = useState(false);
  const [regenResult, setRegenResult] = useState("");
  const [migrating, setMigrating] = useState(false);
  const [migrateResult, setMigrateResult] = useState("");

  async function handleRegenerate() {
    setRegenerating(true);
    setRegenResult("");
    try {
      const res = await fetch("/api/admin/regenerate", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setRegenResult(`Regenerados: ${data.regenerated} cuestionarios` + (data.skipped ? ` (${data.skipped} sin contenido)` : "") + (data.errors ? ` (${data.errors.length} errores)` : ""));
      } else {
        setRegenResult("Error: " + data.error);
      }
    } catch (e) {
      setRegenResult("Error: " + String(e));
    } finally {
      setRegenerating(false);
    }
  }

  async function handleMigrate() {
    setMigrating(true);
    setMigrateResult("");
    try {
      const res = await fetch("/api/admin/migrate-contenido", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setMigrateResult(`Migrados: ${data.migrated}/${data.total} cuestionarios`);
        if (data.results) setMigrateResult((prev) => prev + "\n" + data.results.join("\n"));
        if (data.dbNames) setMigrateResult((prev) => prev + "\n\nArchivos en BD:\n" + data.dbNames.map((d: { name: string; key: string }) => `  ${d.name} → ${d.key}`).join("\n"));
      } else {
        setMigrateResult("Error: " + data.error);
      }
    } catch (e) {
      setMigrateResult("Error: " + String(e));
    } finally {
      setMigrating(false);
    }
  }

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
    <div className="min-h-screen flex flex-col admin-page" style={{ background: "var(--color-ink)" }}>
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
            className="flex flex-col sm:flex-row w-full sm:w-auto"
            style={{
              border: "1px solid var(--color-line-soft)",
              borderRadius: 0,
            }}
          >
            {(["upload", "manage", "analytics"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={tab !== "analytics" ? "border-b sm:border-b-0 sm:border-r" : "border-0"}
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  fontSize: "12px",
                  fontWeight: 500,
                  fontFamily: "var(--font-inter)",
                  cursor: "pointer",
                  borderColor: "var(--color-line-soft)",
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
                <span className="sm:hidden">{tab === "upload" ? "Subir" : tab === "manage" ? "Gestionar" : "Analytics"}</span>
                <span className="hidden sm:inline">{TAB_LABELS[tab]}</span>
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
            <Suspense fallback={<div className="flex items-center gap-2" style={{ padding: "24px 0", color: "var(--color-text-muted)", fontFamily: "var(--font-ibm-plex-mono)", fontSize: "12px" }}><Loader2 style={{ width: "16px", height: "16px", animation: "spin 1s linear infinite" }} /> Cargando…</div>}>
              <AdminUpload materias={materias} onSubmit={handleUpload} claseInicial={claseEditar} />
            </Suspense>
          )}

          {/* Manage Tab */}
          {activeTab === "manage" && (
            <>
              <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
                <h3
                  style={{
                    fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
                    fontWeight: 400,
                    fontSize: "18px",
                    color: "var(--color-text)",
                  }}
                >
                  Materias
                </h3>
                <button
                  onClick={handleRegenerate}
                  disabled={regenerating}
                  style={{
                    padding: "7px 14px",
                    fontSize: "11px",
                    fontFamily: "var(--font-ibm-plex-mono)",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    background: "transparent",
                    color: "var(--color-text-muted)",
                    border: "1px solid var(--color-line)",
                    borderRadius: 0,
                    cursor: regenerating ? "not-allowed" : "pointer",
                    opacity: regenerating ? 0.5 : 1,
                  }}
                >
                  {regenerating ? "Regenerando..." : "Regenerar HTML"}
                </button>
                <button
                  onClick={handleMigrate}
                  disabled={migrating}
                  style={{
                    padding: "7px 14px",
                    fontSize: "11px",
                    fontFamily: "var(--font-ibm-plex-mono)",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    background: "var(--color-gold)",
                    color: "var(--color-ink)",
                    border: "none",
                    borderRadius: 0,
                    cursor: migrating ? "not-allowed" : "pointer",
                    opacity: migrating ? 0.5 : 1,
                  }}
                >
                  {migrating ? "Migrando..." : "Migrar contenido"}
                </button>
              </div>
              {regenResult && (
                <div style={{ padding: "10px 14px", marginBottom: "16px", background: regenResult.startsWith("Error") ? "rgba(224,85,85,0.08)" : "rgba(185,154,98,0.08)", border: `1px solid ${regenResult.startsWith("Error") ? "rgba(224,85,85,0.3)" : "var(--color-gold-dim)"}`, borderRadius: 0 }}>
                  <p style={{ fontSize: "12px", color: regenResult.startsWith("Error") ? "#E05555" : "var(--color-gold)" }}>{regenResult}</p>
                </div>
              )}
              {migrateResult && (
                <div style={{ padding: "10px 14px", marginBottom: "16px", background: migrateResult.startsWith("Error") ? "rgba(224,85,85,0.08)" : "rgba(95,184,138,0.08)", border: `1px solid ${migrateResult.startsWith("Error") ? "rgba(224,85,85,0.3)" : "rgba(95,184,138,0.3)"}`, borderRadius: 0, whiteSpace: "pre-wrap" }}>
                  <p style={{ fontSize: "12px", color: migrateResult.startsWith("Error") ? "#E05555" : "#5fb88a" }}>{migrateResult}</p>
                </div>
              )}
              <Suspense fallback={<div className="flex items-center gap-2" style={{ padding: "16px 0", color: "var(--color-text-muted)", fontFamily: "var(--font-ibm-plex-mono)", fontSize: "12px" }}><Loader2 style={{ width: "16px", height: "16px", animation: "spin 1s linear infinite" }} /> Cargando…</div>}>
                <AdminMaterias />
              </Suspense>
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
              <Suspense fallback={<div className="flex items-center gap-2" style={{ padding: "16px 0", color: "var(--color-text-muted)", fontFamily: "var(--font-ibm-plex-mono)", fontSize: "12px" }}><Loader2 style={{ width: "16px", height: "16px", animation: "spin 1s linear infinite" }} /> Cargando…</div>}>
                <AdminManage
                  onEditarClase={(claseId, materiaId) => {
                    setClaseEditar({ claseId, materiaId });
                    setActiveTab("upload");
                  }}
                />
              </Suspense>
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
                    className="grid grid-cols-2 lg:grid-cols-5 overflow-hidden"
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
                        Ingresaron al portal
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
                        {String(totalRegistradosAllTime).padStart(2, "0")}
                      </div>
                      <p style={{ fontSize: "11px", color: "var(--color-text-muted)", lineHeight: 1.5 }}>
                        Total histórico, nunca baja
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
                        Activas en el período
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
                        {String(visitantesUnicos).padStart(2, "0")}
                      </div>
                      <p style={{ fontSize: "11px", color: "var(--color-text-muted)", lineHeight: 1.5 }}>
                        Últimos {periodo === "all" ? "todo el historial" : `${periodo} días`}
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
                        Páginas vistas por estudiantes registrados
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
                        Veces que se reprodujo audio o video
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
                        Activas en el período
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
                        {String(alumnosActivos).padStart(2, "0")}
                      </div>
                      <p style={{ fontSize: "11px", color: "var(--color-text-muted)", lineHeight: 1.5 }}>
                        De {totalRegistradosAllTime} que ingresaron
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
                        Alumnos nuevos
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
                        {String(alumnosNuevos).padStart(2, "0")}
                      </div>
                      <p style={{ fontSize: "11px", color: "var(--color-text-muted)", lineHeight: 1.5 }}>
                        Que completaron el registro por primera vez
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
                        Tasa de registro
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
                        {String(tasaRegistro).padStart(2, "0")}%
                      </div>
                      <p style={{ fontSize: "11px", color: "var(--color-text-muted)", lineHeight: 1.5 }}>
                        De las visitas, cuántas registran su nombre
                      </p>
                    </div>
                  </div>

                  {/* En línea ahora */}
                  <article
                    style={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-line-soft)",
                      padding: "24px 30px",
                      borderRadius: 0,
                    }}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-3" style={{ marginBottom: "12px" }}>
                      <div className="flex items-center gap-3">
                        <span
                          style={{
                            width: "10px",
                            height: "10px",
                            borderRadius: "50%",
                            background: enLinea.length > 0 ? "#4ade80" : "var(--color-line)",
                            boxShadow: enLinea.length > 0 ? "0 0 0 4px rgba(74, 222, 128, 0.15)" : "none",
                            transition: "background 0.3s ease",
                          }}
                        />
                        <h3
                          style={{
                            fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
                            fontWeight: 400,
                            fontSize: "18px",
                            color: "var(--color-text)",
                          }}
                        >
                          En línea ahora
                        </h3>
                        {enLinea.length > 0 && (
                          <span
                            style={{
                              fontFamily: "var(--font-ibm-plex-mono)",
                              fontSize: "10px",
                              letterSpacing: "0.12em",
                              textTransform: "uppercase",
                              color: "#4ade80",
                            }}
                          >
                            {enLinea.length} {enLinea.length === 1 ? "persona" : "personas"}
                          </span>
                        )}
                      </div>
                      <span
                        style={{
                          fontFamily: "var(--font-ibm-plex-mono)",
                          fontSize: "9px",
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          color: "var(--color-text-faint)",
                        }}
                      >
                        Actualiza cada 12 segundos
                      </span>
                    </div>

                    {enLineaCargando ? (
                      <p style={{ color: "var(--color-text-muted)", fontSize: "13px", padding: "10px 0" }}>
                        Buscando quién está en línea…
                      </p>
                    ) : enLinea.length === 0 ? (
                      <p style={{ color: "var(--color-text-muted)", fontSize: "13px", padding: "10px 0" }}>
                        Nadie en línea ahora mismo. Aparecen aquí los alumnos con nombre que estuvieron activos en los últimos 90 segundos. Tu sesión de administrador no cuenta.
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {enLinea.map((u) => {
                          const segs = Math.max(0, Math.round((Date.now() - new Date(u.ultimo).getTime()) / 1000));
                          const hace = segs <= 5 ? "ahora" : segs < 60 ? `hace ${segs}s` : `hace ${Math.floor(segs / 60)}m`;
                          return (
                            <div
                              key={u.nombre}
                              className="flex items-center gap-4"
                              style={{
                                padding: "9px 0",
                                borderBottom: "1px solid var(--color-line-soft)",
                              }}
                            >
                              <div
                                className="flex items-center justify-center flex-shrink-0"
                                style={{
                                  width: "32px",
                                  height: "32px",
                                  borderRadius: "50%",
                                  border: "1px solid var(--color-gold-dim)",
                                  color: "var(--color-gold)",
                                  fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
                                  fontSize: "14px",
                                  fontWeight: 500,
                                }}
                              >
                                {u.nombre.trim().charAt(0).toUpperCase()}
                              </div>
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
                                  {u.nombre}
                                </p>
                                <p
                                  style={{
                                    fontFamily: "var(--font-ibm-plex-mono)",
                                    fontSize: "10px",
                                    color: "var(--color-text-faint)",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {u.materia_nombre || (u.pagina ? "En el inicio" : "Navegando")}
                                </p>
                              </div>
                              <span
                                style={{
                                  fontFamily: "var(--font-ibm-plex-mono)",
                                  fontSize: "10px",
                                  color: "var(--color-gold)",
                                  flexShrink: 0,
                                }}
                              >
                                ● {hace}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </article>

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
                        const materiasVisibles = item?.materias.slice(0, 3) || [];
                        const materiasRestantes = (item?.materias.length || 0) - materiasVisibles.length;
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
                            {materiasVisibles.length > 0 && (
                              <div
                                style={{
                                  marginTop: "14px",
                                  paddingTop: "12px",
                                  borderTop: "1px solid var(--color-line-soft)",
                                }}
                              >
                                {materiasVisibles.map((m) => (
                                  <div
                                    key={m.slug || m.materia}
                                    className="flex items-center justify-between gap-2"
                                    style={{ padding: "3px 0" }}
                                  >
                                    <span
                                      style={{
                                        fontSize: "12px",
                                        color: "var(--color-text-muted)",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                        minWidth: "0",
                                      }}
                                    >
                                      {m.materia}
                                    </span>
                                    <span
                                      style={{
                                        fontFamily: "var(--font-ibm-plex-mono)",
                                        fontSize: "11px",
                                        fontWeight: 500,
                                        color: "var(--color-text)",
                                        flexShrink: 0,
                                      }}
                                    >
                                      {m.accesos}
                                    </span>
                                  </div>
                                ))}
                                {materiasRestantes > 0 && (
                                  <div
                                    style={{
                                      padding: "3px 0",
                                      fontFamily: "var(--font-ibm-plex-mono)",
                                      fontSize: "10px",
                                      color: "var(--color-text-faint)",
                                    }}
                                  >
                                    +{materiasRestantes} materias más
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </article>

                  {/* Actividad por materia */}
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
                          marginBottom: "4px",
                        }}
                      >
                        Actividad por materia
                      </h3>
                      <p
                        style={{
                          fontSize: "12px",
                          color: "var(--color-text-muted)",
                          marginBottom: "20px",
                          lineHeight: 1.6,
                        }}
                      >
                        Personas, contenido y uso total por materia.
                      </p>

                      {/* Desktop */}
                      <div className="hidden sm:block" style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                          <thead>
                            <tr
                              style={{
                                borderBottom: "1px solid var(--color-line)",
                                fontFamily: "var(--font-ibm-plex-mono)",
                                fontSize: "9px",
                                letterSpacing: "0.12em",
                                textTransform: "uppercase",
                                color: "var(--color-text-faint)",
                              }}
                            >
                              <th style={{ textAlign: "left", padding: "8px 0", fontWeight: 500 }}>#</th>
                              <th style={{ textAlign: "left", padding: "8px 0", fontWeight: 500 }}>Materia</th>
                              <th style={{ textAlign: "right", padding: "8px 0", fontWeight: 500 }}>Personas</th>
                              <th style={{ textAlign: "right", padding: "8px 0", fontWeight: 500 }}>Audio</th>
                              <th style={{ textAlign: "right", padding: "8px 0", fontWeight: 500 }}>Virtual</th>
                              <th style={{ textAlign: "right", padding: "8px 0", fontWeight: 500 }}>Textos</th>
                              <th style={{ textAlign: "right", padding: "8px 0", fontWeight: 500 }}>Archivos</th>
                              <th style={{ textAlign: "right", padding: "8px 0", fontWeight: 500 }}>Enlaces</th>
                              <th style={{ textAlign: "right", padding: "8px 0", fontWeight: 500 }}>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {materiasStats.map((mat, i) => {
                              return (
                                <tr
                                  key={mat.id}
                                  style={{
                                    borderBottom: i < materiasStats.length - 1 ? "1px solid var(--color-line-soft)" : "none",
                                  }}
                                >
                                  <td
                                    style={{
                                      padding: "12px 0",
                                      fontFamily: "var(--font-ibm-plex-mono)",
                                      fontSize: "13px",
                                      fontWeight: 700,
                                      color: rankColor(i),
                                      width: "28px",
                                    }}
                                  >
                                    {String(i + 1).padStart(2, "0")}
                                  </td>
                                  <td style={{ padding: "12px 12px 12px 0" }}>
                                    <p
                                      style={{
                                        fontSize: "14px",
                                        fontWeight: 500,
                                        color: i === 0 ? "var(--color-gold)" : "var(--color-text)",
                                        margin: 0,
                                      }}
                                    >
                                      {mat.nombre}
                                    </p>
                                  </td>
                                  <td
                                    style={{
                                      padding: "12px 0",
                                      textAlign: "right",
                                      fontFamily: "var(--font-ibm-plex-mono)",
                                      fontSize: "12px",
                                      fontWeight: 500,
                                      color: mat.estudiantes > 0 ? "var(--color-gold)" : "var(--color-text-faint)",
                                    }}
                                  >
                                    {mat.estudiantes}
                                  </td>
                                  <td
                                    style={{
                                      padding: "12px 0",
                                      textAlign: "right",
                                      fontFamily: "var(--font-ibm-plex-mono)",
                                      fontSize: "12px",
                                      color: (mat.porTipo.audio_clase || 0) > 0 ? "var(--color-text)" : "var(--color-text-faint)",
                                    }}
                                  >
                                    {mat.porTipo.audio_clase || 0}
                                  </td>
                                  <td
                                    style={{
                                      padding: "12px 0",
                                      textAlign: "right",
                                      fontFamily: "var(--font-ibm-plex-mono)",
                                      fontSize: "12px",
                                      color: (mat.porTipo.clase_youtube || 0) > 0 ? "var(--color-text)" : "var(--color-text-faint)",
                                    }}
                                  >
                                    {mat.porTipo.clase_youtube || 0}
                                  </td>
                                  <td
                                    style={{
                                      padding: "12px 0",
                                      textAlign: "right",
                                      fontFamily: "var(--font-ibm-plex-mono)",
                                      fontSize: "12px",
                                      color: (mat.porTipo.transcripcion || 0) > 0 ? "var(--color-text)" : "var(--color-text-faint)",
                                    }}
                                  >
                                    {mat.porTipo.transcripcion || 0}
                                  </td>
                                  <td
                                    style={{
                                      padding: "12px 0",
                                      textAlign: "right",
                                      fontFamily: "var(--font-ibm-plex-mono)",
                                      fontSize: "12px",
                                      color: (mat.porTipo.archivo || 0) > 0 ? "var(--color-text)" : "var(--color-text-faint)",
                                    }}
                                  >
                                    {mat.porTipo.archivo || 0}
                                  </td>
                                  <td
                                    style={{
                                      padding: "12px 0",
                                      textAlign: "right",
                                      fontFamily: "var(--font-ibm-plex-mono)",
                                      fontSize: "12px",
                                      color: (mat.porTipo.enlace || 0) > 0 ? "var(--color-text)" : "var(--color-text-faint)",
                                    }}
                                  >
                                    {mat.porTipo.enlace || 0}
                                  </td>
                                  <td
                                    style={{
                                      padding: "12px 0",
                                      textAlign: "right",
                                      fontFamily: "var(--font-ibm-plex-mono)",
                                      fontSize: "12px",
                                      fontWeight: 500,
                                      color: mat.consumo > 0 ? "var(--color-gold)" : "var(--color-text-faint)",
                                    }}
                                  >
                                    {mat.consumo}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Móvil: cards apiladas */}
                      <div className="sm:hidden">
                        {materiasStats.map((mat, i) => {
                          return (
                            <div
                              key={mat.id}
                              style={{
                                padding: "14px 0",
                                borderBottom: i < materiasStats.length - 1 ? "1px solid var(--color-line-soft)" : "none",
                              }}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                  <span
                                    style={{
                                      fontFamily: "var(--font-ibm-plex-mono)",
                                      fontSize: "12px",
                                      fontWeight: 700,
                                      color: rankColor(i),
                                      flexShrink: 0,
                                    }}
                                  >
                                    {String(i + 1).padStart(2, "0")}
                                  </span>
                                  <p
                                    style={{
                                      flex: 1,
                                      minWidth: 0,
                                      fontSize: "13px",
                                      fontWeight: 500,
                                      color: i === 0 ? "var(--color-gold)" : "var(--color-text)",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {mat.nombre}
                                  </p>
                                </div>
                                <span
                                  style={{
                                    fontFamily: "var(--font-ibm-plex-mono)",
                                    fontSize: "12px",
                                    fontWeight: 500,
                                    color: "var(--color-gold)",
                                    flexShrink: 0,
                                  }}
                                >
                                  {mat.estudiantes} personas
                                </span>
                              </div>
                              <div
                                className="flex flex-wrap gap-x-4 gap-y-1"
                                style={{ marginTop: "6px", paddingLeft: "36px" }}
                              >
                                {(mat.porTipo.audio_clase || 0) > 0 && (
                                  <span style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "10px", color: "var(--color-text-muted)" }}>
                                    {mat.porTipo.audio_clase} audio
                                  </span>
                                )}
                                {(mat.porTipo.clase_youtube || 0) > 0 && (
                                  <span style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "10px", color: "var(--color-text-muted)" }}>
                                    {mat.porTipo.clase_youtube} virtual
                                  </span>
                                )}
                                {(mat.porTipo.transcripcion || 0) > 0 && (
                                  <span style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "10px", color: "var(--color-text-muted)" }}>
                                    {mat.porTipo.transcripcion} transcrip.
                                  </span>
                                )}
                                {(mat.porTipo.archivo || 0) > 0 && (
                                  <span style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "10px", color: "var(--color-text-muted)" }}>
                                    {mat.porTipo.archivo} archivos
                                  </span>
                                )}
                                {(mat.porTipo.enlace || 0) > 0 && (
                                  <span style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "10px", color: "var(--color-text-muted)" }}>
                                    {mat.porTipo.enlace} enlaces
                                  </span>
                                )}
                                {mat.consumo > 0 && (
                                  <span style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "10px", color: "var(--color-gold)", fontWeight: 500 }}>
                                    {mat.consumo} total
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </article>
                  )}


                  {/* Estudiantes registrados */}
                  {estudiantes.length > 0 && (() => {
                    const estudiantesFiltrados = estudiantes.filter((est) =>
                      est.nombre.toLowerCase().includes(busquedaEstudiante.trim().toLowerCase())
                    );
                    return (
                    <article
                      style={{
                        background: "var(--color-card)",
                        border: "1px solid var(--color-line-soft)",
                        padding: "28px 30px",
                        borderRadius: 0,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setEstudiantesAbiertos((v) => {
                            if (v) setBusquedaEstudiante("");
                            return !v;
                          });
                        }}
                        aria-expanded={estudiantesAbiertos}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          width: "100%",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 0,
                          textAlign: "left",
                          marginBottom: "20px",
                        }}
                      >
                        <h3
                          style={{
                            fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
                            fontWeight: 400,
                            fontSize: "20px",
                            color: "var(--color-text)",
                            margin: 0,
                          }}
                        >
                          Estudiantes que ingresaron
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
                            {totalRegistradosAllTime} total · {estudiantes.length} en período
                          </span>
                        </h3>
                        <span
                          style={{
                            fontFamily: "var(--font-ibm-plex-mono)",
                            fontSize: "11px",
                            letterSpacing: "0.12em",
                            textTransform: "uppercase",
                            color: "var(--color-gold)",
                            transition: "transform 0.2s ease",
                            transform: estudiantesAbiertos ? "rotate(180deg)" : "none",
                          }}
                        >
                          ▼
                        </span>
                      </button>
                      {estudiantesAbiertos && (
                      <>
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
                      <div
                        className="flex items-center gap-2 sm:gap-4"
                        style={{
                          padding: "8px 0",
                          borderBottom: "1px solid var(--color-line)",
                          fontFamily: "var(--font-ibm-plex-mono)",
                          fontSize: "9px",
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          color: "var(--color-text-faint)",
                        }}
                      >
                        <span style={{ width: "28px", flexShrink: 0 }}>#</span>
                        <span style={{ width: "32px", flexShrink: 0 }} />
                        <span className="flex-1 min-w-0">Nombre</span>
                        <span style={{ width: "40px", textAlign: "right", flexShrink: 0 }}>Total</span>
                        <span style={{ width: "14px", flexShrink: 0 }} />
                      </div>
                      <div className="space-y-1">
                        {estudiantesFiltrados.length === 0 ? (
                          <p style={{ color: "var(--color-text-muted)", fontSize: "13px", padding: "16px 0" }}>
                            No se encontró ningún estudiante con ese nombre.
                          </p>
                        ) : (
                        estudiantesFiltrados
                          .map((est, i) => {
                            const seleccionado = estudianteSeleccionado === est.nombre;
                            return (
                              <React.Fragment key={est.nombre}>
                              <div
                                onClick={() => verEstudiante(est.nombre)}
                                className="flex items-center gap-2 sm:gap-4 cursor-pointer"
                                style={{
                                  padding: "10px 0",
                                  borderBottom: seleccionado
                                    ? "1px solid var(--color-gold-dim)"
                                    : i < estudiantesFiltrados.length - 1 ? "1px solid var(--color-line-soft)" : "none",
                                  transition: "background 0.2s ease",
                                  cursor: "pointer",
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-card-hover)")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                              >
                                <span
                                  style={{
                                    fontFamily: "var(--font-ibm-plex-mono)",
                                    fontSize: "13px",
                                    fontWeight: 700,
                                    color: rankColor(i),
                                    width: "28px",
                                    flexShrink: 0,
                                  }}
                                >
                                  {String(i + 1).padStart(2, "0")}
                                </span>
                                <div
                                  className="flex items-center justify-center flex-shrink-0"
                                  style={{
                                    width: "32px",
                                    height: "32px",
                                    borderRadius: "50%",
                                    border: "1px solid var(--color-gold-dim)",
                                    color: "var(--color-gold)",
                                    fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
                                    fontSize: "14px",
                                    fontWeight: 500,
                                  }}
                                >
                                  {est.nombre.trim().charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p
                                    style={{
                                      fontSize: "14px",
                                      fontWeight: 500,
                                      color: i === 0 ? "var(--color-gold)" : "var(--color-text)",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                      textDecoration: seleccionado ? "underline" : "none",
                                      textDecorationColor: "var(--color-gold-dim)",
                                      textUnderlineOffset: "3px",
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
                                    {est.ultima_actividad ? new Date(est.ultima_actividad).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }) : "—"}
                                  </p>
                                </div>
                                <div
                                  className="hidden sm:flex items-center gap-3 flex-shrink-0"
                                  style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "11px" }}
                                >
                                   <span
                                     style={{
                                       color: "var(--color-gold)",
                                       fontWeight: 500,
                                       minWidth: "40px",
                                      textAlign: "right",
                                      flexShrink: 0,
                                    }}
                                  >
                                    {est.total}
                                  </span>
                                </div>
                                <ChevronDown
                                  style={{
                                    width: "14px",
                                    height: "14px",
                                    color: seleccionado ? "var(--color-gold)" : "var(--color-text-faint)",
                                    transform: seleccionado ? "rotate(180deg)" : "none",
                                    transition: "transform 0.2s ease",
                                    flexShrink: 0,
                                  }}
                                />
                                </div>

                                {seleccionado && (
                                  <div
                                    style={{
                                      background: "var(--color-ink)",
                                      border: "1px solid var(--color-gold-dim)",
                                      padding: "20px 24px",
                                      marginBottom: "12px",
                                      borderRadius: 0,
                                    }}
                                  >
                                    {detalleCargando ? (
                                      <div className="flex items-center gap-3" style={{ color: "var(--color-text-faint)", fontFamily: "var(--font-ibm-plex-mono)", fontSize: "12px" }}>
                                        <Loader2 style={{ width: "14px", height: "14px", color: "var(--color-gold)" }} />
                                        Cargando actividad de {est.nombre}…
                                      </div>
                                    ) : detalleError ? (
                                      <p style={{ color: "var(--color-danger, #c65a4f)", fontSize: "13px" }}>
                                        No se pudo cargar la actividad de este alumno.
                                      </p>
                                    ) : detalleEstudiante ? (
                                      <div>
                                        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                                          <p style={{ fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif", fontSize: "16px", color: "var(--color-text)" }}>
                                            Actividad de {detalleEstudiante.nombre}
                                          </p>
                                          <div className="flex flex-wrap items-center gap-4" style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "11px", color: "var(--color-text-muted)" }}>
                                            <span>{detalleEstudiante.total} <span style={{ color: "var(--color-text-faint)" }}>eventos</span></span>
                                            <span>{detalleEstudiante.reproducciones} <span style={{ color: "var(--color-text-faint)" }}>repros</span></span>
                                            <span>{detalleEstudiante.completados} <span style={{ color: "var(--color-text-faint)" }}>completados</span></span>
                                            <span>{detalleEstudiante.materiasUnicas} <span style={{ color: "var(--color-text-faint)" }}>materias</span></span>
                                          </div>
                                        </div>

                                        {(!detalleEstudiante.materias || detalleEstudiante.materias.length === 0) ? (
                                          <p style={{ color: "var(--color-text-muted)", fontSize: "13px" }}>
                                            Sin actividad registrada.
                                          </p>
                                        ) : (
                                          <div className="space-y-5" style={{ maxHeight: "420px", overflowY: "auto", paddingRight: "4px" }}>
                                            {detalleEstudiante.materias.map((mat, mi) => {
                                              const totalMat = mat.elementos.reduce((s, e) => s + e.total, 0);
                                              return (
                                                <div key={mat.materia_slug}>
                                                  <div className="flex items-center justify-between gap-3 mb-2">
                                                    <p
                                                      style={{
                                                        fontFamily: "var(--font-ibm-plex-mono)",
                                                        fontSize: "10px",
                                                        letterSpacing: "0.12em",
                                                        textTransform: "uppercase",
                                                        color: "var(--color-gold)",
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                        whiteSpace: "nowrap",
                                                      }}
                                                    >
                                                      {mat.materia_nombre}
                                                    </p>
                                                    <span
                                                      style={{
                                                        fontFamily: "var(--font-ibm-plex-mono)",
                                                        fontSize: "10px",
                                                        color: "var(--color-text-faint)",
                                                        flexShrink: 0,
                                                      }}
                                                    >
                                                      {mat.visitas > 0 ? `${mat.visitas} visitas · ` : ""}
                                                      {totalMat} accesos
                                                    </span>
                                                  </div>

                                                  <div className="space-y-1">
                                                    {mat.elementos.map((ele, ei) => (
                                                      <div
                                                        key={ele.archivo_id}
                                                        style={{
                                                          padding: "8px 0",
                                                          borderBottom: ei < mat.elementos.length - 1 ? "1px solid var(--color-line-soft)" : "none",
                                                        }}
                                                      >
                                                        <div className="flex items-center gap-3">
                                                          <div
                                                            style={{
                                                              padding: "2px 8px",
                                                              border: "1px solid var(--color-gold-dim)",
                                                              fontFamily: "var(--font-ibm-plex-mono)",
                                                              fontSize: "9px",
                                                              letterSpacing: "0.08em",
                                                              textTransform: "uppercase",
                                                              color: "var(--color-gold)",
                                                              flexShrink: 0,
                                                            }}
                                                          >
                                                            {POR_TIPO_LABELS[ele.tipo] || ele.tipo.replace("_", " ")}
                                                          </div>
                                                          <div className="flex-1 min-w-0">
                                                            <p
                                                              style={{
                                                                fontSize: "12px",
                                                                color: "var(--color-text)",
                                                                overflow: "hidden",
                                                                textOverflow: "ellipsis",
                                                                whiteSpace: "nowrap",
                                                              }}
                                                            >
                                                              {ele.clase_titulo || ele.nombre}
                                                            </p>
                                                            {ele.clase_numero != null && (
                                                              <p style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: "9px", color: "var(--color-text-faint)" }}>
                                                                Clase {String(ele.clase_numero).padStart(2, "0")}
                                                              </p>
                                                            )}
                                                          </div>
                                                          <span
                                                            style={{
                                                              fontFamily: "var(--font-ibm-plex-mono)",
                                                              fontSize: "12px",
                                                              fontWeight: 500,
                                                              color: "var(--color-text)",
                                                              flexShrink: 0,
                                                            }}
                                                          >
                                                            {ele.total} <span style={{ color: "var(--color-text-faint)", fontWeight: 400 }}>veces</span>
                                                          </span>
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5" style={{ paddingLeft: "0px" }}>
                                                          {ele.porDia.map((d) => (
                                                            <span
                                                              key={d.fecha}
                                                              style={{
                                                                padding: "2px 8px",
                                                                background: "var(--color-card-hover)",
                                                                border: "1px solid var(--color-line)",
                                                                fontFamily: "var(--font-ibm-plex-mono)",
                                                                fontSize: "9px",
                                                                color: "var(--color-text-muted)",
                                                                whiteSpace: "nowrap",
                                                              }}
                                                            >
                                                              {d.fecha} · {d.veces}×
                                                            </span>
                                                          ))}
                                                        </div>
                                                      </div>
                                                    ))}
                                                  </div>

                                                  {mi < detalleEstudiante.materias.length - 1 && (
                                                    <div
                                                      style={{
                                                        height: "1px",
                                                        background: "var(--color-gold-dim)",
                                                        marginTop: "12px",
                                                        opacity: 0.35,
                                                      }}
                                                    />
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    ) : null}
                                  </div>
                                )}
                              </React.Fragment>
                            );
                          })
                        )}
                      </div>
                      </>
                      )}
                    </article>
                    );
                  })()}

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
    </div>
  );
}
