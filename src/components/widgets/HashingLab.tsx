"use client";
import { useCallback, useId, useMemo, useState } from "react";
import { m } from "motion/react";
import { Shuffle } from "lucide-react";
import { mulberry32 } from "@/lib/rng";
import { useFixedStep } from "@/lib/sim-loop";
import { useNarrow } from "@/lib/hooks";
import { ReducedNote, SimButtons, useSimGate, useThrottled } from "./lib/sim-kit";
import { More, Slider, WidgetFrame } from "./WidgetFrame";

// ---------------------------------------------------------------- model (pure, tested)
export const MAX_NUMS = 10;
export const MAX_BUCKETS = 7;

/** One stored map entry: value → the index where it was first seen. */
export interface Entry {
  v: number;
  i: number;
}
export type Phase = "start" | "look" | "store" | "found" | "none";
export interface HashFrame {
  phase: Phase;
  /** Index of the number being handled (-1 before the first one). */
  i: number;
  /** target - nums[i]: the partner this number asks the map for. */
  need: number | null;
  /** Bucket the lookup (look/found) or the insert (store) goes to. */
  bucket: number | null;
  /** Chain entries compared by this lookup. */
  probes: number;
  /** Partner index, when the lookup hits. */
  hit: number | null;
  /** On a store frame: false when the value was already in the map (the first index is kept). */
  added: boolean;
  /** Buckets, each a chain in insertion order. */
  table: Entry[][];
  lookups: number;
  compared: number;
}

/** Non-negative remainder, so -3 lands in a real bucket. */
export const bucketOf = (v: number, buckets: number) => ((v % buckets) + buckets) % buckets;

/** Pull up to `max` integers (-99…99) out of free text: "3, 8 -2" → [3, 8, -2]. */
export function parseNums(text: string, max = MAX_NUMS): number[] {
  return (text.match(/-?\d+/g) ?? []).slice(0, max).map((s) => Math.max(-99, Math.min(99, Number(s))));
}

/** The brute force: check pairs (i, j), i < j, in nested-loop order until one sums to target. */
export function bruteTwoSum(nums: number[], target: number) {
  let checks = 0;
  for (let i = 0; i < nums.length; i++)
    for (let j = i + 1; j < nums.length; j++) {
      checks++;
      if (nums[i] + nums[j] === target) return { pair: [i, j] as [number, number], checks };
    }
  return { pair: null, checks };
}

/** One-pass two sum on a chained hash table: look up target - x first, then store x → i. Every state is a frame. */
export function twoSumFrames(nums: number[], target: number, buckets: number): HashFrame[] {
  const B = Math.max(1, Math.floor(buckets));
  const table: Entry[][] = Array.from({ length: B }, () => []);
  const snap = () => table.map((c) => c.slice());
  const frames: HashFrame[] = [];
  let lookups = 0;
  let compared = 0;
  const base = { need: null, bucket: null, probes: 0, hit: null, added: false };
  frames.push({ phase: "start", i: -1, ...base, table: snap(), lookups, compared });
  for (let i = 0; i < nums.length; i++) {
    const x = nums[i];
    const need = target - x;
    const nb = bucketOf(need, B);
    const chain = table[nb];
    const at = chain.findIndex((e) => e.v === need);
    const probes = at === -1 ? chain.length : at + 1;
    lookups++;
    compared += probes;
    const hit = at === -1 ? null : chain[at].i;
    frames.push({ phase: hit === null ? "look" : "found", i, need, bucket: nb, probes, hit, added: false, table: snap(), lookups, compared });
    if (hit !== null) return frames;
    const xb = bucketOf(x, B);
    const added = !table[xb].some((e) => e.v === x);
    if (added) table[xb].push({ v: x, i });
    frames.push({ phase: "store", i, need, bucket: xb, probes: 0, hit: null, added, table: snap(), lookups, compared });
  }
  frames.push({ phase: "none", i: nums.length, ...base, table: snap(), lookups, compared });
  return frames;
}

/** A shuffled input that always has an answer, found late enough to be interesting. */
export function randomCase(seed: number) {
  const rnd = mulberry32(seed);
  const n = 7 + Math.floor(rnd() * 3);
  const nums = Array.from({ length: n }, () => 1 + Math.floor(rnd() * 19));
  const a = Math.floor(rnd() * (n - 2));
  const b = n - 1 - Math.floor(rnd() * 2);
  return { nums, target: nums[a] + nums[b] };
}

// ---------------------------------------------------------------- drawing
/**
 * Two layouts of the same table. WIDE (a desktop pane, 480 px and up) is landscape: each bucket is a lane and its
 * chain grows to the right, so the picture stays short even with one bucket. NARROW (phones) keeps the buckets as
 * columns with chains growing down, which leaves room for readable chips at 360 px, and puts the tally under it.
 */
const WIDE = { W: 600, CW: 34, STEP: 40, CARD_Y: 24, LANE_Y0: 110, ROW: 24, PROBE_X: 2, LABEL_X: 54, LABEL_W: 44, CHAIN_X: 106, CSTEP: 48 };
const NARROW = { W: 360, CW: 30, STEP: 34, CARD_Y: 24, PROBE_Y: 84, BUCKET_Y: 116, ROW: 26 };
const FRAME_MS = 1100;
const DEFAULT = { text: "3 8 11 4 15 7 2", target: 9 };
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function describe(f: HashFrame, nums: number[], target: number, B: number, brute: number) {
  const x = nums[f.i];
  const chained = f.probes ? `compared ${plural(f.probes, "entry", "entries")}` : "the bucket is empty";
  switch (f.phase) {
    case "start":
      return nums.length
        ? `Target ${target}. Each number asks the map for its partner (target − number), then moves in. Press Run or Step.`
        : "Type some numbers to start.";
    case "look":
      return `${x} needs ${f.need} (${target} − ${x}). ${f.need} hashes to bucket ${f.bucket}: ${chained}, no match. So ${x} moves in.`;
    case "store":
      return f.added
        ? `${x} → index ${f.i} goes into bucket ${f.bucket}${f.table[f.bucket!].length > 1 ? `, chained after ${plural(f.table[f.bucket!].length - 1, "other entry", "other entries")} (a collision)` : ""}.`
        : `${x} is already in the map, so its first index stays.`;
    case "found":
      return `${x} needs ${f.need}: bucket ${f.bucket} has it at index ${f.hit}. Answer [${f.hit}, ${f.i}] after ${plural(f.lookups, "lookup", "lookups")}; nested loops took ${plural(brute, "pair check", "pair checks")}.`;
    case "none":
      return `No pair sums to ${target}. ${plural(f.lookups, "lookup", "lookups")} (${f.compared} entries compared) against ${plural(brute, "pair check", "pair checks")} for nested loops.${B === 1 ? " With one bucket, every lookup walks the whole chain." : ""}`;
  }
}

export function HashingLab() {
  const uid = useId();
  const [text, setText] = useState(DEFAULT.text);
  const [targetText, setTargetText] = useState(String(DEFAULT.target));
  const [buckets, setBuckets] = useState(7);
  const [seed, setSeed] = useState(1);
  const [running, setRunning] = useState(true);
  const { ref, inView, reduce } = useSimGate<HTMLDivElement>();
  const wide = !useNarrow(ref, 480);

  const nums = useMemo(() => parseNums(text), [text]);
  const target = Number.isFinite(Number(targetText)) && targetText.trim() !== "" ? Math.max(-198, Math.min(198, Math.round(Number(targetText)))) : 0;
  const frames = useMemo(() => twoSumFrames(nums, target, buckets), [nums, target, buckets]);
  const brute = useMemo(() => bruteTwoSum(nums, target), [nums, target]);
  const last = frames.length - 1;

  const advance = useCallback((i: number) => Math.min(i + 1, last), [last]);
  const [idx, setIdx, tick] = useFixedStep<number>(0, advance, running && inView && !reduce, FRAME_MS);
  const f = frames[Math.min(idx, last)];
  const playing = running && !reduce && idx < last;

  const restart = () => setIdx(0);
  const said = useThrottled(describe(f, nums, target, buckets, brute.checks), 600);

  const n = nums.length;
  const G = wide ? WIDE : NARROW;
  const W = G.W;
  const CW = G.CW;
  const x0 = (W - (n * G.STEP - (G.STEP - CW))) / 2;
  const cardX = (i: number) => x0 + i * G.STEP;
  const where = new Map<number, { b: number; k: number }>();
  f.table.forEach((chain, b) => chain.forEach((e, k) => where.set(e.i, { b, k })));
  const dur = reduce ? 0 : 0.45;
  const pair = f.phase === "found" ? [f.hit!, f.i] : [];
  const showProbe = (f.phase === "look" || f.phase === "found") && f.bucket !== null;
  const stats = { lookups: f.lookups, compared: f.compared, brute: brute.checks };

  // narrow: buckets are columns, chains grow down
  const colW = Math.min(64, (NARROW.W - 10) / buckets);
  const colX = (b: number) => (NARROW.W - buckets * colW) / 2 + b * colW + 3;
  const maxChain = Math.max(2, ...frames[last].table.map((c) => c.length));
  // wide: buckets are lanes, chains grow right
  const laneY = (b: number) => WIDE.LANE_Y0 + b * WIDE.ROW;

  const chipW = wide ? WIDE.CSTEP - 4 : colW - 6;
  const H = wide ? WIDE.LANE_Y0 + buckets * WIDE.ROW + 18 : NARROW.BUCKET_Y + 28 + maxChain * NARROW.ROW + 26;
  const probeAt = wide ? { x: WIDE.PROBE_X, y: laneY(f.bucket ?? 0) - 1 } : { x: colX(f.bucket ?? 0) + chipW / 2 - 24, y: NARROW.PROBE_Y };
  const iY = G.CARD_Y + CW + 27;

  const label = `Numbers ${nums.join(", ") || "none"}, target ${target}, ${buckets} buckets. ${f.phase === "found" ? `Pair found at indices ${f.hit} and ${f.i}.` : f.phase === "none" ? "No pair." : `${f.lookups} lookups so far.`} ${f.compared} entries compared; nested loops: ${brute.checks} pair checks.`;

  return (
    <WidgetFrame title="Two-sum detective" sub="Each number asks the map for its partner, then drops into a bucket.">
      <div className="controls" style={{ alignItems: "center" }}>
        <SimButtons running={playing} reduce={reduce} stepHint="Next lookup or insert" onStep={tick}
          onToggle={() => { if (!playing && idx >= last) restart(); setRunning(!playing); }}
          onReset={() => { restart(); setRunning(false); }} />
        <Slider label="Buckets" value={buckets} min={1} max={MAX_BUCKETS} onChange={(v) => { setBuckets(v); restart(); }} />
        <button type="button" className="wbtn" onClick={() => {
            const c = randomCase(seed);
            setSeed(seed + 1);
            setText(c.nums.join(" "));
            setTargetText(String(c.target));
            restart();
            setRunning(true);
          }}>
          <Shuffle size={14} aria-hidden /> Shuffle
        </button>
      </div>

      <div ref={ref}>
        <svg viewBox={`0 0 ${W} ${H}`} className="sim-svg" role="img" aria-label={label} style={{ maxWidth: wide ? 680 : 520, margin: "0 auto" }}>
          <text x={wide ? 8 : W / 2} y={13} textAnchor={wide ? "start" : "middle"} className="muted-text" style={{ fontSize: 12 }}>
            nums · target <tspan style={{ fontWeight: 750, fill: "var(--fg)" }}>{target}</tspan>
          </text>
          {wide && <Stats {...stats} x={W - 6} y={13} anchor="end" />}
          {nums.map((v, i) => {
            const isPair = pair.includes(i);
            const cur = i === f.i && !isPair;
            const done = i < f.i || (i === f.i && f.phase === "store");
            const fill = isPair ? "color-mix(in srgb, var(--good) 20%, var(--card))" : cur ? "color-mix(in srgb, var(--accent) 16%, var(--card))" : done ? "var(--card-2)" : "var(--card)";
            return (
              <m.g key={i} initial={false} animate={{ x: cardX(i), y: G.CARD_Y - (cur || isPair ? 5 : 0) }} transition={{ duration: dur * 0.6 }}>
                <rect width={CW} height={CW} rx={8} style={{ fill }} stroke={isPair ? "var(--good)" : cur ? "var(--accent)" : "var(--border-strong)"} strokeWidth={cur || isPair ? 2.4 : 1.4} />
                <text x={CW / 2} y={CW / 2 + 5} textAnchor="middle" style={{ fontSize: 14, fontWeight: 700, fill: done && !isPair ? "var(--muted)" : "var(--fg)" }}>
                  {v}
                </text>
                <text x={CW / 2} y={CW + 13} textAnchor="middle" className="muted-text" style={{ fontSize: 10.5 }}>
                  {isPair ? "✓" : i}
                </text>
              </m.g>
            );
          })}
          {n > 0 && f.i >= 0 && f.i < n && (
            <m.g initial={false} animate={{ x: cardX(f.i) + CW / 2, y: iY }} transition={{ duration: dur * 0.6 }}>
              <text textAnchor="middle" style={{ fontSize: 12, fontWeight: 700, fill: "var(--accent-2)" }}>▲ i</text>
            </m.g>
          )}

          {wide && (
            <g className="muted-text" style={{ fontSize: 11 }}>
              <text x={WIDE.LABEL_X + WIDE.LABEL_W / 2} y={WIDE.LANE_Y0 - 7} textAnchor="middle">bucket</text>
              <text x={WIDE.CHAIN_X} y={WIDE.LANE_Y0 - 7}>chain: value→index</text>
            </g>
          )}
          {Array.from({ length: buckets }, (_, b) => {
            const hot = showProbe && f.bucket === b;
            const stroke = hot ? "var(--k-client)" : "var(--border)";
            if (wide)
              return (
                <g key={b}>
                  <line x1={WIDE.LABEL_X + WIDE.LABEL_W} x2={W - 6} y1={laneY(b) + 10} y2={laneY(b) + 10} stroke="var(--border)" strokeDasharray="2 4" />
                  <rect x={WIDE.LABEL_X} y={laneY(b)} width={WIDE.LABEL_W} height={20} rx={6} fill="var(--card-2)" stroke={stroke} strokeWidth={hot ? 2 : 1} />
                  <text x={WIDE.LABEL_X + WIDE.LABEL_W / 2} y={laneY(b) + 14} textAnchor="middle" className="muted-text" style={{ fontSize: 12, fontWeight: 650 }}>
                    {b}
                  </text>
                </g>
              );
            return (
              <g key={b}>
                <rect x={colX(b)} y={NARROW.BUCKET_Y} width={chipW} height={22} rx={6} fill="var(--card-2)" stroke={stroke} strokeWidth={hot ? 2 : 1} />
                <text x={colX(b) + chipW / 2} y={NARROW.BUCKET_Y + 15} textAnchor="middle" className="muted-text" style={{ fontSize: 12, fontWeight: 650 }}>
                  {buckets > 4 ? b : `bucket ${b}`}
                </text>
                <line x1={colX(b) + chipW / 2} x2={colX(b) + chipW / 2} y1={NARROW.BUCKET_Y + 22} y2={NARROW.BUCKET_Y + 28 + maxChain * NARROW.ROW - 6} stroke="var(--border)" strokeDasharray="2 4" />
              </g>
            );
          })}

          {showProbe && (
            <m.g
              key={`probe-${f.i}`}
              initial={reduce ? false : { x: cardX(f.i) + CW / 2 - 24, y: G.CARD_Y, opacity: 0 }}
              animate={{ ...probeAt, opacity: 1 }}
              transition={{ duration: dur }}
            >
              <rect width={48} height={22} rx={11} fill="var(--card)" stroke={f.phase === "found" ? "var(--good)" : "var(--k-client)"} strokeWidth={1.8} strokeDasharray={f.phase === "found" ? undefined : "4 3"} />
              <text x={24} y={15} textAnchor="middle" style={{ fontSize: 12, fontWeight: 700, fill: f.phase === "found" ? "var(--good-ink)" : "var(--fg)" }}>
                {f.need}
                {f.phase === "found" ? " ✓" : " ?"}
              </text>
            </m.g>
          )}

          {nums.map((v, i) => {
            const at = where.get(i);
            const match = f.phase === "found" && f.hit === i;
            const fresh = f.phase === "store" && f.i === i;
            const slot = at ? (wide ? { x: WIDE.CHAIN_X + at.k * WIDE.CSTEP, y: laneY(at.b) } : { x: colX(at.b), y: NARROW.BUCKET_Y + 28 + at.k * NARROW.ROW }) : null;
            const pos = slot ? { ...slot, opacity: 1 } : { x: cardX(i) + CW / 2 - chipW / 2, y: G.CARD_Y + 6, opacity: 0 };
            return (
              <m.g key={`chip-${i}`} initial={false} animate={pos} transition={{ duration: dur }}>
                <rect width={chipW} height={wide ? 20 : 21} rx={6} fill={match ? "color-mix(in srgb, var(--good) 22%, var(--card))" : "var(--card)"} stroke={match ? "var(--good)" : fresh ? "var(--accent)" : "var(--border-strong)"} strokeWidth={match || fresh ? 2 : 1.1} />
                <text x={chipW / 2} y={wide ? 14 : 14.5} textAnchor="middle" style={{ fontSize: chipW < 46 && !wide ? 11 : 12, fontWeight: 650 }}>
                  {v}→{i}
                </text>
              </m.g>
            );
          })}

          <text x={wide ? W - 6 : W / 2} y={H - (wide ? 4 : 8)} textAnchor={wide ? "end" : "middle"} className="muted-text" style={{ fontSize: 12 }}>
            bucket = value mod {buckets}
            {buckets === 1 ? " · one bucket: every lookup scans everything" : ""}
          </text>
        </svg>
        {!wide && (
          <div className="muted" style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "2px 12px", fontSize: 13, lineHeight: 1.5, margin: "4px 0 0" }}>
            <span>
              <b style={{ color: "var(--fg)" }}>{f.lookups}</b> {f.lookups === 1 ? "lookup" : "lookups"}
            </span>
            <span>
              <b style={{ color: "var(--fg)" }}>{f.compared}</b> compared
            </span>
            <span>
              nested loops <b style={{ color: "var(--fg)" }}>{brute.checks}</b>
            </span>
          </div>
        )}
      </div>

      <p className="readout" aria-live="polite">
        {said}
        <ReducedNote reduce={reduce} />
      </p>

      <More label="Your numbers">
        <div className="controls">
          <label className="control" htmlFor={`${uid}n`} style={{ minWidth: 180, flex: 2 }}>
            <span>Numbers (up to {MAX_NUMS})</span>
            <input id={`${uid}n`} type="text" value={text} inputMode="numeric" autoComplete="off" spellCheck={false}
              onChange={(e) => { setText(e.target.value); restart(); }} />
          </label>
          <label className="control" htmlFor={`${uid}t`} style={{ minWidth: 80, flex: "0 1 90px" }}>
            <span>Target</span>
            <input id={`${uid}t`} type="number" value={targetText} min={-198} max={198}
              onChange={(e) => { setTargetText(e.target.value); restart(); }} />
          </label>
        </div>
      </More>
    </WidgetFrame>
  );
}

/** The cost tally, drawn into the wide picture: map lookups and entries compared vs the nested loops' pair checks. */
function Stats({ lookups, compared, brute, x, y, anchor }: { lookups: number; compared: number; brute: number; x: number; y: number; anchor: "start" | "middle" | "end" }) {
  const b = { fontWeight: 750, fill: "var(--fg)" };
  return (
    <text x={x} y={y} textAnchor={anchor} className="muted-text" style={{ fontSize: 12 }}>
      <tspan style={b}>{lookups}</tspan> {lookups === 1 ? "lookup" : "lookups"} · <tspan style={b}>{compared}</tspan> compared · nested loops <tspan style={b}>{brute}</tspan>
    </text>
  );
}
