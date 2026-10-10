"use client";
import { useCallback, useState } from "react";
import { m } from "motion/react";
import { Send, Zap } from "lucide-react";
import { StatTiles } from "@/components/charts/ChartBits";
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
const W = 560;
const H = 260;
const LANE = 214;
const GATE = 280;
const CLIENT_X = 92;
const API_X = 470;
const COLS = 5;
const SLOT = 25;

function TokenGrid({ tokens, capacity }: { tokens: number; capacity: number }) {
  const full = Math.floor(tokens + EPS);
  const frac = tokens - full;
  const x0 = GATE - ((COLS - 1) * SLOT) / 2;
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

function RequestDot({ ok, reduce }: { ok: boolean; reduce: boolean }) {
  const fill = ok ? "var(--series-1)" : "var(--critical)";
  const xs = ok ? [CLIENT_X + 6, GATE, API_X - 8] : [CLIENT_X + 6, GATE - 8, CLIENT_X + 40];
  const ys = ok ? [LANE, LANE, LANE] : [LANE, LANE, LANE + 30];
  const label = ok ? "200" : "429";
  if (reduce) return null;
  return (
    <m.g initial={{ x: xs[0], y: ys[0], opacity: 1 }} animate={{ x: xs, y: ys, opacity: [1, 1, 0.85] }} transition={{ duration: TRAVEL / 1000, times: [0, 0.5, 1], ease: "easeInOut" }}>
      <circle r={7} fill={fill} stroke="var(--card)" strokeWidth={2} />
      <m.text y={-11} textAnchor="middle" initial={{ opacity: 0 }} animate={{ opacity: [0, 0, 1] }} transition={{ duration: TRAVEL / 1000, times: [0, 0.5, 0.6] }} style={{ fontWeight: 700, fontSize: 11, fill: ok ? "var(--good-ink)" : "var(--critical-ink)" }}>
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
      : `Request ${last.id} rejected: 429 Too Many Requests, Retry-After: ${retryAfterHeader(last.retryAfterMs)} (the next token arrives in ${(last.retryAfterMs / 1000).toFixed(2)} s at ${rate}/s).`
    : `The bucket starts full: up to ${capacity} requests can burst, then ${rate} per second.`;
  const said = useThrottled(`${sentence} Totals: ${state.allowed} allowed, ${state.rejected} rejected.`, 700);
  const fillPct = Math.round((state.tokens / capacity) * 100);

  return (
    <WidgetFrame title="Token bucket" sub="The bucket refills at rate r up to capacity b. Each request takes one token; an empty bucket answers 429 with a computed Retry-After.">
      <div className="controls">
        <Slider label="Refill rate r" value={rate} min={0.5} max={10} step={0.5} onChange={setRate} format={(v) => `${v} tokens/s`} />
        <Slider label="Capacity b (burst)" value={capacity} min={1} max={20} onChange={changeCapacity} format={(v) => `${v} tokens`} />
      </div>
      <div className="controls" style={{ marginTop: 0 }}>
        <button type="button" className="wbtn primary" onClick={() => sendBurst(1)}>
          <Send size={14} aria-hidden /> Send 1 request
        </button>
        <button type="button" className="wbtn" onClick={() => sendBurst(20)}>
          <Zap size={14} aria-hidden /> Burst 20
        </button>
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
        <svg viewBox={`0 0 ${W} ${H}`} className="sim-svg" role="img" aria-label={`Token bucket holding ${state.tokens.toFixed(1)} of ${capacity} tokens, refilling at ${rate} per second`}>
          {/* refill tap */}
          <text x={GATE} y={16} textAnchor="middle" className="muted-text" style={{ fontSize: 12 }}>
            refill +{rate}/s
          </text>
          <path d={`M${GATE} 22 V34`} stroke="var(--border-strong)" strokeWidth={3} strokeLinecap="round" />
          {live && state.tokens < capacity - EPS && (
            <m.circle cx={GATE} r={3.5} fill="var(--series-1)" initial={{ cy: 34, opacity: 1 }} animate={{ cy: [34, 58], opacity: [1, 0] }} transition={{ duration: Math.min(1, 1 / rate), repeat: Infinity, ease: "easeIn" }} />
          )}
          {/* bucket */}
          <path d={`M${GATE - 78} 40 L${GATE - 70} 170 Q${GATE - 70} 178 ${GATE - 62} 178 H${GATE + 62} Q${GATE + 70} 178 ${GATE + 70} 170 L${GATE + 78} 40`} fill="var(--card-2)" stroke="var(--border-strong)" strokeWidth={2} />
          <TokenGrid tokens={state.tokens} capacity={capacity} />
          <text x={GATE + 92} y={110} className="muted-text" style={{ fontSize: 12 }}>
            <tspan x={GATE + 92} style={{ fontWeight: 700, fill: "var(--fg)", fontSize: 15 }}>
              {state.tokens.toFixed(1)}
            </tspan>
            <tspan x={GATE + 92} dy={16}>
              of {capacity} tokens
            </tspan>
          </text>
          {/* valve from bucket to the request lane */}
          <path d={`M${GATE} 178 V${LANE - 10}`} stroke="var(--border-strong)" strokeWidth={2} strokeDasharray="3 3" />
          {/* request lane */}
          <line x1={CLIENT_X} x2={API_X} y1={LANE} y2={LANE} stroke="var(--border)" strokeWidth={2} />
          <rect x={GATE - 26} y={LANE - 11} width={52} height={22} rx={6} fill="var(--card)" stroke="var(--accent)" strokeWidth={1.5} />
          <text x={GATE} y={LANE + 4} textAnchor="middle" style={{ fontSize: 11, fontWeight: 650 }}>
            limiter
          </text>
          <rect x={8} y={LANE - 22} width={CLIENT_X - 8} height={44} rx={10} fill="var(--card-2)" stroke="var(--k-client)" strokeWidth={1.5} />
          <text x={(8 + CLIENT_X) / 2} y={LANE + 4} textAnchor="middle" style={{ fontWeight: 650 }}>
            Client
          </text>
          <rect x={API_X} y={LANE - 22} width={W - API_X - 8} height={44} rx={10} fill="var(--card-2)" stroke="var(--k-service)" strokeWidth={1.5} />
          <text x={(API_X + W - 8) / 2} y={LANE + 4} textAnchor="middle" style={{ fontWeight: 650 }}>
            API
          </text>
          {state.dots.map((d) => (
            <RequestDot key={d.id} ok={d.ok} reduce={reduce} />
          ))}
          {reduce && last && (
            <text x={last.ok ? API_X - 10 : CLIENT_X + 10} y={LANE + 36} textAnchor={last.ok ? "end" : "start"} style={{ fontWeight: 700, fill: last.ok ? "var(--good-ink)" : "var(--critical-ink)" }}>
              {last.ok ? "✓ 200 OK" : `✕ 429 · Retry-After: ${retryAfterHeader(last.retryAfterMs)}`}
            </text>
          )}
          <g aria-hidden>
            <circle cx={14} cy={H - 8} r={5} fill="var(--series-1)" />
            <text x={24} y={H - 4} className="muted-text">
              200 allowed
            </text>
            <circle cx={110} cy={H - 8} r={5} fill="var(--critical)" />
            <text x={120} y={H - 4} className="muted-text">
              429 rejected (bounces back)
            </text>
          </g>
        </svg>
      </div>
      <StatTiles
        items={[
          { label: "Tokens", value: `${state.tokens.toFixed(1)} / ${capacity}`, sub: `${fillPct}% full` },
          { label: "Allowed (200)", value: String(state.allowed) },
          { label: "Rejected (429)", value: String(state.rejected) },
          {
            label: "Last Retry-After",
            value: last && !last.ok ? `${retryAfterHeader(last.retryAfterMs)} s` : "–",
            sub: last && !last.ok ? `exact wait ${last.retryAfterMs} ms = (1 − ${last.had.toFixed(2)}) ÷ ${rate}/s` : "token deficit ÷ refill rate",
          },
        ]}
      />
      <p className="readout" aria-live="polite">
        {said}
        <ReducedNote reduce={reduce} what="Clock paused (reduced motion): Step adds 0.5 s of refill." />
      </p>
    </WidgetFrame>
  );
}
