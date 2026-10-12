import { ImageResponse } from "next/og";

export const ogSize = { width: 1200, height: 630 };

const CELLS = [1, 3, 4, 6, 9, 11];

/** Shared social card: dark brand background, eyebrow, title, and a node-graph (system design) or array (DSA) motif. */
export function ogCard({ eyebrow, title, summary, motif = "sd" }: { eyebrow: string; title: string; summary?: string; motif?: "sd" | "dsa" }) {
  const boxes = [
    { x: 760, y: 360, c: "#5aa9ff", t: "Client" },
    { x: 900, y: 300, c: "#b48cff", t: "LB" },
    { x: 1040, y: 360, c: "#46d6b4", t: "Service" },
    { x: 1040, y: 470, c: "#f4b95a", t: "DB" },
  ];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#0b1110", color: "#e8efec", padding: 72, position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 28, fontWeight: 700 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, #46d6b4, #5aa9ff)" }} />
          DSA &amp; System Design
        </div>
        <div style={{ marginTop: 70, fontSize: 26, letterSpacing: 3, textTransform: "uppercase", color: "#f4b95a", display: "flex" }}>{eyebrow}</div>
        <div style={{ marginTop: 14, fontSize: 64, fontWeight: 700, lineHeight: 1.08, maxWidth: 680, display: "flex" }}>{title}</div>
        {summary && <div style={{ marginTop: 22, fontSize: 26, color: "#92a39d", maxWidth: 640, lineHeight: 1.4, display: "flex" }}>{summary.slice(0, 140)}</div>}
        {motif === "dsa" &&
          CELLS.map((v, i) => (
            <div
              key={i}
              style={{ position: "absolute", left: 780 + i * 62, top: 380, width: 54, height: 54, borderRadius: 10, border: `3px solid ${i === 1 || i === 4 ? "#46d6b4" : "#33443f"}`, background: i === 1 || i === 4 ? "#12302a" : "#141d1b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700 }}
            >
              {v}
            </div>
          ))}
        {motif === "dsa" &&
          [1, 4].map((i, k) => (
            <div key={`p${i}`} style={{ position: "absolute", left: 780 + i * 62, top: 444, width: 54, display: "flex", justifyContent: "center", fontSize: 18, color: "#f4b95a" }}>
              {k === 0 ? "▲ left" : "▲ right"}
            </div>
          ))}
        {motif === "sd" && boxes.map((b) => (
          <div
            key={b.t}
            style={{ position: "absolute", left: b.x, top: b.y, width: 120, height: 52, borderRadius: 12, border: `3px solid ${b.c}`, background: "#141d1b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 600 }}
          >
            {b.t}
          </div>
        ))}
      </div>
    ),
    ogSize,
  );
}
