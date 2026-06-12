import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

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
          background: "#bb4a23",
        }}
      >
        <svg width="124" height="124" viewBox="0 0 64 64">
          <rect x="28" y="12" width="8" height="40" rx="4" fill="#fff" />
          <rect x="16" y="24" width="32" height="8" rx="4" fill="#fff" />
        </svg>
      </div>
    ),
    size,
  );
}
