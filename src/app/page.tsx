"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import GlassCard from "@/components/ui/GlassCard";
import { Scale, User, Mail, ArrowRight, Loader2, Lock } from "@/components/icons";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"guest" | "admin">("guest");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGuestLogin = (e: React.FormEvent) => {
    e.preventDefault();
    router.push("/dashboard");
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    setTimeout(() => {
      if (password === "Soyapango503") {
        setLoading(false);
        router.push("/admin");
      } else {
        setError("Contraseña incorrecta");
        setLoading(false);
      }
    }, 300);
  };

  const handleFirstTime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) {
      setError("Completá nombre y email");
      return;
    }
    setLoading(true);
    setError("");

    setTimeout(() => {
      setLoading(false);
      router.push("/dashboard");
    }, 500);
  };

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

        {mode === "guest" ? (
          <>
            <form onSubmit={handleGuestLogin}>
              <div className="flex flex-col gap-4">
                <div className="text-center py-4 bg-white/[0.02] rounded-xl border border-white/[0.08]">
                  <User className="w-10 h-10 text-violet-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-300">Estás ingresando como invitado</p>
                  <p className="text-xs text-gray-500 mt-1">Acceso de estudio</p>
                </div>

                <Button
                  type="submit"
                  className="w-full py-3"
                >
                  <ArrowRight className="w-5 h-5 mr-2" />
                  Entrar a la plataforma
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/[0.1]"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-[#1a1a2e] text-gray-500 text-xs uppercase tracking-wider">O bien</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMode("admin")}
                  className="flex items-center justify-center gap-3 w-full py-3 rounded-xl bg-violet-600/10 hover:bg-violet-600/20 text-violet-400 border border-violet-500/20 transition-all"
                >
                  <Lock className="w-5 h-5" />
                  <span className="font-medium">Acceder como administrador</span>
                </button>
              </div>
            </form>
          </>
        ) : mode === "admin" ? (
          <form onSubmit={handleAdminLogin}>
            <label className="block text-sm text-gray-400 mb-2 font-medium">
              Contraseña de admin
            </label>
            <div className="relative mb-4">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/[0.03] border border-white/[0.1] rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all"
                autoFocus
              />
            </div>

            {error && (
              <p className="text-sm text-red-400 mb-4">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full py-3"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Lock className="w-5 h-5 mr-2" />
              )}
              Acceder al Panel
            </Button>

            <button
              type="button"
              onClick={() => setMode("guest")}
              className="w-full mt-4 text-sm text-gray-500 hover:text-gray-300"
            >
              ← Volver al acceso invitado
            </button>
          </form>
        ) : null}
      </GlassCard>
    </div>
  );
}