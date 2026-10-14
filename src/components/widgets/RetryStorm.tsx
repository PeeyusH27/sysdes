"use client";
import { useDeferredValue, useMemo, useState } from "react";
import { Shuffle } from "lucide-react";
import { LineChart } from "@/components/charts/LineChart";
import { StatTiles } from "@/components/charts/ChartBits";
import { int } from "@/lib/format";
import { mulberry32 } from "@/lib/rng";
import { More, Seg, Slider, WidgetFrame } from "./WidgetFrame";

export type Policy = "none" | "fixed" | "exp" | "jitter";
export const POLICY_NAMES: Record<Policy, string> = { none: "No retries", fixed: "Fixed 1 s", exp: "Exponential", jitter: "Exponential + full jitter" };

export interface StormParams {
  clients: number;
  policy: Policy;
  seed?: number;
  /** The server is down until this time (ms); every request before it fails at once. */
  recoverAt?: number;
  /** Requests the recovered server can answer per slot; the rest are rejected and retried. */
  capacityPerSlot?: number;
  duration?: number;
  slotMs?: number;
  baseMs?: number;
  capMs?: number;
}

/**
 * Requests a server actually answers in one slot. Up to capacity it answers them all; past it, time
 * goes on rejecting and timing out, so goodput falls (to a floor of a quarter of capacity).
 */
export const goodput = (load: number, capacity: number) => (load <= capacity ? load : Math.max(Math.floor(capacity / 4), Math.floor((capacity * capacity) / load)));

/** Delay before retry number `attempt` (0-based), or null to give up. */
export function retryDelay(policy: Policy, attempt: number, rand: () => number, baseMs = 1_000, capMs = 8_000): number | null {
  const exp = Math.min(capMs, baseMs * 2 ** attempt);
  if (policy === "none") return null;
  if (policy === "fixed") return baseMs;
  if (policy === "exp") return exp;
  return rand() * exp; // full jitter: anywhere in [0, exp)
}

/**
 * Pure, seeded simulation of N clients whose first request fails during an outage. Returns the
 * requests arriving at the server per slot, and when everyone was finally served.
 */
export function simulateRetryStorm({ clients, policy, seed = 7, recoverAt = 10_000, capacityPerSlot = 20, duration = 30_000, slotMs = 100, baseMs = 1_000, capMs = 8_000 }: StormParams) {
  const rand = mulberry32(seed);
  const slots = Math.ceil(duration / slotMs);
  const queue: { t: number; attempt: number }[][] = Array.from({ length: slots }, () => []);
  for (let c = 0; c < clients; c++) {
    const t = rand() * 200; // everyone's request fails in the first moments of the outage
    queue[Math.floor(t / slotMs)].push({ t, attempt: 0 });
  }
  const load = new Array<number>(slots).fill(0);
  let served = 0;
  let gaveUp = 0;
  let sent = 0;
  let doneAt: number | null = null;
  for (let s = 0; s < slots; s++) {
    const arrivals = queue[s].sort((a, b) => a.t - b.t);
    const up = s * slotMs >= recoverAt;
    // An index loop, because a short jittered retry can land back in this same slot.
    for (let i = 0; i < arrivals.length; i++) {
      const r = arrivals[i];
      // How many get answered depends on how crowded this slot is (a crowd slows everyone down).
      if (up && i < goodput(arrivals.length, capacityPerSlot)) {
        served++;
        if (served === clients) doneAt = r.t;
        continue;
      }
      const d = retryDelay(policy, r.attempt, rand, baseMs, capMs);
      if (d === null) {
        gaveUp++;
        continue;
      }
      const t = r.t + d;
      const slot = Math.floor(t / slotMs);
      if (slot < slots) queue[slot].push({ t, attempt: r.attempt + 1 });
    }
    load[s] = arrivals.length;
    sent += arrivals.length;
  }
  const fromSlot = Math.ceil(recoverAt / slotMs);
  const after = load.slice(fromSlot);
  const peakAfter = after.length ? Math.max(...after) : 0;
  return {
    load,
    served,
    gaveUp,
    stillWaiting: clients - served - gaveUp,
    sent,
    peak: Math.max(...load),
    peakAfterRecovery: peakAfter,
    peakAfterAt: (fromSlot + after.indexOf(peakAfter)) * slotMs,
    doneAt,
  };
}

const SLOT = 100;
const DURATION = 30_000;
const X = Array.from({ length: DURATION / SLOT }, (_, i) => +((i * SLOT) / 1000).toFixed(1));
const CAPACITY = 20;

const CSS = `
.w-retry { container-type: inline-size; }
.w-retry .controls { margin-bottom: 4px; align-items: flex-end; }
.w-retry .control { min-width: 100px; }
.w-retry .seg button { padding: 5px 8px; }
.w-retry .stat-tiles { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
.w-retry .stat-tile { padding: 5px 9px; border-radius: 10px; }
.w-retry .stat-label, .w-retry .stat-sub { font-size: 11.5px; line-height: 1.35; }
.w-retry .stat-value { font-size: 17px; line-height: 1.3; }
.w-retry .chart { margin: 6px 0 0; padding: 8px 12px 4px; }
.w-retry .chart-title { font-size: 13.5px; margin-bottom: 2px; }
@container (max-width: 520px) { .w-retry .stat-tiles { grid-template-columns: minmax(0, 1fr); } .w-retry .stat-tile { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0 8px; } }
`;

export function RetryStorm() {
  const [clients, setClients] = useState(300);
  const [policy, setPolicy] = useState<Policy>("exp");
  const [seed, setSeed] = useState(7);
  const c = useDeferredValue(clients);

  const chosen = useMemo(() => simulateRetryStorm({ clients: c, policy, seed, capacityPerSlot: CAPACITY }), [c, policy, seed]);
  const jitter = useMemo(() => simulateRetryStorm({ clients: c, policy: "jitter", seed, capacityPerSlot: CAPACITY }), [c, seed]);
  const series =
    policy === "jitter"
      ? [{ id: "jitter", name: POLICY_NAMES.jitter, values: jitter.load }]
      : [
          { id: policy, name: POLICY_NAMES[policy], values: chosen.load },
          { id: "jitter", name: "Full jitter", values: jitter.load },
        ];
  const finish = (r: typeof chosen) => (r.doneAt !== null ? `${(r.doneAt / 1000).toFixed(1)} s` : r.gaveUp ? `${int(r.gaveUp)} gave up` : `${int(r.stillWaiting)} still failing at 30 s`);
  /** Short form for the stat tile; the detail goes in its sub-line. */
  const finishShort = (r: typeof chosen) => (r.doneAt !== null ? `${(r.doneAt / 1000).toFixed(1)} s` : r.gaveUp ? "never" : "not by 30 s");

  let sentence: string;
  if (policy === "none")
    sentence = `No retries: all ${int(c)} requests failed during the outage and nobody tried again, so every one of those users saw an error even though the server was back at 10 s.`;
  else if (policy === "jitter")
    sentence = `Full jitter spreads the retries out: the recovering server's worst 100 ms after 10 s saw ${int(jitter.peakAfterRecovery)} requests (it can answer ${CAPACITY}). Everyone was served by ${finish(jitter)}.`;
  else
    sentence = `${POLICY_NAMES[policy]}: the retries stay synchronised, so the recovering server's worst 100 ms saw ${int(chosen.peakAfterRecovery)} requests (it can answer ${CAPACITY}) against ${int(jitter.peakAfterRecovery)} with full jitter. ${chosen.doneAt !== null ? `Everyone was served by ${finish(chosen)} vs ${finish(jitter)} with jitter.` : `At 30 s, ${int(chosen.stillWaiting)} clients were still failing; with jitter everyone was served by ${finish(jitter)}.`}`;

  return (
    <WidgetFrame title="Retry storm" sub={`${int(clients)} clients fail at once; the server is back at 10 s and answers ${CAPACITY} requests per 100 ms.`}>
      <style href="w-retry-storm" precedence="widgets">
        {CSS}
      </style>
      <div className="w-retry">
        <div className="controls">
          <Seg<Policy>
            label="Retry policy"
            value={policy}
            onChange={setPolicy}
            options={(Object.keys(POLICY_NAMES) as Policy[]).map((p) => ({ value: p, label: POLICY_NAMES[p] }))}
          />
          <Slider label="Clients" value={clients} min={50} max={1000} step={50} onChange={setClients} format={int} />
        </div>
        <StatTiles
          items={[
            { label: "Peak after recovery", value: `${int(chosen.peakAfterRecovery)} / 100 ms`, sub: policy === "jitter" ? `capacity ${CAPACITY}` : `full jitter: ${int(jitter.peakAfterRecovery)}` },
            {
              label: "Everyone served by",
              value: policy === "none" ? "never" : finishShort(chosen),
              sub: policy === "jitter" ? "server back at 10 s" : `${chosen.doneAt === null && policy !== "none" ? `${int(chosen.stillWaiting)} failing · ` : ""}full jitter: ${finish(jitter)}`,
            },
            { label: "Requests sent", value: int(chosen.sent), sub: `${(chosen.sent / c).toFixed(1)} per client` },
          ]}
        />
        <LineChart title="Requests arriving at the server per 100 ms (line: recovery at 10 s)" x={X} series={series} xLabel="Time (s)" yUnit="req" marker={10} height={150} />
        <p className="readout" aria-live="polite">
          {sentence}
        </p>
        <More label="How the model works">
          <p className="muted" style={{ fontSize: 13, margin: "0 0 8px" }}>
            Exponential delays are 1, 2, 4, 8 s, then 8 s (capped); full jitter waits a random time between 0 and that. Past its capacity the server wastes time on rejections, so it answers fewer. Each run uses a seeded random stream: reshuffle for another.
          </p>
          <button type="button" className="wbtn" onClick={() => setSeed((s) => s + 1)}>
            <Shuffle size={14} aria-hidden /> Reshuffle
          </button>
        </More>
      </div>
    </WidgetFrame>
  );
}
