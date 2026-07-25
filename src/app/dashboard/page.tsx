"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { trackActivity } from "@/lib/tracking";
import GlassCard from "@/components/ui/GlassCard";
import { Shield, ArrowRight } from "@/components/icons";
import { cn } from "@/lib/utils";

interface Materia {
  id: string;
  nombre: string;
  slug: string;
  total_clases: number;
  total_audios: number;
  total_reproducciones: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ clases: 0, audios: 0, reproducciones: 0 });

  useEffect(() => {
    loadMaterias();
    trackActivity({ tipo: "page_view", pagina: "dashboard" });
  }, []);

  async function loadMaterias() {
    const { data: materiasData } = await supabase
      .from("materias")
      .select("*")
      .order("nombre");

    if (materiasData) {
      const materiasConStats = await Promise.all(
        materiasData.map(async (m) => {
          const { count: totalClases } = await supabase
            .from("clases")
            .select("*", { count: "exact", head: true })
            .eq("materia_id", m.id);

          const { data: clasesIds } = await supabase
            .from("clases")
            .select("id")
            .eq("materia_id", m.id);

          const claseIds = clasesIds?.map((c) => c.id) || [];

          let totalAudios = 0;
          let totalRep = 0;

          if (claseIds.length > 0) {
            const { count } = await supabase
              .from("archivos")
              .select("*", { count: "exact", head: true })
              .in("clase_id", claseIds)
              .in("tipo", ["audio_clase", "podcast"]);
            totalAudios = count || 0;

            const { data: archivosIds } = await supabase
              .from("archivos")
              .select("id")
              .in("clase_id", claseIds);

            const archIds = archivosIds?.map((a) => a.id) || [];
            if (archIds.length > 0) {
              const { count } = await supabase
                .from("reproducciones")
                .select("*", { count: "exact", head: true })
                .in("archivo_id", archIds);
              totalRep = count || 0;
            }
          }

          return {
            ...m,
            total_clases: totalClases || 0,
            total_audios: totalAudios,
            total_reproducciones: totalRep,
          };
        })
      );
      setMaterias(materiasConStats);
      setStats({
        clases: materiasConStats.reduce((acc, m) => acc + (m.total_clases || 0), 0),
        audios: materiasConStats.reduce((acc, m) => acc + (m.total_audios || 0), 0),
        reproducciones: materiasConStats.reduce((acc, m) => acc + (m.total_reproducciones || 0), 0),
      });
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-violet-600/10 blur-[120px] animate-pulse"></div>
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] rounded-full bg-indigo-600/10 blur-[100px] animate-pulse" style={{ animationDelay: "2s" }}></div>
        <div className="absolute bottom-[20%] left-[20%] w-[35%] h-[35%] rounded-full bg-fuchsia-600/10 blur-[90px] animate-pulse" style={{ animationDelay: "4s" }}></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgNDBMNDAgMFY0MEgwWiIgZmlsbD0idHJhbnNwYXJlbnQiLz48Y2lyY2xlIGN4PSIyIiBjeT0iMiIgcj0iMSIgZmlsbD0id2hpdGUiIGZpbGwtb3BhY2l0eT0iMC4wMyIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] bg-[length:40px_40px] opacity-30"></div>
      </div>

      <header className="relative z-30 border-b border-white/[0.06] bg-[rgba(10,10,20,0.7)] backdrop-blur-md sticky top-0">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-300">Derecho</span>
                  <span className="text-white ml-1">UBA</span>
                </h1>
              </div>
              <p className="text-xs text-gray-400 mt-1 font-light">
                {new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden lg:flex items-center gap-6 px-6 py-2.5 bg-white/[0.03] rounded-full border border-white/[0.08] shadow-sm backdrop-blur-sm">
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{stats.clases}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Clases</p>
                </div>
                <div className="w-px h-8 bg-white/[0.1]"></div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{stats.audios}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Audios</p>
                </div>
                <div className="w-px h-8 bg-white/[0.1]"></div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-violet-400">{stats.reproducciones}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Reproduc.</p>
                </div>
              </div>
              <button
                onClick={() => router.push("/admin")}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-400 hover:text-white transition-colors hover:bg-white/[0.05] rounded-lg border border-transparent hover:border-white/[0.1]"
              >
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">Admin</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-8 pt-10 pb-12">
        <div className="mb-8">
          <h2 className="text-4xl font-bold text-white mb-3 tracking-tight">
            Mis <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-300">Materias</span>
          </h2>
          <p className="text-gray-400 font-light max-w-xl">Seleccioná una materia para gestionar clases, audios y transcripciones</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-72 rounded-3xl bg-white/[0.03] animate-pulse border border-white/[0.05]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {materias.map((m) => (
              <div
                key={m.id}
                onClick={() => router.push(`/dashboard/${m.slug}`)}
                className="group cursor-pointer"
              >
                <div className="relative h-full">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-500/20 to-indigo-500/20 rounded-3xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                  <GlassCard className="p-8 h-full relative z-10 hover:scale-[1.02] transition-transform duration-300">
                    <div className="flex items-start justify-between mb-6">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600/20 to-indigo-600/20 border border-white/[0.08] flex items-center justify-center shadow-inner">
                        <Shield className="w-6 h-6 text-violet-400" />
                      </div>
                      <div className="flex flex-col items-end">
                        <p className="text-3xl font-bold text-white">{m.total_clases}</p>
                        <p className="text-xs text-gray-500 uppercase tracking-wider">Clases</p>
                      </div>
                    </div>

                    <h3 className="text-xl font-semibold text-white mb-1">{m.nombre.split(",")[0]}</h3>
                    <p className="text-sm text-gray-400 mb-4">{m.nombre.split(",")[1]?.trim()}</p>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-500"></span>
                          Archivos
                        </span>
                        <span className="text-white font-medium">{m.total_audios}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
                          Reproducciones
                        </span>
                        <span className="text-white font-medium">{m.total_reproducciones}</span>
                      </div>
                    </div>

                    <div className="mt-8 flex items-center gap-2 text-violet-400 text-sm font-medium group-hover:gap-3 transition-all">
                      <span className="border-b border-violet-500/30 pb-0.5 group-hover:border-violet-500">Ver contenido</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </GlassCard>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
