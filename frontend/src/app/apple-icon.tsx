import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Mesmo marcador do icon.svg, sem cantos arredondados (o iOS aplica a máscara).
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1f1e1b",
        }}
      >
        <svg width="132" height="132" viewBox="4 4 24 24">
          <path
            fill="#fbfaf7"
            stroke="#fbfaf7"
            strokeWidth="1.5"
            strokeLinejoin="round"
            d="M11.5 6h9a1.5 1.5 0 0 1 1.5 1.5V26l-6-4.4-6 4.4V7.5A1.5 1.5 0 0 1 11.5 6Z"
          />
          <circle cx="16" cy="12" r="3" fill="#3e63dd" />
        </svg>
      </div>
    ),
    size,
  );
}
