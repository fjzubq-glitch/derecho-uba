import type { MetadataRoute } from "next";
import { getSupabaseAdmin } from "@/lib/supabase";

const BASE_URL = "https://derecho-uba-orpin.vercel.app";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];

  try {
    const { data: materias } = await getSupabaseAdmin()
      .from("materias")
      .select("slug");
    for (const m of materias || []) {
      entries.push({
        url: `${BASE_URL}/dashboard/${m.slug}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  } catch {
    // Si hay un error, devolver solo la home
  }

  return entries;
}