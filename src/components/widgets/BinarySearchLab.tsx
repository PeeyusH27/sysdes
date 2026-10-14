"use client";
import { useEffect, useState } from "react";
import { m } from "motion/react";
import { mulberry32 } from "@/lib/rng";
import { useFixedStep } from "@/lib/sim-loop";
import { ReducedNote, SimButtons, useSimGate, useThrottled } from "./lib/sim-kit";
import { Slider, WidgetFrame } from "./WidgetFrame";

// ---------------------------------------------------------------- model (pure, tested)
/** "guess": exact match over 1..n (too low / too high / hit). "bad": first true over builds 1..n. */
export type Mode = "guess" | "bad";
export type Result = "low" | "high" | "hit" | "good" | "bad";
export interface Probe {
  x: number;
  result: Result;
  by: "you" | "auto";
  /** The answer already followed from earlier checks. */
  wasted: boolean;
}
/** Invariant: the secret (the number, or the first bad build) is always inside [lo, hi]. */
export interface Game {
  mode: Mode;
  n: number;
  secret: number;
  lo: number;
  hi: number;
  probes: Probe[];
}

export const midOf = (lo: number, hi: number) => Math.floor((lo + hi) / 2);

export function newGame(mode: Mode, n: number, seed: number): Game {
  const r = mulberry32(seed);
  return { mode, n, secret: 1 + Math.floor(r() * n), lo: 1, hi: n, probes: [] };
}

export function isDone(g: Game) {
  return g.mode === "guess" ? g.probes.some((p) => p.result === "hit") : g.lo === g.hi;
}

export function judge(g: Game, x: number): Result {
  if (g.mode === "guess") return x < g.secret ? "low" : x > g.secret ? "high" : "hit";
  return x >= g.secret ? "bad" : "good";
}

/** Exact match: anything outside [lo, hi] is ruled out. First true: below lo is good, at or past a bad build is bad. */
export function isWasted(g: Game, x: number) {
  if (g.mode === "guess") return x < g.lo || x > g.hi;
  return x < g.lo || g.probes.some((p) => p.result === "bad" && p.x <= x);
}

export function probe(g: Game, x: number, by: Probe["by"] = "you"): Game {
  if (isDone(g) || !Number.isInteger(x) || x < 1 || x > g.n) return g;
  const result = judge(g, x);
  const wasted = isWasted(g, x);
  let { lo, hi } = g;
  if (result === "low" || result === "good") lo = Math.max(lo, x + 1);
  else if (result === "high") hi = Math.min(hi, x - 1);
  else if (result === "bad") hi = Math.min(hi, x);
  else lo = hi = x;
  return { ...g, lo, hi, probes: [...g.probes, { x, result, by, wasted }] };
}

/** The halving move. mid rounds down, so in first-true mode mid < hi and the range always shrinks. */
export const autoProbe = (g: Game) => probe(g, midOf(g.lo, g.hi), "auto");

/** Halving's worst case: the smallest k with 2^k − 1 ≥ n (exact match) or 2^k ≥ n (first true). */
export function worstCase(mode: Mode, n: number) {
  let k = 0;
  while (2 ** k - (mode === "guess" ? 1 : 0) < n) k++;
  return k;
}

/** Plays halving from scratch: the sequence of checks it makes. */
export function solve(mode: Mode, n: number, secret: number) {
  let g: Game = { mode, n, secret, lo: 1, hi: n, probes: [] };
  while (!isDone(g)) g = autoProbe(g);
  return g;
}

// ---------------------------------------------------------------- picture
const MOVE_MS = 900;
const SIZES = { guess: [100, 1000], bad: [8, 24] } as const;
const ZOOM = 21; // magnify once this few candidates are left

/** Stacks labels into rows so pointers that sit close together don't overlap. */
export function pointerRows(xs: number[], gap = 28) {
  const order = xs.map((x, i) => [x, i] as const).sort((a, b) => a[0] - b[0]);
  const lastX: number[] = [];
  const rows = xs.map(() => 0);
  for (const [x, i] of order) {
    let r = 0;
    while (lastX[r] !== undefined && x - lastX[r] < gap) r++;
    lastX[r] = x;
    rows[i] = r;
  }
  return rows;
}

/** Phone-sized widget → a narrower viewBox, so SVG text stays readable. */
function useNarrow(ref: React.RefObject<HTMLElement | null>, below = 470) {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    // A hidden stage reports width 0: keep the last layout instead of flashing the phone one.
    const ro = new ResizeObserver(([e]) => {
      if (e.contentRect.width > 0) setNarrow(e.contentRect.width < below);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, below]);
  return narrow;
}

/** A segmented control sized like a .wbtn, captioned by its aria-label (the toolbar has no room for a caption row). */
function Pick<T extends string | number>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="seg" role="group" aria-label={label} style={{ lineHeight: "14px", flex: "none" }}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

interface Sim {
  g: Game;
  acc: number;
}
const stepSim = (s: Sim, dt: number): Sim => {
  if (isDone(s.g)) return s;
  const acc = s.acc + dt;
  return acc >= MOVE_MS ? { g: autoProbe(s.g), acc: 0 } : { ...s, acc };
};

const span = (a: number, b: number) => (a > b ? "none" : a === b ? `${a}` : `${a}–${b}`);
const GLYPH: Record<Result, string> = { low: "↑", high: "↓", hit: "✓", good: "✓", bad: "✕" };
const TONES = { lo: "var(--k-client)", mid: "var(--accent-2)", hi: "var(--k-gateway)" } as const;

function describe(g: Game) {
  const last = g.probes.at(-1);
  const left = g.hi - g.lo + 1;
  if (g.mode === "guess") {
    if (!last) return `I picked a number from 1 to ${g.n}. Type a guess, click the bar, or press Halve to guess the middle.`;
    if (last.result === "hit") return `${last.x} is right, in ${g.probes.length} guesses. Halving never needs more than ${worstCase("guess", g.n)}; counting up from 1 takes ${g.secret}.`;
    const why = `${last.x} is too ${last.result === "low" ? "low" : "high"}`;
    if (last.wasted) return `${why}, but you already knew that: a wasted guess. Still ${left} candidates (${span(g.lo, g.hi)}).`;
    return `${why}, so everything ${last.result === "low" ? "up to" : "from"} ${last.x} is out. ${left} left: ${span(g.lo, g.hi)}.`;
  }
  if (isDone(g)) return `Only build ${g.lo} is left, so it is the first bad build: ${g.probes.length} checks. A scan from build 1 needs ${g.secret}.`;
  if (!last) return `One of these ${g.n} builds broke something, and every later build is broken too. Click a build to test it, or press Halve.`;
  if (last.wasted) return `You already knew build ${last.x} was ${last.result}: a wasted check. The first bad build is in ${span(g.lo, g.hi)}.`;
  const verdict = last.result === "good" ? `Build ${last.x} is good, so builds 1–${last.x} are good` : `Build ${last.x} is bad, so the first bad build is ${last.x} or earlier`;
  return `${verdict}. It is in ${span(g.lo, g.hi)} (${left} left).`;
}

function Pointer({ x, y, label, reduce }: { x: number; y: number; label: keyof typeof TONES; reduce: boolean }) {
  return (
    <m.g initial={false} animate={{ x, y }} transition={{ duration: reduce ? 0 : 0.4, ease: "easeOut" }}>
      <path d="M0 -7 L5 1 L-5 1 Z" fill={TONES[label]} />
      <text y={13} textAnchor="middle" style={{ fontSize: 12, fontWeight: 750, fill: TONES[label] }}>
        {label}
      </text>
    </m.g>
  );
}

function Pointers({ g, at, y, reduce, step = 21 }: { g: Game; at: (v: number) => number; y: number; reduce: boolean; step?: number }) {
  const names = ["lo", "mid", "hi"] as const;
  const xs = [at(g.lo), at(midOf(g.lo, g.hi)), at(g.hi)];
  const rows = pointerRows(xs);
  return (
    <>
      {names.map((nm, i) => (
        <Pointer key={nm} x={xs[i]} y={y + rows[i] * step} label={nm} reduce={reduce} />
      ))}
    </>
  );
}

export function BinarySearchLab() {
  const [mode, setMode] = useState<Mode>("guess");
  const [size, setSize] = useState<Record<Mode, number>>({ guess: 100, bad: 16 });
  const [round, setRound] = useState(0);
  const [typed, setTyped] = useState("");
  const [running, setRunning] = useState(false);
  const { ref, inView, reduce } = useSimGate<HTMLDivElement>();
  const narrow = useNarrow(ref);
  const fresh = (md: Mode, n: number, r: number): Sim => ({ g: newGame(md, n, 11 + r * 7919 + (md === "bad" ? 3 : 0)), acc: 0 });
  const [sim, reset] = useFixedStep<Sim>(() => fresh("guess", 100, 0), stepSim, running && inView && !reduce);
  const g = sim.g;
  const done = isDone(g);
  const n = g.n;
  // A desktop pane gets a long, landscape number line; a phone keeps a shorter one with bigger type.
  const W = narrow ? 330 : 600;
  const X0 = narrow ? 22 : 30;
  const X1 = W - (narrow ? 28 : 34);
  const slot = (X1 - X0) / n;
  const left = (v: number) => X0 + (v - 1) * slot;
  const mid = (v: number) => left(v) + slot / 2;

  const restart = (md = mode, nn = size[md]) => {
    setRound((r) => r + 1);
    setRunning(false);
    setTyped("");
    reset(fresh(md, nn, round + 1));
  };
  const check = (x: number) => reset({ g: probe(g, x), acc: 0 });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const x = Number(typed);
    if (Number.isInteger(x) && x >= 1 && x <= n) check(x);
    setTyped("");
  };
  const clickBar = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const vx = ((e.clientX - r.left) / r.width) * W;
    if (vx >= X0 && vx < X1) check(Math.min(n, Math.floor((vx - X0) / slot) + 1));
  };

  const said = useThrottled(describe(g), 500);
  const wasted = g.probes.filter((p) => p.wasted).length;
  const hiBad = g.probes.some((p) => p.result === "bad" && p.x === g.hi);
  const count = g.hi - g.lo + 1;
  const zoomed = mode === "guess" && count <= ZOOM;
  const cell = Math.min(narrow ? 30 : 34, (X1 - X0) / Math.max(1, count));
  const zx = (v: number) => W / 2 - (count * cell) / 2 + (v - g.lo) * cell + cell / 2;
  const stacked = Math.max(...pointerRows([mid(g.lo), mid(midOf(g.lo, g.hi)), mid(g.hi)]));
  // Pointers that sit on the same candidate stack into rows; the zoomed strip needs room for them.
  const H = mode === "guess" ? 158 + (zoomed && !done ? stacked * 21 : 0) : 122 + (done ? 0 : stacked * 19);
  const label =
    mode === "guess"
      ? `Number line 1 to ${n}. Still possible: ${span(g.lo, g.hi)}. Guesses: ${g.probes.map((p) => `${p.x} ${p.result}`).join(", ") || "none"}.`
      : `${n} builds. Known good: ${span(1, g.lo - 1)}. The first bad build is in ${span(g.lo, g.hi)}.`;

  return (
    <WidgetFrame title="Halving lab" sub="Can you beat halving? Each middle check throws away half of what is left.">
      <div className="controls" style={{ alignItems: "center" }}>
        <Pick<Mode>
          label="Game"
          value={mode}
          onChange={(md) => {
            setMode(md);
            restart(md);
          }}
          options={[
            { value: "guess", label: "Guess my number" },
            { value: "bad", label: "First bad build" },
          ]}
        />
        {mode === "guess" ? (
          <Pick<number>
            label="Range"
            value={size.guess}
            onChange={(v) => {
              setSize((s) => ({ ...s, guess: v }));
              restart("guess", v);
            }}
            options={SIZES.guess.map((v) => ({ value: v, label: `1–${v.toLocaleString("en-GB")}` }))}
          />
        ) : (
          <Slider
            label="Builds"
            value={size.bad}
            min={SIZES.bad[0]}
            max={SIZES.bad[1]}
            onChange={(v) => {
              setSize((s) => ({ ...s, bad: v }));
              restart("bad", v);
            }}
          />
        )}
      </div>
      <div className="controls" style={{ marginTop: 0, alignItems: "center" }}>
        <form onSubmit={submit} style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <label className="control" style={{ minWidth: 0, flex: "none", display: "flex", alignItems: "center", gap: 6 }}>
            <span>{mode === "guess" ? "Your guess" : "Test build"}</span>
            <input type="number" min={1} max={n} value={typed} onChange={(e) => setTyped(e.target.value)} style={{ width: 76 }} disabled={done} />
          </label>
          <button type="submit" className="wbtn primary" disabled={done || typed === ""}>
            {mode === "guess" ? "Guess" : "Test"}
          </button>
        </form>
        <SimButtons
          running={running && !reduce && !done}
          reduce={reduce}
          onToggle={() => {
            if (!done) return setRunning((r) => !r);
            restart();
            setRunning(true);
          }}
          onStep={() => reset({ g: autoProbe(g), acc: 0 })}
          stepLabel="Halve"
          stepHint={`Check the middle candidate, ${midOf(g.lo, g.hi)}`}
          onReset={() => restart()}
        />
      </div>

      <div ref={ref}>
        <svg viewBox={`0 0 ${W} ${H}`} className="sim-svg" role="img" aria-label={label} onClick={clickBar} style={{ cursor: done ? "default" : "pointer", maxWidth: narrow ? 520 : 680, margin: "0 auto" }}>
          <text x={X0} y={15} style={{ fontSize: 13, fontWeight: 750, fill: done ? "var(--good-ink)" : "var(--fg)" }}>
            {done ? (mode === "guess" ? `✓ It was ${g.secret}` : `✓ First bad build: ${g.lo}`) : `${count} of ${n} still possible`}
          </text>
          {!done && (
            <text x={X1} y={15} textAnchor="end" className="muted-text" style={{ fontSize: 12 }}>
              halving tries {midOf(g.lo, g.hi)}
            </text>
          )}

          {mode === "guess" ? (
            <g>
              <rect x={X0} y={54} width={X1 - X0} height={16} rx={4} fill="var(--card-2)" stroke="var(--border)" />
              <m.rect y={54} height={16} rx={4} fill="color-mix(in srgb, var(--accent) 30%, var(--card))" stroke="var(--accent)" initial={false} animate={{ x: left(g.lo), width: Math.max(2, count * slot) }} transition={{ duration: reduce ? 0 : 0.45, ease: "easeInOut" }} />
              {g.lo > 1 && left(g.lo) - X0 > 56 && (
                <text x={(X0 + left(g.lo)) / 2} y={66} textAnchor="middle" className="muted-text" style={{ fontSize: 11 }}>
                  too low
                </text>
              )}
              {g.hi < n && X1 - left(g.hi + 1) > 56 && (
                <text x={(left(g.hi + 1) + X1) / 2} y={66} textAnchor="middle" className="muted-text" style={{ fontSize: 11 }}>
                  too high
                </text>
              )}
              <text x={X0 - 5} y={66} textAnchor="end" className="muted-text" style={{ fontSize: 11 }}>
                1
              </text>
              <text x={X1 + 5} y={66} className="muted-text" style={{ fontSize: 11 }}>
                {n === 1000 ? "1k" : n}
              </text>
              {g.probes.map((p, i) => {
                const last = i === g.probes.length - 1;
                const tone = p.result === "hit" ? "var(--good-ink)" : p.wasted ? "var(--critical-ink)" : "var(--fg)";
                return (
                  <m.g key={i} initial={reduce ? false : { opacity: 0, y: -14 }} animate={{ opacity: last ? 1 : 0.4, y: 0 }} transition={{ duration: reduce ? 0 : 0.3 }}>
                    <line x1={mid(p.x)} x2={mid(p.x)} y1={last ? 36 : 46} y2={54} stroke={tone} strokeWidth={last ? 2 : 1.4} />
                    {last && (
                      <text x={Math.min(Math.max(mid(p.x), X0 + 14), X1 - 14)} y={32} textAnchor="middle" style={{ fontSize: 12.5, fontWeight: 750, fill: tone }}>
                        {p.x}
                        {GLYPH[p.result]}
                      </text>
                    )}
                  </m.g>
                );
              })}
              {zoomed && (
                <g>
                  <path d={`M${left(g.lo)} 71 L${zx(g.lo) - cell / 2} 88 M${left(g.hi + 1)} 71 L${zx(g.hi) + cell / 2} 88`} stroke="var(--accent)" strokeDasharray="3 3" fill="none" />
                  {Array.from({ length: count }, (_, i) => {
                    const v = g.lo + i;
                    const hit = done && v === g.secret;
                    return (
                      <m.g key={v} initial={reduce ? false : { opacity: 0, y: 70 }} animate={{ opacity: 1, x: zx(v) - cell / 2, y: 88 }} transition={{ duration: reduce ? 0 : 0.4 }}>
                        <rect x={1.5} width={cell - 3} height={24} rx={5} fill={hit ? "color-mix(in srgb, var(--good) 22%, var(--card))" : "var(--card)"} stroke={hit ? "var(--good)" : "var(--border-strong)"} strokeWidth={hit ? 2 : 1.2} />
                        <text x={cell / 2} y={16} textAnchor="middle" style={{ fontSize: cell < 22 ? 9.5 : 11.5, fontWeight: 650 }}>
                          {v}
                        </text>
                      </m.g>
                    );
                  })}
                </g>
              )}
              {!done && <Pointers g={g} at={zoomed ? zx : mid} y={zoomed ? 126 : 86} reduce={reduce} />}
            </g>
          ) : (
            <g>
              <m.path initial={false} animate={{ d: `M${left(g.lo) + 1} 32 V26 H${left(g.hi + 1) - 1} V32`, opacity: done ? 0 : 1 }} transition={{ duration: reduce ? 0 : 0.4 }} fill="none" stroke="var(--accent)" strokeWidth={1.6} />
              {Array.from({ length: n }, (_, i) => {
                const v = i + 1;
                const tested = g.probes.findLast((p) => p.x === v);
                const state = v < g.lo ? "good" : v > g.hi || (v === g.hi && hiBad) || (done && v === g.lo) ? "bad" : "unknown";
                const first = done && v === g.lo;
                const latest = !!tested && tested === g.probes.at(-1);
                return (
                  <g key={v}>
                    <m.g initial={false} animate={{ y: latest && !reduce ? [0, -7, 0] : 0 }} transition={{ duration: 0.4 }}>
                      <rect
                        x={left(v) + 1}
                        y={38}
                        width={slot - 2}
                        height={30}
                        rx={4}
                        fill={state === "good" ? "color-mix(in srgb, var(--good) 22%, var(--card))" : state === "bad" ? "color-mix(in srgb, var(--critical) 18%, var(--card))" : "var(--card)"}
                        stroke={first ? "var(--critical)" : tested ? "var(--fg)" : "var(--border-strong)"}
                        strokeWidth={first || tested ? 2 : 1}
                      />
                      <text x={mid(v)} y={58} textAnchor="middle" style={{ fontSize: Math.min(12.5, slot * 0.7), fontWeight: 750, fill: state === "good" ? "var(--good-ink)" : state === "bad" ? "var(--critical-ink)" : "var(--muted)" }}>
                        {state === "good" ? "✓" : state === "bad" ? "✕" : "?"}
                      </text>
                    </m.g>
                    {(slot >= 18 || v % 2 === 1) && (
                      <text x={mid(v)} y={82} textAnchor="middle" className="muted-text" style={{ fontSize: 10.5 }}>
                        {v}
                      </text>
                    )}
                  </g>
                );
              })}
              {done ? (
                <text x={Math.min(Math.max(mid(g.lo), X0 + 34), X1 - 34)} y={104} textAnchor="middle" style={{ fontSize: 12.5, fontWeight: 750, fill: "var(--critical-ink)" }}>
                  ▲ first bad
                </text>
              ) : (
                <Pointers g={g} at={mid} y={98} reduce={reduce} step={19} />
              )}
            </g>
          )}
        </svg>
      </div>

      <div role="group" aria-label="Check counter" style={{ display: "flex", flexWrap: "wrap", gap: "2px 14px", fontSize: 13, lineHeight: 1.5, marginTop: 6 }}>
        <span>
          Your checks: <b>{g.probes.length}</b>
          {wasted > 0 && <span className="bad-ink"> ({wasted} wasted)</span>}
        </span>
        <span>
          Halving, worst case: <b>{worstCase(mode, n)}</b>
        </span>
        <span>
          Linear scan from 1: <b>{done ? g.secret : `up to ${n}`}</b>
        </span>
        {g.probes.length > 0 && (
          <span className="muted" style={{ flexBasis: "100%", fontVariantNumeric: "tabular-nums" }}>
            {mode === "guess" ? "Guesses" : "Tested"}: {g.probes.map((p) => `${p.x}${GLYPH[p.result]}`).join("  ")}
          </span>
        )}
      </div>
      <p className="readout" aria-live="polite">
        {said}
        <ReducedNote reduce={reduce} what="Reduced motion: press Halve to make one check." />
      </p>
    </WidgetFrame>
  );
}
