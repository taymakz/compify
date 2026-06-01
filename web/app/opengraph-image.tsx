import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

export const runtime = "nodejs";

export const alt = "Compify — Free Open-Source Video Compressor";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function OGImage() {
  const logoBuffer = readFileSync(
    join(process.cwd(), "public", "logo.png")
  );

  const logoSrc = `data:image/png;base64,${logoBuffer.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          padding: "64px 72px",
          background: "#070707",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Glow */}
        <div
          style={{
            position: "absolute",
            top: "-140px",
            right: "-100px",
            width: "600px",
            height: "600px",
            borderRadius: "9999px",
            background:
              "radial-gradient(circle, rgba(99,102,241,0.2) 0%, rgba(99,102,241,0.06) 45%, transparent 70%)",
          }}
        />

        <div
          style={{
            position: "absolute",
            bottom: "-100px",
            left: "-60px",
            width: "400px",
            height: "400px",
            borderRadius: "9999px",
            background:
              "radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)",
          }}
        />

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            width: "100%",
          }}
        >
          <img
            src={logoSrc}
            width={44}
            height={44}
            alt="Compify"
            style={{
              borderRadius: "10px",
            }}
          />

          <div
            style={{
              display: "flex",
              marginLeft: "14px",
              color: "#fff",
              fontSize: "22px",
              fontWeight: 700,
            }}
          >
            Compify
          </div>

          <div
            style={{
              display: "flex",
              marginLeft: "12px",
              padding: "4px 10px",
              borderRadius: "999px",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.05)",
            }}
          >
            <span
              style={{
                color: "rgba(255,255,255,0.5)",
                fontSize: "11px",
              }}
            >
              v0.1.0
            </span>
          </div>

          <div
            style={{
              flex: 1,
            }}
          />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              borderRadius: "999px",
              padding: "6px 16px",
              background: "rgba(16,185,129,0.08)",
              border: "1px solid rgba(16,185,129,0.2)",
            }}
          >
            <div
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "999px",
                background: "#34d399",
              }}
            />

            <span
              style={{
                color: "#34d399",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              Free & Open Source
            </span>
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {/* Main Title */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              fontSize: "72px",
              fontWeight: 800,
              color: "#fff",
              lineHeight: 1.05,
              letterSpacing: "-3px",
            }}
          >
            Compress any video.
          </div>

          <div
            style={{
              fontSize: "72px",
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: "-3px",
              background:
                "linear-gradient(90deg,#60a5fa 0%,#a78bfa 50%,#818cf8 100%)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Upload nothing.
          </div>
        </div>

        {/* Subtitle */}
        <div
          style={{
            marginTop: "24px",
            color: "rgba(255,255,255,0.45)",
            fontSize: "20px",
          }}
        >
          Smart presets · GPU acceleration · Batch processing · Zero cloud
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginTop: "32px",
            gap: "10px",
          }}
        >
          {["Windows", "macOS", "Linux"].map((platform) => (
            <div
              key={platform}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                borderRadius: "10px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div
                style={{
                  width: "5px",
                  height: "5px",
                  borderRadius: "999px",
                  background: "#818cf8",
                }}
              />

              <span
                style={{
                  color: "rgba(255,255,255,0.55)",
                  fontSize: "13px",
                }}
              >
                {platform}
              </span>
            </div>
          ))}

          <div style={{ flex: 1 }} />

          <div
            style={{
              color: "rgba(255,255,255,0.2)",
              fontSize: "13px",
            }}
          >
            Built with Tauri v2 · Rust · React
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
