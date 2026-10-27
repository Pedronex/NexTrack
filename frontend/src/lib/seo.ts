import type { Metadata } from "next";

export const SITE_NAME = "NexTrack";
export const SITE_DESCRIPTION =
  "Acompanhe suas leituras: biblioteca, sessões, metas e relatórios — com o Spotify tocando ao lado.";

// Base das URLs absolutas (canonical, Open Graph, sitemap). Produção quando a env não vier.
export const SITE_URL = new URL(process.env.NEXT_PUBLIC_APP_URL || "https://track.nexsdev.com.br");

export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}

// Imagem de compartilhamento gerada por app/opengraph-image.tsx.
export const OG_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: `${SITE_NAME} — rastreador de leituras`,
  type: "image/png",
};

// Páginas privadas ou de fluxo (confirmação, redefinição): fora do índice.
export const NO_INDEX: Metadata["robots"] = { index: false, follow: false };

// Páginas públicas indexáveis. O Next sobrescreve `openGraph`/`twitter` por segmento
// (não mescla, e descarta a imagem do arquivo opengraph-image), então cada página
// repete título, descrição, URL e imagem aqui.
export function publicPage({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const fullTitle = `${title} · ${SITE_NAME}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "pt_BR",
      siteName: SITE_NAME,
      title: fullTitle,
      description,
      url: path,
      images: [OG_IMAGE],
    },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: [OG_IMAGE] },
  };
}
