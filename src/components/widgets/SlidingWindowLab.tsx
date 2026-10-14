"use client";
import { useCallback, useId, useMemo, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { Shuffle } from "lucide-react";
import { mulberry32 } from "@/lib/rng";
import { useFixedStep } from "@/lib/sim-loop";
import { useNarrow } from "@/lib/hooks";
import { ReducedNote, SimButtons, useSimGate, useThrottled } from "./lib/sim-kit";
import { More, Seg, Slider, WidgetFrame } from "./WidgetFrame";

// ---------------------------------------------------------------- model (pure, tested)
export const MAX_LETTERS = 12;
export const MAX_NUMS = 10;
export type WinMode = "unique" | "fixed";
export type Action = "start" | "grow" | "shrink" | "slide" | "done";
export interface WinFrame {
  action: Action;
  /** Window [l, r], both ends included; r = l - 1 means empty. */
  l: number;
  r: number;
  /** Letter counts in the window, in order of first appearance (unique mode). */
  counts: [string, number][];
  /** The letter that appears twice while the window is invalid. */
  dup: string | null;
  /** Window sum (fixed mode). */
  sum: number;
  best: [number, number] | null;
  /** Best length (unique) or best sum (fixed). */
  bestVal: number;
  /** Edge moves so far: right + left (unique), or additions + subtractions (fixed). */
  ops: number;
  isBest: boolean;
}

/** Lower-case letters only, up to `max`. */
export const cleanLetters = (s: string, max = MAX_LETTERS) => s.toLowerCase().replace(/[^a-z]/g, "").slice(0, max);
export function parseNums(text: string, max = MAX_NUMS): number[] {
  return (text.match(/-?\d+/g) ?? []).slice(0, max).map((s) => Math.max(-99, Math.min(99, Number(s))));
}

function countsOf(s: string, l: number, r: number): [string, number][] {
  const m = new Map<string, number>();
  for (let i = l; i <= r; i++) m.set(s[i], (m.get(s[i]) ?? 0) + 1);
  return [...m.entries()];
}

/** Longest substring without repeats: grow right; while a letter repeats, shrink left; then record. */
export function uniqueFrames(s: string): WinFrame[] {
  const count = new Map<string, number>();
  const frames: WinFrame[] = [];
  let l = 0;
  let best: [number, number] | null = null;
  let bestVal = 0;
  let ops = 0;
  const push = (action: Action, r: number, dup: string | null, isBest = false) =>
    frames.push({ action, l, r, counts: countsOf(s, l, r), dup, sum: 0, best, bestVal, ops, isBest });
  push("start", -1, null);
  for (let r = 0; r < s.length; r++) {
    const c = s[r];
    count.set(c, (count.get(c) ?? 0) + 1);
    ops++;
    const record = () => {
      if (r - l + 1 > bestVal) {
        bestVal = r - l + 1;
        best = [l, r];
        return true;
      }
      return false;
    };
    if (count.get(c)! === 1) {
      const nb = record();
      push("grow", r, null, nb);
      continue;
    }
    push("grow", r, c);
    while (count.get(c)! > 1) {
      count.set(s[l], count.get(s[l])! - 1);
      l++;
      ops++;
      const valid = count.get(c)! === 1;
      const nb = valid && record();
      push("shrink", r, valid ? null : c, nb);
    }
  }
  push("done", s.length - 1, null);
  frames[frames.length - 1].l = best ? best[0] : 0;
  frames[frames.length - 1].r = best ? best[1] : -1;
  frames[frames.length - 1].counts = best ? countsOf(s, best[0], best[1]) : [];
  return frames;
}

/** Max sum of k consecutive numbers: build the first window, then add the newcomer and subtract the leaver. */
export function fixedFrames(nums: number[], kIn: number): WinFrame[] {
  const n = nums.length;
  const k = Math.max(1, Math.min(kIn, n));
  const frames: WinFrame[] = [];
  let sum = 0;
  let ops = 0;
  let best: [number, number] | null = null;
  let bestVal = 0;
  const push = (action: Action, l: number, r: number, isBest = false) => frames.push({ action, l, r, counts: [], dup: null, sum, best, bestVal, ops, isBest });
  push("start", 0, -1);
  if (n === 0) {
    push("done", 0, -1);
    return frames;
  }
  for (let r = 0; r < k; r++) {
    sum += nums[r];
    ops++;
    const full = r === k - 1;
    if (full) {
      best = [0, r];
      bestVal = sum;
    }
    push("grow", 0, r, full);
  }
  for (let r = k; r < n; r++) {
    sum += nums[r] - nums[r - k];
    ops += 2;
    const nb = sum > bestVal;
    if (nb) {
      bestVal = sum;
      best = [r - k + 1, r];
    }
    push("slide", r - k + 1, r, nb);
  }
  push("done", best![0], best![1]);
  frames[frames.length - 1].sum = bestVal;
  return frames;
}

/** Brute force: try every substring, keep the longest with no repeats. */
export function bruteLongestUnique(s: string) {
  let best = 0;
  for (let i = 0; i < s.length; i++) for (let j = i; j < s.length; j++) if (new Set(s.slice(i, j + 1)).size === j - i + 1) best = Math.max(best, j - i + 1);
  return best;
}
/** Brute force: re-add every window of k. */
export function bruteMaxSumK(nums: number[], kIn: number) {
  const k = Math.max(1, Math.min(kIn, nums.length));
  let best = -Infinity;
  for (let i = 0; i + k <= nums.length; i++) best = Math.max(best, nums.slice(i, i + k).reduce((a, b) => a + b, 0));
  return { best, ops: Math.max(0, nums.length - k + 1) * k };
}

export function randomCase(seed: number, mode: WinMode) {
  const rnd = mulberry32(seed);
  if (mode === "unique") return Array.from({ length: 9 + Math.floor(rnd() * 4) }, () => "abcdefg"[Math.floor(rnd() * 7)]).join("");
  return Array.from({ length: 8 + Math.floor(rnd() * 3) }, () => Math.floor(rnd() * 10)).join(" ");
}

// ---------------------------------------------------------------- drawing
/**
 * Two layouts of the same picture. WIDE (a desktop pane, 480 px and up) is landscape: big tiles, and the tray of
 * counts shares its row with the tally. NARROW (phones) is squarer, with the tally as page text under it.
 */
const WIDE = { W: 600, TILE_Y: 40, MAX_STEP: 44, BOT_Y: 150, H: 182 };
const NARROW = { W: 360, TILE_Y: 46, MAX_STEP: 34, BOT_Y: 166, H: 200 };
const FRAME_MS = 1000;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function describe(f: WinFrame, mode: WinMode, s: string, nums: number[], k: number, prev: WinFrame | undefined) {
  const n = mode === "unique" ? s.length : nums.length;
  if (!n) return mode === "unique" ? "Type some letters to start." : "Type some numbers to start.";
  if (mode === "unique") {
    const win = s.slice(f.l, f.r + 1);
    const subs = (n * (n + 1)) / 2;
    if (f.action === "start") return "R grows the window one letter at a time. When a letter repeats, L snaps forward until the repeat is gone. Press Run or Step.";
    if (f.action === "done") return `Longest without repeats: “${win}” (${f.bestVal}). ${plural(f.ops, "edge move", "edge moves")}; brute force checks ${subs} substrings.`;
    if (f.action === "grow") return f.dup ? `“${s[f.r]}” joins, but there is already one in the window. Shrink from the left.` : `“${s[f.r]}” joins: “${win}” has no repeats (length ${win.length}).${f.isBest ? " New best." : ""}`;
    const out = prev ? s[prev.l] : "";
    return f.dup ? `“${out}” leaves. Still two “${f.dup}”s: keep shrinking.` : `“${out}” leaves. Valid again: “${win}” (length ${win.length}).${f.isBest ? " New best." : ""}`;
  }
  const kk = Math.max(1, Math.min(k, n));
  if (f.action === "start") return `Window of ${kk}. Build the first one, then slide: add the number coming in, subtract the one leaving.`;
  if (f.action === "grow") return f.r === kk - 1 ? `First window full: sum ${f.sum}.` : `${nums[f.r]} joins the first window: sum ${f.sum}.`;
  if (f.action === "slide") return `+${nums[f.r]} −${nums[f.l - 1]}: sum ${f.sum}${f.isBest ? ", a new best" : ""}. Two operations instead of re-adding ${kk}.`;
  const b = bruteMaxSumK(nums, kk).ops;
  return `Best window of ${kk} sums to ${f.bestVal} (indices ${f.best![0]}–${f.best![1]}). ${f.ops} additions and subtractions vs ${b} to re-add every window.`;
}

export function SlidingWindowLab() {
  const uid = useId();
  const [mode, setMode] = useState<WinMode>("unique");
  const [letters, setLetters] = useState("dvdfabcda");
  const [numText, setNumText] = useState("2 1 5 1 3 2 7 1");
  const [k, setK] = useState(3);
  const [seed, setSeed] = useState(1);
  const [running, setRunning] = useState(true);
  const { ref, inView, reduce } = useSimGate<HTMLDivElement>();
  const wide = !useNarrow(ref, 480);
  const { W, TILE_Y, BOT_Y, H } = wide ? WIDE : NARROW;

  const s = cleanLetters(letters);
  const nums = useMemo(() => parseNums(numText), [numText]);
  const frames = useMemo(() => (mode === "unique" ? uniqueFrames(s) : fixedFrames(nums, k)), [mode, s, nums, k]);
  const last = frames.length - 1;
  const advance = useCallback((i: number) => Math.min(i + 1, last), [last]);
  const [idx, setIdx, tick] = useFixedStep<number>(0, advance, running && inView && !reduce, FRAME_MS);
  const at = Math.min(idx, last);
  const f = frames[at];
  const playing = running && !reduce && idx < last;
  const restart = () => setIdx(0);
  const said = useThrottled(describe(f, mode, s, nums, k, frames[at - 1]), 500);

  const items: string[] = mode === "unique" ? [...s] : nums.map(String);
  const n = items.length;
  const step = Math.min(wide ? WIDE.MAX_STEP : NARROW.MAX_STEP, (W - 12) / Math.max(1, n));
  const tw = step - 4;
  const x0 = (W - n * step + 4) / 2;
  const tx = (i: number) => x0 + i * step;
  const dur = reduce ? 0 : 0.35;
  const empty = f.r < f.l;
  const bad = !!f.dup;
  const done = f.action === "done";
  const frameX = empty ? tx(Math.min(f.l, Math.max(0, n - 1))) - 3 : tx(f.l) - 3;
  const frameW = empty ? 0 : (f.r - f.l + 1) * step + 2;
  const brute = mode === "unique" ? (n * (n + 1)) / 2 : bruteMaxSumK(nums, k).ops;
  const kk = Math.max(1, Math.min(k, Math.max(1, nums.length)));
  const chip = Math.min(46, (wide ? 430 : W - 16) / Math.max(1, f.counts.length));

  const label = `${mode === "unique" ? `Letters ${s || "none"}` : `Numbers ${nums.join(", ") || "none"}, k ${kk}`}. Window from index ${f.l} to ${f.r}.${f.best ? ` Best so far: ${f.bestVal}.` : ""} ${f.ops} ${mode === "unique" ? "edge moves" : "additions and subtractions"}; brute force: ${brute}.`;
  const tally = (
    <>
      {mode === "fixed" && (
        <>
          k = <tspan style={{ fontWeight: 750, fill: "var(--fg)" }}>{kk}</tspan>:{" "}
        </>
      )}
      <tspan style={{ fontWeight: 750, fill: "var(--fg)" }}>{f.ops}</tspan> {mode === "unique" ? (f.ops === 1 ? "edge move" : "edge moves") : "adds and subtracts"}
    </>
  );
  const bruteTally = (
    <>
      brute force <tspan style={{ fontWeight: 750, fill: "var(--fg)" }}>{brute}</tspan> {mode === "unique" ? "substrings" : "additions"}
    </>
  );

  return (
    <WidgetFrame title="The sliding window" sub="Grow right, snap left to keep letters unique. Or slide a fixed window of k.">
      <div className="controls" style={{ alignItems: "center" }}>
        <Seg<WinMode> labelMode="hidden" compact label="Rule" value={mode} onChange={(v) => { setMode(v); restart(); setRunning(true); }}
          options={[{ value: "unique", label: "No repeats" }, { value: "fixed", label: "Max sum of k" }]} />
        <SimButtons running={playing} reduce={reduce} stepHint="Move one edge of the window" onStep={tick}
          onToggle={() => { if (!playing && idx >= last) restart(); setRunning(!playing); }}
          onReset={() => { restart(); setRunning(false); }} />
        <button type="button" className="wbtn" onClick={() => {
            const c = randomCase(seed, mode);
            setSeed(seed + 1);
            if (mode === "unique") setLetters(c);
            else setNumText(c);
            restart();
            setRunning(true);
          }}>
          <Shuffle size={14} aria-hidden /> Shuffle
        </button>
      </div>

      <div ref={ref}>
        <svg viewBox={`0 0 ${W} ${H}`} className="sim-svg" role="img" aria-label={label} style={{ maxWidth: wide ? 680 : 520, margin: "0 auto" }}>
          {f.best && (
            <m.g initial={false} animate={{ x: tx(f.best[0]) }} transition={{ duration: dur }}>
              <m.rect y={14} height={8} rx={4} initial={false} animate={{ width: (f.best[1] - f.best[0] + 1) * step - 4 }} transition={{ duration: dur }} fill="var(--good)" opacity={0.85} />
              <text y={10} style={{ fontSize: 11, fontWeight: 750, fill: "var(--good-ink)" }}>
                ★ best {mode === "unique" ? `${f.bestVal} long` : `sum ${f.bestVal}`}
              </text>
            </m.g>
          )}
          <m.rect y={TILE_Y - 5} height={tw + 10} rx={10} initial={false} animate={{ x: frameX, width: frameW, opacity: empty ? 0 : 1 }} transition={{ duration: dur, ease: "easeOut" }}
            style={{ fill: bad ? "color-mix(in srgb, var(--critical) 12%, transparent)" : "color-mix(in srgb, var(--accent-2) 14%, transparent)" }}
            stroke={bad ? "var(--critical)" : done ? "var(--good)" : "var(--accent-2)"} strokeWidth={2} strokeDasharray={done ? undefined : "6 4"} />
          {items.map((c, i) => {
            const inside = i >= f.l && i <= f.r;
            const isDup = bad && c === f.dup && inside;
            const entering = (f.action === "grow" || f.action === "slide") && i === f.r;
            return (
              <m.g key={i} initial={false} animate={{ x: tx(i), y: TILE_Y + (entering ? -4 : 0), opacity: inside || f.action === "start" ? 1 : i > f.r ? 0.7 : 0.35 }} transition={{ duration: dur }}>
                <rect width={tw} height={tw} rx={6} fill={isDup ? "color-mix(in srgb, var(--critical) 16%, var(--card))" : "var(--card)"} stroke={isDup ? "var(--critical)" : inside ? "var(--accent-2)" : "var(--border-strong)"} strokeWidth={inside ? 1.8 : 1.2} />
                <text x={tw / 2} y={tw / 2 + 5} textAnchor="middle" style={{ fontSize: Math.min(16, tw * 0.5), fontWeight: 700 }}>{c}</text>
                <text x={tw / 2} y={tw + 15} textAnchor="middle" className="muted-text" style={{ fontSize: 10.5 }}>{i}</text>
              </m.g>
            );
          })}
          {n > 0 && !empty && (
            <>
              <m.g initial={false} animate={{ x: tx(f.l) + tw / 2, y: TILE_Y + tw + 35 }} transition={{ duration: dur }}>
                <text textAnchor="middle" style={{ fontSize: 12, fontWeight: 800, fill: "var(--accent-2)" }}>▲ L</text>
              </m.g>
              <m.g initial={false} animate={{ x: tx(f.r) + tw / 2, y: TILE_Y + tw + (f.l === f.r ? 49 : 35) }} transition={{ duration: dur }}>
                <text textAnchor="middle" style={{ fontSize: 12, fontWeight: 800, fill: "var(--k-client)" }}>▲ R</text>
              </m.g>
            </>
          )}

          {mode === "fixed" && f.action === "slide" && (
            <g key={`io-${f.r}`}>
              <m.text x={tx(f.r) + tw / 2} textAnchor="middle" initial={reduce ? false : { y: TILE_Y + 8, opacity: 0 }} animate={{ y: TILE_Y - 9, opacity: 1 }} transition={{ duration: dur * 1.4 }} style={{ fontSize: 12, fontWeight: 800, fill: "var(--good-ink)" }}>
                +{nums[f.r]}
              </m.text>
              <m.text x={tx(f.l - 1) + tw / 2} textAnchor="middle" initial={reduce ? false : { y: TILE_Y + tw - 6, opacity: 1 }} animate={{ y: TILE_Y + tw + 46, opacity: 0.9 }} transition={{ duration: dur * 1.4 }} style={{ fontSize: 12, fontWeight: 800, fill: "var(--critical-ink)" }}>
                −{nums[f.l - 1]}
              </m.text>
            </g>
          )}
          {mode === "unique" ? (
            <g transform={`translate(0 ${BOT_Y})`}>
              <text x={8} y={-8} className="muted-text" style={{ fontSize: 11 }}>letters in the window{bad ? ` · “${f.dup}” twice` : ""}</text>
              <AnimatePresence initial={false}>
                {f.counts.map(([c, cnt], j) => (
                  <m.g key={c} initial={reduce ? false : { opacity: 0, x: 8 + j * chip, y: -10 }} animate={{ opacity: 1, x: 8 + j * chip, y: 0 }} exit={{ opacity: 0, y: 12, transition: { duration: dur } }} transition={{ duration: dur }}>
                    <rect width={chip - 4} height={24} rx={12} fill={cnt > 1 ? "color-mix(in srgb, var(--critical) 16%, var(--card))" : "var(--card-2)"} stroke={cnt > 1 ? "var(--critical)" : "var(--border-strong)"} />
                    <text x={(chip - 4) / 2} y={16} textAnchor="middle" style={{ fontSize: chip < 40 ? 10.5 : 12, fontWeight: 700, fill: cnt > 1 ? "var(--critical-ink)" : "var(--fg)" }}>
                      {c}×{cnt}
                    </text>
                  </m.g>
                ))}
              </AnimatePresence>
            </g>
          ) : (
            <text x={wide ? 8 : W / 2} y={BOT_Y + 16} textAnchor={wide ? "start" : "middle"} style={{ fontSize: 15, fontWeight: 700 }}>
              {f.r >= 0 ? `sum ${f.sum}` : "sum 0"}
              <tspan className="muted-text" style={{ fontWeight: 500, fontSize: 12 }}>
                {f.action === "slide" ? `  = ${f.sum - nums[f.r] + nums[f.l - 1]} + ${nums[f.r]} − ${nums[f.l - 1]}` : f.action === "grow" && f.r > 0 ? `  = ${f.sum - nums[f.r]} + ${nums[f.r]}` : ""}
              </tspan>
            </text>
          )}
          {wide ? (
            <g className="muted-text" style={{ fontSize: 12 }}>
              <text x={W - 8} y={BOT_Y + 2} textAnchor="end">{tally}</text>
              <text x={W - 8} y={BOT_Y + 19} textAnchor="end">{bruteTally}</text>
            </g>
          ) : null}
        </svg>
        {!wide && (
          <div className="muted" style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "2px 12px", fontSize: 13, lineHeight: 1.5, margin: "4px 0 0" }}>
            {mode === "fixed" && (
              <span>
                k = <b style={{ color: "var(--fg)" }}>{kk}</b>
              </span>
            )}
            <span>
              <b style={{ color: "var(--fg)" }}>{f.ops}</b> {mode === "unique" ? (f.ops === 1 ? "edge move" : "edge moves") : "adds and subtracts"}
            </span>
            <span>
              brute force <b style={{ color: "var(--fg)" }}>{brute}</b> {mode === "unique" ? "substrings" : "additions"}
            </span>
          </div>
        )}
      </div>

      <p className="readout" aria-live="polite">
        {said}
        <ReducedNote reduce={reduce} />
      </p>
      <More label={mode === "unique" ? "Type your own letters" : "Your numbers and k"}>
        <div className="controls">
          {mode === "unique" ? (
            <label className="control" htmlFor={`${uid}s`} style={{ minWidth: 150, maxWidth: 320 }}>
              <span>Letters (up to {MAX_LETTERS})</span>
              <input id={`${uid}s`} type="text" value={letters} autoComplete="off" spellCheck={false} onChange={(e) => { setLetters(e.target.value); restart(); }} />
            </label>
          ) : (
            <>
              <label className="control" htmlFor={`${uid}n`} style={{ minWidth: 150, maxWidth: 320 }}>
                <span>Numbers (up to {MAX_NUMS})</span>
                <input id={`${uid}n`} type="text" value={numText} autoComplete="off" spellCheck={false} onChange={(e) => { setNumText(e.target.value); restart(); }} />
              </label>
              <Slider label="k" value={kk} min={1} max={Math.max(1, nums.length)} onChange={(v) => { setK(v); restart(); }} />
            </>
          )}
        </div>
      </More>
    </WidgetFrame>
  );
}
