"use client";
import { useEffect, useRef, useState } from "react";
import { m } from "motion/react";
import { BookOpen, Circle, CircleCheck, PenLine, TriangleAlert } from "lucide-react";
import { useFixedStep } from "@/lib/sim-loop";
import { draw } from "./lib/draw-rng";
import { advance, ReducedNote, SimButtons, useSimGate } from "./lib/sim-kit";
import { More, Slider, WidgetFrame } from "./WidgetFrame";

/* ------------------------------------------------------------------ pure model */

/** After a write, read-your-writes pins this client's reads to the primary for this long. */
export const RYW_WINDOW_MS = 5_000;

export interface Ship {
  replica: number;
  version: number;
  sentAt: number;
  applyAt: number;
}
export interface ReadEvent {
  n: number;
  at: number;
  /** -1 = primary, otherwise the replica index. */
  source: number;
  version: number;
  latest: number;
  stale: boolean;
  pinned: boolean;
}
export interface RLState {
  t: number;
  primary: number;
  replicas: number[];
  ships: Ship[];
  lastWriteAt: number | null;
  reads: ReadEvent[];
  readCount: number;
  staleCount: number;
  seed: number;
}

export const initRL = (seed = 11): RLState => ({
  t: 0,
  primary: 1,
  replicas: [1, 1],
  ships: [],
  lastWriteAt: null,
  reads: [],
  readCount: 0,
  staleCount: 0,
  seed,
});

/** Write the next version to the primary; each replica applies it after `lagMs` × (0.8–1.2) jitter. */
export function writeRL(s: RLState, lagMs: number): RLState {
  const version = s.primary + 1;
  let seed = s.seed;
  const ships: Ship[] = [...s.ships];
  const replicas = [...s.replicas];
  for (let i = 0; i < replicas.length; i++) {
    const [r, next] = draw(seed);
    seed = next;
    const delay = Math.round(lagMs * (0.8 + 0.4 * r));
    if (delay <= 0) replicas[i] = Math.max(replicas[i], version);
    else ships.push({ replica: i, version, sentAt: s.t, applyAt: s.t + delay });
  }
  return { ...s, primary: version, replicas, ships, lastWriteAt: s.t, seed };
}

/** Advance the clock; replicas apply every change whose lag has elapsed. */
export function stepRL(s: RLState, dt: number): RLState {
  const t = s.t + dt;
  if (!s.ships.some((x) => x.applyAt <= t)) return { ...s, t };
  const replicas = [...s.replicas];
  const ships: Ship[] = [];
  for (const x of s.ships) {
    if (x.applyAt <= t) replicas[x.replica] = Math.max(replicas[x.replica], x.version);
    else ships.push(x);
  }
  return { ...s, t, replicas, ships };
}

export const pinnedToPrimary = (s: RLState, ryw: boolean) => ryw && s.lastWriteAt !== null && s.t - s.lastWriteAt < RYW_WINDOW_MS;

/** Read once: from the primary while read-your-writes pins us there, else from a random replica. */
export function readRL(s: RLState, ryw: boolean): RLState {
  const pinned = pinnedToPrimary(s, ryw);
  let seed = s.seed;
  let source = -1;
  if (!pinned) {
    const [r, next] = draw(seed);
    seed = next;
    source = Math.floor(r * s.replicas.length);
  }
  const version = source < 0 ? s.primary : s.replicas[source];
  const stale = version < s.primary;
  const ev: ReadEvent = { n: s.readCount + 1, at: s.t, source, version, latest: s.primary, stale, pinned };
  return { ...s, seed, reads: [ev, ...s.reads].slice(0, 5), readCount: s.readCount + 1, staleCount: s.staleCount + (stale ? 1 : 0) };
}

const nodeName = (source: number) => (source < 0 ? "the primary" : `Replica ${source + 1}`);

export function describeRead(ev: ReadEvent) {
  const where = nodeName(ev.source);
  if (ev.stale) return `Read #${ev.n} went to ${where} and returned v${ev.version}, but the primary already has v${ev.latest}: a stale read.`;
  if (ev.pinned) return `Read #${ev.n} went to the primary (read-your-writes) and returned v${ev.version}: fresh.`;
  return `Read #${ev.n} went to ${where} and returned v${ev.version}: fresh.`;
}

/* ------------------------------------------------------------------ view */

interface Pt {
  x: number;
  y: number;
}
/** Node positions: client left, primary top, replicas below on the desktop pane; a 2 × 2 grid on a phone. */
interface Geo {
  w: number;
  h: number;
  client: Pt;
  primary: Pt;
  replicas: Pt[];
  repLabel: Pt & { anchor: "start" | "end" };
  narrow: boolean;
  k: number;
}
const WIDE: Geo = {
  w: 560,
  h: 220,
  client: { x: 78, y: 100 },
  primary: { x: 330, y: 40 },
  replicas: [
    { x: 250, y: 170 },
    { x: 470, y: 170 },
  ],
  repLabel: { x: 256, y: 106, anchor: "end" },
  narrow: false,
  k: 1,
};
const NARROW: Geo = {
  w: 320,
  h: 240,
  client: { x: 76, y: 34 },
  primary: { x: 244, y: 34 },
  replicas: [
    { x: 76, y: 180 },
    { x: 244, y: 180 },
  ],
  repLabel: { x: 250, y: 114, anchor: "start" },
  narrow: true,
  k: 1.2,
};
const BW = 124;
const BH = 54;
/** Where the line from box `a` towards box `b` leaves `a`'s border. */
const edge = (a: Pt, b: Pt): Pt => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = Math.min(dx ? BW / 2 / Math.abs(dx) : Infinity, dy ? BH / 2 / Math.abs(dy) : Infinity);
  return { x: a.x + dx * t, y: a.y + dy * t };
};

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
.rl { container: rl / inline-size; }
.rl-opts { display: flex; flex-wrap: wrap; gap: 6px 14px; align-items: flex-end; margin: 4px 0 6px; }
.rl-opts .control { min-width: 160px; }
.rl-bar { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 6px; }
.rl-reads { list-style: none; padding: 0 !important; margin: 4px 0 0 !important; display: grid; gap: 2px; font-size: 13.5px; }
.rl-reads li { display: flex; gap: 6px; align-items: baseline; margin: 0 !important; }
.rl-note { font-size: 13px; margin: 6px 0 0 !important; }
.rl-note--narrow { display: none; margin: 0 0 6px !important; }
@container rl (max-width: 479px) {
  .rl-note--wide { display: none; }
  .rl-note--narrow { display: block; }
  .rl-bar .wbtn { padding: 0 9px; }
  .rl-opts .control { min-width: 100%; }
}
`;

// Shown under the readout on the desktop pane, inside "Recent reads" on a phone (CSS picks one).
const RYW_NOTE = `Read-your-writes keeps your own reads on the primary for ${RYW_WINDOW_MS / 1000} s after a write (or until the replica has caught up), so your change never vanishes. Other users can still hit a lagging replica.`;

function NodeBox({ x, y, k, title, version, latest, color, note }: { x: number; y: number; k: number; title: string; version?: number; latest?: number; color: string; note?: string }) {
  const stale = version !== undefined && latest !== undefined && version < latest;
  return (
    <g>
      <rect x={x - BW / 2} y={y - BH / 2} width={BW} height={BH} rx={10} fill="var(--card-2)" stroke={color} strokeWidth={1.8} />
      <text x={x} y={y - 9} textAnchor="middle" style={{ fontWeight: 650, fontSize: 11.5 * k }}>
        {title}
      </text>
      {version !== undefined && (
        <text x={x} y={y + 11 + (k - 1) * 8} textAnchor="middle" style={{ fontWeight: 700, fontSize: 14 * Math.min(k, 1.1), fill: stale ? "var(--warning-ink)" : "var(--fg)" }}>
          price v{version}
          {stale ? " (stale)" : ""}
        </text>
      )}
      {note && (
        <text x={x} y={y + BH / 2 + 15 * k} textAnchor="middle" className="muted-text" style={{ fontSize: 11 * k }}>
          {note}
        </text>
      )}
    </g>
  );
}

export function ReplicationLag() {
  const [lag, setLag] = useState(1500);
  const [ryw, setRyw] = useState(false);
  const [message, setMessage] = useState("The primary and both replicas hold price v1. Write v2, then read before the replicas catch up.");
  const { ref, inView, reduce } = useSimGate<HTMLDivElement>();
  const [boxRef, narrow] = useNarrow(480);
  const g = narrow ? NARROW : WIDE;
  const P = g;
  // The clock only runs while there is something to wait for (a change in flight or the read-your-writes window).
  const [busyFlag, setBusyFlag] = useState(false);
  const [s, reset] = useFixedStep<RLState>(initRL, stepRL, busyFlag && inView && !reduce);
  const busy = s.ships.length > 0 || pinnedToPrimary(s, ryw);
  if (busy !== busyFlag) setBusyFlag(busy); // derived from the previous render's state (React's "adjust state while rendering" pattern)

  const write = () => {
    const next = writeRL(s, lag);
    reset(next);
    setMessage(
      lag === 0
        ? `Wrote v${next.primary} to the primary; with zero lag both replicas have it already.`
        : `Wrote v${next.primary} to the primary. The replicas apply it in about ${(lag / 1000).toFixed(1)} s${ryw ? "; your reads stay on the primary for 5 s" : ""}.`,
    );
  };
  const read = () => {
    const next = readRL(s, ryw);
    reset(next);
    setMessage(describeRead(next.reads[0]));
  };

  const pinned = pinnedToPrimary(s, ryw);
  const pinLeft = pinned && s.lastWriteAt !== null ? RYW_WINDOW_MS - (s.t - s.lastWriteAt) : 0;
  const last = s.reads[0];
  const lastTarget = last ? (last.source < 0 ? P.primary : P.replicas[last.source]) : null;
  const k = g.k;
  const fromClient = (n: Pt) => edge(P.client, n);

  return (
    <WidgetFrame title="Replication lag and read-your-writes" sub="Writes go to the primary and reach the replicas a little later. Read from a replica inside that gap and you get the old value.">
      <style href="w-replication-lag" precedence="widgets">
        {CSS}
      </style>
      <div className="rl" ref={boxRef}>
        <div className="rl-opts">
          <Slider label="Replication lag" value={lag} min={0} max={3000} step={100} onChange={setLag} format={(v) => `${v.toLocaleString("en")} ms`} />
          <button type="button" className="wbtn" aria-pressed={ryw} onClick={() => setRyw((v) => !v)} style={ryw ? { borderColor: "var(--accent)" } : undefined}>
            {ryw ? <CircleCheck size={14} aria-hidden className="ok-ink" /> : <Circle size={14} aria-hidden />}
            Read-your-writes: {ryw ? "on" : "off"}
          </button>
        </div>
        <div className="rl-bar">
          <button type="button" className="wbtn primary" onClick={write} aria-label={`Write v${s.primary + 1} to primary`}>
            <PenLine size={14} aria-hidden /> Write v{s.primary + 1}
          </button>
          <button type="button" className="wbtn" onClick={read}>
            <BookOpen size={14} aria-hidden /> Read
          </button>
          <SimButtons
            running={busy && inView && !reduce}
            reduce={reduce}
            onStep={() => reset(advance(s, stepRL, 10))}
            stepHint="Advance the clock 0.5 seconds"
            onReset={() => {
              reset(initRL());
              setMessage("Reset: everyone holds price v1.");
            }}
          />
        </div>
        <div ref={ref}>
          <svg viewBox={`0 0 ${g.w} ${g.h}`} className="sim-svg" style={{ maxWidth: 620, margin: "0 auto" }} role="img" aria-label={`Primary has v${s.primary}. Replica 1 has v${s.replicas[0]}, replica 2 has v${s.replicas[1]}.`}>
            {/* links */}
            {P.replicas.map((r, i) => {
              const a = edge(P.primary, r);
              const b = edge(r, P.primary);
              return <line key={`rep${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--border-strong)" strokeWidth={1.6} strokeDasharray="10 4 2 4" />;
            })}
            {[P.primary, ...P.replicas].map((n, i) => {
              const hot = lastTarget === n;
              const a = fromClient(n);
              const b = edge(n, P.client);
              return (
                <line
                  key={`rd${i}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={hot ? (last?.stale ? "var(--warning)" : "var(--accent)") : "var(--border)"}
                  strokeWidth={hot ? 2.4 : 1.2}
                />
              );
            })}
            <text x={P.repLabel.x} y={P.repLabel.y} textAnchor={P.repLabel.anchor} className="muted-text" style={{ fontSize: 10.5 * k }}>
              replication
            </text>

            {/* nodes */}
            <NodeBox {...P.client} k={k} title="You (app)" color="var(--k-client)" note={last ? `last read: v${last.version}${last.stale ? " (stale)" : ""}` : "no reads yet"} />
            <NodeBox {...P.primary} k={k} title="Primary" version={s.primary} latest={s.primary} color="var(--k-database)" />
            {pinned && (
              <g>
                <rect x={P.primary.x - BW / 2} y={P.primary.y + BH / 2 + 5} width={BW} height={5} rx={2.5} fill="var(--border)" />
                <rect x={P.primary.x - BW / 2} y={P.primary.y + BH / 2 + 5} width={(BW * pinLeft) / RYW_WINDOW_MS} height={5} rx={2.5} fill="var(--accent)" />
                <text
                  x={g.narrow ? P.primary.x : P.primary.x + BW / 2 + 8}
                  y={P.primary.y + BH / 2 + (g.narrow ? 26 : 11)}
                  textAnchor={g.narrow ? "middle" : "start"}
                  className="muted-text"
                  style={{ fontSize: 10.5 * k }}
                >
                  reads pinned here {(pinLeft / 1000).toFixed(1)} s
                </text>
              </g>
            )}
            {P.replicas.map((r, i) => {
              const pending = s.ships.filter((x) => x.replica === i);
              const eta = pending.length ? Math.max(0, Math.min(...pending.map((x) => x.applyAt)) - s.t) : 0;
              return (
                <NodeBox
                  key={i}
                  {...r}
                  k={k}
                  title={`Replica ${i + 1}`}
                  version={s.replicas[i]}
                  latest={s.primary}
                  color="var(--k-database)"
                  note={pending.length ? `v${pending.at(-1)!.version} arrives in ${(eta / 1000).toFixed(1)} s` : "caught up"}
                />
              );
            })}

            {/* replication packets: position comes from the simulation clock */}
            {s.ships.map((x, i) => {
              const r = P.replicas[x.replica];
              const p = Math.min(1, (s.t - x.sentAt) / Math.max(1, x.applyAt - x.sentAt));
              const a = edge(P.primary, r);
              const b = edge(r, P.primary);
              const cx = a.x + (b.x - a.x) * p;
              const cy = a.y + (b.y - a.y) * p;
              return (
                <g key={`${x.version}-${x.replica}-${i}`} style={{ transform: `translate(${cx}px, ${cy}px)`, transition: reduce ? undefined : "transform 60ms linear" }}>
                  <circle r={7} fill="var(--series-2)" stroke="var(--card)" strokeWidth={2} />
                  <text x={10} y={4} style={{ fontSize: 10.5 * k, fontWeight: 700 }}>
                    v{x.version}
                  </text>
                </g>
              );
            })}

            {/* one-shot animations for the write and the latest read */}
            {!reduce && s.lastWriteAt !== null && (
              <m.circle
                key={`w${s.primary}`}
                r={6}
                fill="var(--accent)"
                stroke="var(--card)"
                strokeWidth={2}
                initial={{ cx: fromClient(P.primary).x, cy: fromClient(P.primary).y, opacity: 1 }}
                animate={{ cx: edge(P.primary, P.client).x, cy: edge(P.primary, P.client).y, opacity: [1, 1, 0] }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            )}
            {!reduce && last && lastTarget && (
              <m.circle
                key={`r${last.n}`}
                r={6}
                fill={last.stale ? "var(--warning)" : "var(--good)"}
                stroke="var(--card)"
                strokeWidth={2}
                initial={{ cx: fromClient(lastTarget).x, cy: fromClient(lastTarget).y, opacity: 1 }}
                animate={{
                  cx: [fromClient(lastTarget).x, edge(lastTarget, P.client).x, fromClient(lastTarget).x],
                  cy: [fromClient(lastTarget).y, edge(lastTarget, P.client).y, fromClient(lastTarget).y],
                  opacity: [1, 1, 0],
                }}
                transition={{ duration: 0.9, ease: "easeInOut" }}
              />
            )}
          </svg>
        </div>

        <p className="readout" aria-live="polite">
          {message} Stale reads so far: <strong>{s.staleCount}</strong> of <strong>{s.readCount}</strong>.
          <ReducedNote reduce={reduce} what="Clock paused (reduced motion): Step advances 0.5 s, so press it to let replication catch up." />
        </p>
        <p className="muted rl-note rl-note--wide">{RYW_NOTE}</p>
        <More label={`Recent reads (${s.reads.length})`}>
          <p className="muted rl-note rl-note--narrow">{RYW_NOTE}</p>
          {s.reads.length ? (
            <ol aria-label="Recent reads" className="rl-reads">
              {s.reads.map((ev) => (
                <li key={ev.n}>
                  {ev.stale ? <TriangleAlert size={13} aria-hidden className="warn-ink" /> : <CircleCheck size={13} aria-hidden className="ok-ink" />}
                  <span>
                    <strong>#{ev.n}</strong> {nodeName(ev.source)} → v{ev.version}{" "}
                    <span className={ev.stale ? "warn-ink" : "ok-ink"} style={{ fontWeight: 600 }}>
                      {ev.stale ? "stale" : "fresh"}
                    </span>
                    {ev.pinned && <span className="muted"> (pinned by read-your-writes)</span>}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="muted" style={{ fontSize: 13, margin: "4px 0 0" }}>
              No reads yet.
            </p>
          )}
        </More>
      </div>
    </WidgetFrame>
  );
}
