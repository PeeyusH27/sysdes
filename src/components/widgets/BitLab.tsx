"use client";
import { useEffect, useState, type RefObject } from "react";
import { m } from "motion/react";
import { Shuffle } from "lucide-react";
import { mulberry32 } from "@/lib/rng";
import { useFixedStep } from "@/lib/sim-loop";
import { ReducedNote, SimButtons, useSimGate, useThrottled } from "./lib/sim-kit";
import { WidgetFrame } from "./WidgetFrame";

// ---------------------------------------------------------------- bit logic (pure, tested)
export const BITS = 8;
export const MASK = (1 << BITS) - 1;
export type Op = "and" | "or" | "xor" | "shl" | "shr" | "drop";
export const OP_LABEL: Record<Op, string> = { and: "AND", or: "OR", xor: "XOR", shl: "A << 1", shr: "A >> 1", drop: "A & (A − 1)" };
const SYMBOL: Record<Op, string> = { and: "A & B", or: "A | B", xor: "A ^ B", shl: "A << 1", shr: "A >> 1", drop: "A & (A−1)" };

export const bit = (n: number, i: number) => (n >> i) & 1;
export const toBits = (n: number, w = BITS) => (n >>> 0).toString(2).padStart(w, "0").slice(-w);
export const isShift = (op: Op) => op === "shl" || op === "shr";

/** The second row: B for AND/OR/XOR, A − 1 (8-bit, so 0 − 1 wraps to 255) for the drop trick, nothing for shifts. */
export const second = (op: Op, a: number, b: number): number | null => (isShift(op) ? null : op === "drop" ? (a - 1) & MASK : b);

export function apply(op: Op, a: number, b: number): number {
  switch (op) {
    case "and":
      return a & b;
    case "or":
      return a | b;
    case "xor":
      return a ^ b;
    case "shl":
      return (a << 1) & MASK;
    case "shr":
      return a >>> 1;
    case "drop":
      return a & (a - 1) & MASK;
  }
}

/** Result bit i, worked out from the input bits that feed it (one column at a time). */
export function resultBit(op: Op, a: number, b: number, i: number): number {
  if (op === "shl") return i === 0 ? 0 : bit(a, i - 1);
  if (op === "shr") return i === BITS - 1 ? 0 : bit(a, i + 1);
  const x = bit(a, i);
  const y = bit(second(op, a, b)!, i);
  return op === "or" ? x | y : op === "xor" ? x ^ y : x & y;
}

/** Which bit of A feeds result bit i in a shift (null when a 0 slides in). */
export const shiftSource = (op: Op, i: number) => (op === "shl" ? (i === 0 ? null : i - 1) : i === BITS - 1 ? null : i + 1);

export function explainBit(op: Op, a: number, b: number, i: number): string {
  const head = `Bit ${i} (${1 << i}): `;
  const r = resultBit(op, a, b, i);
  if (isShift(op)) {
    const from = shiftSource(op, i);
    return from === null ? `${head}nothing to copy, so a 0 slides in.` : `${head}copies A's bit ${from}, a ${r}.`;
  }
  const word = op === "drop" ? "AND" : OP_LABEL[op];
  return `${head}${bit(a, i)} ${word} ${bit(second(op, a, b)!, i)} = ${r}.`;
}

export function summary(op: Op, a: number, b: number): string {
  const r = apply(op, a, b);
  const eq = `${SYMBOL[op]} = ${toBits(r)} = ${r}`;
  switch (op) {
    case "and":
      return `${eq}. Only bits set in both survive.`;
    case "or":
      return `${eq}. A bit set in either survives.`;
    case "xor":
      return `${eq}. Bits that differ survive; equal bits cancel.`;
    case "shl":
      return `${eq}: ${a >= 128 ? `the top bit fell off, so it is 2 × ${a} − 256` : `double ${a}`}.`;
    case "shr":
      return `${eq}: half of ${a}, rounded down.`;
    case "drop":
      return a === 0 ? `${eq}: 0 has no set bit to drop.` : `${eq}: the lowest set bit of ${a} (worth ${a & -a}) is gone${r === 0 ? `, so ${a} is a power of two` : ""}.`;
  }
}

// Single number: XOR a list, pairs cancel.
export const MAX_LIST = 8;
export const DEFAULT_LIST = [3, 5, 9, 5, 3, 6, 9];

/** 1 to 8 whole numbers from 0 to 15, or null. */
export function parseList(text: string): number[] | null {
  const parts = text.split(/[\s,]+/).filter(Boolean);
  if (!parts.length || parts.length > MAX_LIST) return null;
  const v = parts.map(Number);
  return v.every((x) => Number.isInteger(x) && x >= 0 && x <= 15) ? v : null;
}
export const xorUpTo = (list: readonly number[], k: number) => list.slice(0, k).reduce((acc, x) => acc ^ x, 0);

/** Among the first k values, the indices that already met their twin (equal values pair up in order). */
export function cancelled(list: readonly number[], k: number): Set<number> {
  const open = new Map<number, number>();
  const out = new Set<number>();
  for (let i = 0; i < k; i++) {
    const j = open.get(list[i]);
    if (j === undefined) open.set(list[i], i);
    else {
      out.add(i).add(j);
      open.delete(list[i]);
    }
  }
  return out;
}
/** Values that appear an odd number of times: what survives the XOR. */
export const survivors = (list: readonly number[]) => [...new Set(list)].filter((v) => list.filter((x) => x === v).length % 2 === 1);

/** Nested loops: for each value, scan the others for a twin; stop at the first value with none. */
export function bruteChecks(list: readonly number[]): number {
  let checks = 0;
  for (let i = 0; i < list.length; i++) {
    let twin = false;
    for (let j = 0; j < list.length && !twin; j++) {
      if (j === i) continue;
      checks++;
      twin = list[j] === list[i];
    }
    if (!twin) return checks;
  }
  return checks;
}

export interface Flip {
  a: number;
  b: number;
  op: Op;
  /** Result columns revealed so far, from the left (bit 7) to the right (bit 0). */
  col: number;
  acc: number;
}
export const tickFlip = (s: Flip, dt: number): Flip => (s.col >= BITS ? s : s.acc + dt >= 260 ? { ...s, col: s.col + 1, acc: 0 } : { ...s, acc: s.acc + dt });

export interface Xor {
  list: number[];
  /** Values XOR-ed in so far. */
  k: number;
  acc: number;
}
export const tickXor = (s: Xor, dt: number): Xor => (s.k >= s.list.length ? s : s.acc + dt >= 1000 ? { ...s, k: s.k + 1, acc: 0 } : { ...s, acc: s.acc + dt });

// ---------------------------------------------------------------- drawing
function useNarrow(ref: RefObject<HTMLElement | null>, px = 460) {
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

const tint = (v: string, p: number) => ({ fill: `color-mix(in srgb, ${v} ${p}%, var(--card))` });
const VW = 560;
const VH = 214;
const ROW = [26, 86, 160]; // A, second row, result
const BW = 44;
const bx = (i: number) => 122 + (BITS - 1 - i) * 50;

function Cell({ x, y, v, w = BW, h = BW, k, dim = false, pop, reduce, from }: { x: number; y: number; v: number | null; w?: number; h?: number; k: number; dim?: boolean; pop?: string; reduce: boolean; from?: { x: number; y: number } }) {
  const on = v === 1;
  return (
    <m.g key={pop} initial={reduce || !pop ? false : { opacity: 0, x: from?.x ?? 0, y: from?.y ?? -24 }} animate={{ opacity: dim ? 0.35 : 1, x: 0, y: 0 }} transition={{ duration: reduce ? 0 : 0.35 }}>
      <rect x={x - w / 2} y={y} width={w} height={h} rx={8} style={v === null ? { fill: "var(--card-2)" } : on ? tint("var(--accent)", 24) : { fill: "var(--card)" }} stroke={on ? "var(--accent)" : "var(--border-strong)"} strokeWidth={on ? 2 : 1.2} strokeDasharray={v === null ? "4 3" : undefined} />
      <text x={x} y={y + h / 2 + 7 * k} textAnchor="middle" style={{ fontSize: 20 * k, fontWeight: 750, fontFamily: "var(--font-mono)", fill: v === null ? "var(--muted)" : "var(--fg)" }}>
        {v === null ? "?" : v}
      </text>
    </m.g>
  );
}

function FlipBoard({ s, reduce, narrow }: { s: Flip; reduce: boolean; narrow: boolean }) {
  const k = narrow ? 1.3 : 1;
  const two = second(s.op, s.a, s.b);
  const r = apply(s.op, s.a, s.b);
  const cur = s.col > 0 && s.col < BITS ? BITS - s.col : null; // the column being worked out; none once the result is complete
  const shown = (i: number) => i >= BITS - s.col;
  const src = cur !== null && isShift(s.op) ? shiftSource(s.op, cur) : null;
  const rows: [string, number | null, number][] = [
    ["A", s.a, ROW[0]],
    [s.op === "drop" ? "A − 1" : "B", two, ROW[1]],
  ];
  const label = `${SYMBOL[s.op]}: A = ${toBits(s.a)} (${s.a})${two !== null && !isShift(s.op) ? `, ${s.op === "drop" ? "A − 1" : "B"} = ${toBits(two)} (${two})` : ""}, result ${s.col >= BITS ? `${toBits(r)} (${r})` : `${s.col} of 8 bits worked out`}.`;
  const side = { fontSize: 15 * k, fontWeight: 750 };
  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="sim-svg" role="img" aria-label={label}>
      {cur !== null && <m.rect initial={false} animate={{ x: bx(cur) - 25 }} transition={{ duration: reduce ? 0 : 0.2 }} y={14} width={50} height={VH - 16} rx={10} style={tint("var(--accent)", 8)} stroke="var(--accent)" strokeDasharray="4 4" />}
      {!narrow &&
        Array.from({ length: BITS }, (_, i) => (
          <text key={i} x={bx(i)} y={11} textAnchor="middle" className="muted-text" style={{ fontSize: 10 }}>
            {1 << i}
          </text>
        ))}
      {rows.map(([name, v, y]) =>
        v === null ? (
          // a shift: every bit of A slides one column; faint guides for all, the current one in accent
          <g key={name}>
            {Array.from({ length: BITS }, (_, i) => shiftSource(s.op, i)).map((from, i) =>
              from === null ? (
                <text key={i} x={bx(i)} y={ROW[2] - 16} textAnchor="middle" style={{ fontSize: 11 * k, fontWeight: 700, fill: "var(--accent-2)" }}>
                  0 in
                </text>
              ) : (
                <line key={i} x1={bx(from)} y1={ROW[0] + BW + 4} x2={bx(i)} y2={ROW[2] - 12} stroke="var(--border-strong)" strokeWidth={1.4} strokeDasharray="3 4" />
              ),
            )}
          </g>
        ) : (
          <g key={name}>
            <text x={8} y={y + 28} style={side}>
              {name}
            </text>
            {Array.from({ length: BITS }, (_, i) => (
              <Cell key={i} x={bx(i)} y={y} v={bit(v, i)} k={k} reduce={reduce} pop={`${name}${i}:${bit(v, i)}`} dim={src !== null && cur !== null && i !== src && name === "A"} from={{ x: 0, y: 0 }} />
            ))}
            <text x={VW - 4} y={y + 28} textAnchor="end" style={{ ...side, fontVariantNumeric: "tabular-nums" }}>
              {v}
            </text>
          </g>
        ),
      )}
      <line x1={6} x2={VW - 4} y1={ROW[2] - 9} y2={ROW[2] - 9} stroke="var(--border-strong)" strokeWidth={1.5} />
      <text x={8} y={ROW[2] + 28} style={{ ...side, fontSize: (narrow ? 13 : 12.5) * k }}>
        {narrow ? "=" : SYMBOL[s.op]}
      </text>
      {Array.from({ length: BITS }, (_, i) => {
        const v = shown(i) ? resultBit(s.op, s.a, s.b, i) : null;
        const from = isShift(s.op) ? shiftSource(s.op, i) : i;
        return <Cell key={i} x={bx(i)} y={ROW[2]} v={v} k={k} reduce={reduce} pop={v === null ? undefined : `${s.op}${i}:${v}:${s.a}:${s.b}`} from={from === null ? { x: 0, y: -30 } : { x: bx(from) - bx(i), y: -40 }} />;
      })}
      {src !== null && cur !== null && <m.path key={`${s.op}${cur}`} d={`M${bx(src)} ${ROW[0] + BW + 2} L${bx(cur)} ${ROW[2] - 12}`} stroke="var(--accent)" strokeWidth={2.4} initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduce ? 0 : 0.25 }} />}
      <text x={VW - 4} y={ROW[2] + 28} textAnchor="end" style={{ ...side, fontVariantNumeric: "tabular-nums", fill: s.col >= BITS ? "var(--fg)" : "var(--muted)" }}>
        {s.col >= BITS ? r : "?"}
      </text>
    </svg>
  );
}

const SW = 430;
const sx = (c: number) => 128 + (3 - c) * 56;
const rowY = (r: number) => 22 + r * 34;

function XorBoard({ s, reduce, narrow }: { s: Xor; reduce: boolean; narrow: boolean }) {
  const k = narrow ? 1.25 : 1;
  const n = s.list.length;
  const accY = rowY(n) + 12;
  const H = accY + 52;
  const acc = xorUpTo(s.list, s.k);
  const gone = cancelled(s.list, s.k);
  const done = s.k >= n;
  const left = survivors(s.list);
  const prev = s.k ? xorUpTo(s.list, s.k - 1) : 0;
  const label = `XOR of ${s.list.join(", ")}: ${s.k} of ${n} done, accumulator ${acc} (${toBits(acc, 4)}).${gone.size ? ` ${gone.size / 2} pairs cancelled.` : ""}`;
  return (
    <svg viewBox={`0 0 ${SW} ${H}`} className="sim-svg" role="img" aria-label={label}>
      {[3, 2, 1, 0].map((c) => (
        <text key={c} x={sx(c)} y={13} textAnchor="middle" className="muted-text" style={{ fontSize: 10.5 * k }}>
          {1 << c}
        </text>
      ))}
      {s.list.map((v, r) => {
        const isNext = !done && r === s.k;
        const out = gone.has(r);
        const single = done && left.includes(v) && !gone.has(r);
        const tag = out ? "pair ✓" : single ? "no twin" : isNext ? "next" : r < s.k ? "in" : "";
        return (
          <m.g key={r} initial={false} animate={{ opacity: out ? 0.4 : r < s.k || isNext || single ? 1 : 0.75 }} transition={{ duration: reduce ? 0 : 0.3 }}>
            <text x={80} y={rowY(r) + 20} textAnchor="end" style={{ fontSize: 16 * k, fontWeight: 750, fontVariantNumeric: "tabular-nums" }}>
              {v}
            </text>
            {[3, 2, 1, 0].map((c) => (
              <Cell key={c} x={sx(c)} y={rowY(r)} w={46} h={28} v={bit(v, c)} k={k * 0.8} reduce={reduce} />
            ))}
            {out && <line x1={sx(3) - 30} x2={sx(0) + 30} y1={rowY(r) + 14} y2={rowY(r) + 14} stroke="var(--good)" strokeWidth={2} />}
            {tag && (
              <text x={sx(0) + 36} y={rowY(r) + 19} style={{ fontSize: 12 * k, fontWeight: 700, fill: out ? "var(--good-ink)" : single || isNext ? "var(--accent)" : "var(--muted)" }}>
                {tag}
              </text>
            )}
          </m.g>
        );
      })}
      {s.k > 0 && !reduce && (
        <m.g key={`fly${s.k}`} initial={{ y: 0, opacity: 0.9 }} animate={{ y: accY - rowY(s.k - 1), opacity: 0 }} transition={{ duration: 0.7, ease: "easeIn" }}>
          {[3, 2, 1, 0].map((c) => bit(s.list[s.k - 1], c) === 1 && <rect key={c} x={sx(c) - 23} y={rowY(s.k - 1)} width={46} height={28} rx={8} style={tint("var(--accent)", 40)} stroke="var(--accent)" />)}
        </m.g>
      )}
      <line x1={10} x2={SW - 10} y1={accY - 7} y2={accY - 7} stroke="var(--border-strong)" strokeWidth={1.5} />
      <text x={10} y={accY + 21} style={{ fontSize: 14 * k, fontWeight: 750 }}>
        acc
      </text>
      <text x={80} y={accY + 21} textAnchor="end" style={{ fontSize: 16 * k, fontWeight: 800, fontVariantNumeric: "tabular-nums", fill: done && left.length === 1 ? "var(--good-ink)" : "var(--fg)" }}>
        {acc}
      </text>
      {[3, 2, 1, 0].map((c) => {
        const ones = s.list.slice(0, s.k).filter((v) => bit(v, c)).length;
        const flipped = s.k > 0 && bit(acc, c) !== bit(prev, c);
        return (
          <g key={c}>
            {flipped && <rect x={sx(c) - 27} y={accY - 4} width={54} height={36} rx={10} style={tint("var(--accent-2)", 22)} />}
            <Cell x={sx(c)} y={accY} w={46} h={28} v={bit(acc, c)} k={k * 0.8} reduce={reduce} pop={`acc${c}:${bit(acc, c)}`} from={{ x: 0, y: -10 }} />
            <text x={sx(c)} y={accY + 44} textAnchor="middle" className="muted-text" style={{ fontSize: 10.5 * k }}>
              {ones} {ones % 2 ? "odd" : "even"}
            </text>
          </g>
        );
      })}
      {flippedNote(s, k)}
    </svg>
  );
}

function flippedNote(s: Xor, k: number) {
  if (!s.k) return null;
  return (
    <text x={sx(0) + 36} y={rowY(s.list.length) + 33} style={{ fontSize: 12 * k, fontWeight: 700, fill: "var(--accent-2)" }}>
      acc ^= {s.list[s.k - 1]}
    </text>
  );
}

/** One compact line of counters (instead of a row of tiles), so the board and the controls fit one screen. */
function Stats({ items }: { items: { label: string; value: string }[] }) {
  return (
    <p className="muted" style={{ display: "flex", flexWrap: "wrap", gap: "2px 14px", fontSize: 13, margin: "6px 0 0", fontVariantNumeric: "tabular-nums" }}>
      {items.map((t) => (
        <span key={t.label}>
          {t.label} <b style={{ color: "var(--fg)" }}>{t.value}</b>
        </span>
      ))}
    </p>
  );
}

/** A segmented control whose name is announced but not shown (its options say enough), so the toolbar stays one row. */
function Pick<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

const SHORT: Record<Op, string> = { and: "AND", or: "OR", xor: "XOR", shl: "<< 1", shr: ">> 1", drop: "A & (A−1)" };

function Flipper({ modeSwitch }: { modeSwitch: React.ReactNode }) {
  const [running, setRunning] = useState(true);
  const [seed, setSeed] = useState(3);
  const { ref, inView, reduce } = useSimGate<HTMLDivElement>();
  const narrow = useNarrow(ref);
  const [s, reset] = useFixedStep<Flip>({ a: 0b00100101, b: 0b01101100, op: "xor", col: 0, acc: 0 }, tickFlip, running && inView && !reduce);
  // reduced motion: show the whole result at once; Reset then Step walks it column by column
  const set = (p: Partial<Flip>) => reset({ ...s, ...p, col: reduce ? BITS : 0, acc: 0 });
  const two = second(s.op, s.a, s.b);
  const sentence = s.col >= BITS ? summary(s.op, s.a, s.b) : s.col === 0 ? `Tap any bit of A${s.op === "drop" || isShift(s.op) ? "" : " or B"} to flip it.` : explainBit(s.op, s.a, s.b, BITS - s.col);
  const said = useThrottled(sentence, 500);
  const pos = (x: number, y: number) => ({ position: "absolute" as const, left: `${((x - 22) / VW) * 100}%`, top: `${(y / VH) * 100}%`, width: `${(BW / VW) * 100}%`, height: `${(BW / VH) * 100}%`, background: "transparent", border: 0, borderRadius: 8, padding: 0, cursor: "pointer" });
  return (
    <>
      <div className="controls">
        {modeSwitch}
        <Pick<Op> label="Operator" value={s.op} onChange={(op) => set({ op })} options={(["and", "or", "xor", "shl", "shr", "drop"] as Op[]).map((o) => ({ value: o, label: SHORT[o] }))} />
      </div>
      <div className="controls" style={{ marginTop: 0 }}>
        <SimButtons running={running && s.col < BITS && !reduce} reduce={reduce} onToggle={() => (s.col >= BITS ? (reset({ ...s, col: 0, acc: 0 }), setRunning(true)) : setRunning(!running))} onStep={() => reset({ ...s, col: Math.min(BITS, s.col + 1), acc: 0 })} onReset={() => reset({ ...s, col: 0, acc: 0 })} stepHint="Work out the next result bit" />
        <button
          type="button"
          className="wbtn"
          onClick={() => {
            const r = mulberry32(seed);
            setSeed(seed + 1);
            set({ a: Math.floor(r() * 256), b: Math.floor(r() * 256) });
          }}
        >
          <Shuffle size={14} aria-hidden /> Shuffle A and B
        </button>
      </div>
      <div ref={ref} style={{ position: "relative", maxWidth: 640, margin: "0 auto" }}>
        <FlipBoard s={s} reduce={reduce} narrow={narrow} />
        {Array.from({ length: BITS }, (_, i) => (
          <button key={`a${i}`} type="button" aria-pressed={bit(s.a, i) === 1} aria-label={`A bit ${i} (${1 << i})`} onClick={() => set({ a: s.a ^ (1 << i) })} style={pos(bx(i), ROW[0])} />
        ))}
        {two !== null &&
          s.op !== "drop" &&
          Array.from({ length: BITS }, (_, i) => <button key={`b${i}`} type="button" aria-pressed={bit(s.b, i) === 1} aria-label={`B bit ${i} (${1 << i})`} onClick={() => set({ b: s.b ^ (1 << i) })} style={pos(bx(i), ROW[1])} />)}
      </div>
      <Stats
        items={[
          { label: "Result", value: s.col >= BITS ? `${toBits(apply(s.op, s.a, s.b))} = ${apply(s.op, s.a, s.b)}` : `${s.col} / 8 bits` },
          { label: "One operation:", value: "8 bits at once" },
        ]}
      />
      <p className="readout" aria-live="polite">
        {said}
        <ReducedNote reduce={reduce} what="Reduced motion: results appear at once; Reset, then Step, to go bit by bit." />
      </p>
    </>
  );
}

/** The XOR board never draws taller than this (px): a long list shrinks it instead of pushing the controls away. */
const MAX_XOR_PX = 280;

function SingleNumber({ modeSwitch }: { modeSwitch: React.ReactNode }) {
  const [text, setText] = useState(DEFAULT_LIST.join(" "));
  const [running, setRunning] = useState(false);
  const { ref, inView, reduce } = useSimGate<HTMLDivElement>();
  const narrow = useNarrow(ref);
  const [s, reset] = useFixedStep<Xor>({ list: DEFAULT_LIST, k: 0, acc: 0 }, tickXor, running && inView && !reduce);
  const parsed = parseList(text);
  const n = s.list.length;
  const done = s.k >= n;
  const acc = xorUpTo(s.list, s.k);
  const left = survivors(s.list);
  const boardH = rowY(n) + 12 + 52;
  let sentence: string;
  if (!parsed) sentence = `Type 1 to ${MAX_LIST} whole numbers from 0 to 15.`;
  else if (s.k === 0) sentence = "Every number but one has a twin. Press Run or Step to XOR them into acc, one by one.";
  else if (!done) {
    const v = s.list[s.k - 1];
    const pair = cancelled(s.list, s.k).has(s.k - 1);
    sentence = `acc ^= ${v}: ${toBits(xorUpTo(s.list, s.k - 1), 4)} → ${toBits(acc, 4)} = ${acc}.${pair ? ` ${v} met its twin, so the pair cancels.` : ""}`;
  } else if (left.length === 1) sentence = `Done: acc = ${acc} (${toBits(acc, 4)}), the number without a twin. ${n} XORs and one variable; nested loops needed ${bruteChecks(s.list)} checks.`;
  else sentence = left.length ? `Done: acc = ${acc} is ${left.join(" XOR ")}, because ${left.length} numbers have no twin.` : "Done: acc = 0, because every number has a twin.";
  const said = useThrottled(sentence, 600);
  return (
    <>
      <div className="controls">
        {modeSwitch}
        <SimButtons running={running && !done && !reduce} reduce={reduce} onToggle={() => (done ? (reset({ ...s, k: 0, acc: 0 }), setRunning(true)) : setRunning(!running))} onStep={() => reset({ ...s, k: done ? 0 : s.k + 1, acc: 0 })} onReset={() => (reset({ ...s, k: 0, acc: 0 }), setRunning(false))} stepHint="XOR in the next number" />
      </div>
      <div className="controls" style={{ marginTop: 0 }}>
        <label className="control" style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, maxWidth: 420 }}>
          <span style={{ whiteSpace: "nowrap" }}>Numbers (0–15)</span>
          <input
            type="text"
            value={text}
            spellCheck={false}
            autoComplete="off"
            aria-label="Numbers (0 to 15, one without a twin)"
            aria-invalid={!parsed}
            style={{ flex: 1, minWidth: 0 }}
            onChange={(e) => {
              setText(e.target.value);
              const p = parseList(e.target.value);
              if (p) {
                reset({ list: p, k: 0, acc: 0 });
                setRunning(false);
              }
            }}
          />
        </label>
      </div>
      {/* measured on the full-width wrapper, so the board's own width can't flip the narrow switch back and forth */}
      <div ref={ref}>
        <div style={{ maxWidth: Math.min(SW * 1.15, (MAX_XOR_PX / boardH) * SW * (narrow ? 1.3 : 1)), margin: "0 auto" }}>
          <XorBoard s={s} reduce={reduce} narrow={narrow} />
        </div>
      </div>
      <Stats
        items={[
          { label: "XOR steps", value: `${s.k} / ${n}` },
          { label: "Extra memory", value: "1 number" },
          { label: "Nested loops", value: `${bruteChecks(s.list)} checks` },
        ]}
      />
      <p className="readout" aria-live="polite">
        {said}
        <ReducedNote reduce={reduce} what="Reduced motion: use Step." />
      </p>
    </>
  );
}

export function BitLab() {
  const [mode, setMode] = useState<"flip" | "single">("flip");
  const modeSwitch = (
    <Pick
      label="Mode"
      value={mode}
      onChange={setMode}
      options={[
        { value: "flip", label: "Bit flipper" },
        { value: "single", label: "Single number" },
      ]}
    />
  );
  return (
    <WidgetFrame title="Bit lab" sub="Flip the bits of two 8-bit numbers and watch one operator work on every column, or XOR a list and see pairs cancel.">
      {mode === "flip" ? <Flipper modeSwitch={modeSwitch} /> : <SingleNumber modeSwitch={modeSwitch} />}
    </WidgetFrame>
  );
}
