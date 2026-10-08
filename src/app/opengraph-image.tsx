import { ImageResponse } from "next/og";

export const alt = "StealthBridge — exploring privacy-conscious cross-border payments on Stellar";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #031419 0%, #06434a 65%, #087d81 100%)",
          width: "100%", height: "100%", display: "flex", flexDirection: "column",
          padding: "78px 88px", justifyContent: "space-between", color: "#eafffb",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", fontSize: 33, fontWeight: 700, letterSpacing: 1 }}>
          <div style={{ width: 24, height: 24, border: "5px solid #61e6dc", transform: "rotate(45deg)", marginRight: 22 }} />
          StealthBridge
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 67, fontWeight: 700, letterSpacing: -2, lineHeight: 1.13 }}>Privacy-conscious payments.</div>
          <div style={{ fontSize: 67, fontWeight: 700, letterSpacing: -2, lineHeight: 1.13 }}>Built with care.</div>
          <div style={{ marginTop: 26, fontSize: 27, color: "#b0d5d3" }}>Exploring cross-border experiences on Stellar Testnet</div>
        </div>
      </div>
    ),
    size,
  );
}
