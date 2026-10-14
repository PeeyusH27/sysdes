"use client";
import { useCallback, useEffect, useId, useMemo, useState, type RefObject } from "react";
import { m } from "motion/react";
import { ArrowLeft, ArrowRight, RotateCcw, Shuffle } from "lucide-react";
import { mulberry32 } from "@/lib/rng";
import { useFixedStep } from "@/lib/sim-loop";
import { ReducedNote, SimButtons, useSimGate, useThrottled } from "./lib/sim-kit";
import { More, WidgetFrame } from "./WidgetFrame";

// ---------------------------------------------------------------- model (pure, tested)
export const MAX_NUMS = 10;
export type Move = "L" | "R";
export type Status = "small" | "big" | "found" | "met";
/** What a move did: "safe" discards an element that provably can't be in an answer; "risky" discards one without proof; "lost" discards the last answer. */
export interface Verdict {
  move: Move;
  a: number;
  b: number;
  sum: number;
  kind: "safe" | "risky" | "lost";
}
export interface Ptr {
  l: number;
  r: number;
  /** Sums looked at so far (one per pointer position). */
  checks: number;
  wasted: number;
  last: Verdict | null;
  /** The pair a "lost" move threw away. */
  lost: [number, number] | null;
}

/** Up to `max` integers (-99…99) from free text, sorted ascending: the pattern needs sorted input. */
export function parseSorted(text: string, max = MAX_NUMS): number[] {
  return (text.match(/-?\d+/g) ?? [])
    .slice(0, max)
    .map((s) => Math.max(-99, Math.min(99, Number(s))))
    .sort((a, b) => a - b);
}

export const allPairs = (n: number) => (n * (n - 1)) / 2;

/** Brute force inside [l, r]: any pair i < j with nums[i] + nums[j] = target. */
export function pairInRange(nums: number[], target: number, l: number, r: number): [number, number] | null {
  for (let i = l; i <= r; i++) for (let j = i + 1; j <= r; j++) if (nums[i] + nums[j] === target) return [i, j];
  return null;
}

export const startPtr = (nums: number[]): Ptr => ({ l: 0, r: nums.length - 1, checks: nums.length >= 2 ? 1 : 0, wasted: 0, last: null, lost: null });

export function status(nums: number[], target: number, p: Ptr): Status {
  if (p.l >= p.r) return "met";
  const sum = nums[p.l] + nums[p.r];
  return sum === target ? "found" : sum < target ? "small" : "big";
}

/** The move the pattern makes: too small → drop the left value, too big → drop the right one. */
export function autoMove(nums: number[], target: number, p: Ptr): Move | null {
  const s = status(nums, target, p);
  return s === "small" ? "L" : s === "big" ? "R" : null;
}

/** Apply a move (the reader's or the pattern's) and judge it. No-op once the pair is found or the pointers meet. */
export function playMove(nums: number[], target: number, p: Ptr, move: Move): Ptr {
  const s = status(nums, target, p);
  if (s === "found" || s === "met") return p;
  const a = nums[p.l];
  const b = nums[p.r];
  const next = move === "L" ? { l: p.l + 1, r: p.r } : { l: p.l, r: p.r - 1 };
  const safe = (move === "L" && s === "small") || (move === "R" && s === "big");
  const before = pairInRange(nums, target, p.l, p.r);
  const lost = !safe && before !== null && pairInRange(nums, target, next.l, next.r) === null;
  const kind = safe ? "safe" : lost ? "lost" : "risky";
  return {
    ...next,
    checks: p.checks + (next.l < next.r ? 1 : 0),
    wasted: p.wasted + (safe ? 0 : 1),
    last: { move, a, b, sum: a + b, kind },
    lost: lost ? before : p.lost,
  };
}

/** The pattern on its own, one state per pointer move. */
export function autoFrames(nums: number[], target: number): Ptr[] {
  const out = [startPtr(nums)];
  for (let mv = autoMove(nums, target, out[0]); mv; mv = autoMove(nums, target, out.at(-1)!)) out.push(playMove(nums, target, out.at(-1)!, mv));
  return out;
}

/** A shuffled sorted input with exactly one target that some pair reaches. */
export function randomCase(seed: number) {
  const rnd = mulberry32(seed);
  const n = 7 + Math.floor(rnd() * 4);
  const nums = Array.from({ length: n }, () => 1 + Math.floor(rnd() * 24)).sort((a, b) => a - b);
  const i = Math.floor(rnd() * (n / 2));
  const j = n - 1 - Math.floor(rnd() * (n / 2));
  return { nums, target: nums[i] + nums[j] };
}

// ---------------------------------------------------------------- drawing
/**
 * Two layouts of the same picture. WIDE (a desktop pane, 480 px and up) is landscape: the sum and its meter share
 * one row under the cards, and the tally sits in the top corner. NARROW (phones) stacks them and keeps the tally as
 * page text under the picture, so the type stays readable at 360 px.
 */
const WIDE = { W: 600, CW: 38, STEP: 46, STATS_Y: 14, BAR_BASE: 74, BAR_MAX: 50, CARD_Y: 80, PTR_Y: 142, SUM_X: 16, SUM_Y: 180, M0: 236, M1: 584, METER_Y: 176, H: 206 };
const NARROW = { W: 360, CW: 30, STEP: 34, STATS_Y: 0, BAR_BASE: 66, BAR_MAX: 56, CARD_Y: 70, PTR_Y: 130, SUM_X: 180, SUM_Y: 160, M0: 30, M1: 330, METER_Y: 190, H: 226 };
const FRAME_MS = 1300;
const DEFAULT = { text: "1 3 4 6 8 11 13 15", target: 17 };
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** True once the element is narrower than `px` (false on the server and until measured). */
function useNarrow(ref: RefObject<HTMLElement | null>, px = 480) {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    // A hidden stage reports width 0: keep the last layout instead of flashing the phone one.
    const ro = new ResizeObserver(([e]) => {
      if (e.contentRect.width > 0) setNarrow(e.contentRect.width < px);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, px]);
  return narrow;
}

/** A segmented control sized like a .wbtn, captioned by its aria-label (the toolbar has no room for a caption row). */
function Pick<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="seg" role="group" aria-label={label} style={{ lineHeight: "14px", flex: "none" }}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function sentence(nums: number[], target: number, p: Ptr, mode: "watch" | "play") {
  const n = nums.length;
  if (n < 2) return "Type at least two numbers.";
  const s = status(nums, target, p);
  const a = nums[p.l];
  const b = nums[p.r];
  const tally = `${plural(p.checks, "check", "checks")} (all pairs: ${allPairs(n)})`;
  if (s === "found") return `${a} + ${b} = ${target}. Found in ${tally}.${p.wasted ? ` ${plural(p.wasted, "move was", "moves were")} a gamble.` : ""}`;
  if (s === "met") {
    if (p.lost) return `L and R met. ${nums[p.lost[0]]} + ${nums[p.lost[1]]} was the answer, but an unproven move threw it away.`;
    return `L and R met: no pair sums to ${target}, proved in ${tally}.`;
  }
  const v = p.last;
  let lead = "";
  if (mode === "play" && v) {
    const out = v.move === "L" ? v.a : v.b;
    if (v.kind === "safe") lead = `Good move: ${v.sum} was too ${v.move === "L" ? "small" : "big"}, so ${out} could never fit. `;
    else if (v.kind === "risky") lead = `Risky: ${v.sum} was too ${v.move === "L" ? "big" : "small"}, so that move pushed the sum the wrong way and dropped ${out} without proof. `;
    else lead = `Oops: dropping ${out} threw away the answer ${nums[p.lost![0]]} + ${nums[p.lost![1]]}. `;
  }
  const why = s === "small" ? `too small, and ${b} is the biggest partner left, so ${a} is out: L moves right` : `too big, and ${a} is the smallest partner left, so ${b} is out: R moves left`;
  const gone = p.lost && v?.kind !== "lost" ? `The answer ${nums[p.lost[0]]} + ${nums[p.lost[1]]} is already gone: start over. ` : "";
  if (mode === "play") return `${lead}${gone}${a} + ${b} = ${a + b} vs ${target}: your move.`;
  return `${a} + ${b} = ${a + b}: ${why}.`;
}

export function TwoPointersLab() {
  const uid = useId();
  const [text, setText] = useState(DEFAULT.text);
  const [targetText, setTargetText] = useState(String(DEFAULT.target));
  const [mode, setMode] = useState<"watch" | "play">("watch");
  const [seed, setSeed] = useState(1);
  const [running, setRunning] = useState(true);
  const { ref, inView, reduce } = useSimGate<HTMLDivElement>();
  const G = useNarrow(ref) ? NARROW : WIDE;

  const nums = useMemo(() => parseSorted(text), [text]);
  const target = targetText.trim() !== "" && Number.isFinite(Number(targetText)) ? Math.max(-198, Math.min(198, Math.round(Number(targetText)))) : 0;
  const frames = useMemo(() => autoFrames(nums, target), [nums, target]);
  const last = frames.length - 1;

  const advance = useCallback((i: number) => Math.min(i + 1, last), [last]);
  const [idx, setIdx, tick] = useFixedStep<number>(0, advance, mode === "watch" && running && inView && !reduce, FRAME_MS);
  const [mine, setMine] = useState<Ptr>(() => startPtr(nums));
  const p = mode === "watch" ? frames[Math.min(idx, last)] : mine;
  const playing = mode === "watch" && running && !reduce && idx < last;

  const restart = (next = nums) => {
    setIdx(0);
    setMine(startPtr(next));
  };
  const n = nums.length;
  const st = status(nums, target, p);
  const said = useThrottled(sentence(nums, target, p, mode), 500);

  const { W, CW, STEP, CARD_Y, BAR_BASE, PTR_Y, METER_Y, M0, M1, H } = G;
  const x0 = (W - (n * STEP - (STEP - CW))) / 2;
  const cx = (i: number) => x0 + i * STEP + CW / 2;
  const lo = Math.min(...nums, 0);
  const hi = Math.max(...nums, 1);
  const barH = (v: number) => 6 + ((v - lo) / Math.max(1, hi - lo)) * (G.BAR_MAX - 6);
  const sLo = Math.min(target, n >= 2 ? nums[0] + nums[1] : 0);
  const sHi = Math.max(target, n >= 2 ? nums[n - 2] + nums[n - 1] : 1);
  const sx = (v: number) => M0 + ((v - sLo) / Math.max(1, sHi - sLo)) * (M1 - M0);
  const sum = n >= 2 && p.l < p.r ? nums[p.l] + nums[p.r] : null;
  const dur = reduce ? 0 : 0.35;
  const found = st === "found";
  const verdictColor = found ? "var(--good)" : st === "small" ? "var(--k-client)" : st === "big" ? "var(--accent-2)" : "var(--border-strong)";
  const wide = G === WIDE;

  const label = `Sorted numbers ${nums.join(", ") || "none"}, target ${target}. L at index ${p.l}, R at index ${p.r}. ${found ? "Pair found." : st === "met" ? "Pointers met." : `Sum ${sum}, too ${st === "small" ? "small" : "big"}.`} ${plural(p.checks, "check", "checks")} so far; all pairs: ${allPairs(n)}.`;

  return (
    <WidgetFrame title="Squeeze the pair" sub="Sorted cards, one pointer at each end. Drop only cards that can't pair up.">
      <div className="controls" style={{ alignItems: "center" }}>
        <Pick<"watch" | "play"> label="Mode" value={mode} onChange={(v) => { setMode(v); restart(); setRunning(v === "watch"); }}
          options={[{ value: "watch", label: "Watch" }, { value: "play", label: "You play" }]} />
        {mode === "watch" ? (
          <SimButtons running={playing} reduce={reduce} stepHint="Move one pointer" onStep={tick}
            onToggle={() => { if (!playing && idx >= last) setIdx(0); setRunning(!playing); }}
            onReset={() => { setIdx(0); setRunning(false); }} />
        ) : (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button type="button" className="wbtn primary" disabled={st === "found" || st === "met"} onClick={() => setMine(playMove(nums, target, mine, "L"))}>
              Move L <ArrowRight size={14} aria-hidden />
            </button>
            <button type="button" className="wbtn primary" disabled={st === "found" || st === "met"} onClick={() => setMine(playMove(nums, target, mine, "R"))}>
              <ArrowLeft size={14} aria-hidden /> Move R
            </button>
            <button type="button" className="wbtn" onClick={() => setMine(startPtr(nums))} aria-label="Start over" title="Start over">
              <RotateCcw size={14} aria-hidden />
            </button>
          </div>
        )}
        <button type="button" className="wbtn" onClick={() => {
            const c = randomCase(seed);
            setSeed(seed + 1);
            setText(c.nums.join(" "));
            setTargetText(String(c.target));
            restart(c.nums);
            setRunning(true);
          }}>
          <Shuffle size={14} aria-hidden /> Shuffle
        </button>
      </div>

      <div ref={ref}>
        <svg viewBox={`0 0 ${W} ${H}`} className="sim-svg" role="img" aria-label={label} style={{ maxWidth: wide ? 680 : 520, margin: "0 auto" }}>
          {wide && (
            <text x={16} y={G.STATS_Y} className="muted-text" style={{ fontSize: 12 }}>
              <tspan style={{ fontWeight: 750, fill: "var(--fg)" }}>{p.checks}</tspan> {p.checks === 1 ? "check" : "checks"} · all pairs <tspan style={{ fontWeight: 750, fill: "var(--fg)" }}>{allPairs(n)}</tspan>
              {mode === "play" && (
                <tspan style={{ fill: p.wasted ? "var(--warning-ink)" : undefined }}>
                  {" "}· <tspan style={{ fontWeight: 750 }}>{p.wasted}</tspan> unproven
                </tspan>
              )}
            </text>
          )}
          {nums.map((v, i) => {
            const out = i < p.l || i > p.r;
            const isL = i === p.l && !out;
            const isR = i === p.r && !out;
            const lostOne = !!p.lost?.includes(i);
            const stroke = found && (isL || isR) ? "var(--good)" : lostOne ? "var(--critical)" : isL ? "var(--accent-2)" : isR ? "var(--k-client)" : "var(--border-strong)";
            const fill = found && (isL || isR) ? "color-mix(in srgb, var(--good) 20%, var(--card))" : isL || isR ? "color-mix(in srgb, var(--accent) 10%, var(--card))" : "var(--card)";
            return (
              <m.g key={i} initial={false} animate={{ opacity: out ? 0.32 : 1, y: isL || isR ? -4 : 0 }} transition={{ duration: dur }}>
                <rect x={cx(i) - 9} y={BAR_BASE - barH(v)} width={18} height={barH(v)} rx={3} fill={isL || isR ? stroke : "var(--series-1)"} opacity={isL || isR ? 0.85 : 0.45} />
                <rect x={cx(i) - CW / 2} y={CARD_Y} width={CW} height={CW} rx={7} style={{ fill }} stroke={stroke} strokeWidth={isL || isR || lostOne ? 2.4 : 1.3} />
                <text x={cx(i)} y={CARD_Y + CW / 2 + 5} textAnchor="middle" style={{ fontSize: 14, fontWeight: 700 }}>{v}</text>
                {out && <line x1={cx(i) - 11} x2={cx(i) + 11} y1={CARD_Y + CW - 4} y2={CARD_Y + 4} stroke="var(--muted)" strokeWidth={1.4} />}
              </m.g>
            );
          })}
          {p.lost?.map((i) => (
            <text key={`lost-${i}`} x={cx(i)} y={CARD_Y + CW + 13} textAnchor="middle" style={{ fontSize: 11, fontWeight: 700, fill: "var(--critical-ink)" }}>
              ✕ lost
            </text>
          ))}
          {n >= 2 && (
            <>
              <m.g initial={false} animate={{ x: cx(Math.min(p.l, n - 1)) - (p.l === p.r ? 11 : 0), y: PTR_Y }} transition={{ duration: dur }}>
                <text textAnchor="middle" style={{ fontSize: 13, fontWeight: 800, fill: "var(--accent-2)" }}>▲ L</text>
              </m.g>
              <m.g initial={false} animate={{ x: cx(Math.max(p.r, 0)) + (p.l === p.r ? 11 : 0), y: PTR_Y }} transition={{ duration: dur }}>
                <text textAnchor="middle" style={{ fontSize: 13, fontWeight: 800, fill: "var(--k-client)" }}>▲ R</text>
              </m.g>
            </>
          )}

          <text x={G.SUM_X} y={G.SUM_Y} textAnchor={wide ? "start" : "middle"} style={{ fontSize: 15, fontWeight: 650 }}>
            {sum === null ? (n < 2 ? "Need two numbers" : "L and R met") : `${nums[p.l]} + ${nums[p.r]} = ${sum}`}
            <tspan className="muted-text" style={{ fontWeight: 500, fontSize: 13 }}>{sum === null ? "" : found ? "  ✓ target" : st === "small" ? "  too small" : "  too big"}</tspan>
          </text>

          <line x1={M0} x2={M1} y1={METER_Y} y2={METER_Y} stroke="var(--border-strong)" strokeWidth={6} strokeLinecap="round" />
          <text x={M0} y={METER_Y + 22} className="muted-text" style={{ fontSize: 11 }}>← move L to grow</text>
          <text x={M1} y={METER_Y + 22} textAnchor="end" className="muted-text" style={{ fontSize: 11 }}>move R to shrink →</text>
          <line x1={sx(target)} x2={sx(target)} y1={METER_Y - 11} y2={METER_Y + 9} stroke="var(--fg)" strokeWidth={2} />
          <text x={Math.max(M0 + 26, Math.min(M1 - 26, sx(target)))} y={METER_Y - 15} textAnchor="middle" style={{ fontSize: 11, fontWeight: 700 }}>target {target}</text>
          {sum !== null && (
            <m.circle cy={METER_Y} r={8} initial={false} animate={{ cx: sx(sum) }} transition={{ duration: dur }} fill={verdictColor} stroke="var(--card)" strokeWidth={2} />
          )}
        </svg>
        {!wide && (
          <div className="muted" style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "2px 12px", fontSize: 13, lineHeight: 1.5, margin: "4px 0 0" }}>
            <span>
              <b style={{ color: "var(--fg)" }}>{p.checks}</b> {p.checks === 1 ? "check" : "checks"}
            </span>
            <span>
              all pairs <b style={{ color: "var(--fg)" }}>{allPairs(n)}</b>
            </span>
            {mode === "play" && (
              <span className={p.wasted ? "warn-ink" : undefined}>
                <b>{p.wasted}</b> unproven
              </span>
            )}
          </div>
        )}
      </div>

      <p className="readout" aria-live="polite">
        {said}
        <ReducedNote reduce={reduce && mode === "watch"} />
      </p>

      <More label="Your numbers">
        <div className="controls">
          <label className="control" htmlFor={`${uid}n`} style={{ minWidth: 180, flex: 2 }}>
            <span>Numbers (sorted for you)</span>
            <input id={`${uid}n`} type="text" value={text} autoComplete="off" spellCheck={false} onChange={(e) => { setText(e.target.value); restart(parseSorted(e.target.value)); }} />
          </label>
          <label className="control" htmlFor={`${uid}t`} style={{ minWidth: 80, flex: "0 1 90px" }}>
            <span>Target</span>
            <input id={`${uid}t`} type="number" value={targetText} min={-198} max={198} onChange={(e) => { setTargetText(e.target.value); restart(); }} />
          </label>
        </div>
      </More>
    </WidgetFrame>
  );
}
