"use client";
import { useId, useMemo, useRef, useState } from "react";
import { m, useReducedMotion } from "motion/react";
import type { ClassSpec } from "./types";
import { useBoxWidth } from "./useBoxWidth";

type Cls = ClassSpec["classes"][number];
type Rel = ClassSpec["relations"][number];
type Box = { x: number; y: number; w: number; h: number };

/* Full boxes (every field and method drawn), used when the figure is wide enough to show them at a readable size. */
const W = 200;
const LINE = 17;
const HEAD = 30;
const GAP_X = 250;
const GAP_Y = 60;
const PAD = 24;
/* Compact boxes (name + member count; the selected class's members are listed beside the drawing). */
const C_GAP_X = 44;
const C_GAP_Y = 40;
const C_PAD = 16;
/** Full boxes need this much scale to keep member text ≥ ~10 px; below it the compact boxes are used. */
const FULL_MIN_SCALE = 0.85;

function heightOf(c: Cls) {
  const f = c.fields?.length ?? 0;
  const mth = c.methods?.length ?? 0;
  return HEAD + (c.stereotype ? 12 : 0) + Math.max(1, f) * LINE + 8 + Math.max(1, mth) * LINE + 6;
}

const plural = (k: number, one: string) => `${k} ${one}${k === 1 ? "" : "s"}`;
const countLine = (c: Cls) => `${plural(c.fields?.length ?? 0, "field")} · ${plural(c.methods?.length ?? 0, "method")}`;

/** Point where the segment from the box centre towards (tx, ty) leaves the box. */
function exitPoint(b: Box, tx: number, ty: number) {
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const dx = tx - cx;
  const dy = ty - cy;
  const s = 1 / Math.max(Math.abs(dx) / (b.w / 2), Math.abs(dy) / (b.h / 2), 1e-9);
  return { x: cx + dx * s, y: cy + dy * s };
}

function layoutFull(classes: Cls[]) {
  const rowHeights = new Map<number, number>();
  for (const c of classes) rowHeights.set(c.row, Math.max(rowHeights.get(c.row) ?? 0, heightOf(c)));
  const rowY = new Map<number, number>();
  let y = PAD;
  for (const r of [...rowHeights.keys()].sort((a, b) => a - b)) {
    rowY.set(r, y);
    y += rowHeights.get(r)! + GAP_Y;
  }
  const boxes = new Map<string, Box>();
  for (const c of classes) boxes.set(c.id, { x: PAD + c.col * GAP_X, y: rowY.get(c.row)!, w: W, h: heightOf(c) });
  const maxCol = Math.max(...classes.map((c) => c.col));
  return { boxes, width: PAD * 2 + maxCol * GAP_X + W, height: y - GAP_Y + PAD };
}

/** Same grid, but each column only as wide as its longest class name (or member count line). */
function layoutCompact(classes: Cls[]) {
  const cols = [...new Set(classes.map((c) => c.col))].sort((a, b) => a - b);
  const rows = [...new Set(classes.map((c) => c.row))].sort((a, b) => a - b);
  const colW = new Map<number, number>();
  for (const c of classes) {
    const w = Math.max(c.name.length * 8 + 22, countLine(c).length * 5.7 + 18, c.stereotype ? (c.stereotype.length + 2) * 5.8 + 18 : 0, 96);
    colW.set(c.col, Math.max(colW.get(c.col) ?? 0, Math.ceil(w)));
  }
  const rowH = new Map<number, number>();
  for (const c of classes) rowH.set(c.row, Math.max(rowH.get(c.row) ?? 0, c.stereotype ? 58 : 46));
  const colX = new Map<number, number>();
  let x = C_PAD;
  for (const c of cols) {
    colX.set(c, x);
    x += colW.get(c)! + C_GAP_X;
  }
  const rowY = new Map<number, number>();
  let y = C_PAD;
  for (const r of rows) {
    rowY.set(r, y);
    y += rowH.get(r)! + C_GAP_Y;
  }
  const boxes = new Map<string, Box>();
  for (const c of classes) {
    const w = colW.get(c.col)!;
    const h = c.stereotype ? 58 : 46;
    boxes.set(c.id, { x: colX.get(c.col)!, y: rowY.get(c.row)! + (rowH.get(c.row)! - h) / 2, w, h });
  }
  return { boxes, width: x - C_GAP_X + C_PAD, height: y - C_GAP_Y + C_PAD };
}

const REL_WORDS: Record<Rel["type"], [string, string]> = {
  composition: ["owns", "is owned by"],
  aggregation: ["has", "is part of"],
  inheritance: ["extends", "is extended by"],
  implements: ["implements", "is implemented by"],
  association: ["uses", "is used by"],
  dependency: ["depends on", "is used by"],
};

/** "owns Floor (1..*), uses SpotSelector; is used by DisplayBoard (observes)". */
function relationsInWords(id: string, spec: ClassSpec) {
  const name = (x: string) => spec.classes.find((c) => c.id === x)?.name ?? x;
  return spec.relations
    .filter((r) => r.from === id || r.to === id)
    .map((r) => {
      const out = r.from === id;
      const [fwd, back] = REL_WORDS[r.type];
      return `${out ? fwd : back} ${name(out ? r.to : r.from)}${r.label ? ` (${r.label})` : ""}`;
    });
}

/**
 * UML class diagram. When the figure is wide enough the boxes list every field and method; in a narrower figure (the
 * ~600 px pinned pane, a phone) the boxes show names and member counts, and the selected class's members are listed
 * as text under the drawing. Click, tap or focus a class to select it; its relations light up.
 */
export function ClassDiagram({ spec }: { spec: ClassSpec }) {
  const uid = useId().replace(/:/g, "");
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const boxWidth = useBoxWidth(scroller);

  const full = useMemo(() => layoutFull(spec.classes), [spec.classes]);
  const compactLayout = useMemo(() => layoutCompact(spec.classes), [spec.classes]);
  // Server render and wide figures: full boxes (today's desktop look). Narrow figures: compact boxes.
  const compact = boxWidth !== undefined && boxWidth < full.width * FULL_MIN_SCALE;
  const { boxes, width, height } = compact ? compactLayout : full;
  const hub = useMemo(() => {
    const deg = (id: string) => spec.relations.filter((r) => r.from === id || r.to === id).length;
    return [...spec.classes].sort((a, b) => deg(b.id) - deg(a.id))[0]?.id ?? null;
  }, [spec]);
  const [picked, setPicked] = useState<string | null>(null);
  const selected = picked ?? hub;
  const focus = hover ?? (compact ? selected : null);
  const sel = spec.classes.find((c) => c.id === selected);
  const minWidth = compact ? Math.min(width, Math.round(width * 0.8)) : Math.min(width, 600);

  return (
    <figure className={compact ? "flow uml uml--compact" : "flow uml"}>
      {/* Focusable so keyboard users can scroll it sideways when it is wider than the column. */}
      <div ref={scroller} className="flow-scroll" tabIndex={0} role="group" aria-labelledby={`${uid}t`}>
        <svg viewBox={`0 0 ${width} ${height}`} role={compact ? "group" : "img"} aria-labelledby={`${uid}t ${uid}d`} style={{ width: "100%", maxWidth: width, minWidth }}>
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
            const lit = focus && (focus === r.from || focus === r.to);
            return (
              <g key={i} className="uml-rel" data-dim={focus && !lit ? true : undefined} data-lit={compact && lit ? true : undefined}>
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
              </g>
            );
          })}
          {spec.classes.map((c, i) => {
            const b = boxes.get(c.id)!;
            let y = HEAD + (c.stereotype ? 12 : 0);
            const near = focus === c.id || spec.relations.some((r) => (r.from === focus && r.to === c.id) || (r.to === focus && r.from === c.id));
            return (
              <m.g
                key={c.id}
                className="uml-class"
                data-dim={focus && !near ? true : undefined}
                data-selected={compact && selected === c.id ? true : undefined}
                transform={`translate(${b.x},${b.y})`}
                tabIndex={0}
                role={compact ? "button" : undefined}
                aria-pressed={compact ? selected === c.id : undefined}
                aria-label={`${c.stereotype ? c.stereotype + " " : ""}${c.name}${compact ? `, ${countLine(c)}` : ""}`}
                aria-describedby={compact && selected === c.id ? `${uid}card` : undefined}
                onPointerEnter={() => setHover(c.id)}
                onPointerLeave={() => setHover(null)}
                onFocus={() => {
                  setHover(c.id);
                  if (compact) setPicked(c.id);
                }}
                onBlur={() => setHover(null)}
                onClick={() => setPicked(c.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setPicked(c.id);
                  }
                }}
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
                {compact ? (
                  <text x={b.w / 2} y={c.stereotype ? 48 : 36} textAnchor="middle" className="uml-count">
                    {countLine(c)}
                  </text>
                ) : (
                  <>
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
                  </>
                )}
              </m.g>
            );
          })}
          {/* Relation labels last, so a box never hides one (they have a halo in the card colour). */}
          {spec.relations.map((r, i) => {
            if (!r.label) return null;
            const a = boxes.get(r.from)!;
            const b = boxes.get(r.to)!;
            const p1 = exitPoint(a, b.x + b.w / 2, b.y + b.h / 2);
            const p2 = exitPoint(b, a.x + a.w / 2, a.y + a.h / 2);
            const lit = focus && (focus === r.from || focus === r.to);
            return (
              <text key={`l${i}`} x={(p1.x + p2.x) / 2 + 6} y={(p1.y + p2.y) / 2 - 6} className="edge-label uml-rel-label" data-dim={focus && !lit ? true : undefined}>
                {r.label}
              </text>
            );
          })}
        </svg>
      </div>
      <figcaption>
        {compact && sel && (
          <div className="uml-card" id={`${uid}card`}>
            <p className="uml-card-head">
              {sel.stereotype && <span className="uml-card-stereo">«{sel.stereotype}»</span>}
              <span className="uml-card-name">{sel.name}</span>
              <span className="uml-card-hint">Pick a class to see its members</span>
            </p>
            <div className="uml-card-cols">
              <div>
                <span className="uml-card-k">Fields</span>
                {sel.fields?.length ? (
                  <ul>
                    {sel.fields.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="uml-card-none">none</p>
                )}
              </div>
              <div>
                <span className="uml-card-k">Methods</span>
                {sel.methods?.length ? (
                  <ul>
                    {sel.methods.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="uml-card-none">none</p>
                )}
              </div>
            </div>
            {relationsInWords(sel.id, spec).length > 0 && <p className="uml-card-rels">{relationsInWords(sel.id, spec).join("; ")}.</p>}
          </div>
        )}
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
