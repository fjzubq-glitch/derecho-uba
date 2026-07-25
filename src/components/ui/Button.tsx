"use client";

import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

export default function Button({
  variant = "primary",
  size = "md",
  children,
  className = "",
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200";

  const variants = {
    primary:
      "bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/25",
    secondary:
      "bg-white/[0.08] hover:bg-white/[0.15] text-white border border-white/[0.12]",
    ghost: "bg-transparent hover:bg-white/[0.08] text-gray-300 hover:text-white",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-5 py-2.5 text-sm",
    lg: "px-7 py-3 text-base",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
