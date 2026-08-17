import type { Metadata } from "next";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ materia: string }>;
}): Promise<Metadata> {
  const { materia: slug } = await params;

  try {
    const supabase = getSupabaseAdmin();
    const { data: materia } = await supabase
      .from("materias")
      .select("nombre")
      .eq("slug", slug)
      .single();

    if (!materia) return { title: "Materia — Derecho UBA" };

    return {
      title: `${materia.nombre} — Derecho UBA`,
      description: `Clases, transcripciones, Lexpodcast y materiales de ${materia.nombre}. Contenido de cursada para estudiantes de Derecho UBA.`,
    };
  } catch {
    return { title: "Materia — Derecho UBA" };
  }
}

export default function MateriaLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
