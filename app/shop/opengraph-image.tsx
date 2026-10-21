import { ImageResponse } from "next/og";

export const alt = "Zero Degrees Coffee Roasters";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function ShopOpenGraphImage() {
  return new ImageResponse(
    <div style={{
      width: "100%", height: "100%", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      backgroundColor: "#fafafa", color: "#111111", fontFamily: "serif",
    }}>
      <div style={{ display: "flex", fontSize: 106, fontStyle: "italic", letterSpacing: "0.09em", lineHeight: 1.3 }}>
        Zero Degrees
      </div>
      <div style={{ display: "flex", fontSize: 84, fontStyle: "italic", letterSpacing: "0.075em", lineHeight: 1.4 }}>
        Coffee Roasters
      </div>
    </div>,
    size,
  );
}
