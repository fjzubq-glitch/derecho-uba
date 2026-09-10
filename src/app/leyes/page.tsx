import type { Metadata } from "next";
import LeyesClient from "./LeyesClient";

export const metadata: Metadata = {
  title: "Normas y Leyes | Derecho UBA",
  description: "Buscador de legislación argentina. Buscá leyes, decretos y resoluciones de Nación y Provincia de Buenos Aires.",
  openGraph: {
    title: "Normas y Leyes | Derecho UBA",
    description: "Buscador de legislación argentina.",
  },
};

export default function LeyesPage() {
  return <LeyesClient />;
}
