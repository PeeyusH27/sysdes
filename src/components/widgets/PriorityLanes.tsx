"use client";
import { memo, useCallback, useState } from "react";
import { KeyRound, Megaphone, Rocket } from "lucide-react";
import { LineChart } from "@/components/charts/LineChart";
import { compact, int } from "@/lib/format";
import { useFixedStep } from "@/lib/sim-loop";
import { ReducedNote, SimButtons, useSimGate, useThrottled } from "./lib/sim-kit";
import { Seg, WidgetFrame } from "./WidgetFrame";

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

function Pipe({ y, label, sub, segs, workers, busy, color }: { y: number; label: string; sub: string; segs: QSeg[]; workers: number; busy: boolean; color: string }) {
  const total = queued(segs);
  const otps = segs.filter((g) => g.kind === "otp").length;
  const mkt = queued(segs, "mkt");
  // marketing volume as a log-scaled fill; OTP codes drawn as dots at the tail when they're stuck behind it
  const fillW = mkt ? Math.min(250, 20 + Math.log10(mkt + 1) * 38) : 0;
  const x0 = 150;
  const x1 = 430;
  return (
    <g>
      <text x={14} y={y + 12} style={{ fontWeight: 650 }}>
        {label}
      </text>
      <text x={14} y={y + 28} className="muted-text" style={{ fontSize: 10.5 }}>
        {sub}
      </text>
      <rect x={x0} y={y} width={x1 - x0} height={30} rx={8} fill="var(--card-2)" stroke={color} strokeWidth={1.6} />
      {fillW > 0 && <rect x={x1 - fillW} y={y + 4} width={fillW - 4} height={22} rx={5} fill="var(--series-2)" opacity={0.85} />}
      {Array.from({ length: Math.min(otps, 8) }, (_, i) => (
        <circle key={i} cx={x1 - fillW - 10 - i * 13} cy={y + 15} r={5} fill="var(--series-1)" stroke="var(--card)" strokeWidth={1.5} />
      ))}
      <text x={x0 + 6} y={y + 46} className="muted-text" style={{ fontSize: 10.5 }}>
        {total ? `${int(total)} waiting${mkt && otps ? ` (${otps} OTP${otps > 1 ? "s" : ""} behind ${compact(mkt)} marketing)` : ""}` : "empty"}
      </text>
      {Array.from({ length: Math.min(workers, 10) }, (_, i) => (
        <circle key={i} cx={448 + (i % 5) * 20} cy={y + 6 + Math.floor(i / 5) * 18} r={7} fill={busy ? color : "var(--card-2)"} stroke={color} strokeWidth={1.4} />
      ))}
      <text x={446} y={y + 46} className="muted-text" style={{ fontSize: 10.5 }}>
        {workers} workers {busy ? "busy" : "idle"}
      </text>
    </g>
  );
}

export function PriorityLanes() {
  const [speed, setSpeed] = useState(10);
  const [running, setRunning] = useState(true);
  const { ref, inView, reduce } = useSimGate<HTMLDivElement>();
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

  return (
    <WidgetFrame title="Priority lanes" sub="Login codes (OTP) must arrive in seconds; marketing can wait hours. Give them separate queues and workers, or watch one campaign bury every login.">
      <div className="controls">
        <Seg<Mode>
          label="Queues"
          value={s.mode}
          onChange={(m) => reset(setMode(s, m))}
          options={[
            { value: "lanes", label: "Two lanes" },
            { value: "shared", label: "Single shared queue" },
          ]}
        />
        <button type="button" className="wbtn danger" onClick={() => reset(launchCampaign(s))}>
          <Rocket size={14} aria-hidden /> Launch 1M campaign
        </button>
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
        <svg viewBox="0 0 560 172" className="sim-svg" role="img" aria-label={`${s.mode === "lanes" ? "Two queues" : "One shared queue"}. Marketing backlog ${int(mktBacklog)}. An OTP sent now waits ${dur(wait)}.`}>
          {s.mode === "lanes" ? (
            <>
              <Pipe y={14} label="OTP lane" sub="critical · login codes" segs={s.q.otp} workers={WORKERS.otp} busy={s.q.otp.length > 0} color="var(--series-1)" />
              <Pipe y={96} label="Marketing lane" sub="low priority" segs={s.q.mkt} workers={WORKERS.mkt} busy={s.q.mkt.length > 0} color="var(--series-2)" />
            </>
          ) : (
            <Pipe y={52} label="Shared queue" sub="FIFO: first in, first out" segs={s.q.shared} workers={WORKERS.shared} busy={s.q.shared.length > 0} color="var(--k-queue)" />
          )}
        </svg>
      </div>
      <ul className="legend" aria-label="Legend" style={{ marginTop: 2 }}>
        <li>
          <KeyRound size={13} aria-hidden style={{ color: "var(--series-1)" }} /> OTP login code (one every 0.5 s)
        </li>
        <li>
          <Megaphone size={13} aria-hidden style={{ color: "var(--series-2)" }} /> marketing (bar length is log scale)
        </li>
        <li>each worker sends 20 messages/s</li>
      </ul>

      <div className="stat-tiles" style={{ marginTop: 8 }}>
        <div className="stat-tile">
          <div className="stat-label">OTP sent now waits</div>
          <div className={`stat-value ${wait > 30 ? "bad-ink" : ""}`}>{dur(wait + SERVICE_MS / 1000)}</div>
          <div className="stat-sub">{wait > 30 ? "too late: codes expire in minutes" : "on time"}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Oldest waiting OTP</div>
          <div className="stat-value">{oldest ? dur(oldest) : "none"}</div>
          <div className="stat-sub">{int(s.sent.otp)} codes delivered</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Marketing backlog</div>
          <div className="stat-value">{compact(mktBacklog)}</div>
          <div className="stat-sub">{mktBacklog > 1000 ? `drains in ~${dur(drain)}` : "keeping up"}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Simulated time</div>
          <div className="stat-value">{dur(s.t / 1000)}</div>
          <div className="stat-sub">{speed}× real time</div>
        </div>
      </div>

      <LatencyChart samples={s.samples} />

      <p className="readout" aria-live="polite">
        {said}
        <ReducedNote reduce={reduce} what="Paused (reduced motion): Step advances 30 simulated seconds." />
      </p>
    </WidgetFrame>
  );
}
