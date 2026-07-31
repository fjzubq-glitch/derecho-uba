import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Derecho UBA — Gestión Académica";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0A0D16",
          position: "relative",
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="#B99A62"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          width={120}
          height={120}
          style={{ marginBottom: 32 }}
        >
          <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1z" />
          <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1z" />
          <path d="M7 21h10" />
          <path d="M12 3v18" />
          <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
        </svg>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            fontSize: 72,
            fontWeight: 500,
            color: "#ECE9E1",
            fontFamily: "'Georgia', serif",
          }}
        >
          Derecho <span style={{ color: "#B99A62" }}>UBA</span>
        </div>
        <div
          style={{
            fontSize: 26,
            color: "#5A6178",
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            marginTop: 20,
            fontFamily: "'Courier New', monospace",
          }}
        >
          Gestión académica
        </div>
      </div>
    ),
    { ...size }
  );
}
