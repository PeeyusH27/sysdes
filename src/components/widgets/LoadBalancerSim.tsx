"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInView, useReducedMotion } from "motion/react";
import { Pause, Play, RotateCcw, StepForward } from "lucide-react";
import { mulberry32 } from "@/lib/rng";
import { useFixedStep } from "@/lib/sim-loop";
import { Slider, WidgetFrame } from "./WidgetFrame";

type Algo = "rr" | "least" | "p2c" | "hash";
interface Server { id: string; active: number; healthy: boolean; slow: boolean; served: number }
interface Req { server: number; left: number; total: number }
interface SimState { t: number; servers: Server[]; reqs: Req[]; rr: number; latencies: number[]; dropped: number; seed: number }

const NAMES = ["A", "B", "C", "D"];
const init = (seed = 7): SimState => ({
  t: 0,
  servers: NAMES.map((id) => ({ id, active: 0, healthy: true, slow: false, served: 0 })),
  reqs: [],
  rr: 0,
  latencies: [],
  dropped: 0,
  seed,
});

/** Pure picker, exported for tests. */
export function pick(algo: Algo, servers: Server[], rrIndex: number, rand: () => number, clientId: number) {
  const healthy = servers.map((s, i) => ({ s, i })).filter((x) => x.s.healthy);
  if (!healthy.length) return { index: -1, rr: rrIndex };
  if (algo === "rr") {
    for (let n = 0; n < servers.length; n++) {
      const i = (rrIndex + n) % servers.length;
      if (servers[i].healthy) return { index: i, rr: i + 1 };
    }
  }
  if (algo === "least") return { index: healthy.reduce((a, b) => (b.s.active < a.s.active ? b : a)).i, rr: rrIndex };
  if (algo === "p2c") {
    const a = healthy[Math.floor(rand() * healthy.length)];
    let b = healthy[Math.floor(rand() * Math.max(1, healthy.length - 1))];
    if (b === a) b = healthy[healthy.length - 1];
    return { index: a.s.active <= b.s.active ? a.i : b.i, rr: rrIndex };
  }
  return { index: healthy[clientId % healthy.length].i, rr: rrIndex }; // IP hash: same client → same server
}

const ALGOS: [Algo, string][] = [
  ["rr", "Round robin"],
  ["least", "Least connections"],
  ["p2c", "Power of two"],
  ["hash", "IP hash"],
];

/** Four equal columns, so the per-server buttons (an HTML grid) line up under the servers. Phones get bigger text (`k`). */
interface Geo {
  w: number;
  h: number;
  boxY: number;
  boxW: number;
  boxH: number;
  barW: number;
  k: number;
  narrow: boolean;
}
const WIDE: Geo = { w: 560, h: 190, boxY: 12, boxW: 100, boxH: 130, barW: 40, k: 1, narrow: false };
const NARROW: Geo = { w: 320, h: 196, boxY: 8, boxW: 64, boxH: 120, barW: 26, k: 1.2, narrow: true };

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
.lb { container: lb / inline-size; }
.lb-bar { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin: 4px 0 6px; }
.lb-bar .control { flex: 1 1 160px; }
.lb-servers { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; margin: 4px auto 0; max-width: 620px; }
.lb-servers > div { display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; }
.lb-servers .wbtn { padding: 0 10px; }
@container lb (max-width: 479px) {
  .lb-bar .wbtn { padding: 0 9px; }
  .lb-bar .seg button { padding: 5px 8px; }
  .lb-servers .wbtn { padding: 0 6px; font-size: 12px; width: 100%; justify-content: center; }
}
`;

export function LoadBalancerSim() {
  const [algo, setAlgo] = useState<Algo>("rr");
  const [rate, setRate] = useState(18); // requests per second
  const [running, setRunning] = useState(true);
  const box = useRef<HTMLDivElement>(null);
  const [boxRef, narrow] = useNarrow(480);
  const inView = useInView(box);
  const reduce = useReducedMotion();
  const rand = useMemo(() => mulberry32(42), []);

  const step = useCallback(
    (s: SimState, dt: number): SimState => {
      const servers = s.servers.map((x) => ({ ...x }));
      let rr = s.rr;
      const latencies = [...s.latencies];
      let dropped = s.dropped;
      // progress in-flight requests
      const reqs: Req[] = [];
      for (const r of s.reqs) {
        const speed = servers[r.server].slow ? 0.25 : 1;
        const left = r.left - dt * speed;
        if (left <= 0) {
          servers[r.server].active--;
          servers[r.server].served++;
          latencies.push(r.total);
        } else reqs.push({ ...r, left, total: r.total + dt });
      }
      // arrivals (Poisson-ish)
      const expected = (rate * dt) / 1000;
      const arrivals = Math.floor(expected) + (rand() < expected % 1 ? 1 : 0);
      for (let k = 0; k < arrivals; k++) {
        const { index, rr: next } = pick(algo, servers, rr, rand, Math.floor(rand() * 6));
        rr = next;
        if (index < 0) {
          dropped++;
          continue;
        }
        servers[index].active++;
        const work = 300 + rand() * 500;
        reqs.push({ server: index, left: work, total: 0 });
      }
      return { ...s, t: s.t + dt, servers, reqs, rr, latencies: latencies.slice(-200), dropped };
    },
    [algo, rate, rand],
  );

  const [state, reset, tick] = useFixedStep(init, step, running && inView && !reduce);
  const toggle = (i: number, key: "healthy" | "slow") =>
    reset({ ...state, servers: state.servers.map((s, k) => (k === i ? { ...s, [key]: !s[key] } : s)) });

  const sorted = [...state.latencies].sort((a, b) => a - b);
  const p95 = sorted.length ? sorted[Math.floor(sorted.length * 0.95)] : 0;
  const maxActive = Math.max(8, ...state.servers.map((s) => s.active));
  const g = narrow ? NARROW : WIDE;
  const k = g.k;
  const colW = g.w / NAMES.length;

  return (
    <WidgetFrame title="Load balancer simulator" sub="Requests take 0.3–0.8 s. Make server C slow, then compare round robin with least-connections and power-of-two-choices.">
      <style href="w-load-balancer" precedence="widgets">
        {CSS}
      </style>
      <div className="lb" ref={boxRef}>
        <div className="lb-bar">
          <div className="seg" role="group" aria-label="Algorithm">
            {ALGOS.map(([v, l]) => (
              <button key={v} type="button" aria-pressed={algo === v} onClick={() => setAlgo(v)}>
                {l}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" className="wbtn primary" onClick={() => setRunning((r) => !r)} disabled={!!reduce}>
              {running && !reduce ? <Pause size={14} aria-hidden /> : <Play size={14} aria-hidden />} {running && !reduce ? "Pause" : "Run"}
            </button>
            <button type="button" className="wbtn" onClick={() => tick()} aria-label="Step: advance 50 ms" title="Advance 50 ms">
              <StepForward size={14} aria-hidden /> Step
            </button>
            <button type="button" className="wbtn" onClick={() => reset(init())} aria-label="Reset" title="Reset">
              <RotateCcw size={14} aria-hidden />
            </button>
          </div>
          <Slider label="Requests per second" value={rate} min={2} max={40} onChange={setRate} />
        </div>
        <div ref={box}>
          <svg viewBox={`0 0 ${g.w} ${g.h}`} className="sim-svg" style={{ maxWidth: 620, margin: "0 auto" }} role="img" aria-label={`Active requests per server: ${state.servers.map((s) => `${s.id} ${s.active}${s.healthy ? "" : " (down)"}${s.slow ? " (slow)" : ""}`).join(", ")}`}>
            {state.servers.map((s, i) => {
              const cx = colW * i + colW / 2;
              const x = cx - g.boxW / 2;
              const h = (s.active / maxActive) * (g.boxH - 10);
              const base = g.boxY + g.boxH - 5;
              const status = !s.healthy ? "down" : s.slow ? "slow" : "";
              return (
                <g key={s.id}>
                  <rect x={x} y={g.boxY} width={g.boxW} height={g.boxH} rx={10} fill="var(--card-2)" stroke={s.healthy ? (s.slow ? "var(--warning)" : "var(--border-strong)") : "var(--critical)"} strokeDasharray={s.healthy ? undefined : "5 4"} strokeWidth={1.5} />
                  <rect x={cx - g.barW / 2} y={base - h} width={g.barW} height={h} rx={4} fill={s.healthy ? "var(--series-1)" : "var(--border)"} />
                  <text x={cx} y={base - h - 5} textAnchor="middle" style={{ fontWeight: 700, fontSize: 11.5 * k }}>
                    {s.active}
                  </text>
                  <text x={cx} y={g.boxY + g.boxH + 18 * k} textAnchor="middle" style={{ fontWeight: 650, fontSize: 11.5 * k }}>
                    {g.narrow ? s.id : `Server ${s.id}`}
                    {status && !g.narrow ? ` (${status})` : ""}
                  </text>
                  <text x={cx} y={g.boxY + g.boxH + 34 * k} textAnchor="middle" className="muted-text" style={g.narrow && status ? { fontSize: 11 * k, fontWeight: 700, fill: status === "down" ? "var(--critical-ink)" : "var(--warning-ink)" } : { fontSize: 11 * k }}>
                    {g.narrow && status ? status : `served ${s.served}`}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        <div className="lb-servers">
          {state.servers.map((s, i) => (
            <div key={s.id}>
              <button type="button" className="wbtn" aria-pressed={s.slow} aria-label={`Slow server ${s.id}`} onClick={() => toggle(i, "slow")} style={s.slow ? { borderColor: "var(--warning)" } : undefined}>
                {s.slow ? "✓ " : ""}Slow
              </button>
              <button type="button" className={`wbtn ${s.healthy ? "danger" : ""}`} aria-label={s.healthy ? `Kill server ${s.id}` : `Revive server ${s.id}`} onClick={() => toggle(i, "healthy")}>
                {s.healthy ? "Kill" : "Revive"}
              </button>
            </div>
          ))}
        </div>
        <p className="readout" aria-live="polite">
          p95 latency: <strong>{(p95 / 1000).toFixed(2)} s</strong> · in flight: <strong>{state.reqs.length}</strong> · dropped (no healthy server):{" "}
          <strong>{state.dropped}</strong>
          {reduce && <span className="muted"> · Animation paused (reduced motion): use Step.</span>}
        </p>
      </div>
    </WidgetFrame>
  );
}
