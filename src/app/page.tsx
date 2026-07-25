"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import GlassCard from "@/components/ui/GlassCard";
import { Scale, User, ArrowRight } from "@/components/icons";

export default function LoginPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/30 via-purple-900/20 to-slate-900/40"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl"></div>
      </div>

      <GlassCard className="w-full max-w-md p-8 z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-500/30">
            <Scale className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-300">Derecho</span> UBA
          </h1>
          <p className="text-gray-400 text-sm mt-2">Plataforma de estudio</p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="text-center py-4 bg-white/[0.02] rounded-xl border border-white/[0.08]">
            <User className="w-10 h-10 text-violet-400 mx-auto mb-2" />
            <p className="text-sm text-gray-300">Estás ingresando como invitado</p>
            <p className="text-xs text-gray-500 mt-1">Acceso de estudio</p>
          </div>

          <Button
            onClick={() => router.push("/dashboard")}
            className="w-full py-3"
          >
            <ArrowRight className="w-5 h-5 mr-2" />
            Entrar a la plataforma
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}
