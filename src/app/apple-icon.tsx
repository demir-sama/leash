import { ImageResponse } from "next/og";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";
export default function Icon() {
  return new ImageResponse(
    <div style={{ width: 180, height: 180, background: "#0b0e14", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 40 }}>
      <svg width="130" height="130" viewBox="0 0 64 64"><path d="M13 22a11 11 0 0 1 22 0v3a3 3 0 0 1-3 3H16a3 3 0 0 1-3-3z" fill="none" stroke="#c6ff3d" strokeWidth="5.5" strokeLinejoin="round" /><path d="M24 28v15c0 6 3.5 9 9.5 9H43" fill="none" stroke="#eef1f6" strokeWidth="5.5" strokeLinecap="round" /><rect x="44" y="46.5" width="11" height="11" rx="3.2" fill="#c6ff3d" /><circle cx="49.5" cy="52" r="2" fill="#0b0e14" /></svg>
    </div>, size);
}
