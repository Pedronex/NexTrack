import { ImageResponse } from "next/og";
import { OG_IMAGE, SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";

export const alt = OG_IMAGE.alt;
export const size = { width: OG_IMAGE.width, height: OG_IMAGE.height };
export const contentType = "image/png";

// Imagem de compartilhamento (Open Graph e Twitter) gerada no build.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 40,
          padding: "0 96px",
          background: "#f5f2eb",
          color: "#1f1e1b",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <svg width="112" height="112" viewBox="0 0 32 32">
            <rect width="32" height="32" rx="8" fill="#1f1e1b" />
            <path
              fill="#fbfaf7"
              stroke="#fbfaf7"
              strokeWidth="1.5"
              strokeLinejoin="round"
              d="M11.5 6h9a1.5 1.5 0 0 1 1.5 1.5V26l-6-4.4-6 4.4V7.5A1.5 1.5 0 0 1 11.5 6Z"
            />
            <circle cx="16" cy="12" r="3" fill="#3e63dd" />
          </svg>
          <div style={{ fontSize: 88, fontWeight: 700, letterSpacing: -2 }}>{SITE_NAME}</div>
        </div>
        <div style={{ fontSize: 40, lineHeight: 1.3, color: "#4a4842", maxWidth: 1008 }}>{SITE_DESCRIPTION}</div>
      </div>
    ),
    size,
  );
}
