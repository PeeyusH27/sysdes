"use client";
import { useCallback, useMemo, useRef, useState } from "react";
import { StatTiles } from "@/components/charts/ChartBits";
import { mulberry32 } from "@/lib/rng";
import { useFixedStep } from "@/lib/sim-loop";
import { useNarrow } from "@/lib/hooks";
import { advance, ReducedNote, SimButtons, useSimGate, useThrottled } from "./lib/sim-kit";
import { More, Slider, WidgetFrame } from "./WidgetFrame";

export type BreakerState = "closed" | "open" | "half-open";
export type Outcome = "success" | "error" | "fallback";
export interface BreakerConfig {
  /** Consecutive failures that trip the breaker. */
  threshold: number;
  cooldownMs: number;
  /** How long the half-open trial request takes. */
  probeMs?: number;
}
export interface Breaker {
  state: BreakerState;
  failures: number;
  openedAt: number;
  /** Half-open: when the trial request finishes, and whether it worked. */
  probeUntil: number;
  probeOk: boolean;
}
export const closedBreaker = (): Breaker => ({ state: "closed", failures: 0, openedAt: 0, probeUntil: 0, probeOk: false });

/** Finish a half-open trial whose time has come: success closes the breaker, failure re-opens it. */
export function settleProbe(b: Breaker, now: number): { breaker: Breaker; note?: string } {
  if (b.state !== "half-open" || now < b.probeUntil) return { breaker: b };
  return b.probeOk
    ? { breaker: { ...b, state: "closed", failures: 0 }, note: "Trial request succeeded → Closed" }
    : { breaker: { ...b, state: "open", openedAt: b.probeUntil }, note: "Trial request failed → Open again" };
}

/** One request through the breaker. `depFails` says whether the dependency would fail this call. */
export function breakerRequest(b0: Breaker, now: number, cfg: BreakerConfig, depFails: boolean): { breaker: Breaker; outcome: Outcome; note?: string } {
  const settled = settleProbe(b0, now);
  const b = settled.breaker;
  if (b.state === "open") {
    if (now - b.openedAt < cfg.cooldownMs) return { breaker: b, outcome: "fallback", note: settled.note };
    // Cooldown over: this request becomes the single trial call.
    const probe: Breaker = { ...b, state: "half-open", probeUntil: now + (cfg.probeMs ?? 400), probeOk: !depFails };
    return { breaker: probe, outcome: depFails ? "error" : "success", note: "Cooldown over → Half-open: one trial request" };
  }
  if (b.state === "half-open") return { breaker: b, outcome: "fallback", note: settled.note }; // trial in flight: everyone else fails fast
  if (!depFails) return { breaker: { ...b, failures: 0 }, outcome: "success", note: settled.note };
  const failures = b.failures + 1;
  if (failures >= cfg.threshold) return { breaker: { ...b, state: "open", failures, openedAt: now }, outcome: "error", note: `${failures} failures in a row → Open` };
  return { breaker: { ...b, failures }, outcome: "error", note: settled.note };
}

// ---------------------------------------------------------------- simulation
export interface CBParams extends BreakerConfig {
  errorRate: number;
  rps: number;
}
export interface Transition {
  t: number;
  from: BreakerState;
  to: BreakerState;
  text: string;
}
export interface CBState {
  t: number;
  breaker: Breaker;
  nextArrival: number;
  recent: { id: number; outcome: Outcome }[];
  counts: Record<Outcome, number>;
  log: Transition[];
  nextId: number;
}
export const initCB = (): CBState => ({ t: 0, breaker: closedBreaker(), nextArrival: 0, recent: [], counts: { success: 0, error: 0, fallback: 0 }, log: [], nextId: 1 });

/** Advance by dt: settle the trial call and admit arrivals strictly in time order. */
export function cbStep(s: CBState, dt: number, p: CBParams, rand: () => number): CBState {
  const t = s.t + dt;
  let { breaker, nextArrival, nextId } = s;
  let recent = s.recent;
  let log = s.log;
  const counts = { ...s.counts };
  const record = (at: number, from: BreakerState, to: BreakerState, text?: string) => {
    if (text && from !== to) log = [...log, { t: at, from, to, text }].slice(-6);
  };
  for (;;) {
    const probeDue = breaker.state === "half-open" ? breaker.probeUntil : Infinity;
    if (Math.min(probeDue, nextArrival) > t) break;
    const from = breaker.state;
    if (probeDue <= nextArrival) {
      const r = settleProbe(breaker, probeDue);
      breaker = r.breaker;
      record(probeDue, from, breaker.state, r.note);
      continue;
    }
    const r = breakerRequest(breaker, nextArrival, p, rand() < p.errorRate);
    breaker = r.breaker;
    record(nextArrival, from, breaker.state, r.note);
    counts[r.outcome]++;
    recent = [...recent, { id: nextId++, outcome: r.outcome }].slice(-36);
    nextArrival += 1000 / p.rps;
  }
  return { t, breaker, nextArrival, recent, counts, log, nextId };
}

// ---------------------------------------------------------------- picture
const ICON: Record<Outcome, string> = { success: "✓", error: "✕", fallback: "↩" };
const FILL: Record<Outcome, string> = { success: "var(--good)", error: "var(--critical)", fallback: "var(--warning)" };
const NODE_LABEL: Record<BreakerState, string> = { closed: "Closed", open: "Open", "half-open": "Half-open" };
const NODE_COLOR: Record<BreakerState, string> = { closed: "var(--good)", open: "var(--critical)", "half-open": "var(--warning)" };

/**
 * Landscape: the three states in a row, the "trial succeeds" arc under them, recent requests along the bottom.
 * Phone: Closed and Open on top, Half-open under Open, so the drawing stays readable at 300 px.
 */
function geometry(narrow: boolean, threshold: number) {
  if (narrow) {
    const NW = 104;
    const NH = 50;
    const node = { closed: { x: 70, y: 52 }, open: { x: 246, y: 52 }, "half-open": { x: 246, y: 158 } };
    return {
      W: 320,
      H: 246,
      NW,
      NH,
      node,
      edges: {
        "closed>open": { d: `M${70 + NW / 2} 52 L${246 - NW / 2 - 4} 52`, label: [`${threshold} failures`, "in a row"], lx: 158, ly: 30, anchor: "middle" },
        "open>half-open": { d: `M228 ${52 + NH / 2} L228 ${158 - NH / 2 - 4}`, label: ["cooldown", "over"], lx: 220, ly: 100, anchor: "end" },
        "half-open>open": { d: `M264 ${158 - NH / 2} L264 ${52 + NH / 2 + 4}`, label: ["trial", "fails"], lx: 272, ly: 100, anchor: "start" },
        "half-open>closed": { d: `M${246 - NW / 2} 158 C110 158 70 140 70 ${52 + NH / 2 + 4}`, label: ["trial", "succeeds"], lx: 152, ly: 122, anchor: "middle" },
      },
      strip: { x: 8, y: 222, n: 18, step: 16.9, labelY: 214 },
    };
  }
  const NW = 116;
  const NH = 54;
  const node = { closed: { x: 86, y: 62 }, open: { x: 300, y: 62 }, "half-open": { x: 514, y: 62 } };
  return {
    W: 600,
    H: 186,
    NW,
    NH,
    node,
    edges: {
      "closed>open": { d: `M${86 + NW / 2} 52 L${300 - NW / 2 - 4} 52`, label: [`${threshold} failures`, "in a row"], lx: 193, ly: 26, anchor: "middle" },
      "open>half-open": { d: `M${300 + NW / 2} 52 L${514 - NW / 2 - 4} 52`, label: ["cooldown", "over"], lx: 407, ly: 26, anchor: "middle" },
      "half-open>open": { d: `M${514 - NW / 2} 74 L${300 + NW / 2 + 4} 74`, label: ["trial", "fails"], lx: 407, ly: 90, anchor: "middle" },
      "half-open>closed": { d: `M514 ${62 + NH / 2} C514 128 86 128 86 ${62 + NH / 2 + 4}`, label: ["trial succeeds"], lx: 300, ly: 134, anchor: "middle" },
    },
    strip: { x: 120, y: 152, n: 36, step: 13.1, labelY: 165 },
  };
}

function Arrow({ d, label, lx, ly, anchor, active }: { d: string; label: string[]; lx: number; ly: number; anchor: string; active: boolean }) {
  return (
    <g>
      <path d={d} fill="none" stroke={active ? "var(--accent)" : "var(--border-strong)"} strokeWidth={active ? 2.5 : 1.5} markerEnd="url(#cb-arrow)" />
      <text x={lx} y={ly} textAnchor={anchor as "start" | "middle" | "end"} className="muted-text" style={{ fontSize: 10.5, fontWeight: active ? 700 : 400 }}>
        {label.map((line, i) => (
          <tspan key={i} x={lx} dy={i ? 12 : 0}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}

const CSS = `
.w-cb { container-type: inline-size; }
.w-cb .controls { margin-bottom: 4px; }
.w-cb .control { min-width: 120px; }
.w-cb .stat-tiles { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; margin-top: 6px; }
.w-cb .stat-tile { padding: 5px 9px; border-radius: 10px; }
.w-cb .stat-label, .w-cb .stat-sub { font-size: 11.5px; line-height: 1.35; }
.w-cb .stat-value { font-size: 17px; line-height: 1.3; }
@container (max-width: 520px) { .w-cb .stat-tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
`;

export function CircuitBreakerSim() {
  const [errorRate, setErrorRate] = useState(0.1);
  const [threshold, setThreshold] = useState(5);
  const [cooldown, setCooldown] = useState(4);
  const [running, setRunning] = useState(true);
  const rand = useMemo(() => mulberry32(31), []);
  const { ref, inView, reduce } = useSimGate<HTMLDivElement>();
  const box = useRef<HTMLDivElement>(null);
  const narrow = useNarrow(box, 480);

  const params = useMemo<CBParams>(() => ({ errorRate, threshold, cooldownMs: cooldown * 1000, rps: 5, probeMs: 400 }), [errorRate, threshold, cooldown]);
  const step = useCallback((s: CBState, dt: number) => cbStep(s, dt, params, rand), [params, rand]);
  const live = running && inView && !reduce;
  const [s, reset] = useFixedStep(initCB, step, live);

  const b = s.breaker;
  const left = b.state === "open" ? Math.max(0, cooldown * 1000 - (s.t - b.openedAt)) : 0;
  const lastEdge = s.log.at(-1);
  const lit = (from: BreakerState, to: BreakerState) => !!lastEdge && lastEdge.from === from && lastEdge.to === to && s.t - lastEdge.t < 1_500;
  const stateText =
    b.state === "closed"
      ? `Closed: calls go to the dependency (${b.failures} of ${threshold} failures in a row so far).`
      : b.state === "open"
        ? `Open: failing fast and serving the fallback${left > 0 ? `; a trial request is allowed in ${(left / 1000).toFixed(1)} s` : "; the next request will be a trial"}.`
        : "Half-open: one trial request is in flight; everything else still gets the fallback.";
  const said = useThrottled(`${stateText} ${s.counts.success} successes, ${s.counts.fallback} fast-failures served by the fallback, ${s.counts.error} real errors.`, 1200);
  const total = s.counts.success + s.counts.error + s.counts.fallback;
  const g = geometry(narrow, threshold);
  const recent = s.recent.slice(-g.strip.n);

  return (
    <WidgetFrame title="Circuit breaker" sub="Requests (5 per second) pass through a breaker. Raise the dependency's error rate to trip it open, then lower it and watch a trial request close it.">
      <style href="w-circuit-breaker" precedence="widgets">
        {CSS}
      </style>
      <div className="w-cb" ref={box}>
        <div className="controls">
          <Slider label="Dependency error rate" value={errorRate} min={0} max={1} step={0.05} onChange={setErrorRate} format={(v) => `${Math.round(v * 100)}%`} />
          <Slider label="Failure threshold" value={threshold} min={1} max={10} onChange={setThreshold} format={(v) => `${v} in a row`} />
          <Slider label="Cooldown" value={cooldown} min={1} max={10} onChange={setCooldown} format={(v) => `${v} s`} />
        </div>
        <div className="controls" style={{ marginTop: 0 }}>
          <SimButtons running={live} reduce={reduce} onToggle={() => setRunning((r) => !r)} onStep={() => reset(advance(s, step, 10))} stepHint="Advance 0.5 seconds" onReset={() => reset(initCB())} />
        </div>
        <div ref={ref}>
          <svg viewBox={`0 0 ${g.W} ${g.H}`} className="sim-svg" role="img" aria-label={`Circuit breaker state machine. Current state: ${b.state}. Last ${recent.length} requests: ${recent.filter((r) => r.outcome === "success").length} succeeded, ${recent.filter((r) => r.outcome === "error").length} real errors, ${recent.filter((r) => r.outcome === "fallback").length} fast-failures.`}>
            <defs>
              <marker id="cb-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0 0 L10 5 L0 10 z" fill="var(--border-strong)" />
              </marker>
            </defs>
            {(Object.keys(g.edges) as (keyof typeof g.edges)[]).map((k) => {
              const [from, to] = k.split(">") as [BreakerState, BreakerState];
              return <Arrow key={k} {...g.edges[k]} active={lit(from, to)} />;
            })}
            {(Object.keys(g.node) as BreakerState[]).map((id) => {
              const { x, y } = g.node[id];
              const on = b.state === id;
              const color = NODE_COLOR[id];
              return (
                <g key={id} aria-label={`${NODE_LABEL[id]}${on ? " (current)" : ""}`}>
                  <rect x={x - g.NW / 2} y={y - g.NH / 2} width={g.NW} height={g.NH} rx={14} fill={on ? `color-mix(in srgb, ${color} 16%, var(--card))` : "var(--card-2)"} stroke={on ? color : "var(--border)"} strokeWidth={on ? 3 : 1.5} />
                  <text x={x} y={y - 3} textAnchor="middle" style={{ fontWeight: 700, fontSize: 14, fill: on ? "var(--fg)" : "var(--muted)" }}>
                    {NODE_LABEL[id]}
                  </text>
                  <text x={x} y={y + 14} textAnchor="middle" className="muted-text" style={{ fontSize: 10.5 }}>
                    {id === "closed" ? `failures ${b.state === "closed" ? b.failures : 0}/${threshold}` : id === "open" ? (on ? `trial in ${(left / 1000).toFixed(1)} s` : "fail fast") : on ? "trial in flight" : "one trial call"}
                  </text>
                  {on && (
                    <text x={x} y={id === "half-open" && narrow ? y + g.NH / 2 + 13 : y - g.NH / 2 - 7} textAnchor="middle" style={{ fontSize: 11, fontWeight: 700, fill: "var(--fg)" }}>
                      ● current
                    </text>
                  )}
                  {on && id === "open" && <rect x={x - g.NW / 2 + 10} y={y + g.NH / 2 - 9} width={(g.NW - 20) * (1 - left / (cooldown * 1000))} height={4} rx={2} fill="var(--critical)" />}
                </g>
              );
            })}
            <text x={8} y={g.strip.labelY} style={{ fontWeight: 650, fontSize: 12 }}>
              Recent requests{" "}
              <tspan className="muted-text" style={{ fontWeight: 400, fontSize: 10.5 }}>
                (newest →)
              </tspan>
            </text>
            {recent.map((r, i) => {
              const x = g.strip.x + (g.strip.n - recent.length + i) * g.strip.step;
              return (
                <g key={r.id}>
                  <rect x={x} y={g.strip.y} width={g.strip.step - 2.3} height={18} rx={3} fill={FILL[r.outcome]} opacity={r.outcome === "success" ? 0.75 : 0.95} />
                  <text x={x + (g.strip.step - 2.3) / 2} y={g.strip.y + 13} textAnchor="middle" style={{ fontSize: 10, fontWeight: 700, fill: "var(--card)" }}>
                    {ICON[r.outcome]}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        <p className="muted" style={{ margin: "2px 0 0", fontSize: 12.5 }}>
          ✓ success · ✕ real error (dependency called) · ↩ fast-fail, fallback served
        </p>
        <StatTiles
          items={[
            { label: "✓ Successes", value: String(s.counts.success) },
            { label: "↩ Fast-failures", value: String(s.counts.fallback), sub: "fallback served" },
            { label: "✕ Real errors", value: String(s.counts.error), sub: "dependency called" },
            { label: "Calls spared", value: `${total ? Math.round((s.counts.fallback / total) * 100) : 0}%`, sub: "never reached it" },
          ]}
        />
        <p className="readout" aria-live="polite">
          {said}
          <ReducedNote reduce={reduce} what="Paused (reduced motion): Step advances 0.5 s." />
        </p>
        <More label="State changes">
          {s.log.length > 0 ? (
            <ul className="muted" style={{ fontSize: 13, margin: 0, paddingLeft: 18 }} aria-label="Recent state changes">
              {s.log.map((l, i) => (
                <li key={`${l.t}-${i}`}>
                  t = {(l.t / 1000).toFixed(1)} s: {l.text}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted" style={{ fontSize: 13, margin: 0 }}>
              No state changes yet: raise the error rate until {threshold} requests in a row fail.
            </p>
          )}
        </More>
      </div>
    </WidgetFrame>
  );
}
