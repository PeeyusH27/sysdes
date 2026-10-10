"use client";
import { useCallback, useMemo, useState } from "react";
import { useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";
import { Pause, Play, RotateCcw, StepForward } from "lucide-react";
import { mulberry32 } from "@/lib/rng";
import { useFixedStep } from "@/lib/sim-loop";
import { Seg, Slider, WidgetFrame } from "./WidgetFrame";

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

export function LoadBalancerSim() {
  const [algo, setAlgo] = useState<Algo>("rr");
  const [rate, setRate] = useState(18); // requests per second
  const [running, setRunning] = useState(true);
  const box = useRef<HTMLDivElement>(null);
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

  return (
    <WidgetFrame title="Load balancer simulator" sub="Requests take 0.3–0.8 s. Make server C slow, then compare round robin with least-connections and power-of-two-choices.">
      <div className="controls">
        <Seg<Algo>
          label="Algorithm"
          value={algo}
          onChange={setAlgo}
          options={[
            { value: "rr", label: "Round robin" },
            { value: "least", label: "Least connections" },
            { value: "p2c", label: "Power of two" },
            { value: "hash", label: "IP hash" },
          ]}
        />
        <Slider label="Requests per second" value={rate} min={2} max={40} onChange={setRate} />
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" className="wbtn primary" onClick={() => setRunning((r) => !r)} disabled={!!reduce}>
            {running && !reduce ? <Pause size={14} aria-hidden /> : <Play size={14} aria-hidden />} {running && !reduce ? "Pause" : "Run"}
          </button>
          <button type="button" className="wbtn" onClick={() => tick()} aria-label="Advance 50 ms">
            <StepForward size={14} aria-hidden /> Step
          </button>
          <button type="button" className="wbtn" onClick={() => reset(init())} aria-label="Reset">
            <RotateCcw size={14} aria-hidden />
          </button>
        </div>
      </div>
      <div ref={box}>
        <svg viewBox="0 0 560 210" className="sim-svg" role="img" aria-label="Active requests per server">
          {state.servers.map((s, i) => {
            const x = 30 + i * 135;
            const h = (s.active / maxActive) * 120;
            return (
              <g key={s.id}>
                <rect x={x} y={20} width={100} height={130} rx={10} fill="var(--card-2)" stroke={s.healthy ? (s.slow ? "var(--warning)" : "var(--border-strong)") : "var(--critical)"} strokeDasharray={s.healthy ? undefined : "5 4"} strokeWidth={1.5} />
                <rect x={x + 30} y={145 - h} width={40} height={h} rx={4} fill={s.healthy ? "var(--series-1)" : "var(--border)"} />
                <text x={x + 50} y={140 - h} textAnchor="middle" style={{ fontWeight: 700 }}>
                  {s.active}
                </text>
                <text x={x + 50} y={170} textAnchor="middle" style={{ fontWeight: 650 }}>
                  Server {s.id} {s.slow ? "(slow)" : ""} {!s.healthy ? "(down)" : ""}
                </text>
                <text x={x + 50} y={188} textAnchor="middle" className="muted-text">
                  served {s.served}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="controls" style={{ marginTop: 0 }}>
        {state.servers.map((s, i) => (
          <div key={s.id} style={{ display: "flex", gap: 4 }}>
            <button type="button" className="wbtn" aria-pressed={s.slow} onClick={() => toggle(i, "slow")}>
              {s.slow ? `Speed up ${s.id}` : `Slow ${s.id}`}
            </button>
            <button type="button" className={`wbtn ${s.healthy ? "danger" : ""}`} onClick={() => toggle(i, "healthy")}>
              {s.healthy ? `Kill ${s.id}` : `Revive ${s.id}`}
            </button>
          </div>
        ))}
      </div>
      <p className="readout" aria-live="polite">
        p95 latency: <strong>{(p95 / 1000).toFixed(2)} s</strong> · in flight: <strong>{state.reqs.length}</strong> · dropped (no healthy server):{" "}
        <strong>{state.dropped}</strong>
        {reduce && <span className="muted"> · Animation paused (reduced motion): use Step.</span>}
      </p>
    </WidgetFrame>
  );
}
