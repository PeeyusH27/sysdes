"use client";
import { useCallback, useMemo, useState } from "react";
import { Zap } from "lucide-react";
import { LineChart } from "@/components/charts/LineChart";
import { StatTiles } from "@/components/charts/ChartBits";
import { int } from "@/lib/format";
import { useFixedStep } from "@/lib/sim-loop";
import { advance, ReducedNote, SimButtons, useSimGate, useThrottled } from "./lib/sim-kit";
import { Slider, WidgetFrame } from "./WidgetFrame";

export interface QueueParams {
  /** Jobs per second the producer emits. */
  rate: number;
  workers: number;
  msPerJob: number;
}
export interface QueueState {
  t: number;
  depth: number;
  spikeUntil: number;
  /** Jobs/s arriving and finishing during the last step. */
  inRate: number;
  outRate: number;
  processed: number;
  /** Depth sampled every SAMPLE_MS (last HISTORY samples). */
  history: { t: number; depth: number }[];
}

export const SPIKE_FACTOR = 5;
export const SPIKE_MS = 5_000;
const SAMPLE_MS = 500;
const HISTORY = 120;

/** Jobs per second the worker pool can finish. */
export const capacity = (p: QueueParams) => (p.workers * 1000) / p.msPerJob;

/** Little's law: L = λW, so the time a job waits ≈ backlog ÷ throughput. */
export const littleWait = (depth: number, throughputPerSec: number) => (throughputPerSec > 0 ? depth / throughputPerSec : Infinity);

export const initQueue = (): QueueState => ({ t: 0, depth: 0, spikeUntil: 0, inRate: 0, outRate: 0, processed: 0, history: [{ t: 0, depth: 0 }] });

/** One fixed step of a fluid queue: arrivals join the backlog, the workers drain at most their capacity. */
export function queueStep(s: QueueState, dt: number, p: QueueParams): QueueState {
  const inRate = p.rate * (s.t < s.spikeUntil ? SPIKE_FACTOR : 1);
  const arrivals = (inRate * dt) / 1000;
  const served = Math.min(s.depth + arrivals, (capacity(p) * dt) / 1000);
  const depth = Math.max(0, s.depth + arrivals - served);
  const t = s.t + dt;
  const sample = Math.floor(t / SAMPLE_MS) !== Math.floor(s.t / SAMPLE_MS);
  return {
    ...s,
    t,
    depth: depth < 1e-6 ? 0 : depth,
    inRate,
    outRate: (served * 1000) / dt,
    processed: s.processed + served,
    history: sample ? [...s.history, { t, depth }].slice(-HISTORY) : s.history,
  };
}

export const spike = (s: QueueState): QueueState => ({ ...s, spikeUntil: Math.max(s.spikeUntil, s.t) + SPIKE_MS });

// ---------------------------------------------------------------- picture
const SHOWN = 24;

function Flow({ x1, x2, y, live, perSec }: { x1: number; x2: number; y: number; live: boolean; perSec: number }) {
  const dur = Math.max(0.25, Math.min(3, 12 / Math.max(perSec, 0.1)));
  return (
    <g>
      <line x1={x1} x2={x2} y1={y} y2={y} stroke="var(--border-strong)" strokeWidth={2} strokeDasharray="5 7">
        {live && perSec > 0.05 && <animate attributeName="stroke-dashoffset" from="0" to="-12" dur={`${dur}s`} repeatCount="indefinite" />}
      </line>
      <path d={`M${x2 - 7} ${y - 5} L${x2} ${y} L${x2 - 7} ${y + 5}`} fill="none" stroke="var(--border-strong)" strokeWidth={2} />
    </g>
  );
}

export function QueueSim() {
  const [rate, setRate] = useState(30);
  const [workers, setWorkers] = useState(4);
  const [msPerJob, setMsPerJob] = useState(100);
  const [running, setRunning] = useState(true);
  const { ref, inView, reduce } = useSimGate<HTMLDivElement>();

  const params = useMemo(() => ({ rate, workers, msPerJob }), [rate, workers, msPerJob]);
  const step = useCallback((s: QueueState, dt: number) => queueStep(s, dt, params), [params]);
  const live = running && inView && !reduce;
  const [s, reset] = useFixedStep(initQueue, step, live);

  const cap = capacity(params);
  const spiking = s.t < s.spikeUntil;
  const growth = s.inRate - s.outRate;
  const util = cap > 0 ? Math.min(1, s.outRate / cap) : 0;
  const busy = Math.round(util * workers);
  const wait = littleWait(s.depth, s.outRate || cap);
  const trend = growth > 0.5 ? "growing" : s.depth > 0.5 ? "draining" : "empty";
  const fmtWait = (sec: number) => (!Number.isFinite(sec) ? "∞" : sec < 1 ? `${Math.round(sec * 1000)} ms` : `${sec.toFixed(1)} s`);

  const chart = useMemo(
    () => (
      <LineChart
        title="Queue depth over time"
        x={s.history.map((h) => +(h.t / 1000).toFixed(1))}
        series={[{ id: "depth", name: "Queue depth", values: s.history.map((h) => Math.round(h.depth)) }]}
        xLabel="Time (s)"
        yUnit="jobs"
        area
        height={200}
      />
    ),
    [s.history],
  );

  const sentence =
    trend === "growing"
      ? `Backlog: ${int(s.depth)} jobs, growing by ${int(growth)}/s. Arrivals (${int(s.inRate)}/s) exceed what ${workers} workers finish (${int(cap)}/s). Little's law: wait ≈ ${int(s.depth)} ÷ ${int(s.outRate)}/s = ${fmtWait(wait)}.`
      : trend === "draining"
        ? `Backlog: ${int(s.depth)} jobs, draining at ${int(-growth)}/s. Little's law: wait ≈ ${int(s.depth)} ÷ ${int(s.outRate)}/s = ${fmtWait(wait)}.`
        : `Queue empty: ${workers} workers finish up to ${int(cap)} jobs/s and ${int(s.inRate || rate)} arrive, so utilisation is ${Math.round(util * 100)}% and jobs barely wait.`;
  const said = useThrottled(sentence, 1500);

  const qx = 150;
  const qw = 250;
  const cell = qw / SHOWN;
  const shown = Math.min(SHOWN, Math.ceil(s.depth - 1e-9));
  const wx = 440;

  return (
    <WidgetFrame title="Queue simulator" sub="When producers outpace consumers the backlog grows without limit. Add workers or make jobs faster, then hit the spike and watch it drain.">
      <div className="controls">
        <Slider label="Producer rate" value={rate} min={1} max={200} onChange={setRate} format={(v) => `${v} jobs/s`} />
        <Slider label="Workers" value={workers} min={1} max={20} onChange={setWorkers} />
        <Slider label="Time per job" value={msPerJob} min={20} max={1000} step={10} onChange={setMsPerJob} format={(v) => `${v} ms`} />
      </div>
      <div className="controls" style={{ marginTop: 0 }}>
        <button type="button" className="wbtn primary" onClick={() => reset(spike(s))}>
          <Zap size={14} aria-hidden /> Spike ×{SPIKE_FACTOR} {spiking ? `(${((s.spikeUntil - s.t) / 1000).toFixed(1)} s left)` : `for ${SPIKE_MS / 1000} s`}
        </button>
        <SimButtons running={live} reduce={reduce} onToggle={() => setRunning((r) => !r)} onStep={() => reset(advance(s, step, 20))} stepHint="Advance 1 second" onReset={() => reset(initQueue())} />
      </div>
      <div ref={ref}>
        <svg viewBox="0 0 560 170" className="sim-svg" role="img" aria-label={`Producer, queue holding ${int(s.depth)} jobs, and ${workers} workers of which ${busy} are busy`}>
          <rect x={8} y={58} width={96} height={54} rx={10} fill="var(--card-2)" stroke="var(--k-service)" strokeWidth={1.5} />
          <text x={56} y={82} textAnchor="middle" style={{ fontWeight: 650 }}>
            Producer
          </text>
          <text x={56} y={99} textAnchor="middle" className="muted-text">
            {int(s.inRate || rate)}/s{spiking ? " ×5" : ""}
          </text>
          <Flow x1={106} x2={qx - 6} y={85} live={live} perSec={s.inRate} />
          <rect x={qx} y={66} width={qw} height={38} rx={8} fill="var(--card-2)" stroke="var(--k-queue)" strokeWidth={1.5} />
          {Array.from({ length: shown }, (_, i) => (
            <rect key={i} x={qx + qw - (i + 1) * cell + 1.5} y={72} width={cell - 3} height={26} rx={2.5} fill={trend === "growing" ? "var(--series-2)" : "var(--series-1)"} />
          ))}
          <text x={qx + qw / 2} y={52} textAnchor="middle" style={{ fontWeight: 700, fontSize: 15 }}>
            {int(s.depth)} waiting
          </text>
          <text x={qx + qw / 2} y={124} textAnchor="middle" className="muted-text">
            {s.depth > SHOWN ? `showing ${SHOWN} of ${int(s.depth)} · ` : ""}
            {trend === "growing" ? `▲ growing ${int(growth)}/s` : trend === "draining" ? `▼ draining ${int(-growth)}/s` : "● empty"}
          </text>
          <Flow x1={qx + qw + 2} x2={wx - 6} y={85} live={live} perSec={s.outRate} />
          {Array.from({ length: workers }, (_, i) => {
            const cx = wx + 10 + (i % 5) * 22;
            const cy = 85 + (Math.floor(i / 5) - (Math.ceil(workers / 5) - 1) / 2) * 22;
            return <circle key={i} cx={cx} cy={cy} r={8.5} fill={i < busy ? "var(--series-1)" : "var(--card-2)"} stroke={i < busy ? "var(--series-1)" : "var(--border-strong)"} strokeWidth={1.5} />;
          })}
          <text x={wx + 54} y={152} textAnchor="middle" className="muted-text">
            {busy}/{workers} workers busy
          </text>
        </svg>
      </div>
      <StatTiles
        items={[
          { label: "Backlog", value: `${int(s.depth)} jobs`, sub: trend === "growing" ? `+${int(growth)}/s` : trend === "draining" ? `${int(growth)}/s` : "steady" },
          { label: "Arrivals vs capacity", value: `${int(s.inRate || rate)} / ${int(cap)}`, sub: `jobs/s · ${workers} × 1000 ÷ ${msPerJob} ms` },
          { label: "Utilisation", value: `${Math.round(util * 100)}%`, sub: `${busy} of ${workers} workers` },
          { label: "Wait (Little's law)", value: fmtWait(wait), sub: "backlog ÷ throughput" },
        ]}
      />
      {chart}
      <p className="readout" aria-live="polite">
        {said}
        <ReducedNote reduce={reduce} what="Paused (reduced motion): Step advances 1 s." />
      </p>
    </WidgetFrame>
  );
}
