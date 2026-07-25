"use client";

import React from "react";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export default function GlassCard({
  children,
  className = "",
  hover = false,
  onClick,
}: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        relative overflow-hidden
        bg-[rgba(17,25,40,0.55)]
        backdrop-blur-xl
        border border-white/[0.12]
        rounded-2xl
        shadow-[0_8px_32px_rgba(0,0,0,0.36)]
        ${hover ? "cursor-pointer transition-all duration-300 hover:border-white/[0.25] hover:shadow-[0_8px_40px_rgba(139,92,246,0.15)] hover:scale-[1.02]" : ""}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
