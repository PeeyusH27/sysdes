"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Zap } from "lucide-react";
import { useFixedStep } from "@/lib/sim-loop";
import { useNarrow } from "@/lib/hooks";
import { ReducedNote, SimButtons, useSimGate, useThrottled } from "./lib/sim-kit";
import { WidgetFrame } from "./WidgetFrame";

export const LIMIT = 10;
export const WINDOW_MS = 10_000;

/** Fixed window: one counter per aligned window, reset at every boundary. `times` sorted, in ms. */
export function fixedWindow(times: number[], limit = LIMIT, windowMs = WINDOW_MS): boolean[] {
  const counts = new Map<number, number>();
  return times.map((t) => {
    const w = Math.floor(t / windowMs);
    const c = counts.get(w) ?? 0;
    if (c >= limit) return false;
    counts.set(w, c + 1);
    return true;
  });
}

/** Weighted estimate: the previous window counts in proportion to how much of it still overlaps. */
export const slidingEstimate = (prev: number, curr: number, elapsedMs: number, windowMs = WINDOW_MS) => prev * (1 - elapsedMs / windowMs) + curr;

/** Sliding-window counter (two counters per key). Counts only allowed requests. */
export function slidingWindowCounter(times: number[], limit = LIMIT, windowMs = WINDOW_MS): boolean[] {
  const counts = new Map<number, number>();
  return times.map((t) => {
    const w = Math.floor(t / windowMs);
    const prev = counts.get(w - 1) ?? 0;
    const curr = counts.get(w) ?? 0;
    if (slidingEstimate(prev, curr, t - w * windowMs, windowMs) >= limit) return false;
    counts.set(w, curr + 1);
    return true;
  });
}

/** What each limiter's counter reads at time `at` (fixed: this window's count; sliding: the weighted estimate). */
export function counterAt(kind: "fixed" | "sliding", times: number[], allowed: boolean[], at: number, windowMs = WINDOW_MS) {
  const w = Math.floor(at / windowMs);
  let prev = 0;
  let curr = 0;
  times.forEach((t, i) => {
    if (!allowed[i] || t > at) return;
    const tw = Math.floor(t / windowMs);
    if (tw === w) curr++;
    else if (tw === w - 1) prev++;
  });
  return kind === "fixed" ? curr : slidingEstimate(prev, curr, at - w * windowMs, windowMs);
}

/** Most allowed requests inside any span of `windowMs` (the real, rolling rate a client achieved). */
export function maxInAnyWindow(times: number[], allowed: boolean[], windowMs = WINDOW_MS) {
  const ok = times.filter((_, i) => allowed[i]);
  let best = 0;
  let lo = 0;
  for (let hi = 0; hi < ok.length; hi++) {
    while (ok[hi] - ok[lo] >= windowMs) lo++;
    best = Math.max(best, hi - lo + 1);
  }
  return best;
}

type Burst = "before" | "after" | "both";
/** 10 requests 0.2 s apart in the 2 s before the 10 s boundary and/or the 2 s after it. */
export function burstTimes(which: Burst) {
  const before = Array.from({ length: 10 }, (_, i) => 8_000 + i * 200);
  const after = Array.from({ length: 10 }, (_, i) => 10_000 + i * 200);
  return which === "before" ? before : which === "after" ? after : [...before, ...after];
}

// ---------------------------------------------------------------- picture
const T0 = 6_000;
const T1 = 14_000;
const SPEED = 2; // simulated ms per real ms
const SAMPLES = Array.from({ length: 161 }, (_, i) => T0 + i * 50);

/** Drawing geometry: lane labels in a left column on the desktop pane, above each lane on a phone. */
interface Geo {
  w: number;
  h: number;
  l: number;
  r: number;
  narrow: boolean;
  k: number;
  tickEvery: number;
}
const WIDE: Geo = { w: 600, h: 256, l: 104, r: 588, narrow: false, k: 1, tickEvery: 1000 };
const NARROW: Geo = { w: 340, h: 262, l: 8, r: 332, narrow: true, k: 1.2, tickEvery: 2000 };
const xOf = (g: Geo, t: number) => g.l + ((t - T0) / (T1 - T0)) * (g.r - g.l);

const CSS = `
.fvs { container: fvs / inline-size; }
.fvs-bar { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin: 4px 0 6px; }
.fvs-bar > div:last-child { flex-wrap: nowrap !important; }
.fvs .legend { font-size: 12px; gap: 2px 12px; margin-top: 2px !important; }
@container fvs (max-width: 479px) {
  .fvs-bar .wbtn { padding: 0 9px; }
  .fvs-bar .seg button { padding: 5px 8px; }
}
`;

function Lane({ g, y, label, sub, kind, times, allowed, at }: { g: Geo; y: number; label: string; sub: string; kind: "fixed" | "sliding"; times: number[]; allowed: boolean[]; at: number }) {
  const { l: L, r: R, k } = g;
  const x = (t: number) => xOf(g, t);
  const top = g.narrow ? y + 22 : y + 8;
  const h = g.narrow ? 54 : 60;
  const sy = (v: number) => top + h * (1 - v / 12);
  const pts = SAMPLES.filter((s) => s <= at).map((s) => `${x(s).toFixed(1)},${sy(counterAt(kind, times, allowed, s)).toFixed(1)}`);
  const dotsY = top + h + 12;
  const now = counterAt(kind, times, allowed, at);
  const w = Math.floor(at / WINDOW_MS);
  let prev = 0;
  let curr = 0;
  times.forEach((t, i) => {
    if (!allowed[i] || t > at) return;
    if (Math.floor(t / WINDOW_MS) === w) curr++;
    else if (Math.floor(t / WINDOW_MS) === w - 1) prev++;
  });
  const weight = 1 - (at - w * WINDOW_MS) / WINDOW_MS;
  const boxTop = g.narrow ? y + 16 : y;
  const boxH = dotsY + 10 - boxTop;
  return (
    <g>
      {g.narrow ? (
        <text x={L} y={y + 11} style={{ fontWeight: 700, fontSize: 12 * k }}>
          {label}{" "}
          <tspan className="muted-text" style={{ fontWeight: 400, fontSize: 10.5 * k }}>
            · {sub}
          </tspan>
        </text>
      ) : (
        <>
          <text x={8} y={y + 34} style={{ fontWeight: 700, fontSize: 13 }}>
            {label}
          </text>
          <text x={8} y={y + 52} className="muted-text" style={{ fontSize: 11 }}>
            {sub}
          </text>
        </>
      )}
      <rect x={L} y={boxTop} width={x(10_000) - L} height={boxH} fill="color-mix(in srgb, var(--series-3) 5%, transparent)" />
      <rect x={x(10_000)} y={boxTop} width={R - x(10_000)} height={boxH} fill="color-mix(in srgb, var(--series-2) 6%, transparent)" />
      <line x1={L} x2={R} y1={sy(LIMIT)} y2={sy(LIMIT)} stroke="var(--critical)" strokeWidth={1} opacity={0.7} />
      <text x={R - 2} y={sy(LIMIT) - 4} textAnchor="end" style={{ fontSize: 10.5 * k, fill: "var(--critical-ink)" }}>
        limit {LIMIT}
      </text>
      <line x1={L} x2={R} y1={sy(0)} y2={sy(0)} stroke="var(--axis)" strokeWidth={1} />
      {pts.length > 1 && <path d={`M${pts.join(" L")}`} fill="none" stroke="var(--series-1)" strokeWidth={2} strokeLinejoin="round" />}
      {times.map((t, i) =>
        t > at ? null : allowed[i] ? (
          <circle key={i} cx={x(t)} cy={dotsY} r={4.5} fill="var(--series-1)" stroke="var(--card)" strokeWidth={1.5}>
            <title>{`${(t / 1000).toFixed(1)} s: allowed`}</title>
          </circle>
        ) : (
          <g key={i} stroke="var(--critical)" strokeWidth={2} strokeLinecap="round">
            <line x1={x(t) - 4} x2={x(t) + 4} y1={dotsY - 4} y2={dotsY + 4} />
            <line x1={x(t) - 4} x2={x(t) + 4} y1={dotsY + 4} y2={dotsY - 4} />
            <title>{`${(t / 1000).toFixed(1)} s: rejected (429)`}</title>
          </g>
        ),
      )}
      <text x={L + 4} y={sy(LIMIT) - 4} className="muted-text" style={{ fontSize: 11 * k }}>
        {kind === "fixed" ? `counter = ${curr}` : `estimate = ${prev} × ${weight.toFixed(2)} + ${curr} = ${now.toFixed(1)}`}
      </text>
    </g>
  );
}

interface PlayState {
  t: number;
}
const advancePlayhead = (s: PlayState, dt: number): PlayState => (s.t >= T1 ? s : { t: Math.min(T1, s.t + dt * SPEED) });

export function FixedVsSliding() {
  const [which, setWhich] = useState<Burst>("both");
  const [playing, setPlaying] = useState(false);
  const { ref, inView, reduce } = useSimGate<HTMLDivElement>();
  const boxRef = useRef<HTMLDivElement>(null);
  const narrow = useNarrow(boxRef, 480);
  const g = narrow ? NARROW : WIDE;
  const x = (t: number) => xOf(g, t);
  const [state, reset] = useFixedStep<PlayState>({ t: T1 }, advancePlayhead, playing && inView && !reduce);
  const at = state.t;

  const times = useMemo(() => burstTimes(which), [which]);
  const fixed = useMemo(() => fixedWindow(times), [times]);
  const sliding = useMemo(() => slidingWindowCounter(times), [times]);

  const fire = useCallback(() => {
    reset({ t: T0 });
    setPlaying(true);
  }, [reset]);

  // Play once when first scrolled into view (the server-rendered frame shows the finished result).
  const started = useRef(false);
  useEffect(() => {
    if (inView && !reduce && !started.current) {
      started.current = true;
      fire();
    }
  }, [inView, reduce, fire]);

  const seen = (allowed: boolean[]) => times.filter((t, i) => t <= at && allowed[i]).length;
  const done = at >= T1;
  const fMax = maxInAnyWindow(times, fixed);
  const sMax = maxInAnyWindow(times, sliding);
  const sentence = done
    ? `Fixed window allowed ${fMax} requests within ${which === "both" ? "4 s" : "2 s"}${fMax > LIMIT ? ` (${(fMax / LIMIT).toFixed(1)}× the limit of ${LIMIT} per 10 s, because its counter resets at the 10 s boundary)` : ""}. Sliding-window counter allowed ${sMax}: just after the boundary the previous window still counts at almost full weight.`
    : `t = ${(at / 1000).toFixed(1)} s: fixed window allowed ${seen(fixed)}, sliding window allowed ${seen(sliding)} so far.`;
  const said = useThrottled(sentence, 800);
  const k = g.k;
  const bottom = g.h - 34; // end of the second lane
  const ticks: number[] = [];
  for (let t = T0; t <= T1; t += g.tickEvery) ticks.push(t);

  return (
    <WidgetFrame title="Fixed window vs sliding window" sub={`Limit: ${LIMIT} requests per 10 s. Fire bursts right before and right after the 10 s boundary and compare what each limiter lets through.`}>
      <style href="w-fixed-vs-sliding" precedence="widgets">
        {CSS}
      </style>
      <div className="fvs" ref={boxRef}>
        <div className="fvs-bar">
          <div className="seg" role="group" aria-label="Bursts of 10 requests, around the 10 s boundary">
            {(
              [
                ["before", "Before 10 s"],
                ["after", "After 10 s"],
                ["both", "Both sides"],
              ] as const
            ).map(([v, l]) => (
              <button
                key={v}
                type="button"
                aria-pressed={which === v}
                onClick={() => {
                  setWhich(v);
                  if (reduce) reset({ t: T1 });
                  else fire();
                }}
              >
                {l}
              </button>
            ))}
          </div>
          <button type="button" className="wbtn primary" onClick={() => (reduce ? reset({ t: T1 }) : fire())}>
            <Zap size={14} aria-hidden /> Fire bursts
          </button>
          <SimButtons
            running={playing && !done}
            reduce={reduce}
            onToggle={done ? fire : () => setPlaying((p) => !p)}
            onStep={() => reset({ t: at >= T1 ? T0 : Math.min(T1, at + 1_000) })}
            stepHint={done ? "Restart at 6 seconds" : "Advance 1 second"}
            onReset={() => {
              setPlaying(false);
              reset({ t: T0 });
            }}
          />
        </div>
        <div ref={ref}>
          <svg viewBox={`0 0 ${g.w} ${g.h}`} className="sim-svg" style={{ maxWidth: 640, margin: "0 auto" }} role="img" aria-label={`Two timelines from 6 to 14 seconds. Playhead at ${(at / 1000).toFixed(1)} seconds.`}>
            <text x={(g.l + x(10_000)) / 2} y={13} textAnchor="middle" className="muted-text" style={{ fontSize: 11.5 * k }}>
              window 0–10 s
            </text>
            <text x={(x(10_000) + g.r) / 2} y={13} textAnchor="middle" className="muted-text" style={{ fontSize: 11.5 * k }}>
              window 10–20 s
            </text>
            <Lane g={g} y={g.narrow ? 20 : 20} label="Fixed window" sub="1 counter" kind="fixed" times={times} allowed={fixed} at={at} />
            <Lane g={g} y={g.narrow ? 120 : 120} label="Sliding window" sub="2 counters" kind="sliding" times={times} allowed={sliding} at={at} />
            <line x1={x(10_000)} x2={x(10_000)} y1={18} y2={bottom} stroke="var(--accent-2)" strokeWidth={2} />
            <text x={x(10_000)} y={bottom + 13 * k} textAnchor="middle" style={{ fontSize: 11 * k, fontWeight: 650, fill: "var(--accent-2)" }}>
              boundary
            </text>
            {ticks.map((t) => (
              <text key={t} x={x(t)} y={g.h - 4} textAnchor={t === T0 && g.narrow ? "start" : t === T1 && g.narrow ? "end" : "middle"} className="muted-text" style={{ fontSize: 10.5 * k }}>
                {t / 1000} s
              </text>
            ))}
            {!done && <line x1={x(at)} x2={x(at)} y1={18} y2={bottom} stroke="var(--fg)" strokeWidth={1.5} opacity={0.6} />}
          </svg>
        </div>
        <ul className="legend" aria-label="Legend">
          <li>
            <svg width={12} height={12} aria-hidden>
              <circle cx={6} cy={6} r={4.5} fill="var(--series-1)" />
            </svg>
            allowed
          </li>
          <li>
            <svg width={12} height={12} aria-hidden stroke="var(--critical)" strokeWidth={2} strokeLinecap="round">
              <line x1={2} x2={10} y1={2} y2={10} />
              <line x1={2} x2={10} y1={10} y2={2} />
            </svg>
            rejected (429)
          </li>
          <li>
            <span className="line-key" style={{ background: "var(--series-1)" }} aria-hidden />
            counter the limiter compares with {LIMIT}
          </li>
        </ul>
        <p className="readout" aria-live="polite">
          Max allowed in any 10 s span: fixed <strong className={fMax > LIMIT ? "bad-ink" : undefined}>{fMax}</strong>, sliding <strong>{sMax}</strong>. {said}
          <ReducedNote reduce={reduce} what="Showing the finished result (reduced motion): Step replays it 1 s at a time." />
        </p>
      </div>
    </WidgetFrame>
  );
}
