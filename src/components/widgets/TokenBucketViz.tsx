"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { m } from "motion/react";
import { Send, Zap } from "lucide-react";
import { useFixedStep } from "@/lib/sim-loop";
import { advance, ReducedNote, SimButtons, useSimGate, useThrottled } from "./lib/sim-kit";
import { Slider, WidgetFrame } from "./WidgetFrame";

const EPS = 1e-9;

/** Refill for `dtMs` at `ratePerSec`, never above `capacity`. */
export function tokenBucketStep(tokens: number, dtMs: number, ratePerSec: number, capacity: number) {
  return Math.min(capacity, tokens + (dtMs / 1000) * ratePerSec);
}

/** Try to take `n` tokens. On failure, `retryAfterMs` is the time until the deficit refills. */
export function take(tokens: number, ratePerSec: number, n = 1) {
  if (tokens + EPS >= n) {
    const left = Math.max(0, tokens - n);
    return { ok: true, tokens: left, remaining: Math.floor(left + EPS), retryAfterMs: 0 };
  }
  return { ok: false, tokens, remaining: 0, retryAfterMs: Math.ceil(((n - tokens) / ratePerSec) * 1000) };
}

/** The HTTP `Retry-After` header carries whole seconds, so round the exact wait up. */
export const retryAfterHeader = (retryAfterMs: number) => Math.max(1, Math.ceil(retryAfterMs / 1000));

// ---------------------------------------------------------------- simulation state
const TRAVEL = 1000; // ms a request dot takes to cross the picture
const LIFE = 1700; // ms before a dot is removed
const BURST_GAP = 40; // ms between requests in a burst

interface Dot {
  id: number;
  born: number;
  ok: boolean;
}
interface Outcome {
  id: number;
  ok: boolean;
  remaining: number;
  retryAfterMs: number;
  /** Tokens in the bucket when the request arrived. */
  had: number;
}
export interface TBState {
  t: number;
  tokens: number;
  pending: number;
  nextSend: number;
  dots: Dot[];
  allowed: number;
  rejected: number;
  nextId: number;
  last: Outcome | null;
}

export const initTB = (capacity: number): TBState => ({ t: 0, tokens: capacity, pending: 0, nextSend: 0, dots: [], allowed: 0, rejected: 0, nextId: 1, last: null });

/** Send one request at the current time: take a token or answer 429. */
export function sendOne(s: TBState, ratePerSec: number): TBState {
  const r = take(s.tokens, ratePerSec);
  const id = s.nextId;
  return {
    ...s,
    tokens: r.tokens,
    nextId: id + 1,
    dots: [...s.dots.slice(-40), { id, born: s.t, ok: r.ok }],
    allowed: s.allowed + (r.ok ? 1 : 0),
    rejected: s.rejected + (r.ok ? 0 : 1),
    last: { id, ok: r.ok, remaining: r.remaining, retryAfterMs: r.retryAfterMs, had: s.tokens },
  };
}

/** One fixed step: refill, release queued burst requests, retire old dots. */
export function stepTB(s: TBState, dt: number, ratePerSec: number, capacity: number): TBState {
  let next: TBState = { ...s, t: s.t + dt, tokens: tokenBucketStep(Math.min(s.tokens, capacity), dt, ratePerSec, capacity) };
  while (next.pending > 0 && next.nextSend <= next.t) {
    next = sendOne(next, ratePerSec);
    next = { ...next, pending: next.pending - 1, nextSend: next.nextSend + BURST_GAP };
  }
  if (next.dots.length && next.t - next.dots[0].born > LIFE) next = { ...next, dots: next.dots.filter((d) => next.t - d.born <= LIFE) };
  return next;
}

// ---------------------------------------------------------------- picture
const COLS = 5;
const SLOT = 25;

/** Drawing geometry: wide for the desktop pane, narrower with bigger text (`k`) for phones. */
interface Geo {
  w: number;
  h: number;
  lane: number;
  gate: number;
  clientX: number;
  apiX: number;
  k: number;
  narrow: boolean;
}
const WIDE: Geo = { w: 560, h: 240, lane: 210, gate: 280, clientX: 92, apiX: 470, k: 1, narrow: false };
const NARROW: Geo = { w: 340, h: 244, lane: 212, gate: 170, clientX: 74, apiX: 266, k: 1.25, narrow: true };

/** True while the widget is narrower than `px`, i.e. on a phone. */
function useNarrow(px: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setNarrow(e.contentRect.width < px));
    ro.observe(el);
    return () => ro.disconnect();
  }, [px]);
  return [ref, narrow] as const;
}

const CSS = `
.tb { container: tb / inline-size; }
.tb-sliders { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px 14px; margin: 4px 0 8px; }
.tb-sliders .control { min-width: 0; }
.tb-bar { display: flex; flex-wrap: wrap; gap: 6px; align-items: flex-end; margin: 0 0 6px; }
.tb-bar > div { flex-wrap: nowrap !important; }
.tb-stats { display: flex; flex-wrap: wrap; gap: 2px 16px; margin: 4px 0 0 !important; font-size: 13px; }
.tb-stats > div { display: flex; gap: 5px; align-items: center; }
.tb-stats dt { color: var(--muted); display: inline-flex; align-items: center; gap: 5px; }
.tb-stats dd { margin: 0; font-weight: 650; font-variant-numeric: tabular-nums; }
.tb-dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
@container tb (max-width: 479px) {
  .tb-bar .wbtn { padding: 0 9px; }
  .tb-send .wbtn > svg { display: none; }
}
`;

function TokenGrid({ g, tokens, capacity }: { g: Geo; tokens: number; capacity: number }) {
  const full = Math.floor(tokens + EPS);
  const frac = tokens - full;
  const x0 = g.gate - ((COLS - 1) * SLOT) / 2;
  const yBottom = 150;
  return (
    <g aria-hidden>
      {Array.from({ length: capacity }, (_, i) => {
        const cx = x0 + (i % COLS) * SLOT;
        const cy = yBottom - Math.floor(i / COLS) * SLOT;
        const isFull = i < full;
        const isFilling = i === full && frac > 0.01;
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r={9.5} fill="none" stroke="var(--border-strong)" strokeDasharray={isFull ? undefined : "2 3"} />
            {isFull && <circle cx={cx} cy={cy} r={9.5} fill="var(--series-1)" />}
            {isFilling && <circle cx={cx} cy={cy} r={9.5 * Math.sqrt(frac)} fill="var(--series-1)" opacity={0.75} />}
          </g>
        );
      })}
    </g>
  );
}

function RequestDot({ g, ok, reduce }: { g: Geo; ok: boolean; reduce: boolean }) {
  const fill = ok ? "var(--series-1)" : "var(--critical)";
  const xs = ok ? [g.clientX + 6, g.gate, g.apiX - 8] : [g.clientX + 6, g.gate - 8, g.clientX + 40];
  const ys = ok ? [g.lane, g.lane, g.lane] : [g.lane, g.lane, g.lane + 22];
  const label = ok ? "200" : "429";
  if (reduce) return null;
  return (
    <m.g initial={{ x: xs[0], y: ys[0], opacity: 1 }} animate={{ x: xs, y: ys, opacity: [1, 1, 0.85] }} transition={{ duration: TRAVEL / 1000, times: [0, 0.5, 1], ease: "easeInOut" }}>
      <circle r={7} fill={fill} stroke="var(--card)" strokeWidth={2} />
      <m.text y={-11} textAnchor="middle" initial={{ opacity: 0 }} animate={{ opacity: [0, 0, 1] }} transition={{ duration: TRAVEL / 1000, times: [0, 0.5, 0.6] }} style={{ fontWeight: 700, fontSize: 11 * g.k, fill: ok ? "var(--good-ink)" : "var(--critical-ink)" }}>
        {label}
      </m.text>
    </m.g>
  );
}

export function TokenBucketViz() {
  const [rate, setRate] = useState(2);
  const [capacity, setCapacity] = useState(10);
  const [running, setRunning] = useState(true);
  const { ref, inView, reduce } = useSimGate<HTMLDivElement>();
  const [boxRef, narrow] = useNarrow(480);
  const g = narrow ? NARROW : WIDE;
  const k = g.k;

  const step = useCallback((s: TBState, dt: number) => stepTB(s, dt, rate, capacity), [rate, capacity]);
  const live = running && inView && !reduce;
  const [state, reset] = useFixedStep(() => initTB(10), step, live);

  const sendBurst = (n: number) => {
    if (reduce || !live) {
      // No clock running: process the whole burst at this instant.
      let s = state;
      for (let i = 0; i < n; i++) s = sendOne(s, rate);
      reset(s);
    } else reset({ ...state, pending: state.pending + n, nextSend: Math.max(state.nextSend, state.t) });
  };
  const changeCapacity = (c: number) => {
    setCapacity(c);
    reset({ ...state, tokens: Math.min(state.tokens, c) });
  };

  const last = state.last;
  const sentence = last
    ? last.ok
      ? `Request ${last.id} allowed (200). ${last.remaining} whole token${last.remaining === 1 ? "" : "s"} left.`
      : `Request ${last.id} rejected: 429 Too Many Requests, Retry-After: ${retryAfterHeader(last.retryAfterMs)} (exact wait (1 − ${last.had.toFixed(2)}) ÷ ${rate}/s = ${(last.retryAfterMs / 1000).toFixed(2)} s).`
    : `The bucket starts full: up to ${capacity} requests can burst, then ${rate} per second.`;
  const said = useThrottled(`${sentence} Totals: ${state.allowed} allowed, ${state.rejected} rejected.`, 700);
  const fillPct = Math.round((state.tokens / capacity) * 100);
  const gate = g.gate;
  const lane = g.lane;

  return (
    <WidgetFrame title="Token bucket" sub="The bucket refills at rate r up to capacity b. Each request takes one token; an empty bucket answers 429 with a computed Retry-After.">
      <style href="w-token-bucket" precedence="widgets">
        {CSS}
      </style>
      <div className="tb" ref={boxRef}>
        <div className="tb-sliders">
          <Slider label="Refill rate r" value={rate} min={0.5} max={10} step={0.5} onChange={setRate} format={(v) => `${v} tokens/s`} />
          <Slider label="Capacity b (burst)" value={capacity} min={1} max={20} onChange={changeCapacity} format={(v) => `${v} tokens`} />
        </div>
        <div className="tb-bar">
          <div className="tb-send" style={{ display: "flex", gap: 6 }}>
            <button type="button" className="wbtn primary" onClick={() => sendBurst(1)}>
              <Send size={14} aria-hidden /> Send 1 request
            </button>
            <button type="button" className="wbtn" onClick={() => sendBurst(20)}>
              <Zap size={14} aria-hidden /> Burst 20
            </button>
          </div>
          <SimButtons
            running={live}
            reduce={reduce}
            onToggle={() => setRunning((r) => !r)}
            onStep={() => reset(advance(state, step, 10))}
            stepHint="Advance the clock 0.5 seconds"
            onReset={() => reset(initTB(capacity))}
          />
        </div>
        <div ref={ref}>
          <svg viewBox={`0 0 ${g.w} ${g.h}`} className="sim-svg" style={{ maxWidth: 620, margin: "0 auto" }} role="img" aria-label={`Token bucket holding ${state.tokens.toFixed(1)} of ${capacity} tokens, refilling at ${rate} per second`}>
            {/* refill tap */}
            <text x={g.narrow ? gate - 10 : gate} y={16} textAnchor={g.narrow ? "end" : "middle"} className="muted-text" style={{ fontSize: 12 * k }}>
              refill +{rate}/s
            </text>
            <path d={`M${gate} 22 V34`} stroke="var(--border-strong)" strokeWidth={3} strokeLinecap="round" />
            {live && state.tokens < capacity - EPS && (
              <m.circle cx={gate} r={3.5} fill="var(--series-1)" initial={{ cy: 34, opacity: 1 }} animate={{ cy: [34, 58], opacity: [1, 0] }} transition={{ duration: Math.min(1, 1 / rate), repeat: Infinity, ease: "easeIn" }} />
            )}
            {/* bucket */}
            <path d={`M${gate - 78} 40 L${gate - 70} 170 Q${gate - 70} 178 ${gate - 62} 178 H${gate + 62} Q${gate + 70} 178 ${gate + 70} 170 L${gate + 78} 40`} fill="var(--card-2)" stroke="var(--border-strong)" strokeWidth={2} />
            <TokenGrid g={g} tokens={state.tokens} capacity={capacity} />
            {g.narrow ? (
              <text x={gate + 10} y={16} className="muted-text" style={{ fontSize: 12 * k }}>
                <tspan style={{ fontWeight: 700, fill: "var(--fg)" }}>{state.tokens.toFixed(1)}</tspan> of {capacity}
              </text>
            ) : (
              <text x={gate + 92} y={110} className="muted-text" style={{ fontSize: 12 }}>
                <tspan x={gate + 92} style={{ fontWeight: 700, fill: "var(--fg)", fontSize: 15 }}>
                  {state.tokens.toFixed(1)}
                </tspan>
                <tspan x={gate + 92} dy={16}>
                  of {capacity} tokens
                </tspan>
              </text>
            )}
            {/* valve from bucket to the request lane */}
            <path d={`M${gate} 178 V${lane - 10}`} stroke="var(--border-strong)" strokeWidth={2} strokeDasharray="3 3" />
            {/* request lane */}
            <line x1={g.clientX} x2={g.apiX} y1={lane} y2={lane} stroke="var(--border)" strokeWidth={2} />
            <rect x={gate - 26 * k} y={lane - 11 * k} width={52 * k} height={22 * k} rx={6} fill="var(--card)" stroke="var(--accent)" strokeWidth={1.5} />
            <text x={gate} y={lane + 4 * k} textAnchor="middle" style={{ fontSize: 11 * k, fontWeight: 650 }}>
              limiter
            </text>
            <rect x={6} y={lane - 22} width={g.clientX - 6} height={44} rx={10} fill="var(--card-2)" stroke="var(--k-client)" strokeWidth={1.5} />
            <text x={(6 + g.clientX) / 2} y={lane + 4 * k} textAnchor="middle" style={{ fontWeight: 650, fontSize: 11.5 * k }}>
              Client
            </text>
            <rect x={g.apiX} y={lane - 22} width={g.w - g.apiX - 6} height={44} rx={10} fill="var(--card-2)" stroke="var(--k-service)" strokeWidth={1.5} />
            <text x={(g.apiX + g.w - 6) / 2} y={lane + 4 * k} textAnchor="middle" style={{ fontWeight: 650, fontSize: 11.5 * k }}>
              API
            </text>
            {state.dots.map((d) => (
              <RequestDot key={d.id} g={g} ok={d.ok} reduce={reduce} />
            ))}
            {reduce && last && (
              <text x={last.ok ? g.apiX - 10 : g.clientX + 10} y={lane + 30} textAnchor={last.ok ? "end" : "start"} style={{ fontWeight: 700, fontSize: 11.5 * k, fill: last.ok ? "var(--good-ink)" : "var(--critical-ink)" }}>
                {last.ok ? "✓ 200 OK" : `✕ 429 · Retry-After: ${retryAfterHeader(last.retryAfterMs)}`}
              </text>
            )}
          </svg>
        </div>
        <dl className="tb-stats">
          <div>
            <dt>Tokens</dt>
            <dd>
              {state.tokens.toFixed(1)} / {capacity} <span className="muted" style={{ fontWeight: 400 }}>({fillPct}%)</span>
            </dd>
          </div>
          <div>
            <dt>
              <span className="tb-dot" style={{ background: "var(--series-1)" }} aria-hidden />
              Allowed (200)
            </dt>
            <dd>{state.allowed}</dd>
          </div>
          <div>
            <dt>
              <span className="tb-dot" style={{ background: "var(--critical)" }} aria-hidden />
              Rejected (429)
            </dt>
            <dd>{state.rejected}</dd>
          </div>
          <div>
            <dt>Last Retry-After</dt>
            <dd>{last && !last.ok ? `${retryAfterHeader(last.retryAfterMs)} s` : "–"}</dd>
          </div>
        </dl>
        <p className="readout" aria-live="polite">
          {said}
          <ReducedNote reduce={reduce} what="Clock paused (reduced motion): Step adds 0.5 s of refill." />
        </p>
      </div>
    </WidgetFrame>
  );
}
