"use client";
import { useCallback, useEffect, useState, type KeyboardEvent, type RefObject } from "react";
import { AnimatePresence, m } from "motion/react";
import { mulberry32 } from "@/lib/rng";
import { useFixedStep } from "@/lib/sim-loop";
import { ReducedNote, SimButtons, useSimGate, useThrottled } from "./lib/sim-kit";
import { More, Slider, WidgetFrame } from "./WidgetFrame";

// ---------------------------------------------------------------- model (pure, tested)
export type Keep = "largest" | "smallest";
/** Stream values have ids 0, 1, 2…; values you type get negative ids, so keys never clash. */
export interface Item {
  id: number;
  v: number;
}
export type Phase = { kind: "idle" } | { kind: "up"; i: number } | { kind: "evict" } | { kind: "down"; i: number };
export type HeapEvent =
  | { kind: "land"; id: number; i: number }
  | { kind: "swap"; dir: "up" | "down"; id: number; other: number }
  | { kind: "stay"; dir: "up" | "down"; id: number; other: number }
  | { kind: "evict"; id: number; moved: number | null };
export interface HeapState {
  k: number;
  keep: Keep;
  heap: Item[];
  phase: Phase;
  streamPos: number;
  typed: number;
  seen: number;
  /** Comparisons the heap has made. */
  comps: number;
  /** Comparisons the trap would make: re-sorting every value seen after each arrival (≈ n log₂ n each time). */
  naive: number;
  out: Item[];
  last: HeapEvent | null;
  /** Game mode: the id of a wrong pick, and how many wrong picks so far. */
  miss: number | null;
  misses: number;
  acc: number;
}

export const SEED = 3;
export const MAX_K = 7;
export const streamValue = (n: number) => 1 + Math.floor(mulberry32(SEED ^ Math.imul(n + 1, 0x9e3779b1))() * 99);
/** True when a belongs above b: a min-heap keeps the k largest, a max-heap the k smallest. */
export const before = (keep: Keep, a: number, b: number) => (keep === "largest" ? a < b : a > b);
export const sortCost = (n: number) => (n < 2 ? 0 : Math.ceil(n * Math.log2(n)));

export const initHeap = (k: number, keep: Keep): HeapState => ({
  k,
  keep,
  heap: [],
  phase: { kind: "idle" },
  streamPos: 0,
  typed: 0,
  seen: 0,
  comps: 0,
  naive: 0,
  out: [],
  last: null,
  miss: null,
  misses: 0,
  acc: 0,
});

export const isHeap = (h: Item[], keep: Keep) => h.every((x, i) => i === 0 || !before(keep, x.v, h[(i - 1) >> 1].v));
const afterSift = (s: HeapState, h: Item[]): Phase => (h.length > s.k ? { kind: "evict" } : { kind: "idle" });
const hasChild = (i: number, n: number) => 2 * i + 1 < n;
/** The child a sift-down would swap with: the one that belongs higher. */
const pickChild = (h: Item[], i: number, keep: Keep) => {
  const l = 2 * i + 1;
  return l + 1 < h.length && before(keep, h[l + 1].v, h[l].v) ? l + 1 : l;
};

function land(s: HeapState, item: Item): HeapState {
  const heap = [...s.heap, item];
  const seen = s.seen + 1;
  const i = heap.length - 1;
  return { ...s, heap, seen, naive: s.naive + sortCost(seen), phase: i === 0 ? afterSift(s, heap) : { kind: "up", i }, last: { kind: "land", id: item.id, i }, miss: null };
}

/** One small move: a value lands, one swap, one "stays", or the root leaves. Idle pulls the next stream value. */
export function stepHeap(s: HeapState): HeapState {
  const { phase, keep } = s;
  if (phase.kind === "idle") return land({ ...s, streamPos: s.streamPos + 1 }, { id: s.streamPos, v: streamValue(s.streamPos) });
  const h = s.heap.slice();
  const base = { ...s, miss: null };
  if (phase.kind === "evict") {
    const top = h[0];
    const tail = h.pop()!;
    if (h.length > 0) h[0] = tail;
    return {
      ...base,
      heap: h,
      out: [...s.out, top].slice(-3),
      phase: hasChild(0, h.length) ? { kind: "down", i: 0 } : { kind: "idle" },
      last: { kind: "evict", id: top.id, moved: h.length ? tail.id : null },
    };
  }
  if (phase.kind === "up") {
    const i = phase.i;
    const p = (i - 1) >> 1;
    if (!before(keep, h[i].v, h[p].v)) return { ...base, comps: s.comps + 1, phase: afterSift(s, h), last: { kind: "stay", dir: "up", id: h[i].id, other: h[p].id } };
    [h[i], h[p]] = [h[p], h[i]];
    return { ...base, heap: h, comps: s.comps + 1, phase: p === 0 ? afterSift(s, h) : { kind: "up", i: p }, last: { kind: "swap", dir: "up", id: h[p].id, other: h[i].id } };
  }
  const i = phase.i;
  const c = pickChild(h, i, keep);
  const comps = s.comps + (2 * i + 2 < h.length ? 2 : 1); // one comparison per child that exists
  if (!before(keep, h[c].v, h[i].v)) return { ...base, comps, phase: { kind: "idle" }, last: { kind: "stay", dir: "down", id: h[i].id, other: h[c].id } };
  [h[i], h[c]] = [h[c], h[i]];
  return { ...base, heap: h, comps, phase: hasChild(c, h.length) ? { kind: "down", i: c } : { kind: "idle" }, last: { kind: "swap", dir: "down", id: h[c].id, other: h[i].id } };
}

export function finish(s: HeapState): HeapState {
  let out = s;
  for (let guard = 0; out.phase.kind !== "idle" && guard < 64; guard++) out = stepHeap(out);
  return out;
}

/** Push a value you typed (the current operation finishes first). */
export function pushValue(s: HeapState, v: number): HeapState {
  const done = finish(s);
  return land({ ...done, typed: done.typed + 1 }, { id: -(done.typed + 1), v });
}

/** Game mode: the node the reader should click now (the swap partner, the value itself if it stays, or the root to evict). */
export function expectedPick(s: HeapState): number | null {
  const h = s.heap;
  const p = s.phase;
  if (p.kind === "evict") return h[0].id;
  if (p.kind === "up") {
    const q = (p.i - 1) >> 1;
    return before(s.keep, h[p.i].v, h[q].v) ? h[q].id : h[p.i].id;
  }
  if (p.kind === "down") {
    const c = pickChild(h, p.i, s.keep);
    return before(s.keep, h[c].v, h[p.i].v) ? h[c].id : h[p.i].id;
  }
  return null;
}

export function pick(s: HeapState, id: number): HeapState {
  const want = expectedPick(s);
  if (want === null) return s;
  return want === id ? stepHeap(s) : { ...s, miss: id, misses: s.misses + 1 };
}

/** The current top k, best first (mid-operation the heap can briefly hold k + 1). */
export const board = (s: HeapState) =>
  s.heap
    .map((x) => x.v)
    .sort((a, b) => (s.keep === "largest" ? b - a : a - b))
    .slice(0, s.k);

// ---------------------------------------------------------------- picture
const R = 15;
/**
 * Wide (desktop pane): the tree on the left; the stream, the evicted values and the array on the right, so the lab
 * fits one screen. Narrow (phones): stream on top, then the tree, then the array (the original stacked drawing).
 */
interface Lay {
  W: number;
  treeW: number;
  treeY: number;
  level: number;
  /** stream chips: first x, y; evicted chips: first x */
  sx: number;
  sy: number;
  ox: number;
  /** array cells: first x, spacing */
  ax: number;
  adx: number;
  wide: boolean;
}
const PX = 352;
const WIDE: Lay = { W: 630, treeW: 330, treeY: 40, level: 50, sx: PX + 14, sy: 40, ox: PX + 182, ax: PX + 18, adx: 34, wide: true };
const NARROW: Lay = { W: 320, treeW: 320, treeY: 86, level: 45, sx: 18, sy: 36, ox: 242, ax: 20, adx: 40, wide: false };
const slot = (L: Lay, i: number) => {
  const d = Math.floor(Math.log2(i + 1));
  return { x: ((i - (2 ** d - 1) + 0.5) * L.treeW) / 2 ** d, y: L.treeY + d * L.level };
};
const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"}`;
const fmt = (n: number) => n.toLocaleString("en-US");
const ease = (reduce: boolean) => ({ duration: reduce ? 0 : 0.32, ease: [0.4, 0, 0.2, 1] as const });

/** A segmented control with its name inline (or announced only), so the toolbar stays one row. */
function Pick<T extends string>({ label, show = false, value, options, onChange }: { label: string; show?: boolean; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {show && (
        <span className="muted" style={{ fontSize: 12.5 }} aria-hidden>
          {label}
        </span>
      )}
      <div className="seg" role="group" aria-label={label}>
        {options.map((o) => (
          <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** True once the element is narrower than `px` (false on the server and until measured). */
function useNarrow(ref: RefObject<HTMLElement | null>, px = 480) {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setNarrow(e.contentRect.width < px));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, px]);
  return narrow;
}

function Chip({ v, r, tone, mark }: { v: number; r: number; tone: "plain" | "active" | "compare" | "out" | "bad" | "root"; mark?: string }) {
  const stroke = { plain: "var(--border-strong)", active: "var(--accent)", compare: "var(--k-client)", out: "var(--critical)", bad: "var(--critical)", root: "var(--accent-2)" }[tone];
  const fill = tone === "plain" ? "var(--card)" : `color-mix(in srgb, ${stroke} ${tone === "out" ? 12 : 18}%, var(--card))`;
  return (
    <>
      <circle r={r} fill={fill} stroke={stroke} strokeWidth={tone === "plain" ? 1.6 : 2.6} />
      <text y={4.5} textAnchor="middle" style={{ fontSize: r > 14 ? 13 : 12, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
        {v}
      </text>
      {mark && (
        <text x={r - 1} y={-r + 3} style={{ fontSize: 11, fontWeight: 800, fill: tone === "bad" || tone === "out" ? "var(--critical-ink)" : "var(--good-ink)" }}>
          {mark}
        </text>
      )}
    </>
  );
}

function describe(s: HeapState, said: { smaller: string; bigger: string }) {
  const name = new Map([...s.heap, ...s.out].map((x) => [x.id, x.v]));
  const v = (id: number) => name.get(id);
  const e = s.last;
  const top = board(s);
  const tail = s.heap.length >= s.k && s.phase.kind === "idle" ? ` Top ${s.k} so far: ${top.join(", ")}; the root ${s.heap[0].v} is the ${ordinal(s.k)} ${s.keep}.` : "";
  if (s.miss !== null && s.phase.kind !== "idle") {
    const want = expectedPick(s);
    if (s.phase.kind === "evict") return `Not ${v(s.miss)}: the root leaves, because it is the weakest value kept.`;
    const mover = s.heap[s.phase.i];
    return want === mover.id
      ? `Not ${v(s.miss)}: ${mover.v} is already in order, so click ${mover.v} itself.`
      : `Not ${v(s.miss)}: ${mover.v} should swap with ${v(want ?? 0)}, so every parent stays ${said.smaller} than its children.`;
  }
  if (!e) return `Press Step or Run to stream values in, or push your own. The heap keeps the ${s.k} ${s.keep} it has seen.`;
  if (e.kind === "land") return `${v(e.id)} lands as the last leaf, index ${e.i}.${e.i === 0 && s.phase.kind === "idle" ? tail : ""}`;
  const rel = (dir: "up" | "down") => (dir === "up" ? `${said.smaller} than its parent` : `${said.bigger} than its ${said.smaller} child`);
  if (e.kind === "swap") return `${v(e.id)} is ${rel(e.dir)} ${v(e.other)}: swap ${e.dir}.${s.phase.kind === "idle" ? tail : ""}`;
  if (e.kind === "stay") return `${v(e.id)} is not ${rel(e.dir)} ${v(e.other)}, so it stays.${s.phase.kind === "idle" ? tail : ` That makes ${s.heap.length} values, but k = ${s.k}.`}`;
  return `${s.k + 1} values but k = ${s.k}: the root ${v(e.id)} leaves, the ${s.keep === "largest" ? "smallest" : "largest"} of them.${e.moved !== null ? ` The last leaf ${v(e.moved)} moves to the root and sifts down.` : ""}${s.phase.kind === "idle" ? tail : ""}`;
}

// ---------------------------------------------------------------- widget
const SPEED_MS = [1100, 750, 500, 330, 200];
const INK = { plain: "var(--fg)", active: "var(--accent)", compare: "var(--k-client)", root: "var(--accent-2)", bad: "var(--critical-ink)" };

export function HeapLab() {
  const [k, setK] = useState(3);
  const [keep, setKeep] = useState<Keep>("largest");
  const [mode, setMode] = useState<"auto" | "you">("auto");
  const [speed, setSpeed] = useState(2);
  const [running, setRunning] = useState(false);
  const [text, setText] = useState("");
  const { ref, inView, reduce } = useSimGate<HTMLDivElement>();
  const L = useNarrow(ref) ? NARROW : WIDE;
  const every = SPEED_MS[speed - 1];
  const tick = useCallback(
    (s: HeapState, dt: number) => {
      const acc = s.acc + dt;
      return acc < every ? { ...s, acc } : { ...stepHeap(s), acc: 0 };
    },
    [every],
  );
  const auto = mode === "auto";
  const [s, reset] = useFixedStep<HeapState>(() => initHeap(3, "largest"), tick, running && auto && inView && !reduce);
  const restart = (nk = k, nkeep = keep) => {
    setRunning(false);
    reset(initHeap(nk, nkeep));
  };
  const said = keep === "largest" ? { smaller: "smaller", bigger: "bigger" } : { smaller: "bigger", bigger: "smaller" };
  const sentence = describe(s, said);
  const live = useThrottled(sentence, 700);

  const want = auto ? null : expectedPick(s);
  const phaseI = s.phase.kind === "up" || s.phase.kind === "down" ? s.phase.i : s.phase.kind === "evict" ? 0 : -1;
  const compareI = s.phase.kind === "up" ? (phaseI - 1) >> 1 : s.phase.kind === "down" ? pickChild(s.heap, phaseI, keep) : -1;
  const full = s.heap.length >= k;
  const typedV = Number(text);
  const canPush = text.trim() !== "" && Number.isInteger(typedV) && typedV >= 0 && typedV <= 99;
  const upcoming = Array.from({ length: 4 }, (_, j) => ({ id: s.streamPos + j, v: streamValue(s.streamPos + j) }));
  const kept = board(s);
  const treeBottom = slot(L, k).y + R + 16;
  const ARR_Y = L.wide ? 126 : treeBottom + 46;
  const H = L.wide ? Math.max(176, treeBottom + 4) : ARR_Y + 40;
  const cellX = (i: number) => L.ax + i * L.adx;
  const heapName = keep === "largest" ? "min-heap" : "max-heap";

  const toneOf = (id: number, i: number): "plain" | "active" | "compare" | "bad" | "root" => {
    if (s.miss === id) return "bad";
    if (i === phaseI) return s.phase.kind === "evict" ? "bad" : "active";
    if (i === compareI) return "compare";
    if (i === 0 && full && s.phase.kind === "idle") return "root";
    return "plain";
  };
  const onKey = (id: number) => (e: KeyboardEvent<SVGGElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      reset(pick(s, id));
    }
  };
  const label = `${keep === "largest" ? "Min" : "Max"}-heap of at most ${k} values, drawn as a tree and as an array: ${s.heap.map((x) => x.v).join(", ") || "empty"}. ${s.seen} values seen, ${s.comps} comparisons.`;

  return (
    <WidgetFrame title="Top-k arena" sub={`Values stream in; a ${heapName} of size k keeps the ${keep} k. Watch each swap on the tree and the array at once.`}>
      <div className="controls">
        <SimButtons
          running={running && auto && !reduce}
          reduce={reduce}
          onToggle={auto ? () => setRunning((r) => !r) : undefined}
          onStep={() => reset(stepHeap(s))}
          stepHint={auto ? "One move: a value lands, one swap, or the root leaves" : "Show me the right move"}
          stepLabel={auto ? "Step" : "Show me"}
          onReset={() => restart()}
        />
        <Pick<"auto" | "you">
          label="Who sifts"
          show
          value={mode}
          onChange={(v) => {
            setMode(v);
            setRunning(false);
          }}
          options={[
            { value: "auto", label: "Auto" },
            { value: "you", label: "You" },
          ]}
        />
        <Pick<Keep>
          label="Keep the"
          value={keep}
          onChange={(v) => {
            setKeep(v);
            restart(k, v);
          }}
          options={[
            { value: "largest", label: "k largest" },
            { value: "smallest", label: "k smallest" },
          ]}
        />
      </div>

      <div ref={ref}>
        <svg viewBox={`0 0 ${L.W} ${H}`} className="sim-svg" role={auto ? "img" : "group"} aria-label={label} style={{ maxWidth: L.wide ? 680 : 460, margin: "0 auto" }}>
          <g aria-hidden="true">
            {L.wide ? (
              <>
                <text x={4} y={14} className="muted-text" style={{ fontSize: 12 }}>
                  {heapName}, k = {k}: the root is the weakest kept
                </text>
                <line x1={PX - 10} x2={PX - 10} y1={6} y2={H - 6} stroke="var(--border)" />
                <text x={PX} y={16} className="muted-text" style={{ fontSize: 12 }}>
                  next in the stream
                </text>
                <text x={L.ox - 14} y={16} className="muted-text" style={{ fontSize: 12 }}>
                  evicted
                </text>
              </>
            ) : (
              <>
                <text x={6} y={16} className="muted-text" style={{ fontSize: 12 }}>
                  next in the stream
                </text>
                <text x={L.W - 4} y={16} textAnchor="end" className="muted-text" style={{ fontSize: 12 }}>
                  evicted
                </text>
                <line x1={198} x2={198} y1={6} y2={52} stroke="var(--border)" />
              </>
            )}
            {Array.from({ length: Math.max(k, s.heap.length) }, (_, i) => i)
              .filter((i) => i > 0)
              .map((i) => {
                const p = (i - 1) >> 1;
                const a = slot(L, p);
                const b = slot(L, i);
                const hot = (i === phaseI && compareI === p) || (i === compareI && phaseI === p);
                return (
                  <line
                    key={i}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={hot ? "var(--k-client)" : i < s.heap.length ? "var(--border-strong)" : "var(--border)"}
                    strokeWidth={hot ? 3 : 1.6}
                    strokeDasharray={i < s.heap.length ? undefined : "3 4"}
                  />
                );
              })}
            {Array.from({ length: k + 1 }, (_, i) => (
              <circle
                key={i}
                cx={slot(L, i).x}
                cy={slot(L, i).y}
                r={R + 3}
                fill="none"
                stroke={i === k ? "var(--critical)" : "var(--border)"}
                strokeDasharray="3 3"
                opacity={i === k && s.heap.length <= k ? 0.45 : 1}
              />
            ))}
            <text x={slot(L, k).x + R + 3} y={slot(L, k).y - R + 2} opacity={s.heap.length > k ? 1 : 0.6} style={{ fontSize: 10.5, fontWeight: 750, fill: "var(--critical-ink)" }}>
              k+1
            </text>
            {full && s.phase.kind === "idle" && (
              <text x={slot(L, 0).x + R + 8} y={slot(L, 0).y + 4} style={{ fontSize: 12, fontWeight: 700, fill: "var(--accent-2)" }}>
                ← {ordinal(k)} {keep}
              </text>
            )}
            <text x={L.wide ? PX : 4} y={ARR_Y - 24} className="muted-text" style={{ fontSize: 12 }}>
              as an array: children of i at 2i+1, 2i+2
            </text>
            {Array.from({ length: k + 1 }, (_, i) => (
              <g key={i}>
                <rect
                  x={cellX(i) - 15}
                  y={ARR_Y - 15}
                  width={30}
                  height={30}
                  rx={6}
                  fill="var(--card-2)"
                  stroke={i === k ? "var(--critical)" : "var(--border)"}
                  strokeDasharray={i === k ? "3 3" : undefined}
                />
                <text x={cellX(i)} y={ARR_Y + 30} textAnchor="middle" className="muted-text" style={{ fontSize: 11.5 }}>
                  {i}
                </text>
              </g>
            ))}
            {L.wide && (
              <text x={PX} y={ARR_Y + 58} style={{ fontSize: 13, fontWeight: 700 }}>
                Top {k}: <tspan style={{ fill: "var(--accent-2)" }}>{kept.length ? kept.join(", ") : "none yet"}</tspan>
              </text>
            )}
          </g>
          <AnimatePresence initial={false}>
            {upcoming.map((x, j) => (
              <m.g
                key={`t${x.id}`}
                aria-hidden="true"
                initial={reduce ? false : { opacity: 0, x: L.sx + 160, y: L.sy }}
                animate={{ opacity: 1, x: L.sx + j * 29, y: L.sy }}
                exit={{ opacity: 0 }}
                transition={ease(reduce)}
              >
                <Chip v={x.v} r={12} tone="plain" />
              </m.g>
            ))}
            {s.out.map((x, j) => (
              <m.g key={`t${x.id}`} aria-hidden="true" initial={false} animate={{ opacity: j === s.out.length - 1 ? 1 : 0.55, x: L.ox + j * 29, y: L.sy }} exit={{ opacity: 0 }} transition={ease(reduce)}>
                <Chip v={x.v} r={12} tone="out" mark={j === s.out.length - 1 ? "✕" : undefined} />
              </m.g>
            ))}
            {s.heap.map((x, i) => {
              const p = slot(L, i);
              const click = !auto && want !== null;
              return (
                <m.g
                  key={`t${x.id}`}
                  initial={reduce ? false : { opacity: 0, x: p.x, y: p.y - 30 }}
                  animate={{ opacity: 1, x: p.x, y: p.y }}
                  exit={{ opacity: 0 }}
                  transition={ease(reduce)}
                  role={click ? "button" : undefined}
                  tabIndex={click ? 0 : undefined}
                  aria-label={click ? `${x.v}${s.miss === x.id ? " ✕ not this one" : ""}, index ${i}` : undefined}
                  aria-hidden={click ? undefined : true}
                  onClick={click ? () => reset(pick(s, x.id)) : undefined}
                  onKeyDown={click ? onKey(x.id) : undefined}
                  style={click ? { cursor: "pointer" } : undefined}
                >
                  <Chip v={x.v} r={R} tone={toneOf(x.id, i)} mark={s.miss === x.id ? "✕" : undefined} />
                </m.g>
              );
            })}
            {s.heap.map((x, i) => (
              <m.g
                key={`a${x.id}`}
                aria-hidden="true"
                initial={reduce ? false : { opacity: 0, x: cellX(i), y: ARR_Y - 20 }}
                animate={{ opacity: 1, x: cellX(i), y: ARR_Y }}
                exit={{ opacity: 0 }}
                transition={ease(reduce)}
              >
                <text y={4.5} textAnchor="middle" style={{ fontSize: 13, fontWeight: 700, fill: INK[toneOf(x.id, i)] }}>
                  {x.v}
                </text>
              </m.g>
            ))}
          </AnimatePresence>
        </svg>
      </div>

      <p className="muted" style={{ fontSize: 13, margin: "6px 0 0", display: "flex", flexWrap: "wrap", gap: "4px 14px" }}>
        {!L.wide && (
          <span>
            Top {k}: <b style={{ color: "var(--fg)" }}>{kept.length ? kept.join(", ") : "none yet"}</b>
          </span>
        )}
        <span>
          Held: <b style={{ color: "var(--fg)" }}>{s.heap.length}</b> of {s.seen} seen
        </span>
        <span>
          Comparisons: <b style={{ color: "var(--fg)" }}>{fmt(s.comps)}</b> vs ≈{fmt(s.naive)} re-sorting after every arrival
        </span>
        {!auto && (
          <span>
            Wrong picks: <b style={{ color: "var(--fg)" }}>{s.misses}</b>
          </span>
        )}
      </p>
      {!auto && (
        <p className="muted" style={{ fontSize: 13, margin: "4px 0 0" }}>
          {want === null
            ? "Press Show me (or push a value) to bring in the next value."
            : s.phase.kind === "evict"
              ? "Your move: click the value that must leave."
              : `Your move: click the node ${s.heap[phaseI]?.v} should swap with, or click ${s.heap[phaseI]?.v} itself if it is in place.`}
        </p>
      )}
      <p className="readout" aria-live="polite">
        {live}
        <ReducedNote reduce={reduce} what="Reduced motion: no auto-play; Step makes one move." />
      </p>
      <More label="k, speed and your own values">
        <div className="controls">
          <Slider
            label="k"
            value={k}
            min={1}
            max={MAX_K}
            onChange={(v) => {
              setK(v);
              restart(v, keep);
            }}
          />
          <Slider label="Speed" value={speed} min={1} max={5} onChange={setSpeed} />
          <form
            style={{ display: "flex", gap: 6, alignItems: "flex-end" }}
            onSubmit={(e) => {
              e.preventDefault();
              if (canPush) reset(pushValue(s, typedV));
              setText("");
            }}
          >
            <label className="control" style={{ minWidth: 0, flex: "none" }}>
              <span>Your value (0–99)</span>
              <input type="text" inputMode="numeric" value={text} onChange={(e) => setText(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))} style={{ width: 84 }} />
            </label>
            <button type="submit" className="wbtn primary" disabled={!canPush}>
              Push
            </button>
          </form>
        </div>
      </More>
    </WidgetFrame>
  );
}
