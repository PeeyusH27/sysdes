"use client";
import { useState } from "react";
import { m } from "motion/react";
import { Eraser, Shuffle } from "lucide-react";
import { mulberry32 } from "@/lib/rng";
import { useFixedStep } from "@/lib/sim-loop";
import { useNarrow } from "@/lib/hooks";
import { ReducedNote, SimButtons, useSimGate, useThrottled } from "./lib/sim-kit";
import { More, WidgetFrame } from "./WidgetFrame";

// ---------------------------------------------------------------- House Robber (pure, tested)
export const MAX_HOUSES = 8;
export const MAX_LOOT = 99;
export const DEFAULT_LOOT = [2, 7, 9, 3, 1, 8, 5, 4];

/** dp value at i, where every index before the street (i < 0) is worth 0. */
export const at = (dp: readonly (number | null)[], i: number) => (i < 0 ? 0 : (dp[i] ?? 0));

/** dp[i] = the most loot from houses 0..i without robbing two neighbours. */
export function robTable(loot: readonly number[]): number[] {
  const dp: number[] = [];
  for (let i = 0; i < loot.length; i++) dp.push(Math.max(at(dp, i - 1), loot[i] + at(dp, i - 2)));
  return dp;
}

/** Walk back from the last cell: a cell bigger than its left neighbour means that house was robbed. */
export function robPath(loot: readonly number[], dp: readonly number[] = robTable(loot)): number[] {
  const out: number[] = [];
  for (let t = loot.length - 1; t >= 0; ) {
    if (dp[t] !== at(dp, t - 1)) {
      out.push(t);
      t -= 2;
    } else t -= 1;
  }
  return out.reverse();
}

/** Brute force: try all 2^n subsets, keep the best one with no two neighbours. */
export function robBrute(loot: readonly number[]): number {
  let best = 0;
  for (let mask = 0; mask < 1 << loot.length; mask++) {
    if (mask & (mask >> 1)) continue;
    let sum = 0;
    for (let i = 0; i < loot.length; i++) if (mask & (1 << i)) sum += loot[i];
    best = Math.max(best, sum);
  }
  return best;
}

/** Calls made by plain recursion rob(i) = max(rob(i - 1), loot[i] + rob(i - 2)), started at rob(n - 1); rob(i < 0) counts as a call. */
export function naiveCalls(n: number): number {
  let twoBack = 1; // calls for rob(-2)
  let oneBack = 1; // calls for rob(-1)
  for (let i = 0; i < n; i++) [twoBack, oneBack] = [oneBack, 1 + oneBack + twoBack];
  return oneBack;
}

/** The first pair of neighbouring picks, or null when the picks are legal. */
export function clash(picks: readonly number[]): [number, number] | null {
  const s = [...picks].sort((a, b) => a - b);
  for (let k = 1; k < s.length; k++) if (s[k] - s[k - 1] === 1) return [s[k - 1], s[k]];
  return null;
}
export const haul = (loot: readonly number[], picks: readonly number[]) => picks.reduce((t, i) => t + (loot[i] ?? 0), 0);

/** "2 7, 9" → [2, 7, 9]; null unless it is 1–8 whole numbers from 0 to 99. */
export function parseLoot(text: string): number[] | null {
  const parts = text.split(/[\s,]+/).filter(Boolean);
  if (!parts.length || parts.length > MAX_HOUSES) return null;
  const v = parts.map(Number);
  return v.every((x) => Number.isInteger(x) && x >= 0 && x <= MAX_LOOT) ? v : null;
}

export function randomLoot(seed: number, n: number): number[] {
  const r = mulberry32(seed);
  return Array.from({ length: n }, () => 1 + Math.floor(r() * 12));
}

export type Phase = "fill" | "trace" | "done";
export interface Hop {
  from: number;
  to: number;
  took: boolean;
}
export interface Lab {
  loot: number[];
  dp: (number | null)[];
  /** Next cell to fill. */
  next: number;
  /** Cell just filled (its two choices are drawn), or null. */
  last: number | null;
  phase: Phase;
  /** Cell the walk-back looks at next. */
  t: number;
  robbed: number[];
  hop: Hop | null;
  steps: number;
  acc: number;
}

export const initLab = (loot: number[]): Lab => ({ loot, dp: loot.map(() => null), next: 0, last: null, phase: loot.length ? "fill" : "done", t: loot.length - 1, robbed: [], hop: null, steps: 0, acc: 0 });

/** One move: fill the next cell, or (once the row is full) take one hop of the walk back. */
export function stepLab(s: Lab): Lab {
  if (s.phase === "fill") {
    const i = s.next;
    const dp = [...s.dp];
    dp[i] = Math.max(at(dp, i - 1), s.loot[i] + at(dp, i - 2));
    return { ...s, dp, next: i + 1, last: i, phase: i + 1 === s.loot.length ? "trace" : "fill", steps: s.steps + 1 };
  }
  if (s.phase === "trace") {
    const took = s.dp[s.t] !== at(s.dp, s.t - 1);
    const to = s.t - (took ? 2 : 1);
    return { ...s, last: null, robbed: took ? [s.t, ...s.robbed] : s.robbed, hop: { from: s.t, to, took }, t: to, phase: to < 0 ? "done" : "trace", steps: s.steps + 1 };
  }
  return s;
}

const PERIOD: Record<Phase, number> = { fill: 950, trace: 700, done: Infinity };
export function tickLab(s: Lab, dt: number): Lab {
  if (s.phase === "done") return s; // same object: the loop stops re-rendering
  const acc = s.acc + dt;
  return acc >= PERIOD[s.phase] ? { ...stepLab(s), acc: 0 } : { ...s, acc };
}

const list = (xs: number[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

/** The latest move as a sentence. */
export function describe(s: Lab): string {
  const n = s.loot.length;
  if (s.steps === 0) return `${n} houses. Tap houses to rob them yourself (no two neighbours), then press Run or Step to let the DP fill the row.`;
  if (s.last !== null) {
    const i = s.last;
    const skip = at(s.dp, i - 1);
    const rob = s.loot[i] + at(s.dp, i - 2);
    const verdict = rob > skip ? "rob wins" : rob === skip ? "a tie, so skip" : "skip wins";
    return `dp[${i}]: rob house ${i} (${s.loot[i]} + dp[${i - 2}] = ${rob}) or skip it (dp[${i - 1}] = ${skip})? ${verdict[0].toUpperCase()}${verdict.slice(1)}: dp[${i}] = ${s.dp[i]}.`;
  }
  const h = s.hop!;
  const head = h.took ? `dp[${h.from}] = ${s.dp[h.from]} beats dp[${h.from - 1}] = ${at(s.dp, h.from - 1)}, so house ${h.from} was robbed: hop to dp[${h.to}].` : `dp[${h.from}] equals dp[${h.from - 1}], so house ${h.from} was skipped: hop to dp[${h.to}].`;
  if (s.phase !== "done") return head;
  const from = s.robbed.length ? `from houses ${list(s.robbed)}` : "(no house is worth robbing)";
  return `Best haul: ${at(s.dp, n - 1)} ${from}. The DP filled ${n} cells; plain recursion makes ${naiveCalls(n)} calls.`;
}

// ---------------------------------------------------------------- drawing
const VW = 640;
const COL = 62;
const DP_Y = 132;
const CH = 44;
const BOT = DP_Y + CH;
const VH = 256;
const colX = (n: number, c: number) => (VW - (n + 2) * COL) / 2 + (c + 2) * COL + COL / 2;
const tint = (v: string, p: number) => ({ fill: `color-mix(in srgb, ${v} ${p}%, var(--card))` });

function Arc({ x1, x2, depth, win, label, reduce, k }: { x1: number; x2: number; depth: number; win: boolean | null; label: string; reduce: boolean; k: number }) {
  const color = win === false ? "var(--muted)" : win === null ? "var(--k-client)" : "var(--accent)";
  const mid = (x1 + x2) / 2;
  return (
    <g opacity={win === false ? 0.7 : 1}>
      <m.path
        d={`M${x1} ${BOT + 2} Q${mid} ${BOT + depth * 2} ${x2} ${BOT + 4}`}
        fill="none"
        stroke={color}
        strokeWidth={win ? 2.4 : 1.6}
        strokeDasharray={win === false ? "4 3" : undefined}
        initial={reduce ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: reduce ? 0 : 0.45 }}
      />
      <path d={`M${x2 - 4.5} ${BOT + 11} L${x2} ${BOT + 3} L${x2 + 4.5} ${BOT + 11}`} fill="none" stroke={color} strokeWidth={1.8} />
      <text x={mid} y={BOT + depth + 3 + 11 * k} textAnchor="middle" style={{ fontSize: 12 * k, fontWeight: win ? 750 : 500, fill: win === false ? "var(--muted)" : "var(--fg)" }}>
        {label}
        {win ? " ✓" : ""}
      </text>
    </g>
  );
}

function Street({ s, picks, bad, reduce, narrow }: { s: Lab; picks: number[]; bad: [number, number] | null; reduce: boolean; narrow: boolean }) {
  const k = narrow ? 1.35 : 1; // bigger type on phones, where the drawing is scaled down
  const n = s.loot.length;
  const x = (c: number) => colX(n, c);
  const i = s.last;
  const skip = i !== null ? at(s.dp, i - 1) : 0;
  const rob = i !== null ? s.loot[i] + at(s.dp, i - 2) : 0;
  const tr = { duration: reduce ? 0 : 0.3 };
  const label = `A street of ${n} houses with loot ${s.loot.join(", ")}. dp row: ${s.dp.map((v) => (v === null ? "empty" : v)).join(", ")}.${s.robbed.length ? ` Best houses so far: ${s.robbed.join(", ")}.` : ""}${picks.length ? ` You rob houses ${picks.join(", ")}.` : ""}`;
  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="sim-svg" role="img" aria-label={label}>
      {s.loot.map((v, c) => {
        const picked = picks.includes(c);
        const alarm = !!bad && (bad[0] === c || bad[1] === c);
        const best = s.robbed.includes(c);
        const cx = x(c);
        return (
          <m.g key={c} initial={false} animate={alarm && !reduce ? { x: [0, -4, 4, -3, 3, 0] } : { x: 0 }} transition={{ duration: 0.4 }}>
            <polygon points={`${cx - 29},46 ${cx},21 ${cx + 29},46`} style={tint("var(--k-database)", best ? 70 : 45)} stroke="var(--border-strong)" />
            <rect x={cx - 23} y={46} width={46} height={46} rx={3} style={best ? tint("var(--good)", 22) : { fill: "var(--card)" }} stroke={best ? "var(--good)" : "var(--border-strong)"} strokeWidth={best ? 2.2 : 1.2} />
            <text x={cx} y={best ? 72 : 76} textAnchor="middle" style={{ fontSize: 18 * k, fontWeight: 750, fontVariantNumeric: "tabular-nums" }}>
              {v}
            </text>
            {best && (
              <text x={cx} y={88} textAnchor="middle" style={{ fontSize: 9.5 * k, fontWeight: 750, fill: "var(--good-ink)" }}>
                {narrow ? "✓" : "✓ best"}
              </text>
            )}
            {(picked || alarm) && (
              <g>
                <rect x={cx - 27} y={0} width={54} height={18} rx={9} fill="var(--card)" stroke={alarm ? "var(--critical)" : "var(--k-client)"} strokeWidth={1.5} />
                <text x={cx} y={9 + 4 * k} textAnchor="middle" style={{ fontSize: 10.5 * k, fontWeight: 750, fill: alarm ? "var(--critical-ink)" : "var(--k-client)" }}>
                  {alarm ? (narrow ? "alarm" : "⚠ alarm") : "you"}
                </text>
              </g>
            )}
            {picked && <rect x={cx - 26} y={43} width={52} height={52} rx={5} fill="none" stroke={alarm ? "var(--critical)" : "var(--k-client)"} strokeWidth={2} strokeDasharray="5 3" />}
          </m.g>
        );
      })}
      {/* the dp row, with two zero cells before the street so every cell reads i - 1 and i - 2 */}
      {Array.from({ length: n + 2 }, (_, j) => {
        const c = j - 2;
        const v = c < 0 ? 0 : s.dp[c];
        const cur = c === i || (s.phase === "trace" && c === s.t);
        const reads = i !== null && (c === i - 1 || c === i - 2);
        const best = s.robbed.includes(c);
        const stroke = cur ? "var(--accent)" : best ? "var(--good)" : reads ? "var(--k-client)" : "var(--border-strong)";
        const fill = cur ? tint("var(--accent)", 18) : best ? tint("var(--good)", 18) : reads ? tint("var(--k-client)", 12) : { fill: c < 0 ? "var(--card-2)" : "var(--card)" };
        return (
          <g key={c}>
            <rect x={x(c) - 24} y={DP_Y} width={48} height={CH} rx={9} style={fill} stroke={stroke} strokeWidth={cur || best || reads ? 2 : 1.2} strokeDasharray={c < 0 ? "4 3" : undefined} />
            {!narrow && (
              <text x={x(c)} y={DP_Y + 12} textAnchor="middle" className="muted-text" style={{ fontSize: 9.5 }}>
                dp[{c < 0 ? `−${-c}` : c}]
              </text>
            )}
            {v !== null && (
              <m.text key={`${c}:${v}`} x={x(c)} y={narrow ? DP_Y + 30 : DP_Y + 34} textAnchor="middle" initial={reduce || c < 0 ? false : { opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }} transition={tr} style={{ fontSize: 18 * k, fontWeight: 750, fontVariantNumeric: "tabular-nums" }}>
                {v}
              </m.text>
            )}
          </g>
        );
      })}
      {i !== null && (
        <g key={`choice-${i}`}>
          <m.line x1={x(i)} x2={x(i)} y1={95} y2={DP_Y - 3} stroke={rob > skip ? "var(--accent)" : "var(--muted)"} strokeWidth={rob > skip ? 2.4 : 1.6} strokeDasharray={rob > skip ? undefined : "4 3"} initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={tr} />
          <text x={x(i) + 6} y={118} style={{ fontSize: 12 * k, fontWeight: 750, fill: rob > skip ? "var(--fg)" : "var(--muted)" }}>
            +{s.loot[i]}
          </text>
          <Arc x1={x(i - 1) + 4} x2={x(i) - 9} depth={11} win={skip >= rob} label={`skip ${skip}`} reduce={reduce} k={k} />
          <Arc x1={x(i - 2)} x2={x(i) + 9} depth={56} win={rob > skip} label={narrow ? `rob ${rob}` : `rob ${s.loot[i]}+${at(s.dp, i - 2)} = ${rob}`} reduce={reduce} k={k} />
        </g>
      )}
      {!narrow && (
        <text x={(x(-2) + x(-1)) / 2} y={DP_Y - 8} textAnchor="middle" className="muted-text" style={{ fontSize: 10.5 }}>
          before the street
        </text>
      )}
      {s.hop && <Arc key={`hop-${s.hop.from}`} x1={x(s.hop.from)} x2={x(s.hop.to)} depth={s.hop.took ? 30 : 18} win={null} label={s.hop.took ? "robbed: back 2" : "skipped: back 1"} reduce={reduce} k={k} />}
    </svg>
  );
}

export function Dp1dLab() {
  const [text, setText] = useState(DEFAULT_LOOT.join(" "));
  const [picks, setPicks] = useState<number[]>([]);
  const [pickedAt, setPickedAt] = useState(-1);
  const [seed, setSeed] = useState(1);
  const [running, setRunning] = useState(false);
  const { ref, inView, reduce } = useSimGate<HTMLDivElement>();
  const narrow = useNarrow(ref, 460);
  const [s, reset] = useFixedStep<Lab>(() => initLab(DEFAULT_LOOT), tickLab, running && inView && !reduce);
  const parsed = parseLoot(text);
  const n = s.loot.length;
  const bad = clash(picks);
  const done = s.phase === "done";

  const restart = (loot: number[], run = false) => {
    reset(initLab(loot));
    setPickedAt(-1);
    setRunning(run);
  };
  const load = (loot: number[]) => {
    restart(loot);
    setPicks([]);
  };
  const onText = (v: string) => {
    setText(v);
    const p = parseLoot(v);
    if (p) load(p);
  };
  const toggle = (c: number) => {
    setPicks((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c].sort((a, b) => a - b)));
    setPickedAt(s.steps);
  };

  const best = done ? at(s.dp, n - 1) : null;
  const mine = haul(s.loot, picks);
  let sentence = describe(s);
  if (!parsed) sentence = `Type 1 to ${MAX_HOUSES} whole numbers from 0 to ${MAX_LOOT}, separated by spaces.`;
  else if (pickedAt === s.steps) {
    sentence = bad ? `Alarm: houses ${bad[0]} and ${bad[1]} are neighbours. Drop one of them.` : picks.length ? `You rob houses ${list(picks)}: haul ${mine}.${best !== null ? ` The best is ${best}.` : " Press Run to see if the DP beats you."}` : "No houses picked.";
  }
  const said = useThrottled(sentence, 600);
  const verdict = bad ? "alarm" : !picks.length ? "pick houses" : best === null ? "legal" : mine === best ? "matches best" : `${best - mine} short`;

  return (
    <WidgetFrame title="House robber lab" sub="Never rob two neighbours. Pick your haul, then let the DP find the best one.">
      <div className="controls" style={{ alignItems: "center" }}>
        <SimButtons
          running={running && !done && !reduce}
          reduce={reduce}
          onToggle={() => (done ? restart(s.loot, true) : setRunning(!running))}
          onStep={() => (done ? restart(s.loot) : reset(stepLab(s)))}
          onReset={() => restart(s.loot)}
          stepHint={s.phase === "trace" ? "Take one hop back" : "Fill the next cell"}
        />
        <button
          type="button"
          className="wbtn"
          onClick={() => {
            const loot = randomLoot(seed, Math.max(5, n));
            setSeed(seed + 1);
            setText(loot.join(" "));
            load(loot);
          }}
        >
          <Shuffle size={14} aria-hidden /> Shuffle
        </button>
        <button type="button" className="wbtn" onClick={() => setPicks([])} disabled={!picks.length}>
          <Eraser size={14} aria-hidden /> Clear my picks
        </button>
      </div>
      <div ref={ref} style={{ position: "relative", maxWidth: 680, margin: "0 auto" }}>
        <Street s={s} picks={picks} bad={bad} reduce={reduce} narrow={narrow} />
        {s.loot.map((v, c) => (
          <button
            key={c}
            type="button"
            onClick={() => toggle(c)}
            aria-pressed={picks.includes(c)}
            aria-label={`House ${c}, loot ${v}`}
            style={{ position: "absolute", left: `${((colX(n, c) - 29) / VW) * 100}%`, top: 0, width: `${(58 / VW) * 100}%`, height: `${(96 / VH) * 100}%`, background: "transparent", border: 0, borderRadius: 8, cursor: "pointer", padding: 0 }}
          />
        ))}
      </div>
      <div role="group" aria-label="Counters" style={{ display: "flex", flexWrap: "wrap", gap: "2px 14px", fontSize: 13, lineHeight: 1.5, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
        <span>
          Cells <b>{Math.min(s.next, n)}/{n}</b>
        </span>
        <span>
          Recursion <b>{naiveCalls(n)}</b> calls
        </span>
        <span>
          Subsets <b>{2 ** n}</b>
        </span>
        <span>
          Your haul <b>{mine}</b> <span className={bad ? "bad-ink" : best !== null && picks.length && mine === best ? "ok-ink" : "muted"} style={{ fontWeight: 650 }}>({verdict})</span>
        </span>
      </div>
      <p className="readout" aria-live="polite">
        {said}
        <ReducedNote reduce={reduce} what="Reduced motion: Step fills one cell at a time." />
      </p>
      <More label="Your street">
        <div className="controls">
          <label className="control" style={{ minWidth: 180, maxWidth: 320 }}>
            <span>Loot per house (up to {MAX_HOUSES})</span>
            <input type="text" value={text} onChange={(e) => onText(e.target.value)} aria-invalid={!parsed} spellCheck={false} autoComplete="off" />
          </label>
        </div>
      </More>
    </WidgetFrame>
  );
}
