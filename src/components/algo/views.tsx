"use client";
import { useId, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, m, useReducedMotionConfig } from "motion/react";
import { useBoxWidth } from "@/lib/hooks";
import type { ArrayView, GraphView, GridView, Json, ListView, MapView, NoteView, Prim, QueueView, SetView, StackView, Tone, TreeView, View } from "./types";

const ease = { duration: 0.35, ease: [0.4, 0, 0.2, 1] as const };

export const fmt = (v: Prim | undefined): string => (v === null || v === undefined ? "null" : typeof v === "string" ? v : String(v));
export const fmtJson = (v: Json | undefined): string =>
  v === null || v === undefined ? "null" : typeof v === "string" ? JSON.stringify(v) : Array.isArray(v) ? `[${v.map(fmtJson).join(", ")}]` : typeof v === "object" ? `{${Object.entries(v).map(([k, x]) => `${k}: ${fmtJson(x)}`).join(", ")}}` : String(v);

const TONE_WORD: Partial<Record<Tone, string>> = { found: "✓", bad: "✕" };
const sizeClass = (s: string) => (s.length > 5 ? "xs" : s.length > 3 ? "sm" : undefined);

/** Text that pops briefly when its value changes (never on first render), so the eye catches every update. */
function Val({ text, className }: { text: string; className?: string }) {
  const [seen, setSeen] = useState({ text, n: 0 });
  if (seen.text !== text) setSeen({ text, n: seen.n + 1 });
  return (
    <span key={seen.n} className={seen.n ? (className ? `${className} av-pop` : "av-pop") : className}>
      {text}
    </span>
  );
}

/** Same for SVG text: a short fade-in on change. */
function SvgVal({ text, ...rest }: { text: string } & React.SVGProps<SVGTextElement>) {
  const [seen, setSeen] = useState({ text, n: 0 });
  if (seen.text !== text) setSeen({ text, n: seen.n + 1 });
  return (
    <text key={seen.n} {...rest} className={seen.n ? `${rest.className ?? ""} av-flash`.trim() : rest.className}>
      {text}
    </text>
  );
}

/**
 * FLIP for wrapped chips: when an entry is added or removed, the others slide to their new place instead of jumping.
 * Children opt in with data-flip="key".
 */
function useFlip<T extends HTMLElement>() {
  const box = useRef<T>(null);
  const last = useRef(new Map<string, { x: number; y: number }>());
  const reduce = useReducedMotionConfig();
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const next = new Map<string, { x: number; y: number }>();
    // Layout offsets (the box is position: relative), so running enter/exit transforms don't count as moves.
    el.querySelectorAll<HTMLElement>(":scope > [data-flip]").forEach((c) => {
      const at = { x: c.offsetLeft, y: c.offsetTop };
      const was = last.current.get(c.dataset.flip!);
      next.set(c.dataset.flip!, at);
      if (!was || reduce || typeof c.animate !== "function") return;
      const dx = was.x - at.x;
      const dy = was.y - at.y;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) c.animate([{ translate: `${dx}px ${dy}px` }, { translate: "0 0" }], { duration: 320, easing: "cubic-bezier(.4, 0, .2, 1)" });
    });
    last.current = next;
  });
  return box;
}

export function ViewPanel({ view }: { view: View }) {
  switch (view.kind) {
    case "array":
      return <ArrayPanel v={view} />;
    case "grid":
      return <GridPanel v={view} />;
    case "map":
      return <MapPanel v={view} />;
    case "set":
      return <SetPanel v={view} />;
    case "stack":
      return <StackPanel v={view} />;
    case "queue":
      return <QueuePanel v={view} />;
    case "list":
      return <ListPanel v={view} />;
    case "tree":
      return <TreePanel v={view} />;
    case "graph":
      return <GraphPanel v={view} />;
    case "note":
      return <NotePanel v={view} />;
  }
}

function Label({ text, extra }: { text?: string; extra?: string }) {
  if (!text) return null;
  return (
    <div className="av-label">
      {text}
      {extra && <span className="muted"> {extra}</span>}
    </div>
  );
}

// ------------------------------------------------------------------ array
const CELL = 40;
const STEP = 46;
const PTR_ROW = 17;

function ArrayPanel({ v }: { v: ArrayView }) {
  const n = v.values.length;
  const ptrs = Object.entries(v.pointers ?? {}).filter((p): p is [string, number] => typeof p[1] === "number");
  const lo = Math.min(0, ...ptrs.map(([, i]) => i));
  const hi = Math.max(n - 1, ...ptrs.map(([, i]) => i));
  const x = (i: number) => (i - lo) * STEP;
  const rows = new Map<number, number>();
  const rowOf: Record<string, number> = {};
  for (const [name, i] of ptrs) {
    rowOf[name] = rows.get(i) ?? 0;
    rows.set(i, rowOf[name] + 1);
  }
  const showIdx = v.indices !== false;
  const ptrTop = CELL + (showIdx ? 18 : 6);
  const height = ptrTop + Math.max(0, ...rows.values()) * PTR_ROW + 4;
  const ghosts = [...new Set(ptrs.map(([, i]) => i).filter((i) => i < 0 || i >= n))];
  if (n === 0 && !ptrs.length) {
    return (
      <div className="av av-array">
        <Label text={v.label} extra="(0)" />
        <span className="av-empty">empty</span>
      </div>
    );
  }
  return (
    <div className="av av-array">
      <Label text={v.label} extra={`(${n})`} />
      <div className="av-scroll">
        <div className="av-track" style={{ width: Math.max(CELL, (hi - lo + 1) * STEP - (STEP - CELL)), height }}>
          {v.window && (
            <m.div
              className="av-window"
              aria-hidden
              initial={false}
              animate={{ x: x(v.window[0]) - 3, width: Math.max(0, v.window[1] - v.window[0] + 1) * STEP - (STEP - CELL) + 6, opacity: v.window[1] >= v.window[0] ? 1 : 0 }}
              transition={ease}
            />
          )}
          {ghosts.map((i) => (
            <div key={`g${i}`} className="av-cell av-ghost" style={{ left: x(i) }} aria-hidden>
              <span>{i < 0 ? "−1" : "end"}</span>
            </div>
          ))}
          {v.values.map((val, i) => {
            const s = fmt(val);
            const tone = v.tones?.[i];
            return (
              <div key={i} className="av-cell" data-tone={tone} data-size={sizeClass(s)} style={{ left: x(i) }}>
                <Val text={s} />
                {tone && TONE_WORD[tone] && <i className="av-mark">{TONE_WORD[tone]}</i>}
              </div>
            );
          })}
          {showIdx &&
            v.values.map((_, i) => (
              <div key={`i${i}`} className="av-idx" style={{ left: x(i), top: CELL + 2 }} aria-hidden>
                {i}
              </div>
            ))}
          {ptrs.map(([name, i]) => (
            <m.div key={name} className="av-ptr" initial={false} animate={{ x: x(i), y: ptrTop + rowOf[name] * PTR_ROW }} transition={ease}>
              ▲ {name}
            </m.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ grid
function GridPanel({ v }: { v: GridView }) {
  const cols = Math.max(0, ...v.cells.map((r) => r.length));
  const hasRow = !!v.rowLabels?.length;
  const hasCol = !!v.colLabels?.length;
  return (
    <div className="av av-grid">
      <Label text={v.label} extra={`(${v.cells.length}×${cols})`} />
      <div className="av-scroll">
        <div className="av-gridwrap" style={{ gridTemplateColumns: `${hasRow ? "auto " : ""}repeat(${cols}, minmax(30px, auto))` }}>
          {hasCol && (
            <>
              {hasRow && <span />}
              {Array.from({ length: cols }, (_, c) => (
                <span key={`c${c}`} className="av-head">
                  {fmt(v.colLabels![c] ?? "")}
                </span>
              ))}
            </>
          )}
          {v.cells.map((row, r) => (
            <div key={r} style={{ display: "contents" }}>
              {hasRow && <span className="av-head av-rowhead">{fmt(v.rowLabels![r] ?? "")}</span>}
              {Array.from({ length: cols }, (_, c) => {
                const s = c < row.length ? fmt(row[c]) : "";
                const tone = v.tones?.[`${r},${c}`];
                return (
                  <span key={c} className="av-gcell" data-tone={tone} data-size={sizeClass(s)} data-empty={s === "" || undefined}>
                    <Val text={s} />
                    {tone && TONE_WORD[tone] && <i className="av-mark">{TONE_WORD[tone]}</i>}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ map / set
function MapPanel({ v }: { v: MapView }) {
  const box = useFlip<HTMLDivElement>();
  return (
    <div className="av av-map">
      <Label text={v.label} extra={`(size ${v.entries.length})`} />
      <div className="av-chips" ref={box}>
        {v.entries.length === 0 && <span className="av-empty">empty</span>}
        <AnimatePresence initial={false} mode="popLayout">
          {v.entries.map(([k, val]) => (
            <m.span
              key={String(k)}
              data-flip={String(k)}
              className="av-chip"
              data-tone={v.tones?.[String(k)]}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7, transition: { duration: 0.2 } }}
              transition={ease}
            >
              <b>{fmt(k)}</b>
              <span className="av-arrow">→</span>
              <Val text={fmt(val)} />
            </m.span>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function SetPanel({ v }: { v: SetView }) {
  const box = useFlip<HTMLDivElement>();
  return (
    <div className="av av-map">
      <Label text={v.label} extra={`(size ${v.items.length})`} />
      <div className="av-chips" ref={box}>
        {v.items.length === 0 && <span className="av-empty">empty</span>}
        <AnimatePresence initial={false} mode="popLayout">
          {v.items.map((k) => (
            <m.span
              key={String(k)}
              data-flip={String(k)}
              className="av-chip"
              data-tone={v.tones?.[String(k)]}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7, transition: { duration: 0.2 } }}
              transition={ease}
            >
              <b>{fmt(k)}</b>
            </m.span>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ stack / queue
/** Stable keys for items that may repeat: value + how many equal values came before it. */
function itemKeys(items: Prim[]) {
  const seen = new Map<string, number>();
  return items.map((it) => {
    const s = fmt(it);
    const k = seen.get(s) ?? 0;
    seen.set(s, k + 1);
    return `${s}#${k}`;
  });
}
const itemWidth = (items: Prim[]) => Math.max(40, ...items.map((i) => fmt(i).length * 8.5 + 18));

function StackPanel({ v }: { v: StackView }) {
  const w = itemWidth(v.items);
  const H = 32;
  const GAP = 5;
  const n = v.items.length;
  return (
    <div className="av av-stack">
      <Label text={v.label} extra={`(${n})`} />
      <div className="av-stackbox" style={{ width: w + 64, height: Math.max(1, n) * (H + GAP) + 8 }}>
        {n === 0 && <span className="av-empty">empty</span>}
        <AnimatePresence initial={false}>
          {v.items.map((it, i) => {
            const fromTop = n - 1 - i;
            return (
              <m.div
                key={`${i}-${fmt(it)}`}
                className="av-sitem"
                data-tone={v.tones?.[i]}
                style={{ width: w, height: H }}
                initial={{ opacity: 0, y: -24 }}
                animate={{ opacity: 1, y: fromTop * (H + GAP) }}
                exit={{ opacity: 0, x: 40, transition: { duration: 0.25 } }}
                transition={ease}
              >
                {fmt(it)}
                {i === n - 1 && <span className="av-top">← top</span>}
              </m.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

function QueuePanel({ v }: { v: QueueView }) {
  const w = itemWidth(v.items);
  const GAP = 6;
  const keys = itemKeys(v.items);
  return (
    <div className="av av-queue">
      <Label text={v.label} extra={`(${v.items.length})`} />
      <div className="av-scroll">
        <div className="av-queuebox" style={{ width: Math.max(1, v.items.length) * (w + GAP) + 4, height: 54 }}>
          {v.items.length === 0 && <span className="av-empty">empty</span>}
          <AnimatePresence initial={false}>
            {v.items.map((it, i) => (
              <m.div
                key={keys[i]}
                className="av-qitem"
                data-tone={v.tones?.[i]}
                style={{ width: w }}
                initial={{ opacity: 0, x: (v.items.length + 0.5) * (w + GAP) }}
                animate={{ opacity: 1, x: i * (w + GAP) }}
                exit={{ opacity: 0, x: -w, transition: { duration: 0.25 } }}
                transition={ease}
              >
                {fmt(it)}
              </m.div>
            ))}
          </AnimatePresence>
          {v.items.length === 1 && (
            <span className="av-qlabel" style={{ left: 0 }}>
              front = back
            </span>
          )}
          {v.items.length > 1 && (
            <>
              <span className="av-qlabel" style={{ left: 0 }}>
                front
              </span>
              <span className="av-qlabel" style={{ left: (v.items.length - 1) * (w + GAP) }}>
                back
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Natural size when there is room; shrink to 70% before scrolling sideways. */
const shrink = (width: number) => ({ width: "100%", maxWidth: width, minWidth: Math.round(width * 0.7) });

// ------------------------------------------------------------------ linked list
const NW = 46;
const NH = 34;
const LSTEP = 84;

function ListPanel({ v }: { v: ListView }) {
  const uid = useId().replace(/:/g, "");
  const ptrs = Object.entries(v.pointers ?? {});
  const hasNullPtr = ptrs.some(([, id]) => id === null);
  const offset = hasNullPtr ? 1 : 0;
  const index = new Map(v.nodes.map((n, i) => [n.id, i]));
  const X = (i: number) => 14 + (i + offset) * LSTEP;
  const top = 34;
  const mid = top + NH / 2;
  const last = v.nodes.length - 1;
  const endsInNull = last >= 0 && v.next[v.nodes[last].id] === null;
  const rows = new Map<number, number>();
  const rowOf: Record<string, number> = {};
  for (const [name, id] of ptrs) {
    const i = id === null ? -1 : (index.get(id) ?? -1);
    rowOf[name] = rows.get(i) ?? 0;
    rows.set(i, rowOf[name] + 1);
  }
  const width = X(last) + NW + (endsInNull ? 64 : 16);
  const height = top + NH + 22 + Math.max(0, ...rows.values()) * 15;
  const arrows = v.nodes.flatMap((n, i) => {
    const to = v.next[n.id];
    if (to === null || to === undefined) return [];
    const j = index.get(to);
    if (j === undefined) return [];
    let d: string;
    if (j === i + 1) d = `M${X(i) + NW} ${mid - 5} L${X(j) - 3} ${mid - 5}`;
    else if (j === i - 1) d = `M${X(i)} ${mid + 5} L${X(j) + NW + 3} ${mid + 5}`;
    else if (j === i) d = `M${X(i) + NW - 10} ${top} C ${X(i) + NW + 20} ${top - 30}, ${X(i) - 20} ${top - 30}, ${X(i) + 10} ${top - 3}`;
    else {
      const h = Math.min(30, 10 + Math.abs(j - i) * 6);
      d = `M${X(i) + NW / 2} ${top} C ${X(i) + NW / 2} ${top - h}, ${X(j) + NW / 2} ${top - h}, ${X(j) + NW / 2} ${top - 3}`;
    }
    return [{ key: `${n.id}>${to}`, d }];
  });
  return (
    <div className="av av-list">
      <Label text={v.label} />
      <div className="av-scroll">
        <svg viewBox={`0 0 ${width} ${height}`} style={shrink(width)} role="img" aria-label={`Linked list: ${v.nodes.map((n) => fmt(n.value)).join(", ")}`}>
          <defs>
            <marker id={`${uid}a`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0L10 5L0 10z" className="av-head-fill" />
            </marker>
          </defs>
          {hasNullPtr && (
            <g aria-hidden>
              <rect x={X(-1) + 6} y={top + 4} width={NW - 12} height={NH - 8} rx={8} className="av-ghostrect" />
              <text x={X(-1) + NW / 2} y={mid + 4} textAnchor="middle" className="av-nulltext">
                null
              </text>
            </g>
          )}
          <AnimatePresence initial={false}>
            {arrows.map((a) => (
              <m.path
                key={a.key}
                d={a.d}
                className="av-link"
                markerEnd={`url(#${uid}a)`}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
                transition={{ duration: 0.45 }}
              />
            ))}
          </AnimatePresence>
          {v.nodes.map((n, i) => (
            <g key={n.id} className="av-lnode" data-tone={v.tones?.[n.id]}>
              <rect x={X(i)} y={top} width={NW} height={NH} rx={9} />
              <text x={X(i) + NW / 2} y={mid + 4.5} textAnchor="middle">
                {fmt(n.value)}
              </text>
              {v.next[n.id] === null && i !== last && (
                <text x={X(i) + NW + 5} y={mid - 4} className="av-nulltext" aria-hidden>
                  ∅
                </text>
              )}
            </g>
          ))}
          {endsInNull && (
            <g aria-hidden>
              <path d={`M${X(last) + NW} ${mid - 5} L${X(last) + NW + 18} ${mid - 5}`} className="av-link" markerEnd={`url(#${uid}a)`} />
              <text x={X(last) + NW + 22} y={mid - 1} className="av-nulltext">
                null
              </text>
            </g>
          )}
          {ptrs.map(([name, id]) => {
            const i = id === null ? -1 : (index.get(id) ?? -1);
            return (
              <m.text key={name} className="av-ptrtext" textAnchor="middle" initial={false} animate={{ x: X(i) + NW / 2, y: top + NH + 16 + rowOf[name] * 15 }} transition={ease}>
                ▲ {name}
              </m.text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ tree
const TR = 17;
const TX = 42;
const TY = 52;

function TreePanel({ v }: { v: TreeView }) {
  const byId = new Map(v.nodes.map((n) => [n.id, n]));
  const pos = new Map<string, { x: number; y: number }>();
  let order = 0;
  let depthMax = 0;
  const seen = new Set<string>();
  const walk = (id: string | null, depth: number) => {
    if (!id || seen.has(id)) return;
    const n = byId.get(id);
    if (!n) return;
    seen.add(id);
    walk(n.left, depth + 1);
    pos.set(id, { x: 24 + order++ * TX, y: 26 + depth * TY });
    depthMax = Math.max(depthMax, depth);
    walk(n.right, depth + 1);
  };
  walk(v.root, 0);
  const width = Math.max(80, 48 + Math.max(0, order - 1) * TX);
  const ptrRows: Record<string, number> = {};
  const count = new Map<string, number>();
  for (const [name, id] of Object.entries(v.pointers ?? {})) {
    if (!id) continue;
    ptrRows[name] = count.get(id) ?? 0;
    count.set(id, ptrRows[name] + 1);
  }
  const height = 26 + depthMax * TY + TR + 16 + Math.max(0, ...count.values()) * 14 + 4;
  const edges = v.nodes.flatMap((n) =>
    [n.left, n.right].filter((c): c is string => !!c && pos.has(c) && pos.has(n.id)).map((c) => ({ key: `${n.id}-${c}`, a: pos.get(n.id)!, b: pos.get(c)! })),
  );
  return (
    <div className="av av-tree">
      <Label text={v.label} />
      <div className="av-scroll">
        {v.root === null ? (
          <span className="av-empty">empty tree (null)</span>
        ) : (
          <svg viewBox={`0 0 ${width} ${height}`} style={shrink(width)} role="img" aria-label={`Tree with ${pos.size} nodes`}>
            {edges.map((e) => (
              <m.line key={e.key} className="av-tedge" initial={{ x1: e.a.x, y1: e.a.y, x2: e.b.x, y2: e.b.y, opacity: 0 }} animate={{ x1: e.a.x, y1: e.a.y, x2: e.b.x, y2: e.b.y, opacity: 1 }} transition={ease} />
            ))}
            {v.nodes
              .filter((n) => pos.has(n.id))
              .map((n) => {
                const p = pos.get(n.id)!;
                const s = fmt(n.value);
                const tone = v.tones?.[n.id];
                return (
                  <m.g key={n.id} className="av-tnode" data-tone={tone} initial={{ x: p.x, y: p.y, opacity: 0 }} animate={{ x: p.x, y: p.y, opacity: 1 }} transition={ease}>
                    <circle r={TR} />
                    <SvgVal text={s} y={4.5} textAnchor="middle" data-size={sizeClass(s)} />
                    {tone && TONE_WORD[tone] && (
                      <text x={TR - 2} y={-TR + 5} className="av-tmark">
                        {TONE_WORD[tone]}
                      </text>
                    )}
                    {v.badges?.[n.id] !== undefined && <SvgVal text={fmt(v.badges[n.id])} x={TR + 3} y={-TR + 2} className="av-badge" />}
                  </m.g>
                );
              })}
            {Object.entries(v.pointers ?? {}).map(([name, id]) => {
              const p = id ? pos.get(id) : undefined;
              if (!p) return null;
              return (
                <m.text key={name} className="av-ptrtext" textAnchor="middle" initial={false} animate={{ x: p.x, y: p.y + TR + 13 + ptrRows[name] * 14 }} transition={ease}>
                  ▲ {name}
                </m.text>
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ graph
const GR = 18;
const GPAD = 30;

/** Width of an element, tracked with ResizeObserver (undefined until measured, so the server render is stable). */
function GraphPanel({ v }: { v: GraphView }) {
  const uid = useId().replace(/:/g, "");
  // A squarer canvas on narrow stages keeps nodes and labels readable instead of shrinking a wide drawing.
  const box = useRef<HTMLDivElement>(null);
  const width = useBoxWidth(box);
  const narrow = width !== undefined && width < 460;
  const GW = narrow ? 380 : 520;
  const GH = narrow ? 280 : 270;
  const P = new Map(v.nodes.map((n) => [n.id, { x: GPAD + (n.x / 100) * (GW - 2 * GPAD), y: GPAD + (n.y / 100) * (GH - 2 * GPAD) }]));
  const edgeTone = (a: string, b: string) => v.edgeTones?.[`${a}-${b}`] ?? (v.directed ? undefined : v.edgeTones?.[`${b}-${a}`]);
  const hasPair = new Set(v.edges.map((e) => `${e.from}-${e.to}`));
  return (
    <div className="av av-graph" ref={box}>
      <Label text={v.label} />
      <div className="av-scroll">
        <svg viewBox={`0 0 ${GW} ${GH}`} style={{ width: "100%", maxWidth: GW, minWidth: 260 }} role="img" aria-label={`Graph with ${v.nodes.length} nodes and ${v.edges.length} edges`}>
          <defs>
            <marker id={`${uid}g`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0L10 5L0 10z" className="av-head-fill" />
            </marker>
          </defs>
          {v.edges.map((e, i) => {
            const a = P.get(e.from);
            const b = P.get(e.to);
            if (!a || !b) return null;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const len = Math.hypot(dx, dy) || 1;
            const ux = dx / len;
            const uy = dy / len;
            // Bend one of a pair of opposite directed edges so both stay visible.
            const bend = v.directed && hasPair.has(`${e.to}-${e.from}`) ? 18 : 0;
            const sx = a.x + ux * GR;
            const sy = a.y + uy * GR;
            const ex = b.x - ux * (GR + (v.directed ? 3 : 0));
            const ey = b.y - uy * (GR + (v.directed ? 3 : 0));
            const cx = (sx + ex) / 2 - uy * bend;
            const cy = (sy + ey) / 2 + ux * bend;
            return (
              <m.g key={`${e.from}-${e.to}-${i}`} className="av-gedge" data-tone={edgeTone(e.from, e.to)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={ease}>
                <path d={`M${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`} markerEnd={v.directed ? `url(#${uid}g)` : undefined} />
                {e.w !== undefined && e.w !== null && (
                  <text x={cx} y={cy - 4} textAnchor="middle" className="av-weight">
                    {fmt(e.w)}
                  </text>
                )}
              </m.g>
            );
          })}
          {v.nodes.map((n) => {
            const p = P.get(n.id)!;
            const tone = v.tones?.[n.id];
            return (
              <g key={n.id} className="av-gnode" data-tone={tone} transform={`translate(${p.x},${p.y})`}>
                <m.g initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={ease}>
                  <circle r={GR} />
                  <text y={4.5} textAnchor="middle" data-size={sizeClass(n.label ?? n.id)}>
                    {n.label ?? n.id}
                  </text>
                  {tone && TONE_WORD[tone] && (
                    <text x={GR - 3} y={-GR + 5} className="av-tmark">
                      {TONE_WORD[tone]}
                    </text>
                  )}
                  {v.badges?.[n.id] !== undefined && (
                    <g transform={`translate(0,${GR + 12})`}>
                      <rect x={-17} y={-9} width={34} height={16} rx={8} className="av-gbadge" />
                      <SvgVal text={fmt(v.badges[n.id])} y={3} textAnchor="middle" className="av-gbadge-text" />
                    </g>
                  )}
                </m.g>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function NotePanel({ v }: { v: NoteView }) {
  return (
    <div className="av av-note" data-tone={v.tone}>
      {v.text}
    </div>
  );
}
