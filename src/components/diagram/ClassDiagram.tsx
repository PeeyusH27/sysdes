"use client";
import { useId, useMemo, useState } from "react";
import { m, useReducedMotion } from "motion/react";
import type { ClassSpec } from "./types";

const W = 200;
const LINE = 17;
const HEAD = 30;
const GAP_X = 250;
const GAP_Y = 60;
const PAD = 24;

type Box = { x: number; y: number; w: number; h: number };

function heightOf(c: ClassSpec["classes"][number]) {
  const f = c.fields?.length ?? 0;
  const mth = c.methods?.length ?? 0;
  return HEAD + (c.stereotype ? 12 : 0) + Math.max(1, f) * LINE + 8 + Math.max(1, mth) * LINE + 6;
}

/** Point where the segment from the box centre towards (tx, ty) leaves the box. */
function exitPoint(b: Box, tx: number, ty: number) {
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const dx = tx - cx;
  const dy = ty - cy;
  const s = 1 / Math.max(Math.abs(dx) / (b.w / 2), Math.abs(dy) / (b.h / 2), 1e-9);
  return { x: cx + dx * s, y: cy + dy * s };
}

export function ClassDiagram({ spec }: { spec: ClassSpec }) {
  const uid = useId().replace(/:/g, "");
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<string | null>(null);

  const { boxes, width, height } = useMemo(() => {
    const rowHeights = new Map<number, number>();
    for (const c of spec.classes) rowHeights.set(c.row, Math.max(rowHeights.get(c.row) ?? 0, heightOf(c)));
    const rowY = new Map<number, number>();
    let y = PAD;
    for (const r of [...rowHeights.keys()].sort((a, b) => a - b)) {
      rowY.set(r, y);
      y += rowHeights.get(r)! + GAP_Y;
    }
    const boxes = new Map<string, Box>();
    for (const c of spec.classes) boxes.set(c.id, { x: PAD + c.col * GAP_X, y: rowY.get(c.row)!, w: W, h: heightOf(c) });
    const maxCol = Math.max(...spec.classes.map((c) => c.col));
    return { boxes, width: PAD * 2 + maxCol * GAP_X + W, height: y - GAP_Y + PAD };
  }, [spec.classes]);

  return (
    <figure className="flow uml">
      {/* Focusable so keyboard users can scroll it sideways when it is wider than the column. */}
      <div className="flow-scroll" tabIndex={0} role="group" aria-labelledby={`${uid}t`}>
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={`${uid}t ${uid}d`} style={{ width: "100%", maxWidth: width, minWidth: Math.min(width, 600) }}>
          <title id={`${uid}t`}>{spec.title}</title>
          <desc id={`${uid}d`}>{spec.description}</desc>
          <defs>
            <marker id={`${uid}-tri`} viewBox="0 0 12 12" refX="11" refY="6" markerWidth="12" markerHeight="12" orient="auto-start-reverse">
              <path d="M0 0L12 6L0 12z" className="uml-hollow" />
            </marker>
            <marker id={`${uid}-dia`} viewBox="0 0 16 10" refX="0" refY="5" markerWidth="16" markerHeight="10" orient="auto">
              <path d="M0 5L8 0L16 5L8 10z" className="uml-filled" />
            </marker>
            <marker id={`${uid}-odia`} viewBox="0 0 16 10" refX="0" refY="5" markerWidth="16" markerHeight="10" orient="auto">
              <path d="M0 5L8 0L16 5L8 10z" className="uml-hollow" />
            </marker>
            <marker id={`${uid}-open`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse">
              <path d="M0 0L10 5L0 10" className="uml-open" />
            </marker>
          </defs>
          {spec.relations.map((r, i) => {
            const a = boxes.get(r.from)!;
            const b = boxes.get(r.to)!;
            const p1 = exitPoint(a, b.x + b.w / 2, b.y + b.h / 2);
            const p2 = exitPoint(b, a.x + a.w / 2, a.y + a.h / 2);
            const dashed = r.type === "implements" || r.type === "dependency";
            const start = r.type === "composition" ? `url(#${uid}-dia)` : r.type === "aggregation" ? `url(#${uid}-odia)` : undefined;
            const end =
              r.type === "inheritance" || r.type === "implements" ? `url(#${uid}-tri)` : r.type === "association" || r.type === "dependency" ? `url(#${uid}-open)` : undefined;
            const lit = hover && (hover === r.from || hover === r.to);
            return (
              <g key={i} className="uml-rel" data-dim={hover && !lit ? true : undefined}>
                <m.path
                  d={`M${p1.x},${p1.y} L${p2.x},${p2.y}`}
                  strokeDasharray={dashed ? "6 5" : undefined}
                  markerStart={start}
                  markerEnd={end}
                  initial={reduce ? false : { opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 + i * 0.06 }}
                />
                {r.label && (
                  <text x={(p1.x + p2.x) / 2 + 6} y={(p1.y + p2.y) / 2 - 6} className="edge-label">
                    {r.label}
                  </text>
                )}
              </g>
            );
          })}
          {spec.classes.map((c, i) => {
            const b = boxes.get(c.id)!;
            let y = HEAD + (c.stereotype ? 12 : 0);
            return (
              <m.g
                key={c.id}
                className="uml-class"
                data-dim={hover && hover !== c.id && !spec.relations.some((r) => (r.from === hover && r.to === c.id) || (r.to === hover && r.from === c.id)) ? true : undefined}
                transform={`translate(${b.x},${b.y})`}
                tabIndex={0}
                aria-label={`${c.stereotype ? c.stereotype + " " : ""}${c.name}`}
                onPointerEnter={() => setHover(c.id)}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(c.id)}
                onBlur={() => setHover(null)}
                initial={reduce ? false : { opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <rect width={b.w} height={b.h} rx={8} />
                {c.stereotype && (
                  <text x={b.w / 2} y={16} textAnchor="middle" className="uml-stereo">
                    «{c.stereotype}»
                  </text>
                )}
                <text x={b.w / 2} y={c.stereotype ? 32 : 20} textAnchor="middle" className="uml-name">
                  {c.name}
                </text>
                <line x1={0} x2={b.w} y1={y - 4} y2={y - 4} />
                {(c.fields?.length ? c.fields : [""]).map((f, k) => (
                  <text key={k} x={10} y={y + 10 + k * LINE} className="uml-member">
                    {f}
                  </text>
                ))}
                {(() => {
                  y += Math.max(1, c.fields?.length ?? 0) * LINE + 8;
                  return <line x1={0} x2={b.w} y1={y - 4} y2={y - 4} />;
                })()}
                {(c.methods?.length ? c.methods : [""]).map((mm, k) => (
                  <text key={k} x={10} y={y + 10 + k * LINE} className="uml-member">
                    {mm}
                  </text>
                ))}
              </m.g>
            );
          })}
        </svg>
      </div>
      <figcaption>
        <p className="flow-caption">{spec.description}</p>
        <ul className="legend uml-legend" aria-label="Relationship key">
          <li>◆ composition (owns)</li>
          <li>◇ aggregation</li>
          <li>△ inheritance / implements (dashed)</li>
          <li>→ association · ⇢ dependency</li>
        </ul>
      </figcaption>
    </figure>
  );
}
