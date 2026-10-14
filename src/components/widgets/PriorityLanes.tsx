"use client";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { KeyRound, Megaphone, Rocket } from "lucide-react";
import { LineChart } from "@/components/charts/LineChart";
import { compact, int } from "@/lib/format";
import { useFixedStep } from "@/lib/sim-loop";
import { ReducedNote, SimButtons, useSimGate, useThrottled } from "./lib/sim-kit";
import { More, Seg, WidgetFrame } from "./WidgetFrame";

/* ------------------------------------------------------------------ pure simulation */

export type Mode = "lanes" | "shared";
export type QueueId = "otp" | "mkt" | "shared";
export interface QSeg {
  kind: "otp" | "mkt";
  n: number;
  enq: number;
}

/** Each send takes this long per worker. */
export const SERVICE_MS = 50;
export const WORKERS: Record<QueueId, number> = { otp: 2, mkt: 8, shared: 10 };
/** One login code every 500 ms. */
export const OTP_EVERY_MS = 500;
/** Background marketing traffic, per second. */
export const MKT_BASE_PER_S = 40;
export const CAMPAIGN = 1_000_000;

export interface PLState {
  t: number;
  mode: Mode;
  q: Record<QueueId, QSeg[]>;
  carry: Record<QueueId, number>;
  mktCarry: number;
  nextOtpAt: number;
  /** most recent OTP latencies (ms), newest last */
  otpLat: number[];
  samples: { t: number; v: number }[];
  nextSampleAt: number;
  sent: { otp: number; mkt: number };
  campaigns: number;
}

export const initPL = (mode: Mode = "lanes"): PLState => ({
  t: 0,
  mode,
  q: { otp: [], mkt: [], shared: [] },
  carry: { otp: 0, mkt: 0, shared: 0 },
  mktCarry: 0,
  nextOtpAt: 0,
  otpLat: [],
  samples: [],
  nextSampleAt: 0,
  sent: { otp: 0, mkt: 0 },
  campaigns: 0,
});

const laneFor = (mode: Mode, kind: QSeg["kind"]): QueueId => (mode === "shared" ? "shared" : kind);

function push(q: QSeg[], kind: QSeg["kind"], n: number, enq: number) {
  const last = q[q.length - 1];
  if (kind === "mkt" && last?.kind === "mkt") q[q.length - 1] = { ...last, n: last.n + n };
  else q.push({ kind, n, enq });
}

/** Flood the marketing traffic with a campaign. */
export function launchCampaign(s: PLState, n = CAMPAIGN): PLState {
  const id = laneFor(s.mode, "mkt");
  const q = { ...s.q, [id]: s.q[id].slice() };
  push(q[id], "mkt", n, s.t);
  return { ...s, q, campaigns: s.campaigns + 1 };
}

/** Switch between two lanes and one shared FIFO, keeping every waiting message in arrival order. */
export function setMode(s: PLState, mode: Mode): PLState {
  if (mode === s.mode) return s;
  const q: Record<QueueId, QSeg[]> = { otp: [], mkt: [], shared: [] };
  if (mode === "shared") {
    const all = [...s.q.otp, ...s.q.mkt].sort((a, b) => a.enq - b.enq);
    for (const g of all) push(q.shared, g.kind, g.n, g.enq);
  } else for (const g of s.q.shared) push(q[g.kind], g.kind, g.n, g.enq);
  return { ...s, mode, q, carry: { otp: 0, mkt: 0, shared: 0 } };
}

export const queued = (q: QSeg[], kind?: QSeg["kind"]) => q.reduce((a, g) => a + (kind && g.kind !== kind ? 0 : g.n), 0);

/** Seconds an OTP enqueued now would wait before a worker picks it up. */
export function otpWaitEstimate(s: PLState) {
  const id = laneFor(s.mode, "otp");
  return queued(s.q[id]) / ((WORKERS[id] * 1000) / SERVICE_MS);
}

export function oldestOtpAge(s: PLState) {
  const id = laneFor(s.mode, "otp");
  const g = s.q[id].find((x) => x.kind === "otp");
  return g ? s.t - g.enq : 0;
}

function serve(s: PLState, id: QueueId, dt: number, now: number, lat: number[], sent: PLState["sent"]) {
  const q = s.q[id];
  let cap = s.carry[id] + (WORKERS[id] * dt) / SERVICE_MS;
  let take = Math.floor(cap);
  cap -= take;
  while (take > 0 && q.length) {
    const g = q[0];
    if (g.kind === "otp") {
      lat.push(now - g.enq + SERVICE_MS);
      sent.otp += 1;
      q.shift();
      take -= 1;
    } else {
      const k = Math.min(take, g.n);
      sent.mkt += k;
      take -= k;
      if (k === g.n) q.shift();
      else q[0] = { ...g, n: g.n - k };
    }
  }
  s.carry[id] = q.length ? cap : 0; // idle workers can't bank capacity
}

/** Advance the simulation clock by `simDt` ms (in sub-steps of at most 250 ms). */
export function stepPL(s0: PLState, simDt: number): PLState {
  const s: PLState = {
    ...s0,
    q: { otp: s0.q.otp.slice(), mkt: s0.q.mkt.slice(), shared: s0.q.shared.slice() },
    carry: { ...s0.carry },
    otpLat: s0.otpLat.slice(),
    sent: { ...s0.sent },
  };
  let left = simDt;
  while (left > 0) {
    const dt = Math.min(250, left);
    left -= dt;
    const now = s.t + dt;
    // arrivals
    while (s.nextOtpAt < now) {
      push(s.q[laneFor(s.mode, "otp")], "otp", 1, s.nextOtpAt);
      s.nextOtpAt += OTP_EVERY_MS;
    }
    s.mktCarry += (MKT_BASE_PER_S * dt) / 1000;
    const k = Math.floor(s.mktCarry);
    if (k > 0) {
      push(s.q[laneFor(s.mode, "mkt")], "mkt", k, now);
      s.mktCarry -= k;
    }
    // workers
    const ids: QueueId[] = s.mode === "shared" ? ["shared"] : ["otp", "mkt"];
    for (const id of ids) serve(s, id, dt, now, s.otpLat, s.sent);
    s.t = now;
  }
  s.otpLat = s.otpLat.slice(-20);
  return s;
}

/** Record one point for the latency chart: the worse of the oldest waiting OTP and the latest delivered one. */
export function sample(s: PLState, every: number): PLState {
  if (s.t < s.nextSampleAt) return s;
  const v = Math.max(oldestOtpAge(s), s.otpLat.at(-1) ?? 0) / 1000;
  return { ...s, samples: [...s.samples, { t: s.t / 1000, v }].slice(-80), nextSampleAt: s.t + every };
}

/* ------------------------------------------------------------------ view */

const dur = (sec: number) => (sec < 1 ? `${Math.round(sec * 1000)} ms` : sec < 120 ? `${sec.toFixed(1)} s` : sec < 7200 ? `${(sec / 60).toFixed(1)} min` : `${(sec / 3600).toFixed(1)} h`);

const LatencyChart = memo(function LatencyChart({ samples }: { samples: { t: number; v: number }[] }) {
  if (samples.length < 2) return <p className="muted" style={{ fontSize: 13, margin: "10px 0" }}>The OTP latency chart fills in as the simulation runs.</p>;
  const big = samples.at(-1)!.t > 600;
  return (
    <LineChart
      title="OTP wait over time (oldest waiting code, or the last one delivered)"
      x={samples.map((p) => +(big ? p.t / 60 : p.t).toFixed(1))}
      series={[{ id: "otp", name: "OTP wait", values: samples.map((p) => p.v) }]}
      xLabel={big ? "Simulated minutes" : "Simulated seconds"}
      yUnit="s"
      height={200}
      area
    />
  );
});

/** Drawing geometry: label column beside the pipes on the desktop pane, label above each pipe on a phone. */
interface Geo {
  w: number;
  narrow: boolean;
  x0: number;
  x1: number;
  workerX: number;
  workerGap: number;
  k: number;
}
const WIDE: Geo = { w: 560, narrow: false, x0: 150, x1: 430, workerX: 448, workerGap: 20, k: 1 };
const NARROW: Geo = { w: 320, narrow: true, x0: 8, x1: 226, workerX: 240, workerGap: 16, k: 1.2 };

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
.pl { container: pl / inline-size; }
.pl-bar { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin: 4px 0 6px; }
.pl-bar > div:last-child { flex-wrap: nowrap !important; }
.pl .legend { font-size: 12px; gap: 2px 12px; margin-top: 2px !important; }
.pl-stats { display: flex; flex-wrap: wrap; gap: 2px 16px; margin: 6px 0 0 !important; font-size: 13px; }
.pl-stats > div { display: block; }
.pl-stats dt, .pl-stats dd { display: inline; }
.pl-stats dt { color: var(--muted); }
.pl-stats dd { margin: 0 0 0 5px; font-weight: 650; font-variant-numeric: tabular-nums; }
.pl-stats small { font-size: 12px; font-weight: 400; color: var(--muted); }
.pl .widget-more .chart { margin: 8px 0 0; padding: 0; border: 0; background: transparent; }
@container pl (max-width: 479px) {
  .pl-bar .wbtn { padding: 0 9px; }
  .pl-bar .seg button { padding: 5px 8px; }
}
`;

function Pipe({ g, y, label, sub, segs, workers, busy, color }: { g: Geo; y: number; label: string; sub: string; segs: QSeg[]; workers: number; busy: boolean; color: string }) {
  const total = queued(segs);
  const otps = segs.filter((s) => s.kind === "otp").length;
  const mkt = queued(segs, "mkt");
  const { x0, x1, k } = g;
  const room = x1 - x0 - 30;
  // marketing volume as a log-scaled fill; OTP codes drawn as dots at the tail when they're stuck behind it
  const fillW = mkt ? Math.min(room, 20 + Math.log10(mkt + 1) * 38 * (room / 250)) : 0;
  const top = g.narrow ? y + 20 : y; // pipe top
  // waiting OTP dots sit at the tail of the queue; when the backlog fills the pipe they overlap its bar instead of spilling out
  const shownOtps = Math.min(otps, 8);
  const shift = Math.max(0, x0 + 8 - (x1 - fillW - 10 - (shownOtps - 1) * 13));
  const note = y + (g.narrow ? 66 : 46);
  return (
    <g>
      {g.narrow ? (
        <text x={x0} y={y + 12} style={{ fontWeight: 650, fontSize: 11.5 * k }}>
          {label}{" "}
          <tspan className="muted-text" style={{ fontWeight: 400, fontSize: 10.5 * k }}>
            · {sub}
          </tspan>
        </text>
      ) : (
        <>
          <text x={14} y={y + 12} style={{ fontWeight: 650 }}>
            {label}
          </text>
          <text x={14} y={y + 28} className="muted-text" style={{ fontSize: 10.5 }}>
            {sub}
          </text>
        </>
      )}
      <rect x={x0} y={top} width={x1 - x0} height={30} rx={8} fill="var(--card-2)" stroke={color} strokeWidth={1.6} />
      {fillW > 0 && <rect x={x1 - fillW} y={top + 4} width={fillW - 4} height={22} rx={5} fill="var(--series-2)" opacity={0.85} />}
      {Array.from({ length: shownOtps }, (_, i) => (
        <circle key={i} cx={x1 - fillW - 10 - i * 13 + shift} cy={top + 15} r={5} fill="var(--series-1)" stroke="var(--card)" strokeWidth={1.5} />
      ))}
      <text x={x0 + 6} y={note} className="muted-text" style={{ fontSize: 10.5 * k }}>
        {!total
          ? "empty"
          : g.narrow
            ? `${compact(total)} waiting${mkt && otps ? ` · ${otps} OTP${otps > 1 ? "s" : ""} stuck` : ""}`
            : `${int(total)} waiting${mkt && otps ? ` (${otps} OTP${otps > 1 ? "s" : ""} behind ${compact(mkt)} marketing)` : ""}`}
      </text>
      {Array.from({ length: Math.min(workers, 10) }, (_, i) => (
        <circle
          key={i}
          cx={g.workerX + (i % 5) * g.workerGap}
          cy={top + 6 + Math.floor(i / 5) * (g.narrow ? 16 : 18)}
          r={g.narrow ? 6 : 7}
          fill={busy ? color : "var(--card-2)"}
          stroke={color}
          strokeWidth={1.4}
        />
      ))}
      <text x={g.narrow ? g.w - 4 : g.workerX - 7} y={note} textAnchor={g.narrow ? "end" : "start"} className="muted-text" style={{ fontSize: 10.5 * k }}>
        {workers} workers {busy ? "busy" : "idle"}
      </text>
    </g>
  );
}

export function PriorityLanes() {
  const [speed, setSpeed] = useState(10);
  const [running, setRunning] = useState(true);
  const { ref, inView, reduce } = useSimGate<HTMLDivElement>();
  const [boxRef, narrow] = useNarrow(480);
  const g = narrow ? NARROW : WIDE;
  const step = useCallback((s: PLState, dt: number) => sample(stepPL(s, dt * speed), speed * 250), [speed]);
  const [s, reset] = useFixedStep<PLState>(() => initPL(), step, running && inView && !reduce);

  const wait = otpWaitEstimate(s);
  const lastLat = (s.otpLat.at(-1) ?? 0) / 1000;
  const oldest = oldestOtpAge(s) / 1000;
  const mktBacklog = queued(s.mode === "shared" ? s.q.shared : s.q.mkt, "mkt");
  const mktRate = ((s.mode === "shared" ? WORKERS.shared : WORKERS.mkt) * 1000) / SERVICE_MS;
  const drain = mktBacklog / Math.max(1, mktRate - MKT_BASE_PER_S - (s.mode === "shared" ? 1000 / OTP_EVERY_MS : 0));

  let sentence: string;
  if (s.mode === "lanes") {
    sentence = s.campaigns
      ? `Separate lanes: login codes still go out in ${dur(Math.max(lastLat, wait + SERVICE_MS / 1000))} because ${WORKERS.otp} workers serve only the OTP lane. The ${compact(mktBacklog)} marketing messages queue in their own lane and drain in about ${dur(drain)}.`
      : `Separate lanes: login codes go out in ${dur(Math.max(lastLat, SERVICE_MS / 1000))}. Launch the campaign and watch them stay fast.`;
  } else {
    sentence = mktBacklog > 1000
      ? `One shared queue: a login code sent now waits behind ${compact(mktBacklog)} marketing messages, about ${dur(wait)}. The oldest waiting code has been stuck for ${dur(oldest)}; it expired long ago.`
      : `One shared queue: fine while it's quiet (codes go out in ${dur(Math.max(lastLat, SERVICE_MS / 1000))}). Launch the campaign to see what FIFO does to them.`;
  }
  const said = useThrottled(sentence, 900);
  // on a phone the single shared queue gets a shorter drawing instead of empty space above and below it
  const lanesH = g.narrow ? (s.mode === "lanes" ? 162 : 82) : 172;

  return (
    <WidgetFrame title="Priority lanes" sub="Login codes (OTP) must arrive in seconds; marketing can wait hours. Give them separate queues and workers, or watch one campaign bury every login.">
      <style href="w-priority-lanes" precedence="widgets">
        {CSS}
      </style>
      <div className="pl" ref={boxRef}>
        <div className="pl-bar">
          <div className="seg" role="group" aria-label="Queues">
            {(
              [
                ["lanes", "Two lanes"],
                ["shared", "Shared queue"],
              ] as const
            ).map(([v, l]) => (
              <button key={v} type="button" aria-pressed={s.mode === v} onClick={() => reset(setMode(s, v))}>
                {l}
              </button>
            ))}
          </div>
          <button type="button" className="wbtn danger" onClick={() => reset(launchCampaign(s))}>
            <Rocket size={14} aria-hidden /> Launch 1M campaign
          </button>
          <SimButtons
            running={running && inView}
            reduce={reduce}
            onToggle={() => setRunning((r) => !r)}
            onStep={() => reset(sample(stepPL(s, 30_000), 0))}
            stepHint="Advance 30 simulated seconds"
            onReset={() => reset(initPL(s.mode))}
          />
        </div>

        <div ref={ref}>
          <svg viewBox={`0 0 ${g.w} ${lanesH}`} className="sim-svg" style={{ maxWidth: 620, margin: "0 auto" }} role="img" aria-label={`${s.mode === "lanes" ? "Two queues" : "One shared queue"}. Marketing backlog ${int(mktBacklog)}. An OTP sent now waits ${dur(wait)}.`}>
            {s.mode === "lanes" ? (
              <>
                <Pipe g={g} y={g.narrow ? 4 : 14} label="OTP lane" sub="critical · login codes" segs={s.q.otp} workers={WORKERS.otp} busy={s.q.otp.length > 0} color="var(--series-1)" />
                <Pipe g={g} y={g.narrow ? 86 : 96} label="Marketing lane" sub="low priority" segs={s.q.mkt} workers={WORKERS.mkt} busy={s.q.mkt.length > 0} color="var(--series-2)" />
              </>
            ) : (
              <Pipe g={g} y={g.narrow ? 4 : 52} label="Shared queue" sub="FIFO: first in, first out" segs={s.q.shared} workers={WORKERS.shared} busy={s.q.shared.length > 0} color="var(--k-queue)" />
            )}
          </svg>
        </div>
        <ul className="legend" aria-label="Legend">
          <li>
            <KeyRound size={13} aria-hidden style={{ color: "var(--series-1)" }} /> OTP code (one every 0.5 s)
          </li>
          <li>
            <Megaphone size={13} aria-hidden style={{ color: "var(--series-2)" }} /> marketing (log-scale bar)
          </li>
          <li>1 worker = 20 messages/s</li>
        </ul>

        <dl className="pl-stats">
          <div>
            <dt>OTP sent now waits</dt>
            <dd className={wait > 30 ? "bad-ink" : undefined}>
              {dur(wait + SERVICE_MS / 1000)} <small className={wait > 30 ? "bad-ink" : undefined}>{wait > 30 ? "✕ too late: codes expire in minutes" : "✓ on time"}</small>
            </dd>
          </div>
          <div>
            <dt>Oldest waiting OTP</dt>
            <dd>
              {oldest ? dur(oldest) : "none"} <small>({int(s.sent.otp)} delivered)</small>
            </dd>
          </div>
          <div>
            <dt>Marketing backlog</dt>
            <dd>
              {compact(mktBacklog)} <small>{mktBacklog > 1000 ? `drains in ~${dur(drain)}` : "keeping up"}</small>
            </dd>
          </div>
          <div>
            <dt>Simulated time</dt>
            <dd>
              {dur(s.t / 1000)} <small>({speed}× real time)</small>
            </dd>
          </div>
        </dl>

        <p className="readout" aria-live="polite">
          {said}
          <ReducedNote reduce={reduce} what="Paused (reduced motion): Step advances 30 simulated seconds." />
        </p>
        <More label="Speed and OTP wait chart">
          <Seg<number>
            label="Speed"
            value={speed}
            onChange={setSpeed}
            options={[
              { value: 1, label: "1×" },
              { value: 10, label: "10×" },
              { value: 60, label: "60×" },
            ]}
          />
          <LatencyChart samples={s.samples} />
        </More>
      </div>
    </WidgetFrame>
  );
}
