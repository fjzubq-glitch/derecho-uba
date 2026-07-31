import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Derecho UBA — Gestión Académica",
    short_name: "Derecho UBA",
    description:
      "Plataforma de gestión de clases, audios y transcripciones para materias de la carrera de Abogacía en UBA.",
    start_url: "/",
    display: "standalone",
    background_color: "#0A0D16",
    theme_color: "#0A0D16",
    icons: [
      { src: "/icon", sizes: "192x192", type: "image/png" },
      { src: "/icon", sizes: "512x512", type: "image/png" },
    ],
  };
}
