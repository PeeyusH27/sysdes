"use client";
import { useCallback, useMemo, useRef, useState } from "react";
import { Zap } from "lucide-react";
import { LineChart } from "@/components/charts/LineChart";
import { StatTiles } from "@/components/charts/ChartBits";
import { int } from "@/lib/format";
import { useFixedStep } from "@/lib/sim-loop";
import { useNarrow } from "@/lib/hooks";
import { advance, ReducedNote, SimButtons, useSimGate, useThrottled } from "./lib/sim-kit";
import { More, Slider, WidgetFrame } from "./WidgetFrame";

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

function Flow({ x1, y1, x2, y2, live, perSec }: { x1: number; y1: number; x2: number; y2: number; live: boolean; perSec: number }) {
  const dur = Math.max(0.25, Math.min(3, 12 / Math.max(perSec, 0.1)));
  const a = Math.atan2(y2 - y1, x2 - x1);
  const head = (da: number) => `${x2 - 7 * Math.cos(a + da)} ${y2 - 7 * Math.sin(a + da)}`;
  return (
    <g>
      <line x1={x1} x2={x2} y1={y1} y2={y2} stroke="var(--border-strong)" strokeWidth={2} strokeDasharray="5 7">
        {live && perSec > 0.05 && <animate attributeName="stroke-dashoffset" from="0" to="-12" dur={`${dur}s`} repeatCount="indefinite" />}
      </line>
      <path d={`M${head(-0.6)} L${x2} ${y2} L${head(0.6)}`} fill="none" stroke="var(--border-strong)" strokeWidth={2} />
    </g>
  );
}

/** Backlog over the last 60 s as a small area chart inside the picture. */
function Spark({ history, x, y, w, h }: { history: QueueState["history"]; x: number; y: number; w: number; h: number }) {
  const max = Math.max(10, ...history.map((p) => p.depth));
  const step = w / (HISTORY - 1);
  const x0 = x + w - (history.length - 1) * step;
  const pts = history.map((p, i) => `${(x0 + i * step).toFixed(1)},${(y + h - (p.depth / max) * h).toFixed(1)}`);
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={4} fill="var(--card-2)" stroke="var(--border)" />
      {pts.length > 1 && <path d={`M${x0} ${y + h} L${pts.join(" L")} L${x + w} ${y + h} Z`} fill="var(--series-1)" opacity={0.18} />}
      {pts.length > 1 && <path d={`M${pts.join(" L")}`} fill="none" stroke="var(--series-1)" strokeWidth={1.6} />}
      <text x={x + 5} y={y + 11} className="muted-text" style={{ fontSize: 10 }}>
        top {int(max)}
      </text>
    </g>
  );
}

const CSS = `
.w-queue { container-type: inline-size; }
.w-queue .controls { margin-bottom: 4px; }
.w-queue .control { min-width: 120px; }
.w-queue .stat-tiles { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; margin-top: 4px; }
.w-queue .stat-tile { padding: 5px 9px; border-radius: 10px; }
.w-queue .stat-label, .w-queue .stat-sub { font-size: 11.5px; line-height: 1.35; }
.w-queue .stat-value { font-size: 17px; line-height: 1.3; }
.w-queue .chart { margin: 4px 0 0; padding: 10px 12px 6px; }
@container (max-width: 520px) { .w-queue .stat-tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
`;

export function QueueSim() {
  const [rate, setRate] = useState(30);
  const [workers, setWorkers] = useState(4);
  const [msPerJob, setMsPerJob] = useState(100);
  const [running, setRunning] = useState(true);
  const { ref, inView, reduce } = useSimGate<HTMLDivElement>();
  const box = useRef<HTMLDivElement>(null);
  const narrow = useNarrow(box, 480);

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
        height={180}
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

  // Landscape: producer → queue → workers in a row, backlog sparkline under the queue. Phone: the same, top to bottom.
  const W = narrow ? 300 : 600;
  const qx = narrow ? 10 : 150;
  const qw = narrow ? 280 : 250;
  const qy = narrow ? 70 : 42;
  const qh = narrow ? 32 : 36;
  const cell = qw / SHOWN;
  const shown = Math.min(SHOWN, Math.ceil(s.depth - 1e-9));
  const perRow = narrow ? 10 : 5;
  const rows = Math.ceil(workers / perRow);
  const workerAt = (i: number) => {
    const r = Math.floor(i / perRow);
    const inRow = Math.min(perRow, workers - r * perRow);
    return narrow
      ? { cx: W / 2 + ((i % perRow) - (inRow - 1) / 2) * 22, cy: 136 + r * 22 }
      : { cx: 456 + (i % perRow) * 22, cy: 60 + (r - (rows - 1) / 2) * 22 };
  };
  const busyLabelY = narrow ? 136 + rows * 22 + 2 : 113;
  const spark = narrow ? { x: 10, y: busyLabelY + 22, w: 280, h: 36 } : { x: 150, y: 120, w: 442, h: 28 };
  const H = spark.y + spark.h + 2;
  const trendText = `${trend === "growing" ? `▲ growing ${int(growth)}/s` : trend === "draining" ? `▼ draining ${int(-growth)}/s` : "● empty"}`;

  return (
    <WidgetFrame title="Queue simulator" sub="When producers outpace consumers the backlog grows without limit. Add workers or make jobs faster, then hit the spike.">
      <style href="w-queue-sim" precedence="widgets">
        {CSS}
      </style>
      <div className="w-queue" ref={box}>
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
          <svg viewBox={`0 0 ${W} ${H}`} className="sim-svg" role="img" aria-label={`Producer, queue holding ${int(s.depth)} jobs, and ${workers} workers of which ${busy} are busy`}>
            {narrow ? (
              <>
                <rect x={W / 2 - 60} y={2} width={120} height={42} rx={10} fill="var(--card-2)" stroke="var(--k-service)" strokeWidth={1.5} />
                <text x={W / 2} y={19} textAnchor="middle" style={{ fontWeight: 650 }}>
                  Producer
                </text>
                <text x={W / 2} y={36} textAnchor="middle" className="muted-text">
                  {int(s.inRate || rate)}/s{spiking ? " ×5" : ""}
                </text>
                <Flow x1={W / 2} y1={46} x2={W / 2} y2={qy - 4} live={live} perSec={s.inRate} />
                <text x={qx} y={qy - 8} style={{ fontWeight: 700, fontSize: 14 }}>
                  {int(s.depth)} waiting
                </text>
                <text x={qx + qw} y={qy - 8} textAnchor="end" className="muted-text">
                  {trendText}
                </text>
                <Flow x1={W / 2} y1={qy + qh + 3} x2={W / 2} y2={121} live={live} perSec={s.outRate} />
              </>
            ) : (
              <>
                <rect x={8} y={34} width={100} height={52} rx={10} fill="var(--card-2)" stroke="var(--k-service)" strokeWidth={1.5} />
                <text x={58} y={57} textAnchor="middle" style={{ fontWeight: 650 }}>
                  Producer
                </text>
                <text x={58} y={74} textAnchor="middle" className="muted-text">
                  {int(s.inRate || rate)}/s{spiking ? " ×5" : ""}
                </text>
                <Flow x1={110} y1={60} x2={qx - 6} y2={60} live={live} perSec={s.inRate} />
                <text x={qx + qw / 2} y={30} textAnchor="middle" style={{ fontWeight: 700, fontSize: 15 }}>
                  {int(s.depth)} waiting
                </text>
                <text x={qx + qw / 2} y={96} textAnchor="middle" className="muted-text">
                  {s.depth > SHOWN ? `showing ${SHOWN} of ${int(s.depth)} · ` : ""}
                  {trendText}
                </text>
                <Flow x1={qx + qw + 2} y1={60} x2={440} y2={60} live={live} perSec={s.outRate} />
                <text x={8} y={spark.y + 12} className="muted-text" style={{ fontSize: 10.5 }}>
                  backlog,
                </text>
                <text x={8} y={spark.y + 25} className="muted-text" style={{ fontSize: 10.5 }}>
                  last 60 s
                </text>
              </>
            )}
            <rect x={qx} y={qy} width={qw} height={qh} rx={8} fill="var(--card-2)" stroke="var(--k-queue)" strokeWidth={1.5} />
            {Array.from({ length: shown }, (_, i) => (
              <rect key={i} x={qx + qw - (i + 1) * cell + 1.5} y={qy + 5} width={cell - 3} height={qh - 10} rx={2.5} fill={trend === "growing" ? "var(--series-2)" : "var(--series-1)"} />
            ))}
            {Array.from({ length: workers }, (_, i) => {
              const { cx, cy } = workerAt(i);
              return <circle key={i} cx={cx} cy={cy} r={8.5} fill={i < busy ? "var(--series-1)" : "var(--card-2)"} stroke={i < busy ? "var(--series-1)" : "var(--border-strong)"} strokeWidth={1.5} />;
            })}
            <text x={narrow ? W / 2 : 500} y={busyLabelY} textAnchor="middle" className="muted-text">
              {busy}/{workers} workers busy
            </text>
            {narrow && (
              <text x={spark.x} y={spark.y - 4} className="muted-text" style={{ fontSize: 10.5 }}>
                backlog, last 60 s
              </text>
            )}
            <Spark history={s.history} {...spark} />
          </svg>
        </div>
        <StatTiles
          items={[
            { label: "Backlog", value: `${int(s.depth)} jobs`, sub: trend === "growing" ? `+${int(growth)}/s` : trend === "draining" ? `${int(growth)}/s` : "steady" },
            { label: "Arrivals / capacity", value: `${int(s.inRate || rate)} / ${int(cap)}`, sub: `jobs/s · ${workers} × 1000 ÷ ${msPerJob}` },
            { label: "Utilisation", value: `${Math.round(util * 100)}%`, sub: `${busy} of ${workers} workers` },
            { label: "Wait (Little's law)", value: fmtWait(wait), sub: "backlog ÷ throughput" },
          ]}
        />
        <p className="readout" aria-live="polite">
          {said}
          <ReducedNote reduce={reduce} what="Paused (reduced motion): Step advances 1 s." />
        </p>
        <More label="Chart: queue depth over time">{chart}</More>
      </div>
    </WidgetFrame>
  );
}
