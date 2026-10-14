"use client";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { m, useInView, useReducedMotionConfig } from "motion/react";
import { cn } from "@/lib/cn";
import { useBoxWidth } from "@/lib/hooks";
import { KIND_META } from "./kinds";
import { ArrowMarker, Legend, Packet, StepControls } from "./parts";
import type { SeqAlt, SeqItem, SeqMessage, SeqNote, SequenceSpec } from "./types";
import { useStepper } from "./useStepper";

type Row =
  | { kind: "msg"; msg: SeqMessage; depth: number }
  | { kind: "note"; note: SeqNote; depth: number }
  | { kind: "frame"; label: string; depth: number; span: number };

/** Flatten using the branch the reader picked for each alt block (key = path like "r.3"). */
export function flatten(items: SeqItem[], choice: Record<string, number>, path = "r", depth = 0): Row[] {
  return items.flatMap((it, i): Row[] => {
    if ("alt" in it) {
      const key = `${path}.${i}`;
      const branch = it.alt[choice[key] ?? 0];
      const inner = flatten(branch.items, choice, key, depth + 1);
      return [{ kind: "frame", label: `[${branch.when}]`, depth, span: inner.length }, ...inner];
    }
    return "note" in it ? [{ kind: "note", note: it, depth }] : [{ kind: "msg", msg: it, depth }];
  });
}

/** Every alt block reachable with the current choices (for the branch selectors). */
function altBlocks(items: SeqItem[], choice: Record<string, number>, path = "r"): { key: string; alt: SeqAlt["alt"] }[] {
  return items.flatMap((it, i) => {
    if (!("alt" in it)) return [];
    const key = `${path}.${i}`;
    const branch = it.alt[choice[key] ?? 0];
    return [{ key, alt: it.alt }, ...altBlocks(branch.items, choice, key)];
  });
}

/** Column spacing: as wide as the figure allows, between these bounds (the server render uses the widest). */
const MIN_COL = 112;
const MAX_COL = 168;
const ROW = 36;
const HEAD = 52;
const PAD_X = 64;
/** Below this scale the diagram scrolls sideways instead of shrinking further. */
const MIN_SCALE = 0.7;
/** Rough rendered width of a message label (12 px sans), to keep self-message labels inside the drawing. */
const textW = (s: string) => s.length * 6.4;

/** Split a long actor name over two lines at the space nearest its middle. */
function actorLines(label: string, room: number): string[] {
  if (label.length * 7.2 <= room || !label.includes(" ")) return [label];
  const mid = label.length / 2;
  let best = -1;
  for (let i = 0; i < label.length; i++) if (label[i] === " " && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
  return [label.slice(0, best), label.slice(best + 1)];
}

/**
 * Lifelines with one message per row. The actor header stays pinned while the message area scrolls inside a capped
 * box (it follows the current step), so a long sequence never makes the figure taller than about 600 px. Columns
 * squeeze to the figure's own width (down to MIN_COL) before anything scrolls sideways.
 */
export function SequenceDiagram({ spec }: { spec: SequenceSpec }) {
  const uid = useId().replace(/:/g, "");
  const [choice, setChoice] = useState<Record<string, number>>({});
  const rows = useMemo(() => flatten(spec.items, choice), [spec.items, choice]);
  const blocks = useMemo(() => altBlocks(spec.items, choice), [spec.items, choice]);
  const msgRows = useMemo(() => rows.map((r, i) => (r.kind === "msg" ? i : -1)).filter((i) => i >= 0), [rows]);
  const durationOf = useCallback(() => 1200, []);
  const stepper = useStepper(msgRows.length, durationOf);
  const reduce = useReducedMotionConfig();
  const box = useRef<HTMLElement>(null);
  const inView = useInView(box, { margin: "-10% 0px" });
  const scroller = useRef<HTMLDivElement>(null);
  const boxWidth = useBoxWidth(scroller);

  const n = spec.actors.length;
  const col = boxWidth === undefined ? MAX_COL : Math.max(MIN_COL, Math.min(MAX_COL, (boxWidth - 2 * PAD_X) / Math.max(1, n - 1)));
  const width = Math.round(PAD_X * 2 + (n - 1) * col);
  const actorW = Math.min(132, col - 12);
  const showIcon = actorW >= 118;
  const xOf = (id: string) => PAD_X + spec.actors.findIndex((a) => a.id === id) * col;
  const lastId = spec.actors.at(-1)?.id;
  const height = rows.length * ROW + 14;
  const currentRow = stepper.index >= 0 ? msgRows[stepper.index] : -1;
  // Self-messages loop to the right of their lifeline (to the left on the last actor), label beyond the loop.
  const selfLeft = (r: Extract<Row, { kind: "msg" }>) => r.msg.from === lastId || xOf(r.msg.from) + 50 + textW(r.msg.label) > width;
  const msgPath = (r: Extract<Row, { kind: "msg" }>, i: number) => {
    const y = i * ROW + ROW / 2 + 4;
    const x1 = xOf(r.msg.from);
    const x2 = xOf(r.msg.to);
    if (r.msg.from === r.msg.to) {
      const d = selfLeft(r) ? -1 : 1;
      return `M${x1},${y - 8} C${x1 + d * 44},${y - 8} ${x1 + d * 44},${y + 10} ${x1 + d * 4},${y + 10}`;
    }
    return `M${x1 + Math.sign(x2 - x1) * 4},${y + 6} L${x2 - Math.sign(x2 - x1) * 6},${y + 6}`;
  };
  const started = stepper.index >= 0;
  const caption = currentRow >= 0 && rows[currentRow].kind === "msg" ? describe(rows[currentRow].msg, spec) : spec.description;
  const minWidth = Math.min(width, Math.round(width * MIN_SCALE));

  // Keep the current message in view inside the capped message area (never scrolls the page).
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (currentRow < 0) {
      el.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
      return;
    }
    const row = el.querySelector<SVGGElement>(`[data-row="${currentRow}"]`);
    const head = el.querySelector<HTMLElement>(".seq-head");
    if (!row) return;
    const headH = head?.getBoundingClientRect().height ?? 0;
    const r = row.getBoundingClientRect();
    const top = r.top - el.getBoundingClientRect().top + el.scrollTop;
    const view = el.clientHeight - headH;
    if (top - headH < el.scrollTop + 4 || top + r.height > el.scrollTop + el.clientHeight - 8) {
      el.scrollTo({ top: Math.max(0, top - headH - view / 3), behavior: reduce ? "auto" : "smooth" });
    }
  }, [currentRow, reduce, choice]);

  return (
    <figure ref={box} className={cn("flow seq", !inView && "is-paused")}>
      {blocks.length > 0 && (
        <div className="branch-pickers">
          {blocks.map((b) => (
            <div key={b.key} role="radiogroup" aria-label="Branch" className="scenario-tabs">
              {b.alt.map((br, i) => (
                <button
                  key={br.when}
                  type="button"
                  role="radio"
                  aria-checked={(choice[b.key] ?? 0) === i}
                  onClick={() => {
                    setChoice((c) => ({ ...c, [b.key]: i }));
                    stepper.reset();
                  }}
                >
                  {br.when}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
      <div ref={scroller} className="flow-scroll seq-scroll" tabIndex={0} aria-keyshortcuts="Space ArrowLeft ArrowRight Home" onKeyDown={stepper.handleKey}>
        {/* Actor header: pinned while the messages scroll under it. Same viewBox width as the body, so both scale alike. */}
        <svg className="seq-head" viewBox={`0 0 ${width} ${HEAD}`} aria-hidden style={{ width: "100%", maxWidth: width, minWidth }}>
          {spec.actors.map((a) => {
            const x = xOf(a.id);
            const meta = KIND_META[a.kind];
            const Icon = meta.icon;
            const room = actorW - (showIcon ? 34 : 14);
            const lines = actorLines(a.label, room);
            const tx = showIcon ? x + 9 : x;
            const fit = Math.max(...lines.map((l) => l.length * 7.2)) > room;
            return (
              <g key={a.id} className="actor">
                <line x1={x} x2={x} y1={44} y2={HEAD} className="lifeline" />
                <rect x={x - actorW / 2} y={6} width={actorW} height={38} rx={9} style={{ stroke: meta.color }} />
                {showIcon && <Icon x={x - actorW / 2 + 8} y={17} width={16} height={16} aria-hidden style={{ color: meta.color }} />}
                {lines.map((l, k) => (
                  <text
                    key={k}
                    x={tx}
                    y={lines.length === 1 ? 29.5 : 22 + k * 13}
                    textAnchor="middle"
                    className={lines.length === 1 ? "node-label" : "node-label seq-actor2"}
                    textLength={fit ? Math.min(l.length * 7.2, room) : undefined}
                    lengthAdjust={fit ? "spacingAndGlyphs" : undefined}
                  >
                    {l}
                  </text>
                ))}
              </g>
            );
          })}
        </svg>
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={`${uid}t ${uid}d`} style={{ width: "100%", maxWidth: width, minWidth }}>
          <title id={`${uid}t`}>{spec.title}</title>
          <desc id={`${uid}d`}>{spec.description}</desc>
          <defs>
            <ArrowMarker id={`${uid}-arrow`} />
          </defs>
          {spec.actors.map((a) => (
            <line key={a.id} x1={xOf(a.id)} x2={xOf(a.id)} y1={0} y2={height - 6} className="lifeline" />
          ))}
          {rows.map((r, i) => {
            const y = i * ROW + ROW / 2 + 4;
            const future = started && i > currentRow;
            if (r.kind === "frame") {
              const x1 = 8 + r.depth * 8;
              const x2 = width - 8 - r.depth * 8;
              return (
                <g key={i} data-row={i} className="seq-frame" data-dim={future || undefined}>
                  <rect x={x1} y={y - ROW / 2 + 3} width={x2 - x1} height={(r.span + 1) * ROW - 6} rx={8} />
                  <text x={x1 + 10} y={y + 3} className="frame-label">
                    alt {r.label}
                  </text>
                </g>
              );
            }
            if (r.kind === "note") {
              const xs = r.note.over.map(xOf);
              // Centre on the actors it spans, but grow the box to fit the text and keep both inside the drawing.
              const tw = Math.min(width - 20, r.note.note.length * 6.1);
              const mid = Math.max(10 + tw / 2, Math.min(width - 10 - tw / 2, (Math.min(...xs) + Math.max(...xs)) / 2));
              const x1 = Math.max(4, Math.min(Math.min(...xs) - Math.min(70, col / 2), mid - tw / 2 - 8));
              const x2 = Math.min(width - 4, Math.max(Math.max(...xs) + Math.min(70, col / 2), mid + tw / 2 + 8));
              return (
                <g key={i} data-row={i} className="seq-note" data-dim={future || undefined}>
                  <rect x={x1} y={y - 12} width={x2 - x1} height={24} rx={6} />
                  <text x={mid} y={y + 4} textAnchor="middle">
                    {r.note.note}
                  </text>
                </g>
              );
            }
            const { from, to, label, type = "call" } = r.msg;
            const x1 = xOf(from);
            const x2 = xOf(to);
            const self = from === to;
            const left = self && selfLeft(r);
            const d = msgPath(r, i);
            const isCurrent = i === currentRow;
            return (
              <g key={i} data-row={i} className="seq-msg" data-type={type} data-dim={future || undefined} data-active={isCurrent || undefined}>
                <path d={d} className="seq-line" markerEnd={`url(#${uid}-arrow)`} />
                {isCurrent && !reduce && (
                  <m.path d={d} className="edge-trace" initial={{ pathLength: 0, opacity: 1 }} animate={{ pathLength: 1, opacity: 0.0 }} transition={{ duration: 0.9 }} />
                )}
                <text x={self ? x1 + (left ? -50 : 50) : (x1 + x2) / 2} y={y + (self ? 5 : 0)} textAnchor={self ? (left ? "end" : "start") : "middle"} className="seq-label">
                  {label}
                </text>
              </g>
            );
          })}
          {currentRow >= 0 && !reduce && inView && rows[currentRow].kind === "msg" && (
            <Packet key={`${currentRow}-${JSON.stringify(choice)}-${col}`} d={msgPath(rows[currentRow] as Extract<Row, { kind: "msg" }>, currentRow)} ms={800 / stepper.speed} />
          )}
        </svg>
      </div>
      <figcaption>
        <StepControls stepper={stepper} />
        <p className="flow-caption" aria-live="polite">
          {currentRow >= 0 && <span className="step-no">{stepper.index + 1}</span>}
          {caption}
        </p>
        <div className="flow-foot">
          <Legend kinds={[...new Set(spec.actors.map((a) => a.kind))]} />
          <details className="text-desc">
            <summary>Text description</summary>
            <ol>
              {rows
                .filter((r): r is Extract<Row, { kind: "msg" }> => r.kind === "msg")
                .map((r, i) => (
                  <li key={i}>{describe(r.msg, spec)}</li>
                ))}
            </ol>
          </details>
        </div>
      </figcaption>
    </figure>
  );
}

function describe(msg: SeqMessage, spec: SequenceSpec) {
  const name = (id: string) => spec.actors.find((a) => a.id === id)?.label ?? id;
  if (msg.from === msg.to) return `${name(msg.from)}: ${msg.label}`;
  const verb = msg.type === "reply" ? "replies to" : msg.type === "async" ? "sends (async) to" : "→";
  return `${name(msg.from)} ${verb} ${name(msg.to)}: ${msg.label}`;
}
