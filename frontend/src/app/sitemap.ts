import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

// Apenas páginas públicas e indexáveis.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: absoluteUrl("/entrar"), changeFrequency: "monthly", priority: 1 },
    { url: absoluteUrl("/cadastrar"), changeFrequency: "monthly", priority: 0.8 },
  ];
}
