"use client";
import { useCallback, useId, useMemo, useRef, useState } from "react";
import { m, useInView, useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";
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

const COL = 168;
const ROW = 44;
const TOP = 66;
const PAD_X = 84;

export function SequenceDiagram({ spec }: { spec: SequenceSpec }) {
  const uid = useId().replace(/:/g, "");
  const [choice, setChoice] = useState<Record<string, number>>({});
  const rows = useMemo(() => flatten(spec.items, choice), [spec.items, choice]);
  const blocks = useMemo(() => altBlocks(spec.items, choice), [spec.items, choice]);
  const msgRows = useMemo(() => rows.map((r, i) => (r.kind === "msg" ? i : -1)).filter((i) => i >= 0), [rows]);
  const durationOf = useCallback(() => 1200, []);
  const stepper = useStepper(msgRows.length, durationOf);
  const reduce = useReducedMotion();
  const box = useRef<HTMLElement>(null);
  const inView = useInView(box, { margin: "-10% 0px" });

  const xOf = (id: string) => PAD_X + spec.actors.findIndex((a) => a.id === id) * COL;
  // Self-messages loop to the right of their lifeline with the label after the loop: leave room when the last actor has one.
  const lastId = spec.actors.at(-1)?.id;
  const selfOnLast = rows.some((r) => r.kind === "msg" && r.msg.from === r.msg.to && r.msg.from === lastId);
  const width = PAD_X * 2 + (spec.actors.length - 1) * COL + (selfOnLast ? 150 : 0);
  const height = TOP + rows.length * ROW + 30;
  const currentRow = stepper.index >= 0 ? msgRows[stepper.index] : -1;
  const msgPath = (r: Extract<Row, { kind: "msg" }>, i: number) => {
    const y = TOP + i * ROW + ROW / 2;
    const x1 = xOf(r.msg.from);
    const x2 = xOf(r.msg.to);
    return r.msg.from === r.msg.to
      ? `M${x1},${y - 8} C${x1 + 60},${y - 8} ${x1 + 60},${y + 12} ${x1 + 4},${y + 12}`
      : `M${x1 + Math.sign(x2 - x1) * 4},${y + 6} L${x2 - Math.sign(x2 - x1) * 6},${y + 6}`;
  };
  const started = stepper.index >= 0;

  const caption = currentRow >= 0 && rows[currentRow].kind === "msg" ? describe(rows[currentRow].msg, spec) : spec.description;

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
      <div className="flow-scroll" tabIndex={0} aria-keyshortcuts="Space ArrowLeft ArrowRight Home" onKeyDown={stepper.handleKey}>
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={`${uid}t ${uid}d`} style={{ width: "100%", maxWidth: width, minWidth: Math.min(width, 560) }}>
          <title id={`${uid}t`}>{spec.title}</title>
          <desc id={`${uid}d`}>{spec.description}</desc>
          <defs>
            <ArrowMarker id={`${uid}-arrow`} />
          </defs>
          {/* actors + lifelines */}
          {spec.actors.map((a) => {
            const x = xOf(a.id);
            const meta = KIND_META[a.kind];
            const Icon = meta.icon;
            return (
              <g key={a.id} className="actor">
                <line x1={x} x2={x} y1={46} y2={height - 10} className="lifeline" />
                <rect x={x - 66} y={8} width={132} height={38} rx={9} style={{ stroke: meta.color }} />
                <Icon x={x - 58} y={19} width={16} height={16} aria-hidden style={{ color: meta.color }} />
                <text x={x + 8} y={32} textAnchor="middle" className="node-label">
                  {a.label}
                </text>
              </g>
            );
          })}
          {/* rows */}
          {rows.map((r, i) => {
            const y = TOP + i * ROW + ROW / 2;
            const future = started && i > currentRow;
            if (r.kind === "frame") {
              const x1 = PAD_X - 74 + r.depth * 8;
              const x2 = PAD_X + (spec.actors.length - 1) * COL + 74 - r.depth * 8 + (selfOnLast ? 140 : 0);
              return (
                <g key={i} className="seq-frame" data-dim={future || undefined}>
                  <rect x={x1} y={y - ROW / 2 + 4} width={x2 - x1} height={(r.span + 1) * ROW - 8} rx={8} />
                  <text x={x1 + 10} y={y + 4} className="frame-label">
                    alt {r.label}
                  </text>
                </g>
              );
            }
            if (r.kind === "note") {
              const xs = r.note.over.map(xOf);
              const x1 = Math.min(...xs) - 70;
              const x2 = Math.max(...xs) + 70;
              return (
                <g key={i} className="seq-note" data-dim={future || undefined}>
                  <rect x={x1} y={y - 13} width={x2 - x1} height={26} rx={6} />
                  <text x={(x1 + x2) / 2} y={y + 4} textAnchor="middle">
                    {r.note.note}
                  </text>
                </g>
              );
            }
            const { from, to, label, type = "call" } = r.msg;
            const x1 = xOf(from);
            const x2 = xOf(to);
            const self = from === to;
            const d = msgPath(r, i);
            const isCurrent = i === currentRow;
            return (
              <g key={i} className="seq-msg" data-type={type} data-dim={future || undefined} data-active={isCurrent || undefined}>
                <path
                  d={d}
                  className="seq-line"
                  markerEnd={`url(#${uid}-arrow)`}
                />
                {isCurrent && !reduce && (
                  <m.path d={d} className="edge-trace" initial={{ pathLength: 0, opacity: 1 }} animate={{ pathLength: 1, opacity: 0.0 }} transition={{ duration: 0.9 }} />
                )}
                <text x={self ? x1 + 66 : (x1 + x2) / 2} y={y - 2} textAnchor={self ? "start" : "middle"} className="seq-label">
                  {label}
                </text>
              </g>
            );
          })}
          {currentRow >= 0 && !reduce && inView && rows[currentRow].kind === "msg" && (
            <Packet key={`${currentRow}-${JSON.stringify(choice)}`} d={msgPath(rows[currentRow] as Extract<Row, { kind: "msg" }>, currentRow)} ms={800 / stepper.speed} />
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
              {rows.filter((r): r is Extract<Row, { kind: "msg" }> => r.kind === "msg").map((r, i) => (
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
