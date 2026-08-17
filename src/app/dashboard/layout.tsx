import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Materias — Derecho UBA",
  description:
    "Explorá las materias de Derecho UBA: clases, transcripciones, Lexpodcast y materiales de cursada organizados por materia.",
};

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
