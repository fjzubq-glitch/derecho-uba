"use client";

import React from "react";
import { Scale, Briefcase } from "@/components/icons";
import GlassCard from "@/components/ui/GlassCard";

interface MateriaCardProps {
  nombre: string;
  slug: string;
  onClick: () => void;
}

const ICONS: Record<string, React.ReactNode> = {
  "contratos-i": <Scale className="w-8 h-8" />,
  "contratos-ii": <Scale className="w-8 h-8" />,
  "derecho-comercial": <Briefcase className="w-8 h-8" />,
};

const COLORS: Record<string, string> = {
  "contratos-i": "from-violet-500/20 to-purple-500/20",
  "contratos-ii": "from-blue-500/20 to-cyan-500/20",
  "derecho-comercial": "from-amber-500/20 to-orange-500/20",
};

export default function MateriaCard({
  nombre,
  slug,
  onClick,
}: MateriaCardProps) {
  return (
    <GlassCard hover onClick={onClick} className="p-6">
      <div
        className={`w-14 h-14 rounded-xl bg-gradient-to-br ${COLORS[slug] || COLORS["contratos-i"]} flex items-center justify-center text-violet-400 mb-4`}
      >
        {ICONS[slug] || <Scale className="w-8 h-8" />}
      </div>

      <h3 className="text-lg font-semibold text-white mb-1">{nombre}</h3>
    </GlassCard>
  );
}
