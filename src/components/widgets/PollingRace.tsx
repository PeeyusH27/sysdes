"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Shuffle } from "lucide-react";
import { mulberry32 } from "@/lib/rng";
import { useFixedStep } from "@/lib/sim-loop";
import { useNarrow } from "@/lib/hooks";
import { ReducedNote, SimButtons, useSimGate, useThrottled } from "./lib/sim-kit";
import { More, Slider, WidgetFrame } from "./WidgetFrame";

export type LaneId = "short" | "long" | "sse" | "ws";
export interface Span {
  start: number;
  end: number;
  empty: boolean;
}
export interface Delivery {
  event: number;
  at: number;
}
export interface LaneResult {
  id: LaneId;
  name: string;
  requests: Span[];
  deliveries: Delivery[];
  requestCount: number;
  emptyCount: number;
  avgDelay: number;
  maxDelay: number;
}
export interface PollingParams {
  duration?: number;
  /** Short-polling interval, ms. */
  interval?: number;
  /** One-way network latency, ms. */
  latency?: number;
  /** Long-poll hold before the server answers empty, ms. */
  timeout?: number;
}

/** A seeded Poisson stream of server-side events (ms), kept away from the very end of the run. */
export function makeEvents(seed: number, perMinute: number, duration = 60_000) {
  const rand = mulberry32(seed);
  const mean = 60_000 / perMinute;
  const out: number[] = [];
  let t = 0;
  for (;;) {
    t += -Math.log(1 - rand()) * mean;
    if (t >= duration - 1_000) break;
    out.push(Math.round(t));
  }
  return out;
}

function summarise(id: LaneId, name: string, requests: Span[], deliveries: Delivery[], requestCount = requests.length): LaneResult {
  const delays = deliveries.map((d) => d.at - d.event);
  return {
    id,
    name,
    requests,
    deliveries,
    requestCount,
    emptyCount: requests.filter((r) => r.empty).length,
    avgDelay: delays.length ? delays.reduce((a, b) => a + b, 0) / delays.length : 0,
    maxDelay: delays.length ? Math.max(...delays) : 0,
  };
}

/**
 * Pure simulation of four ways to get server events to a client. Requests started inside the run are
 * drawn and counted; polls after the end only finish delivering events that happened inside it.
 */
export function simulatePolling(events: number[], { duration = 60_000, interval = 5_000, latency = 50, timeout = 30_000 }: PollingParams = {}): LaneResult[] {
  const ev = [...events].sort((a, b) => a - b);

  // Short polling: ask every `interval`; the server answers at once with whatever has happened.
  const shortReqs: Span[] = [];
  const shortDel: Delivery[] = [];
  for (let s = 0, next = 0; s < duration || next < ev.length; s += interval) {
    const arrive = s + latency;
    const end = arrive + latency;
    const before = next;
    while (next < ev.length && ev[next] <= arrive) shortDel.push({ event: ev[next++], at: end });
    if (s < duration) shortReqs.push({ start: s, end, empty: next === before });
  }

  // Long polling: the server holds the request until an event (or the timeout), then the client re-asks at once.
  const longReqs: Span[] = [];
  const longDel: Delivery[] = [];
  for (let s = 0, next = 0; s < duration || next < ev.length; ) {
    const arrive = s + latency;
    const respond = next < ev.length && ev[next] <= arrive ? arrive : next < ev.length && ev[next] <= arrive + timeout ? ev[next] : arrive + timeout;
    const end = respond + latency;
    const before = next;
    while (next < ev.length && ev[next] <= respond) longDel.push({ event: ev[next++], at: end });
    if (s < duration) longReqs.push({ start: s, end, empty: next === before });
    s = end;
  }

  // SSE and WebSocket: one long-lived connection; each event is pushed as soon as it happens.
  const push = ev.map((e) => ({ event: e, at: Math.max(e, latency) + latency }));
  return [
    summarise("short", `Short polling (${interval / 1000} s)`, shortReqs, shortDel),
    summarise("long", "Long polling", longReqs, longDel),
    summarise("sse", "Server-Sent Events", [{ start: 0, end: duration, empty: false }], push),
    summarise("ws", "WebSocket", [{ start: 0, end: duration, empty: false }], push),
  ];
}

export const fmtDelay = (ms: number) => (ms < 1_000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(2)} s`);

// ---------------------------------------------------------------- picture
const D = 60_000;
const SPEED = 7.5; // simulated ms per real ms: 60 s plays in 8 s

/** Landscape: lane names in a left column. Phone: each lane's name sits above its track, so the track gets the full width. */
function geometry(narrow: boolean) {
  const W = narrow ? 300 : 640;
  const L = narrow ? 8 : 128;
  const R = W - 12;
  const TOP = narrow ? 40 : 34;
  const LANE_H = narrow ? 54 : 46;
  const x = (t: number) => L + (Math.min(t, D) / D) * (R - L);
  return { W, L, R, TOP, LANE_H, x, height: TOP + 4 * LANE_H + 24 };
}
type Geo = ReturnType<typeof geometry>;

interface Play {
  t: number;
}
const play = (s: Play, dt: number): Play => (s.t >= D ? s : { t: Math.min(D, s.t + dt * SPEED) });

const laneName = (lane: LaneResult) => (lane.id === "short" ? "Short polling" : lane.name);
const laneStats = (lane: LaneResult) => `${lane.requestCount} req${lane.emptyCount ? `, ${lane.emptyCount} empty` : ""} · avg ${fmtDelay(lane.avgDelay)}`;

function LaneView({ lane, y, at, g, narrow }: { lane: LaneResult; y: number; at: number; g: Geo; narrow: boolean }) {
  const { x, L, R, LANE_H } = g;
  const mid = narrow ? y + 28 : y + LANE_H / 2 - 4;
  const longLived = lane.id === "sse" || lane.id === "ws";
  return (
    <g>
      {narrow ? (
        <text x={L} y={y + 12} style={{ fontWeight: 650, fontSize: 12 }}>
          {laneName(lane)}{" "}
          <tspan className="muted-text" style={{ fontWeight: 400, fontSize: 11 }}>
            · {laneStats(lane)}
          </tspan>
        </text>
      ) : (
        <>
          <text x={8} y={mid - 2} style={{ fontWeight: 650, fontSize: 12 }}>
            {laneName(lane)}
          </text>
          <text x={8} y={mid + 13} className="muted-text" style={{ fontSize: 10.5 }}>
            {lane.requestCount} req{lane.emptyCount ? `, ${lane.emptyCount} empty` : ""}
          </text>
          <text x={8} y={mid + 26} className="muted-text" style={{ fontSize: 10.5 }}>
            avg {fmtDelay(lane.avgDelay)}
          </text>
        </>
      )}
      <line x1={L} x2={R} y1={y + LANE_H} y2={y + LANE_H} stroke="var(--grid)" />
      {lane.requests.map((r, i) => {
        if (r.start > at) return null;
        const end = Math.min(r.end, at);
        const w = Math.max(1.5, x(end) - x(r.start));
        if (longLived) return <rect key={i} x={x(r.start)} y={mid - 4} width={w} height={8} rx={4} fill="var(--series-3)" opacity={0.35} />;
        if (lane.id === "long") return <rect key={i} x={x(r.start)} y={mid - 7} width={Math.max(2, w - 1)} height={14} rx={4} fill="var(--series-3)" opacity={i % 2 ? 0.28 : 0.45} />;
        return <rect key={i} x={x(r.start) - 0.75} y={mid - (r.empty ? 6 : 10)} width={2.5} height={r.empty ? 12 : 20} rx={1} fill={r.empty ? "var(--border-strong)" : "var(--series-3)"} />;
      })}
      {lane.deliveries.map((d, i) => {
        if (d.event > at || d.event > D) return null;
        const arrived = d.at <= at;
        return (
          <g key={i}>
            <line x1={x(d.event)} x2={x(Math.min(d.at, at))} y1={mid + 13} y2={mid + 13} stroke="var(--series-2)" strokeWidth={3} strokeLinecap="round" />
            {arrived && <circle cx={x(d.at)} cy={mid + 13} r={4} fill="var(--series-1)" stroke="var(--card)" strokeWidth={1.5} />}
          </g>
        );
      })}
    </g>
  );
}

export function PollingRace() {
  const [interval, setPollEvery] = useState(5);
  const [perMinute, setPerMinute] = useState(6);
  const [seed, setSeed] = useState(11);
  const [playing, setPlaying] = useState(false);
  const { ref, inView, reduce } = useSimGate<HTMLDivElement>();
  const box = useRef<HTMLDivElement>(null);
  const narrow = useNarrow(box, 480);
  const [state, reset] = useFixedStep<Play>({ t: D }, play, playing && inView && !reduce);
  const at = state.t;

  const events = useMemo(() => makeEvents(seed, perMinute), [seed, perMinute]);
  const lanes = useMemo(() => simulatePolling(events, { interval: interval * 1000 }), [events, interval]);

  const replay = useCallback(() => {
    reset({ t: 0 });
    setPlaying(true);
  }, [reset]);
  const started = useRef(false);
  useEffect(() => {
    if (inView && !reduce && !started.current) {
      started.current = true;
      replay();
    }
  }, [inView, reduce, replay]);

  const [short, long, sse] = lanes;
  const done = at >= D;
  const said = useThrottled(
    `${events.length} events in 60 s. Short polling every ${interval} s: ${short.requestCount} requests (${short.emptyCount} came back empty), average delay ${fmtDelay(short.avgDelay)}. Long polling: ${long.requestCount} requests, ${fmtDelay(long.avgDelay)}. SSE and WebSocket: one connection each, ${fmtDelay(sse.avgDelay)}.`,
    800,
  );
  const g = geometry(narrow);
  const { W, TOP, LANE_H, x, height } = g;
  const ticks = narrow ? [0, 20, 40, 60] : [0, 10, 20, 30, 40, 50, 60];

  return (
    <WidgetFrame title="Polling race" sub="The same server events, delivered four ways over 60 simulated seconds (50 ms one-way latency). Amber bars are the wait before the client has an event.">
      <div ref={box}>
        <div className="controls" style={{ marginBottom: 4 }}>
          <Slider label="Short-poll interval" value={interval} min={1} max={20} onChange={setPollEvery} format={(v) => `${v} s`} />
          <Slider label="Events per minute" value={perMinute} min={2} max={20} onChange={setPerMinute} />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "flex-end" }}>
            <button type="button" className="wbtn" onClick={() => setSeed((s) => s + 1)} aria-label="New events" title="New events">
              <Shuffle size={14} aria-hidden />
            </button>
            <SimButtons
              running={playing && !done && !reduce}
              reduce={reduce}
              onToggle={done ? replay : () => setPlaying((p) => !p)}
              onStep={() => reset({ t: at >= D ? 0 : Math.min(D, at + 10_000) })}
              stepHint={done ? "Restart at 0 seconds" : "Advance 10 seconds"}
              onReset={() => {
                setPlaying(false);
                reset({ t: 0 });
              }}
            />
          </div>
        </div>
        <div ref={ref}>
          <svg viewBox={`0 0 ${W} ${height}`} className="sim-svg" role="img" aria-label={`Timeline of ${events.length} events and how each technique delivers them; playhead at ${Math.round(at / 1000)} s`}>
            <text x={8} y={narrow ? 12 : TOP - 12} style={{ fontWeight: 650, fontSize: 12 }}>
              Server events
            </text>
            {events.map((e) => (
              <g key={e} opacity={e <= at ? 1 : 0.25}>
                <line x1={x(e)} x2={x(e)} y1={TOP - 4} y2={TOP + lanes.length * LANE_H} stroke="var(--grid)" />
                <path d={`M${x(e)} ${TOP - 22} l6 6 l-6 6 l-6 -6 z`} fill="var(--accent-2)" />
              </g>
            ))}
            {lanes.map((lane, i) => (
              <LaneView key={lane.id} lane={lane} y={TOP + i * LANE_H} at={at} g={g} narrow={narrow} />
            ))}
            {ticks.map((s, i) => (
              <text key={s} x={x(s * 1000)} y={height - 6} textAnchor={i === ticks.length - 1 ? "end" : i === 0 && narrow ? "start" : "middle"} className="muted-text" style={{ fontSize: 10.5 }}>
                {s} s
              </text>
            ))}
            {!done && <line x1={x(at)} x2={x(at)} y1={TOP - 26} y2={TOP + lanes.length * LANE_H} stroke="var(--fg)" strokeWidth={1.5} opacity={0.55} />}
          </svg>
        </div>
        <ul className="legend" aria-label="Legend" style={{ marginTop: 4 }}>
          <li>
            <svg width={12} height={12} aria-hidden>
              <path d="M6 0 l6 6 l-6 6 l-6 -6 z" fill="var(--accent-2)" />
            </svg>
            event on the server
          </li>
          <li>
            <span className="line-key" style={{ background: "var(--series-2)", height: 4 }} aria-hidden />
            waiting
          </li>
          <li>
            <svg width={12} height={12} aria-hidden>
              <circle cx={6} cy={6} r={4.5} fill="var(--series-1)" />
            </svg>
            client has it
          </li>
          <li>
            <span className="line-key" style={{ background: "var(--series-3)", height: 8, opacity: 0.45 }} aria-hidden />
            request or connection (grey: empty poll)
          </li>
        </ul>
        <p className="readout" aria-live="polite">
          {said}
          <ReducedNote reduce={reduce} what="Showing the full 60 s (reduced motion): Step replays it 10 s at a time." />
        </p>
        <More label="Results by technique">
          {narrow ? (
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, display: "grid", gap: 4 }}>
              {lanes.map((l) => (
                <li key={l.id} style={{ margin: 0 }}>
                  <strong>{l.name}</strong>: {l.id === "sse" ? "1 stream" : l.id === "ws" ? "1 upgrade" : `${l.requestCount} HTTP requests, ${l.emptyCount} empty`}; delay avg {fmtDelay(l.avgDelay)}, worst {fmtDelay(l.maxDelay)}
                </li>
              ))}
            </ul>
          ) : (
            <div className="table-wrap" style={{ margin: 0 }}>
              <table style={{ fontSize: 13.5 }}>
                <thead>
                  <tr>
                    <th scope="col">Technique</th>
                    <th scope="col">HTTP requests</th>
                    <th scope="col">Empty answers</th>
                    <th scope="col">Avg delay</th>
                    <th scope="col">Worst delay</th>
                  </tr>
                </thead>
                <tbody>
                  {lanes.map((l) => (
                    <tr key={l.id}>
                      <th scope="row">{l.name}</th>
                      <td>{l.id === "sse" ? "1 (stream)" : l.id === "ws" ? "1 (upgrade)" : l.requestCount}</td>
                      <td>{l.emptyCount}</td>
                      <td>{fmtDelay(l.avgDelay)}</td>
                      <td>{fmtDelay(l.maxDelay)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </More>
      </div>
    </WidgetFrame>
  );
}
