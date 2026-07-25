"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AdminUpload from "@/components/AdminUpload";
import AdminManage from "@/components/AdminManage";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import { ArrowLeft, BarChart3, Headphones, FileText, Users, Lock, Loader2, Calendar, TrendingUp, Eye } from "@/components/icons";

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
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

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
      loadData();
      loadAnalytics();
    }
  }, [authenticated]);

  async function loadData() {
    const { data: materiasData } = await supabase
      .from("materias")
      .select("*")
      .order("nombre");

    setMaterias(materiasData || []);

    const { count: clasesCount } = await supabase
      .from("clases")
      .select("*", { count: "exact", head: true });

    const { count: archivosCount } = await supabase
      .from("archivos")
      .select("*", { count: "exact", head: true });

    const { count: repCount } = await supabase
      .from("reproducciones")
      .select("*", { count: "exact", head: true });

    setStats({
      totalClases: clasesCount || 0,
      totalArchivos: archivosCount || 0,
      totalReproducciones: repCount || 0,
    });

    setLoading(false);
  }

  async function loadAnalytics() {
    setAnalyticsLoading(true);

    // Visitas únicas totales
    const { data: allActivity } = await supabase
      .from("actividad")
      .select("ip_hash")
      .eq("tipo", "page_view");

    const uniqueIps = new Set(allActivity?.map((a) => a.ip_hash) || []);
    setVisitantesUnicos(uniqueIps.size);
    setTotalVisitas(allActivity?.length || 0);

    // Actividad reciente
    const { data: recentActivity } = await supabase
      .from("actividad")
      .select(`
        tipo,
        pagina,
        materia_slug,
        created_at,
        ip_hash,
        archivos!inner(nombre_display),
        clases!inner(numero, titulo, materias!inner(nombre))
      `)
      .order("created_at", { ascending: false })
      .limit(20);

    if (recentActivity) {
      const mapped: ActividadReciente[] = recentActivity.map((a: any) => ({
        tipo: a.tipo,
        pagina: a.pagina,
        materia_slug: a.materia_slug,
        archivo_nombre: a.archivos?.nombre_display || null,
        materia: a.clases?.materias?.nombre || null,
        clase_numero: a.clases?.numero || null,
        created_at: a.created_at,
        ip_hash: a.ip_hash,
      }));
      setActividadReciente(mapped);
    }

    // Contenido más popular
    const { data: popularData } = await supabase
      .from("archivos")
      .select(`
        id,
        nombre_display,
        tipo,
        play_count,
        clases!inner(numero, titulo, materias!inner(nombre))
      `)
      .gt("play_count", 0)
      .order("play_count", { ascending: false })
      .limit(10);

    if (popularData) {
      const mapped: ContenidoPopular[] = popularData.map((p: any) => ({
        archivo_id: p.id,
        nombre_display: p.nombre_display,
        tipo: p.tipo,
        materia: p.clases?.materias?.nombre || "",
        clase_numero: p.clases?.numero || 0,
        clase_titulo: p.clases?.titulo || "",
        total_reproducciones: p.play_count,
        usuarios_unicos: 0,
      }));
      setContenidoPopular(mapped);
    }

    // Visitas por día (últimos 7 días)
    const { data: dailyData } = await supabase
      .from("actividad")
      .select("created_at, ip_hash")
      .eq("tipo", "page_view")
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (dailyData) {
      const dayMap: Record<string, Set<string>> = {};
      dailyData.forEach((d) => {
        const day = new Date(d.created_at).toLocaleDateString("es-AR");
        if (!dayMap[day]) dayMap[day] = new Set();
        dayMap[day].add(d.ip_hash);
      });
      const days: VisitaDia[] = Object.entries(dayMap)
        .map(([fecha, ips]) => ({
          fecha,
          visitantes_unicos: ips.size,
          total_visitas: dailyData.filter((d) => new Date(d.created_at).toLocaleDateString("es-AR") === fecha).length,
        }))
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      setVisitasPorDia(days);
    }

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
  ) {
    setUploading(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("materiaId", materiaId);
      formData.append("claseNumero", claseNumero.toString());
      formData.append("claseTitulo", claseTitulo);
      formData.append("claseFecha", claseFecha);

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
          processedItems.push({
            tipo: item.tipo,
            nombre: item.nombre,
            storageKey: `uploads/${Date.now()}-${item.archivo.name}`,
            fileSize: item.archivo.size,
          });
          formData.append(`file_${item.tipo}`, item.archivo);
        } else if (item.driveLink) {
          processedItems.push({
            tipo: item.tipo,
            nombre: item.nombre,
            youtubeUrl: item.driveLink,
          });
        }
      }

      formData.append("items", JSON.stringify(processedItems));

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.ok) {
        setMessage("Clase subida correctamente");
        loadData();
      } else {
        setMessage("Error: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      setMessage("Error al subir: " + String(err));
    } finally {
      setUploading(false);
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

  const TIPO_COLORS: Record<string, string> = {
    page_view: "text-blue-400 bg-blue-500/20",
    play_start: "text-violet-400 bg-violet-500/20",
    play_pause: "text-amber-400 bg-amber-500/20",
    play_complete: "text-green-400 bg-green-500/20",
    youtube_open: "text-red-400 bg-red-500/20",
    transcription_view: "text-cyan-400 bg-cyan-500/20",
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/30 via-purple-900/20 to-slate-900/40"></div>
        </div>

        <GlassCard className="w-full max-w-md p-8 z-10">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600/20 to-indigo-600/20 border border-white/[0.12] flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-violet-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">Panel de Admin</h2>
            <p className="text-sm text-gray-400">Ingresá la contraseña para continuar</p>
          </div>

          <form onSubmit={handlePasswordSubmit}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-white/[0.03] border border-white/[0.1] rounded-xl px-4 py-3 text-white text-center text-lg tracking-widest placeholder-gray-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all mb-4"
              autoFocus
            />

            {passwordError && (
              <p className="text-sm text-red-400 mb-4 text-center">
                {passwordError}
              </p>
            )}

            <Button
              type="submit"
              disabled={passwordLoading || !password}
              className="w-full py-3"
            >
              {passwordLoading ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Lock className="w-5 h-5 mr-2" />
              )}
              Acceder
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => router.push("/dashboard")}
              className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              ← Volver al dashboard
            </button>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/[0.06] bg-[rgba(10,10,20,0.6)] backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">Panel de Administración</h1>
              <p className="text-xs text-gray-400">Gestionar contenido y analytics</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white/[0.03] rounded-xl p-1 border border-white/[0.08]">
            <button
              onClick={() => setActiveTab("upload")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "upload"
                  ? "bg-violet-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Subir Contenido
            </button>
            <button
              onClick={() => setActiveTab("manage")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "manage"
                  ? "bg-violet-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Gestionar
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "analytics"
                  ? "bg-violet-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Analytics
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Clases", value: stats.totalClases, icon: <Headphones className="w-5 h-5" /> },
            { label: "Archivos", value: stats.totalArchivos, icon: <FileText className="w-5 h-5" /> },
            { label: "Reproducciones", value: stats.totalReproducciones, icon: <BarChart3 className="w-5 h-5" /> },
          ].map((stat) => (
            <GlassCard key={stat.label} className="p-5">
              <div className="flex items-center gap-3">
                <div className="text-violet-400">{stat.icon}</div>
                <div>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-xs text-gray-400">{stat.label}</p>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>

        {message && (
          <GlassCard
            className={`p-4 mb-6 ${
              message.startsWith("Error")
                ? "border-red-500/30"
                : "border-green-500/30"
            }`}
          >
            <p className={`text-sm ${message.startsWith("Error") ? "text-red-400" : "text-green-400"}`}>
              {message}
            </p>
          </GlassCard>
        )}

        {activeTab === "upload" && (
          <AdminUpload materias={materias} onSubmit={handleUpload} />
        )}

        {activeTab === "manage" && (
          <AdminManage />
        )}

        {activeTab === "analytics" && (
          <div className="space-y-6">
            {analyticsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <GlassCard className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-white">{visitantesUnicos}</p>
                        <p className="text-xs text-gray-400">Visitantes Únicos</p>
                      </div>
                    </div>
                  </GlassCard>

                  <GlassCard className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                        <Eye className="w-5 h-5 text-violet-400" />
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-white">{totalVisitas}</p>
                        <p className="text-xs text-gray-400">Total Visitas</p>
                      </div>
                    </div>
                  </GlassCard>
                </div>

                {visitasPorDia.length > 0 && (
                  <GlassCard className="p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-violet-400" />
                      Visitas por Día (Últimos 7 días)
                    </h3>
                    <div className="space-y-3">
                      {visitasPorDia.map((dia) => (
                        <div key={dia.fecha} className="flex items-center gap-4">
                          <span className="text-sm text-gray-400 w-32">{dia.fecha}</span>
                          <div className="flex-1 h-6 bg-white/[0.03] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-violet-600 to-indigo-600 rounded-full transition-all"
                              style={{ width: `${Math.min((dia.total_visitas / Math.max(...visitasPorDia.map((d) => d.total_visitas))) * 100, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-white w-16 text-right">{dia.total_visitas}</span>
                          <span className="text-xs text-gray-500 w-20 text-right">{dia.visitantes_unicos} únicos</span>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                )}

                {contenidoPopular.length > 0 && (
                  <GlassCard className="p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-violet-400" />
                      Contenido Más Popular
                    </h3>
                    <div className="space-y-3">
                      {contenidoPopular.map((item, i) => (
                        <div key={item.archivo_id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/[0.03] transition-colors">
                          <span className="text-lg font-bold text-gray-600 w-8">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{item.nombre_display}</p>
                            <p className="text-xs text-gray-500">
                              {item.materia} - Clase {item.clase_numero.toString().padStart(2, "0")}
                            </p>
                          </div>
                          <span className={`text-xs font-medium px-2 py-1 rounded-md ${TIPO_COLORS[item.tipo] || "text-gray-400 bg-gray-500/20"}`}>
                            {item.tipo.replace("_", " ")}
                          </span>
                          <div className="text-right">
                            <p className="text-sm font-bold text-white">{item.total_reproducciones}</p>
                            <p className="text-xs text-gray-500">reproducciones</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                )}

                {actividadReciente.length > 0 && (
                  <GlassCard className="p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-violet-400" />
                      Actividad Reciente
                    </h3>
                    <div className="space-y-2">
                      {actividadReciente.map((act, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors">
                          <span className={`text-xs font-medium px-2 py-1 rounded-md ${TIPO_COLORS[act.tipo] || "text-gray-400 bg-gray-500/20"}`}>
                            {TIPO_LABELS[act.tipo] || act.tipo}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate">
                              {act.archivo_nombre || act.pagina || act.tipo}
                            </p>
                            <p className="text-xs text-gray-500">
                              {act.materia && ` ${act.materia}`}
                              {act.clase_numero && ` - Clase ${act.clase_numero.toString().padStart(2, "0")}`}
                            </p>
                          </div>
                          <span className="text-xs text-gray-500">
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
                  </GlassCard>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
