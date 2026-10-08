import { ImageResponse } from "next/og";

export const alt = "Casa di Stefano · Tominiko Beans & Coffee";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      padding: "72px 80px",
      background: "#f1ece3",
      color: "#211d18",
      fontFamily: "serif",
    }}>
      <div style={{ display: "flex", fontSize: 22, letterSpacing: "0.16em" }}>CASA DI STEFANO</div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontSize: 76, lineHeight: 1, letterSpacing: "-0.04em" }}>Tominiko Beans</div>
        <div style={{ display: "flex", fontSize: 76, lineHeight: 1, letterSpacing: "-0.04em" }}>&amp; Coffee</div>
        <div style={{ display: "flex", marginTop: 30, fontFamily: "sans-serif", fontSize: 20, letterSpacing: "0.1em", color: "#684c38" }}>
          ROASTED BY ZERO DEGREES · SUWON
        </div>
      </div>
      <div style={{ display: "flex", fontFamily: "sans-serif", fontSize: 18, color: "#75695e" }}>
        향긋한 커피를 직접 만나보세요.
      </div>
    </div>,
    size,
  );
}
