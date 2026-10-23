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
          <svg width="44" height="44" viewBox="0 0 64 64">
            <defs>
              <linearGradient id="bg" x1="8" y1="0" x2="56" y2="64" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#6d5ffa" />
                <stop offset="1" stopColor="#3a2eb8" />
              </linearGradient>
            </defs>
            <rect width="64" height="64" rx="15" fill="url(#bg)" />
            <path d="M45 18 C37 12 19 14 19 24 C19 31 26 32 32 32 C38 32 45 33 45 40 C45 50 27 52 19 46" fill="none" stroke="#ffffff" strokeOpacity="0.9" strokeWidth="4.4" strokeLinecap="round" />
            <circle cx="45" cy="18" r="6" fill="#f0b35a" />
            <circle cx="32" cy="32" r="5.2" fill="#ffffff" />
            <circle cx="19" cy="46" r="6" fill="#5eead4" />
            <circle cx="45" cy="18" r="2" fill="#3a2eb8" />
            <circle cx="32" cy="32" r="1.8" fill="#3a2eb8" />
            <circle cx="19" cy="46" r="2" fill="#3a2eb8" />
          </svg>
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
