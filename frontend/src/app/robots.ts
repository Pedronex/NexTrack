import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

// Só as telas públicas de entrada são rastreáveis; o resto exige sessão.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/entrar", "/cadastrar"],
      disallow: [
        "/api/",
        "/auth/",
        "/biblioteca",
        "/sessoes",
        "/relatorios",
        "/configuracoes",
        "/spotify/",
        "/confirmar-email",
        "/esqueci-senha",
        "/redefinir-senha",
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
