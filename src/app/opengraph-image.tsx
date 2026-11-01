import { ImageResponse } from "next/og";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Leash: give your AI agent an allowance, not your wallet";
export default function OG() {
  const rows = [["Ceramic mug · Slow Clay Studio", "$29.00", "PAID", "#c6ff3d"], ["Pottery class voucher", "$55.00", "ASK", "#ffb547"], ["Prepaid Visa gift card", "$100.00", "BLOCKED", "#ff5d5d"]];
  return new ImageResponse(
    <div style={{ width: 1200, height: 630, display: "flex", background: "#0b0e14", color: "#eef1f6", padding: 72, fontFamily: "Georgia, serif", position: "relative" }}>
      <div style={{ position: "absolute", right: -160, top: -200, width: 700, height: 700, borderRadius: 700, background: "radial-gradient(circle, rgba(139,123,255,.35), transparent 65%)", display: "flex" }} />
      <div style={{ display: "flex", flexDirection: "column", width: 600 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <svg width="64" height="64" viewBox="0 0 64 64"><path d="M13 22a11 11 0 0 1 22 0v3a3 3 0 0 1-3 3H16a3 3 0 0 1-3-3z" fill="none" stroke="#c6ff3d" strokeWidth="5.5" strokeLinejoin="round" /><path d="M24 28v15c0 6 3.5 9 9.5 9H43" fill="none" stroke="#eef1f6" strokeWidth="5.5" strokeLinecap="round" /><rect x="44" y="46.5" width="11" height="11" rx="3.2" fill="#c6ff3d" /><circle cx="49.5" cy="52" r="2" fill="#0b0e14" /></svg>
          <div style={{ fontSize: 52 }}>leash</div>
        </div>
        <div style={{ fontSize: 76, lineHeight: 1.02, marginTop: 70, letterSpacing: -2 }}>Give your AI an allowance,</div>
        <div style={{ fontSize: 76, lineHeight: 1.02, color: "#c6ff3d", fontStyle: "italic", letterSpacing: -2 }}>not your wallet.</div>
        <div style={{ fontSize: 26, marginTop: 34, color: "#8a93a6", fontFamily: "sans-serif" }}>Agent errands, paid from a vaulted PayPal wallet, inside rules you set.</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18, marginLeft: 40, marginTop: 120, width: 420 }}>
        {rows.map(([n, p, s, c]) => (
          <div key={n} style={{ display: "flex", flexDirection: "column", padding: 22, borderRadius: 20, border: "1px solid #232a38", background: "#131823", fontFamily: "sans-serif" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22 }}><span>{n}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 20 }}><span style={{ color: "#8a93a6" }}>{p}</span><span style={{ color: c, letterSpacing: 3 }}>{s}</span></div>
          </div>))}
      </div>
    </div>, size);
}
