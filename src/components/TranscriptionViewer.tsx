"use client";

import React, { useState } from "react";
import { BookOpen, Search, ChevronDown, ChevronUp } from "@/components/icons";

interface TranscriptionViewerProps {
  contenido: string | null;
  storageUrl?: string;
  nombre: string;
}

export default function TranscriptionViewer({
  contenido,
  storageUrl,
  nombre,
}: TranscriptionViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const text = contenido || "";

  const highlightedText = searchTerm
    ? text.replace(
        new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"),
        '<mark class="bg-violet-500/30 text-white rounded px-0.5">$1</mark>'
      )
    : text;

  return (
    <div className="border border-white/[0.12] rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/[0.05] transition-colors"
      >
        <div className="flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-violet-400" />
          <span className="text-sm font-medium text-white">{nombre}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {isOpen && (
        <div className="border-t border-white/[0.08]">
          {text && (
            <div className="p-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar en la transcripción..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50"
                />
              </div>
              <div
                className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto pr-2"
                dangerouslySetInnerHTML={{ __html: highlightedText }}
              />
            </div>
          )}
          {!text && storageUrl && (
            <div className="p-4">
              <a
                href={storageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-400 hover:text-violet-300 text-sm underline"
              >
                Abrir transcripción en nueva pestaña
              </a>
            </div>
          )}
          {!text && !storageUrl && (
            <p className="p-4 text-sm text-gray-500">Sin contenido disponible</p>
          )}
        </div>
      )}
    </div>
  );
}
