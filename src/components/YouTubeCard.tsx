"use client";

import React from "react";
import { Play, ExternalLink } from "@/components/icons";
import { getYouTubeThumbnail } from "@/lib/utils";

interface YouTubeCardProps {
  url: string;
  nombre: string;
}

export default function YouTubeCard({ url, nombre }: YouTubeCardProps) {
  const thumbnail = getYouTubeThumbnail(url);

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="group block">
      <div className="relative overflow-hidden rounded-xl border border-white/[0.12] bg-black/40">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={nombre}
            className="w-full aspect-video object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300"
          />
        ) : (
          <div className="w-full aspect-video bg-white/[0.05] flex items-center justify-center">
            <Play className="w-16 h-16 text-white/30" />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-red-600/90 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
            <Play className="w-8 h-8 text-white ml-1" fill="white" />
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <ExternalLink className="w-4 h-4 text-violet-400" />
        <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
          {nombre}
        </span>
      </div>
    </a>
  );
}
