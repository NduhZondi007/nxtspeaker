import { ImageResponse } from "next/og";

export const alt = "NxtSpeaker — Africa's Premier Speaker Platform";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0A0A0F",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Georgia, serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Gold top gradient bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "6px",
            background: "linear-gradient(90deg, #C9A96E 0%, #8B6A35 60%, transparent 100%)",
          }}
        />

        {/* Subtle background glow */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(201,169,110,0.07) 0%, transparent 70%)",
            transform: "translate(-50%, -50%)",
          }}
        />

        {/* Microphone icon — inline SVG shapes */}
        <div
          style={{
            width: 88,
            height: 88,
            borderRadius: 20,
            background: "#1a1208",
            border: "1.5px solid #C9A96E33",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 32,
          }}
        >
          <svg
            width="44"
            height="44"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x="12" y="4" width="8" height="14" rx="4" fill="#C9A96E" />
            <path
              d="M9 15a7 7 0 0 0 14 0"
              stroke="#C9A96E"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <line x1="16" y1="22" x2="16" y2="26" stroke="#C9A96E" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="12" y1="26" x2="20" y2="26" stroke="#C9A96E" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>

        {/* Brand name */}
        <div
          style={{
            fontSize: 80,
            fontWeight: 700,
            color: "#FFFFFF",
            letterSpacing: "-2px",
            lineHeight: 1,
          }}
        >
          NxtSpeaker
        </div>

        {/* Gold divider */}
        <div
          style={{
            width: 56,
            height: 3,
            background: "linear-gradient(90deg, transparent, #C9A96E, transparent)",
            borderRadius: 2,
            marginTop: 20,
            marginBottom: 20,
          }}
        />

        {/* Tagline */}
        <div
          style={{
            fontSize: 26,
            color: "#C9A96E",
            fontWeight: 400,
            letterSpacing: "2px",
            textTransform: "uppercase",
          }}
        >
          Africa&apos;s Premier Speaker Platform
        </div>

        {/* Stats row */}
        <div
          style={{
            position: "absolute",
            bottom: 48,
            display: "flex",
            gap: 64,
          }}
        >
          {[
            ["500+", "Speakers"],
            ["R2.4B", "Fees Facilitated"],
            ["48h", "Response Time"],
          ].map(([value, label]) => (
            <div
              key={label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 26, fontWeight: 700, color: "#C9A96E" }}>{value}</span>
              <span
                style={{
                  fontSize: 11,
                  color: "#9A9590",
                  marginTop: 4,
                  textTransform: "uppercase",
                  letterSpacing: "2px",
                }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Bottom gold bar */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            height: "3px",
            background: "linear-gradient(90deg, transparent, #8B6A35 40%, #C9A96E 100%)",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
