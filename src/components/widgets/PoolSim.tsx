"use client";
import { useCallback, useDeferredValue, useMemo, useRef, useState } from "react";
import { CircleCheck, Flame, Hourglass, TriangleAlert } from "lucide-react";
import { LineChart } from "@/components/charts/LineChart";
import { niceTicks } from "@/components/charts/scales";
import { StatTiles } from "@/components/charts/ChartBits";
import { int } from "@/lib/format";
import { useFixedStep } from "@/lib/sim-loop";
import { useNarrow } from "@/lib/hooks";
import { draw } from "./lib/draw-rng";
import { advance, ReducedNote, SimButtons, useSimGate, useThrottled } from "./lib/sim-kit";
import { More, Slider, WidgetFrame } from "./WidgetFrame";

/* ------------------------------------------------------------------ pure model */

export interface PoolInputs {
  pool: number;
  /** requests per second */
  rate: number;
  /** query time on an idle database, ms */
  queryMs: number;
  cores: number;
}

/** A request that waits this long for a connection gives up. */
export const TIMEOUT_MS = 2_000;
/** Context switching and lock contention per extra connection beyond the knee. */
export const CONTENTION = 0.03;
/** The database runs about 2 × cores queries at full speed (CPU plus overlapping I/O waits). */
export const knee = (cores: number) => 2 * cores;

/** Time one query takes when `active` queries share the database. Beyond the knee they time-share and contend. */
export function queryTime(q: number, active: number, cores: number) {
  const k = knee(cores);
  if (active <= k) return q;
  return q * (active / k) * (1 + (CONTENTION * (active - k)) / k);
}

/** Queries completed per ms with `active` running. Peaks at the knee, then slowly falls. */
export const dbThroughput = (q: number, active: number, cores: number) => (active <= 0 ? 0 : active / queryTime(q, active, cores));

export interface PoolResult {
  /** average wait for a connection over all requests (timeouts count as the full 2 s) */
  avgWait: number;
  /** average time a served query spends in the database */
  avgQuery: number;
  /** wait + query, averaged over all requests */
  avgTotal: number;
  timeoutRate: number;
  /** average connections busy */
  busy: number;
  /** completed requests per second */
  throughput: number;
}

/**
 * Birth–death model of the pool (Poisson arrivals, exponential work): with k requests in the system,
 * min(k, pool) run in the database at `dbThroughput`, the rest queue. A request that finds more than
 * 2 s of work queued ahead of it times out. Exact for that Markov model, solved in log space.
 */
export function poolModel({ pool, rate, queryMs: q, cores }: PoolInputs): PoolResult {
  const lam = rate / 1000; // per ms
  if (pool <= 0 || lam <= 0) return { avgWait: lam > 0 ? TIMEOUT_MS : 0, avgQuery: 0, avgTotal: lam > 0 ? TIMEOUT_MS : 0, timeoutRate: lam > 0 ? 1 : 0, busy: 0, throughput: 0 };
  const mu = (k: number) => dbThroughput(q, Math.min(k, pool), cores);
  const queueCap = Math.min(8_000, Math.max(1, Math.floor(mu(pool) * TIMEOUT_MS)));
  const n = pool + queueCap;
  const logp = new Float64Array(n + 1);
  let max = 0;
  for (let k = 1; k <= n; k++) {
    logp[k] = logp[k - 1] + Math.log(lam / mu(k));
    if (logp[k] > max) max = logp[k];
  }
  let z = 0;
  for (let k = 0; k <= n; k++) z += Math.exp(logp[k] - max);
  let eBusy = 0;
  let eQueue = 0;
  for (let k = 0; k <= n; k++) {
    const p = Math.exp(logp[k] - max) / z;
    eBusy += p * Math.min(k, pool);
    eQueue += p * Math.max(0, k - pool);
  }
  const block = Math.exp(logp[n] - max) / z;
  const accepted = lam * (1 - block);
  const waitServed = accepted > 0 ? eQueue / accepted : 0; // Little's law
  const avgQuery = accepted > 0 ? eBusy / accepted : q;
  const avgWait = (1 - block) * waitServed + block * TIMEOUT_MS;
  return { avgWait, avgQuery, avgTotal: avgWait + (1 - block) * avgQuery, timeoutRate: block, busy: eBusy, throughput: accepted * 1000 };
}

export const POOL_X = Array.from({ length: 61 }, (_, i) => i);

/** The curve for the chart, and the pool size with the lowest total time. */
export function poolCurve(i: Omit<PoolInputs, "pool">, sizes = POOL_X) {
  const rows = sizes.map((pool) => poolModel({ ...i, pool }));
  let best = 1;
  for (let k = 1; k < sizes.length; k++) if (rows[k].avgTotal < rows[best].avgTotal - 1e-9) best = k;
  return { rows, best: sizes[best] };
}

/* ------------------------------------------------------------------ live simulation (same assumptions, seeded) */

interface Active {
  work: number;
  wait: number;
  start: number;
}
interface Bucket {
  done: number;
  wait: number;
  total: number;
  timeouts: number;
}
export interface LiveState {
  t: number;
  seed: number;
  queue: number[]; // arrival times, oldest first
  active: Active[];
  buckets: Bucket[]; // last 5 s in 500 ms buckets
  bucketAt: number;
  done: number;
  timeouts: number;
}
const SUB = 5;
const emptyBucket = (): Bucket => ({ done: 0, wait: 0, total: 0, timeouts: 0 });
export const initLive = (seed = 3): LiveState => ({ t: 0, seed, queue: [], active: [], buckets: Array.from({ length: 10 }, emptyBucket), bucketAt: 0, done: 0, timeouts: 0 });

/** Advance the live pool by `dt` ms in 5 ms sub-steps. */
export function stepLive(s: LiveState, dt: number, i: PoolInputs): LiveState {
  let { t, seed, bucketAt, done, timeouts } = s;
  const queue = s.queue.slice();
  let head = 0;
  let active = s.active.map((a) => ({ ...a }));
  const buckets = s.buckets.map((b) => ({ ...b }));
  const rnd = () => {
    const [v, next] = draw(seed);
    seed = next;
    return v;
  };
  for (let el = 0; el < dt; el += SUB) {
    t += SUB;
    if (t - bucketAt >= 500) {
      buckets.shift();
      buckets.push(emptyBucket());
      bucketAt = t;
    }
    const cur = buckets[buckets.length - 1];
    // Poisson arrivals (Knuth)
    const mean = (i.rate / 1000) * SUB;
    let k = 0;
    for (let p = rnd(), L = Math.exp(-mean); p > L; p *= rnd()) k++;
    for (let a = 0; a < k && queue.length - head < 20_000; a++) queue.push(t);
    // timeouts at the head of the FIFO
    while (head < queue.length && t - queue[head] >= TIMEOUT_MS) {
      head++;
      timeouts++;
      cur.timeouts++;
    }
    // hand out free connections
    while (active.length < i.pool && head < queue.length) {
      const arrived = queue[head++];
      active.push({ work: -Math.log(1 - rnd()) * i.queryMs, wait: t - arrived, start: t });
    }
    // run queries; each progresses at 1 / slowdown
    if (active.length) {
      const speed = i.queryMs / queryTime(i.queryMs, active.length, i.cores);
      const still: Active[] = [];
      for (const a of active) {
        a.work -= SUB * speed;
        if (a.work > 0) still.push(a);
        else {
          done++;
          cur.done++;
          cur.wait += a.wait;
          cur.total += a.wait + (t - a.start);
        }
      }
      active = still;
    }
  }
  return { t, seed, queue: queue.slice(head), active, buckets, bucketAt, done, timeouts };
}

export function liveStats(s: LiveState) {
  const sum = s.buckets.reduce((a, b) => ({ done: a.done + b.done, wait: a.wait + b.wait, total: a.total + b.total, timeouts: a.timeouts + b.timeouts }), emptyBucket());
  const secs = Math.max(0.5, Math.min(5, s.t / 1000));
  return {
    avgWait: sum.done ? sum.wait / sum.done : 0,
    avgTotal: sum.done ? sum.total / sum.done : 0,
    perSec: sum.done / secs,
    timeoutsPerSec: sum.timeouts / secs,
  };
}

/* ------------------------------------------------------------------ view */

const ms = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(2)} s` : `${v < 10 ? v.toFixed(1) : Math.round(v)} ms`);

const CSS = `
.w-pool { container-type: inline-size; }
.w-pool .controls { margin-bottom: 6px; }
.w-pool .control { min-width: 118px; }
.w-pool .stat-tiles { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; margin-top: 6px; }
.w-pool .stat-tile { padding: 5px 9px; border-radius: 10px; }
.w-pool .stat-label, .w-pool .stat-sub { font-size: 11.5px; line-height: 1.35; }
.w-pool .stat-value { font-size: 17px; line-height: 1.3; }
.w-pool .chart { margin: 6px 0 0; padding: 10px 12px 6px; }
@container (max-width: 520px) { .w-pool .stat-tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
`;

export function PoolSim() {
  const [pool, setPool] = useState(10);
  const [rate, setRate] = useState(340);
  const [queryMs, setQueryMs] = useState(20);
  const [cores, setCores] = useState(4);
  const [running, setRunning] = useState(true);
  const { ref, inView, reduce } = useSimGate<HTMLDivElement>();
  const box = useRef<HTMLDivElement>(null);
  const narrow = useNarrow(box, 480);

  const inputs = useMemo(() => ({ pool, rate, queryMs, cores }), [pool, rate, queryMs, cores]);
  const step = useCallback((s: LiveState, dt: number) => stepLive(s, dt, inputs), [inputs]);
  const [live, reset] = useFixedStep(initLive, step, running && inView && !reduce);

  const curveIn = useDeferredValue(useMemo(() => ({ rate, queryMs, cores }), [rate, queryMs, cores]));
  const curve = useMemo(() => poolCurve(curveIn), [curveIn]);
  const now = poolModel(inputs);
  const best = poolModel({ ...inputs, pool: curve.best });
  const k = knee(cores);
  const capacity = (dbThroughput(queryMs, Math.min(pool, k), cores) * 1000) | 0;
  const wait = curve.rows.map((r) => r.avgWait);
  const total = curve.rows.map((r) => r.avgTotal);
  const yMax = niceTicks(Math.max(60, Math.min(Math.max(...total), Math.max(5 * best.avgTotal, 2.5 * queryMs)))).at(-1)!;
  const clipped = Math.max(...total) > yMax;
  const stats = liveStats(live);

  // Why this pool size behaves the way it does.
  const peak = dbThroughput(queryMs, k, cores) * 1000;
  let verdict: { tone: "ok" | "warn" | "bad"; text: string };
  if (rate >= peak * 0.98) {
    verdict = {
      tone: "bad",
      text: `The database itself is overloaded: at its best (${k} queries at once) it finishes about ${int(peak)} queries/s, and ${int(rate)} arrive. No pool size fixes that. Make queries faster, add cores or replicas, cache reads, or shed load.`,
    };
  } else if (now.timeoutRate > 0.01 && pool < k) {
    verdict = {
      tone: "bad",
      text: `Too small: ${pool} connections finish at most ${int(capacity)} queries/s but ${int(rate)} arrive, so the line for a connection grows past the 2 s timeout and ${Math.round(now.timeoutRate * 100)}% of requests fail.`,
    };
  } else if (now.timeoutRate > 0.01) {
    verdict = {
      tone: "bad",
      text: `Too big for this load: ${pool} queries run at once on ${cores} cores, each takes ${ms(queryTime(queryMs, pool, cores))} instead of ${ms(queryMs)}, and the database now completes fewer queries per second than arrive. The backlog never drains and ${Math.round(now.timeoutRate * 100)}% time out. ${curve.best} connections would be fine.`,
    };
  } else if (pool > k && now.avgTotal > best.avgTotal * 1.08) {
    verdict = {
      tone: "warn",
      text: `Bigger isn't faster: past ~${k} active connections (2 × ${cores} cores) the extra ones only move the waiting into the database. Queries average ${ms(now.avgQuery)} instead of ${ms(queryMs)}, so the total is ${ms(now.avgTotal)} vs ${ms(best.avgTotal)} with ${curve.best} connections.`,
    };
  } else if (pool > k) {
    verdict = {
      tone: "warn",
      text: `No faster than ${curve.best} connections (${ms(now.avgTotal)} vs ${ms(best.avgTotal)}): beyond ~${k} the extra connections sit idle most of the time or just queue inside the database, and each one costs server memory.`,
    };
  } else {
    verdict = {
      tone: "ok",
      text: `Healthy: requests wait ${ms(now.avgWait)} for a connection and the query takes ${ms(now.avgQuery)}. The database stays at or below its sweet spot of ~${k} active queries (2 × ${cores} cores).`,
    };
  }
  const said = useThrottled(verdict.text, 500);
  const VerdictIcon = verdict.tone === "ok" ? CircleCheck : verdict.tone === "warn" ? Flame : TriangleAlert;

  // live picture
  const qLen = live.queue.length;
  const oldest = qLen ? live.t - live.queue[0] : 0;
  const busy = live.active.length;
  const over = busy > k;
  const shown = Math.min(pool, 60);
  const perQuery = ms(queryTime(queryMs, busy, cores));

  // Landscape: queue | pool | database in one row. Phone: queue and pool side by side, the database under them.
  const L = narrow
    ? { w: 264, h: 274, qx: 4, qy: 0, qCols: 6, px: 140, py: 0, pCols: 8, cell: 15, dx: 4, dy: 162, dw: 256, qTitle: "Queue", pTitle: `Pool ${busy}/${pool}` }
    : { w: 600, h: 146, qx: 8, qy: 0, qCols: 10, px: 214, py: 0, pCols: 10, cell: 17, dx: 412, dy: 0, dw: 182, qTitle: "Waiting for a connection", pTitle: `Pool: ${busy}/${pool} busy` };
  const qMax = L.qCols * 4;
  const qw = L.qCols * 16 + 12;
  const dbH = narrow ? 70 : 100;
  const dcx = L.dx + L.dw / 2;
  const meterW = L.dw - 40;

  return (
    <WidgetFrame title="Connection pool simulator" sub="Too few connections and requests queue until they time out; too many and the database itself slows down.">
      <style href="w-pool-sim" precedence="widgets">
        {CSS}
      </style>
      <div className="w-pool" ref={box}>
        <div className="controls">
          <Slider label="Pool size" value={pool} min={1} max={60} onChange={setPool} valueText={`Pool size ${pool} connections`} />
          <Slider label="Request rate" value={rate} min={20} max={1000} step={10} onChange={setRate} format={(v) => `${v}/s`} />
          <Slider label="Query time" value={queryMs} min={5} max={200} step={5} onChange={setQueryMs} format={(v) => `${v} ms`} valueText={`Query time on an idle database ${queryMs} ms`} />
          <Slider label="DB cores" value={cores} min={1} max={16} onChange={setCores} />
          <SimButtons
            running={running && inView}
            reduce={reduce}
            onToggle={() => setRunning((r) => !r)}
            onStep={() => reset(advance(live, step, 20))}
            stepHint="Run the live pool for 1 second"
            onReset={() => reset(initLive())}
          />
        </div>

        <div ref={ref}>
          <svg viewBox={`0 0 ${L.w} ${L.h}`} className="sim-svg" role="img" aria-label={`Live pool: ${qLen} requests waiting, ${busy} of ${pool} connections busy, ${busy} queries running on ${cores} cores.`}>
            {/* queue */}
            <text x={L.qx} y={L.qy + 13} style={{ fontWeight: 650 }}>
              {L.qTitle}
            </text>
            <rect x={L.qx} y={L.qy + 22} width={qw} height={84} rx={10} fill="var(--card-2)" stroke="var(--border-strong)" />
            {Array.from({ length: Math.min(qLen, qMax) }, (_, n) => (
              <rect key={n} x={L.qx + 9 + (n % L.qCols) * 16} y={L.qy + 87 - Math.floor(n / L.qCols) * 19} width={12} height={12} rx={3} fill={oldest > TIMEOUT_MS * 0.6 ? "var(--warning)" : "var(--series-3)"} />
            ))}
            <text x={L.qx + qw / 2} y={L.qy + 123} textAnchor="middle" style={{ fontWeight: 700 }}>
              {int(qLen)} queued{qLen > qMax && !narrow ? ` (${qMax} shown)` : ""}
            </text>
            <text x={L.qx + qw / 2} y={L.qy + 138} textAnchor="middle" className="muted-text" style={{ fontSize: 10.5 }}>
              {narrow ? `oldest ${ms(oldest)}` : `oldest ${ms(oldest)} · timeout 2 s`}
            </text>

            {/* pool */}
            <text x={L.px} y={L.py + 13} style={{ fontWeight: 650 }}>
              {L.pTitle}
            </text>
            {Array.from({ length: shown }, (_, n) => (
              <rect
                key={n}
                x={L.px + (n % L.pCols) * L.cell}
                y={L.py + 24 + Math.floor(n / L.pCols) * L.cell}
                width={L.cell - 4}
                height={L.cell - 4}
                rx={3}
                fill={n < busy ? "var(--series-1)" : "var(--card-2)"}
                stroke={n < busy ? "none" : "var(--border-strong)"}
              />
            ))}
            <text x={L.px} y={L.py + (narrow ? 154 : 138)} className="muted-text" style={{ fontSize: 10.5 }}>
              {narrow ? "filled = in use" : "filled = connection in use"}
            </text>

            {/* database */}
            <text x={L.dx} y={L.dy + 13} style={{ fontWeight: 650 }}>
              Database · {cores} cores
            </text>
            <rect x={L.dx} y={L.dy + 22} width={L.dw} height={dbH} rx={10} fill="var(--card-2)" stroke={over ? "var(--warning)" : "var(--k-database)"} strokeWidth={1.6} />
            <text x={narrow ? L.dx + 14 : dcx} y={L.dy + 44} textAnchor={narrow ? "start" : "middle"} style={{ fontWeight: 700, fontSize: 15 }}>
              {busy} running
            </text>
            <rect x={L.dx + 20} y={L.dy + 54} width={meterW} height={9} rx={4.5} fill="var(--border)" />
            <rect x={L.dx + 20} y={L.dy + 54} width={Math.min(meterW, (meterW * busy) / Math.max(1, 2 * k))} height={9} rx={4.5} fill={over ? "var(--warning)" : "var(--series-1)"} />
            <line x1={L.dx + 20 + meterW / 2} x2={L.dx + 20 + meterW / 2} y1={L.dy + 50} y2={L.dy + 67} stroke="var(--fg)" strokeWidth={1.2} />
            {narrow ? (
              <>
                <text x={L.dx + L.dw - 14} y={L.dy + 44} textAnchor="end" style={{ fontWeight: 650, fill: over ? "var(--warning-ink)" : "var(--fg)" }}>
                  {over ? "⚠ " : ""}query ≈ {perQuery}
                </text>
                <text x={dcx} y={L.dy + 81} textAnchor="middle" className="muted-text" style={{ fontSize: 10.5 }}>
                  sweet spot ≤ {k} (2 × cores){over ? " · contended" : ""}
                </text>
              </>
            ) : (
              <>
                <text x={dcx} y={L.dy + 80} textAnchor="middle" className="muted-text" style={{ fontSize: 10.5 }}>
                  sweet spot ≤ {k} (2 × cores)
                </text>
                <text x={dcx} y={L.dy + 98} textAnchor="middle" style={{ fontWeight: 650 }}>
                  each query ≈ {perQuery}
                </text>
                {over && (
                  <text x={dcx} y={L.dy + 114} textAnchor="middle" style={{ fontWeight: 700, fontSize: 10.5, fill: "var(--warning-ink)" }}>
                    ⚠ contended
                  </text>
                )}
              </>
            )}
            <text x={dcx} y={L.dy + 22 + dbH + 17} textAnchor="middle" style={{ fontWeight: 650 }}>
              {int(stats.perSec)}/s done ·{" "}
              <tspan className="muted-text" style={{ fontWeight: 400, fontSize: 10.5 }}>
                {stats.timeoutsPerSec > 0 ? `${int(stats.timeoutsPerSec)}/s timing out` : "no timeouts"} (last 5 s)
              </tspan>
            </text>
          </svg>
        </div>

        <StatTiles
          items={[
            { label: "Connection wait", value: ms(now.avgWait), sub: `live: ${ms(stats.avgWait)}` },
            { label: "Query in the DB", value: ms(now.avgQuery), sub: `${ms(queryMs)} uncontended` },
            { label: "Total per request", value: ms(now.avgTotal), sub: `best: ${ms(best.avgTotal)} at ${curve.best}` },
            { label: "Timeouts", value: `${(now.timeoutRate * 100).toFixed(now.timeoutRate > 0 && now.timeoutRate < 0.01 ? 2 : 0)}%`, sub: "waited over 2 s" },
          ]}
        />
        <p className="readout" aria-live="polite" style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
          <VerdictIcon size={15} aria-hidden className={verdict.tone === "ok" ? "ok-ink" : verdict.tone === "warn" ? "warn-ink" : "bad-ink"} style={{ flex: "none", position: "relative", top: 2 }} />
          <span>
            {said}
            <ReducedNote reduce={reduce} what="Live pool paused (reduced motion): Step runs it for 1 s. The numbers and the chart don't need animation." />
          </span>
        </p>
        <More label="Chart: average time vs pool size">
          <LineChart
            title={`Average time vs pool size at ${int(rate)} req/s${clipped ? ` (axis stops at ${ms(yMax)}; timeouts go off the top, see the table)` : ""}`}
            x={POOL_X}
            series={[
              { id: "wait", name: "Wait for a connection", values: wait },
              { id: "total", name: "Wait + query", values: total },
            ]}
            xLabel="Pool size (connections)"
            yUnit="ms"
            marker={pool}
            yMax={yMax}
            height={220}
          />
          <p className="muted" style={{ fontSize: 13, margin: "8px 0 0", display: "flex", gap: 6 }}>
            <Hourglass size={13} aria-hidden style={{ flex: "none", position: "relative", top: 3 }} />
            Model: Poisson arrivals, exponential query times, up to 2 × cores queries at full speed, then time-sharing plus {CONTENTION * 100}% contention per extra connection per knee. The PostgreSQL rule of thumb for the pool is (cores × 2) + disks.
          </p>
        </More>
      </div>
    </WidgetFrame>
  );
}
