import { ImageResponse } from "next/og";

export const alt = "NXT Speaker — Book Speakers Directly";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#031E57",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Orange top bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "8px",
            background: "#FF5700",
          }}
        />

        {/* Teal bottom bar */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            height: "3px",
            background: "#629DAB",
          }}
        />

        {/* Angular mark watermark — right side, 12% opacity */}
        <div
          style={{
            position: "absolute",
            right: -40,
            top: "50%",
            transform: "translateY(-50%) rotate(15deg)",
            opacity: 0.12,
            display: "flex",
          }}
        >
          <svg
            width="480"
            height="480"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <polygon points="4,24 8,24 20,8 16,8" fill="#FFFFFF" />
            <polygon points="14,24 17,24 28,8 25,8" fill="#FFFFFF" />
            <polygon points="4,18 8,18 8,15 4,15" fill="#FFFFFF" />
            <polygon points="24,17 28,17 28,14 24,14" fill="#FFFFFF" />
          </svg>
        </div>

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            paddingLeft: 80,
            paddingRight: 80,
            paddingTop: 48,
            paddingBottom: 48,
          }}
        >
          {/* Eyebrow */}
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#629DAB",
              letterSpacing: "4px",
              textTransform: "uppercase",
              marginBottom: 28,
            }}
          >
            SOUTH AFRICA&apos;S SPEAKER PLATFORM
          </div>

          {/* Brand name */}
          <div
            style={{
              fontSize: 104,
              fontWeight: 900,
              color: "#FFFFFF",
              letterSpacing: "-3px",
              lineHeight: 0.9,
              textTransform: "uppercase",
              marginBottom: 28,
            }}
          >
            NXT SPEAKER
          </div>

          {/* Tagline */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              fontSize: 26,
              fontWeight: 400,
              color: "rgba(255,255,255,0.75)",
              lineHeight: 1.4,
              maxWidth: 560,
              marginBottom: 48,
            }}
          >
            <span>Book transformative speakers directly.</span>
            <span>No agencies. No gatekeepers.</span>
          </div>

          {/* Teal divider */}
          <div
            style={{
              width: 64,
              height: 3,
              background: "#629DAB",
              borderRadius: 2,
              marginBottom: 40,
            }}
          />

          {/* Stats row */}
          <div style={{ display: "flex", gap: 56 }}>
            {[
              ["500+", "SPEAKERS"],
              ["SOUTH AFRICA", "BASED"],
              ["48h", "RESPONSE TIME"],
            ].map(([value, label]) => (
              <div
                key={label}
                style={{ display: "flex", flexDirection: "column", gap: 4 }}
              >
                <span
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: "#FFFFFF",
                    letterSpacing: "-0.5px",
                  }}
                >
                  {value}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 400,
                    color: "#9AA1B0",
                    letterSpacing: "2px",
                    textTransform: "uppercase",
                  }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
