"use client";
import { useCallback, useMemo, useState } from "react";
import { StatTiles } from "@/components/charts/ChartBits";
import { mulberry32 } from "@/lib/rng";
import { useFixedStep } from "@/lib/sim-loop";
import { advance, ReducedNote, SimButtons, useSimGate, useThrottled } from "./lib/sim-kit";
import { Slider, WidgetFrame } from "./WidgetFrame";

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
const NODES: { id: BreakerState; label: string; x: number; color: string }[] = [
  { id: "closed", label: "Closed", x: 86, color: "var(--good)" },
  { id: "open", label: "Open", x: 280, color: "var(--critical)" },
  { id: "half-open", label: "Half-open", x: 474, color: "var(--warning)" },
];
const NY = 78;
const NW = 112;
const NH = 58;
const ICON: Record<Outcome, string> = { success: "✓", error: "✕", fallback: "↩" };
const FILL: Record<Outcome, string> = { success: "var(--good)", error: "var(--critical)", fallback: "var(--warning)" };

function Arrow({ d, label, lx, ly, active }: { d: string; label: string[]; lx: number; ly: number; active: boolean }) {
  return (
    <g>
      <path d={d} fill="none" stroke={active ? "var(--accent)" : "var(--border-strong)"} strokeWidth={active ? 2.5 : 1.5} markerEnd="url(#cb-arrow)" />
      <text x={lx} y={ly} textAnchor="middle" className="muted-text" style={{ fontSize: 10.5, fontWeight: active ? 700 : 400 }}>
        {label.map((line, i) => (
          <tspan key={i} x={lx} dy={i ? 12 : 0}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}

export function CircuitBreakerSim() {
  const [errorRate, setErrorRate] = useState(0.1);
  const [threshold, setThreshold] = useState(5);
  const [cooldown, setCooldown] = useState(4);
  const [running, setRunning] = useState(true);
  const rand = useMemo(() => mulberry32(31), []);
  const { ref, inView, reduce } = useSimGate<HTMLDivElement>();

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

  return (
    <WidgetFrame title="Circuit breaker" sub="Requests (5 per second) pass through a breaker. Raise the dependency's error rate to trip it open, then lower it and watch a trial request close it again.">
      <div className="controls">
        <Slider label="Dependency error rate" value={errorRate} min={0} max={1} step={0.05} onChange={setErrorRate} format={(v) => `${Math.round(v * 100)}%`} />
        <Slider label="Failure threshold" value={threshold} min={1} max={10} onChange={setThreshold} format={(v) => `${v} in a row`} />
        <Slider label="Cooldown" value={cooldown} min={1} max={10} onChange={setCooldown} format={(v) => `${v} s`} />
        <SimButtons running={live} reduce={reduce} onToggle={() => setRunning((r) => !r)} onStep={() => reset(advance(s, step, 10))} stepHint="Advance 0.5 seconds" onReset={() => reset(initCB())} />
      </div>
      <div ref={ref}>
        <svg viewBox="0 0 560 250" className="sim-svg" role="img" aria-label={`Circuit breaker state machine. Current state: ${b.state}.`}>
          <defs>
            <marker id="cb-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" fill="var(--border-strong)" />
            </marker>
          </defs>
          <Arrow d={`M${86 + NW / 2} ${NY - 10} L${280 - NW / 2 - 4} ${NY - 10}`} label={[`${threshold} failures`, "in a row"]} lx={183} ly={NY - 36} active={lit("closed", "open")} />
          <Arrow d={`M${280 + NW / 2} ${NY - 10} L${474 - NW / 2 - 4} ${NY - 10}`} label={["cooldown", "over"]} lx={377} ly={NY - 36} active={lit("open", "half-open")} />
          <Arrow d={`M${474 - NW / 2} ${NY + 12} L${280 + NW / 2 + 4} ${NY + 12}`} label={["trial", "fails"]} lx={377} ly={NY + 30} active={lit("half-open", "open")} />
          <Arrow d={`M474 ${NY + NH / 2} C474 ${NY + 92} 86 ${NY + 92} 86 ${NY + NH / 2 + 4}`} label={["trial succeeds"]} lx={280} ly={NY + 98} active={lit("half-open", "closed")} />
          {NODES.map((n) => {
            const on = b.state === n.id;
            return (
              <g key={n.id} aria-label={`${n.label}${on ? " (current)" : ""}`}>
                <rect x={n.x - NW / 2} y={NY - NH / 2} width={NW} height={NH} rx={14} fill={on ? `color-mix(in srgb, ${n.color} 16%, var(--card))` : "var(--card-2)"} stroke={on ? n.color : "var(--border)"} strokeWidth={on ? 3 : 1.5} />
                <text x={n.x} y={NY - 4} textAnchor="middle" style={{ fontWeight: 700, fontSize: 14, fill: on ? "var(--fg)" : "var(--muted)" }}>
                  {n.label}
                </text>
                <text x={n.x} y={NY + 14} textAnchor="middle" className="muted-text" style={{ fontSize: 10.5 }}>
                  {n.id === "closed" ? `failures ${b.state === "closed" ? b.failures : 0}/${threshold}` : n.id === "open" ? (on ? `trial in ${(left / 1000).toFixed(1)} s` : "fail fast") : on ? "trial in flight" : "one trial call"}
                </text>
                {on && (
                  <text x={n.x} y={NY - NH / 2 - 8} textAnchor="middle" style={{ fontSize: 11, fontWeight: 700, fill: "var(--fg)" }}>
                    ● current
                  </text>
                )}
                {on && n.id === "open" && <rect x={n.x - NW / 2 + 10} y={NY + NH / 2 - 9} width={(NW - 20) * (1 - left / (cooldown * 1000))} height={4} rx={2} fill="var(--critical)" />}
              </g>
            );
          })}
          <text x={14} y={196} style={{ fontWeight: 650, fontSize: 12 }}>
            Recent requests
          </text>
          <text x={546} y={196} textAnchor="end" className="muted-text" style={{ fontSize: 10.5 }}>
            newest →
          </text>
          {s.recent.map((r, i) => {
            const x = 14 + (36 - s.recent.length + i) * 14.8;
            return (
              <g key={r.id}>
                <rect x={x} y={204} width={12.5} height={18} rx={3} fill={FILL[r.outcome]} opacity={r.outcome === "success" ? 0.75 : 0.95} />
                <text x={x + 6.25} y={217} textAnchor="middle" style={{ fontSize: 10, fontWeight: 700, fill: "var(--card)" }}>
                  {ICON[r.outcome]}
                </text>
              </g>
            );
          })}
          <text x={14} y={242} className="muted-text" style={{ fontSize: 10.5 }}>
            ✓ success · ✕ real error (dependency called) · ↩ fast-fail, fallback served
          </text>
        </svg>
      </div>
      <StatTiles
        items={[
          { label: "✓ Successes", value: String(s.counts.success) },
          { label: "↩ Fast-failures", value: String(s.counts.fallback), sub: "served by the fallback" },
          { label: "✕ Real errors", value: String(s.counts.error), sub: "dependency was called" },
          { label: "Calls spared", value: `${s.counts.success + s.counts.error + s.counts.fallback ? Math.round((s.counts.fallback / (s.counts.success + s.counts.error + s.counts.fallback)) * 100) : 0}%`, sub: "never reached the dependency" },
        ]}
      />
      {s.log.length > 0 && (
        <ul className="muted" style={{ fontSize: 13, margin: "10px 0 0", paddingLeft: 18 }} aria-label="Recent state changes">
          {s.log.slice(-3).map((l, i) => (
            <li key={`${l.t}-${i}`}>
              t = {(l.t / 1000).toFixed(1)} s: {l.text}
            </li>
          ))}
        </ul>
      )}
      <p className="readout" aria-live="polite">
        {said}
        <ReducedNote reduce={reduce} what="Paused (reduced motion): Step advances 0.5 s." />
      </p>
    </WidgetFrame>
  );
}
