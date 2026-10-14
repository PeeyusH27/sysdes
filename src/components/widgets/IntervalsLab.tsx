"use client";
import { useRef, useState } from "react";
import { m } from "motion/react";
import { ChevronLeft, ChevronRight, Dices, Minus, Plus, Trash2 } from "lucide-react";
import { mulberry32 } from "@/lib/rng";
import { useFixedStep } from "@/lib/sim-loop";
import { useNarrow } from "@/lib/hooks";
import { ReducedNote, SimButtons, useSimGate, useThrottled } from "./lib/sim-kit";
import { More, Seg, WidgetFrame } from "./WidgetFrame";

// ---------------------------------------------------------------- model (pure, tested)
/** Time is counted in half-hour slots from 8:00, so the day 8:00–18:00 is 0..20. Meetings are half-open: [start, end). */
export const SLOTS = 20;
export interface Meeting {
  id: string;
  start: number;
  end: number;
}
export interface Event {
  t: number;
  delta: 1 | -1;
  id: string;
}

const byStart = (a: Meeting, b: Meeting) => a.start - b.start || a.end - b.end || a.id.localeCompare(b.id);

/** Sort by start, then extend the open block or start a new one. Back-to-back meetings join: the busy time is continuous. */
export function mergeBusy(ms: Meeting[]): [number, number][] {
  const out: [number, number][] = [];
  for (const { start, end } of [...ms].sort(byStart)) {
    const last = out.at(-1);
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else out.push([start, end]);
  }
  return out;
}

/** +1 at each start, −1 at each end, sorted by time with ends first, so back-to-back meetings never count together. */
export function sweepEvents(ms: Meeting[]): Event[] {
  return ms
    .flatMap((x): Event[] => [
      { t: x.start, delta: 1, id: x.id },
      { t: x.end, delta: -1, id: x.id },
    ])
    .sort((a, b) => a.t - b.t || a.delta - b.delta || a.id.localeCompare(b.id));
}

/** How many meetings are running during the slot that starts at t. */
export const countAt = (ms: Meeting[], t: number) => ms.filter((x) => x.start <= t && t < x.end).length;

/** The sweep's answer: the largest running count. */
export function roomsNeeded(ms: Meeting[]) {
  let run = 0;
  let peak = 0;
  for (const e of sweepEvents(ms)) {
    run += e.delta;
    peak = Math.max(peak, run);
  }
  return peak;
}

/** Start order, and each meeting takes the lowest-numbered room that is free by its start (the min-heap idea). */
export function assignRooms(ms: Meeting[]): Record<string, number> {
  const freeAt: number[] = [];
  const room: Record<string, number> = {};
  for (const x of [...ms].sort(byStart)) {
    let r = freeAt.findIndex((end) => end <= x.start);
    if (r < 0) r = freeAt.length;
    freeAt[r] = x.end;
    room[x.id] = r;
  }
  return room;
}

export const pairChecks = (n: number) => (n * (n - 1)) / 2;

export function randomMeetings(seed: number, n = 6): Meeting[] {
  const r = mulberry32(seed);
  return Array.from({ length: n }, (_, i) => {
    const len = 1 + Math.floor(r() * 4);
    const start = Math.floor(r() * (SLOTS - len + 1));
    return { id: "ABCDEF"[i], start, end: start + len };
  });
}

// ---------------------------------------------------------------- picture
const DEFAULT: Meeting[] = [
  { id: "A", start: 2, end: 5 },
  { id: "B", start: 3, end: 6 },
  { id: "C", start: 4, end: 8 },
  { id: "D", start: 10, end: 12 },
  { id: "E", start: 12, end: 15 },
  { id: "F", start: 16, end: 18 },
];
const COLORS = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--k-gateway)", "var(--k-cache)", "var(--k-queue)"];
const color = (id: string) => COLORS["ABCDEF".indexOf(id)] ?? COLORS[0];
const MS_PER_SLOT = 280;
const LANE = 28;
const GRAPH_H = 42;

export const clock = (s: number) => `${8 + Math.floor(s / 2)}:${s % 2 ? "30" : "00"}`;
const span = (a: number, b: number) => `${clock(a)}–${clock(b)}`;

interface Sim {
  pos: number;
}
const stepSim = (s: Sim, dt: number): Sim => (s.pos >= SLOTS ? s : { pos: Math.min(SLOTS, s.pos + dt / MS_PER_SLOT) });

function describe(ms: Meeting[], pos: number) {
  if (!ms.length) return "No meetings: zero rooms, nothing to merge. Press Add.";
  const busy = mergeBusy(ms);
  const rooms = roomsNeeded(ms);
  if (pos >= SLOTS) return `Peak: ${rooms} ${rooms === 1 ? "meeting" : "meetings"} at once, so you need ${rooms} ${rooms === 1 ? "room" : "rooms"}. Merged, the day has ${busy.length} busy ${busy.length === 1 ? "block" : "blocks"}: ${busy.map(([a, b]) => span(a, b)).join(", ")}.`;
  const events = sweepEvents(ms).filter((e) => e.t <= pos);
  if (!events.length) return `Sweeping from 8:00. Nothing has started yet.`;
  const t = events.at(-1)!.t;
  const now = events.filter((e) => e.t === t);
  const peak = Math.max(0, ...events.map((e) => countAt(ms, e.t)));
  const what = now.map((e) => `${e.id} ${e.delta > 0 ? "starts (+1)" : "ends (−1)"}`).join(", ");
  return `${clock(t)}: ${what}. ${countAt(ms, t)} running; peak so far ${peak}.`;
}

export function IntervalsLab() {
  const [ms, setMs] = useState<Meeting[]>(DEFAULT);
  const [sel, setSel] = useState("C");
  const [seed, setSeed] = useState(1);
  const [running, setRunning] = useState(true);
  /** With reduced motion nothing sweeps on its own, so show the finished day until the reader steps. */
  const [touched, setTouched] = useState(false);
  const { ref, inView, reduce } = useSimGate<HTMLDivElement>();
  const narrow = useNarrow(ref, 470);
  const [sim, reset] = useFixedStep<Sim>({ pos: 0 }, stepSim, running && inView && !reduce);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: string; resize: boolean; x0: number; start: number; end: number } | null>(null);

  const pos = reduce && !touched ? SLOTS : sim.pos;
  const done = pos >= SLOTS;
  // A desktop pane gets a wide day (landscape); a phone keeps a squarer one with bigger type.
  const W = narrow ? 330 : 600;
  const X0 = narrow ? 30 : 52;
  const X1 = W - 10;
  const sw = (X1 - X0) / SLOTS;
  const tx = (t: number) => X0 + t * sw;

  const rooms = roomsNeeded(ms);
  const lanes = Math.max(3, rooms);
  const room = assignRooms(ms);
  const busy = mergeBusy(ms);
  const events = sweepEvents(ms);
  const laneY = (r: number) => 22 + r * LANE;
  const busyY = laneY(lanes) + 8;
  const graphTop = busyY + 34;
  const H = graphTop + GRAPH_H + 18;
  const scaleMax = Math.max(3, rooms);
  const gy = (c: number) => graphTop + GRAPH_H - (c / scaleMax) * GRAPH_H;
  const nowCount = countAt(ms, Math.min(Math.floor(pos), SLOTS - 1));
  const peakSoFar = Math.max(0, ...events.filter((e) => e.t <= pos).map((e) => countAt(ms, e.t)));

  // occupancy step line up to the sweep line
  const stepPath = (until: number) => {
    let d = `M${tx(0)} ${gy(0)}`;
    for (let t = 0; t < Math.ceil(until); t++) {
      const c = countAt(ms, t);
      d += ` V${gy(c)} H${tx(Math.min(t + 1, until))}`;
    }
    return d;
  };

  const update = (id: string, f: (x: Meeting) => Meeting) => setMs((list) => list.map((x) => (x.id === id ? f(x) : x)));
  const move = (d: number) => update(sel, (x) => (x.start + d < 0 || x.end + d > SLOTS ? x : { ...x, start: x.start + d, end: x.end + d }));
  const resize = (d: number) => update(sel, (x) => ({ ...x, end: Math.max(x.start + 1, Math.min(SLOTS, x.end + d)) }));
  const add = () => {
    const id = [..."ABCDEF"].find((c) => !ms.some((x) => x.id === c));
    if (!id) return;
    setMs((list) => [...list, { id, start: 8, end: 10 }]);
    setSel(id);
  };
  const remove = () => {
    const rest = ms.filter((x) => x.id !== sel);
    setMs(rest);
    setSel(rest[0]?.id ?? "A");
  };
  const shuffle = () => {
    setMs(randomMeetings(seed * 31 + 7));
    setSeed((s) => s + 1);
    setSel("A");
    reset({ pos: 0 });
    setRunning(true);
  };
  const nextEvent = () => {
    const from = touched || !reduce ? pos : 0;
    setTouched(true);
    reset({ pos: events.find((e) => e.t > from + 1e-9)?.t ?? SLOTS });
  };

  const svgX = (clientX: number) => {
    const r = svgRef.current!.getBoundingClientRect();
    return ((clientX - r.left) / r.width) * W;
  };
  const onDown = (e: React.PointerEvent, x: Meeting) => {
    const px = svgX(e.clientX);
    drag.current = { id: x.id, resize: px > tx(x.end) - Math.max(6, sw * 0.45), x0: px, start: x.start, end: x.end };
    svgRef.current?.setPointerCapture?.(e.pointerId);
    setSel(x.id);
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = Math.round((svgX(e.clientX) - d.x0) / sw);
    if (d.resize) update(d.id, (x) => ({ ...x, end: Math.max(d.start + 1, Math.min(SLOTS, d.end + dx)) }));
    else {
      const len = d.end - d.start;
      const start = Math.max(0, Math.min(SLOTS - len, d.start + dx));
      update(d.id, (x) => ({ ...x, start, end: start + len }));
    }
  };
  const onUp = () => {
    drag.current = null;
  };

  const said = useThrottled(describe(ms, pos), 700);
  const selM = ms.find((x) => x.id === sel);
  const label = `Day timeline 8:00 to 18:00. ${ms.map((x) => `${x.id} ${span(x.start, x.end)} in room ${room[x.id] + 1}`).join("; ") || "No meetings"}. Rooms needed: ${rooms}. Busy blocks: ${busy.map(([a, b]) => span(a, b)).join(", ") || "none"}.`;
  const hours = Array.from({ length: 11 }, (_, h) => h).filter((h) => !narrow || h % 2 === 0);

  return (
    <WidgetFrame title="Meeting scheduler" sub="Drag a meeting or its right edge. Run sweeps a line across the day.">
      <div className="controls" style={{ alignItems: "center" }}>
        <SimButtons
          running={running && !reduce && !done}
          reduce={reduce}
          onToggle={() => {
            if (done) reset({ pos: 0 });
            setRunning((r) => (done ? true : !r));
          }}
          onStep={nextEvent}
          stepLabel="Next event"
          stepHint="Jump the sweep line to the next start or end"
          onReset={() => {
            setTouched(true);
            reset({ pos: 0 });
            setRunning(false);
          }}
        />
        <button type="button" className="wbtn" onClick={add} disabled={ms.length >= 6}>
          <Plus size={14} aria-hidden /> Add
        </button>
        <button type="button" className="wbtn" onClick={shuffle}>
          <Dices size={14} aria-hidden /> Shuffle
        </button>
      </div>

      <div ref={ref}>
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="sim-svg" role="img" aria-label={label} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} style={{ maxWidth: narrow ? 520 : 680, margin: "0 auto", userSelect: "none" }}>
          {hours.map((h) => (
            <g key={h}>
              <line x1={tx(h * 2)} x2={tx(h * 2)} y1={16} y2={graphTop + GRAPH_H} stroke="var(--border)" strokeDasharray="2 4" />
              <text x={tx(h * 2)} y={12} textAnchor="middle" className="muted-text" style={{ fontSize: 10.5 }}>
                {8 + h}
              </text>
            </g>
          ))}
          {Array.from({ length: lanes }, (_, r) => (
            <text key={r} x={X0 - 5} y={laneY(r) + 17} textAnchor="end" className="muted-text" style={{ fontSize: 10.5 }}>
              {narrow ? `R${r + 1}` : `Room ${r + 1}`}
            </text>
          ))}

          {ms.map((x) => {
            const live = pos > x.start && pos < x.end && !done;
            const c = color(x.id);
            const w = (x.end - x.start) * sw;
            return (
              <m.g
                key={x.id}
                initial={false}
                animate={{ x: tx(x.start), y: laneY(room[x.id]) }}
                transition={{ x: { duration: reduce ? 0 : 0.12 }, y: { duration: reduce ? 0 : 0.35, ease: "easeOut" } }}
                onPointerDown={(e) => onDown(e, x)}
                style={{ cursor: "grab", touchAction: "none" }}
              >
                <m.rect y={2} height={LANE - 6} rx={6} fill={`color-mix(in srgb, ${c} ${live ? 38 : 22}%, var(--card))`} stroke={c} strokeWidth={x.id === sel ? 2.6 : live ? 2 : 1.3} initial={false} animate={{ width: w }} transition={{ duration: reduce ? 0 : 0.12 }} />
                <rect x={w - 5} y={8} width={2.5} height={LANE - 18} rx={1} fill={c} opacity={0.8} />
                <text x={6} y={18} style={{ fontSize: 12, fontWeight: 800 }}>
                  {x.id}
                </text>
                {w > 86 && (
                  <text x={18} y={18} className="muted-text" style={{ fontSize: 10.5 }}>
                    {span(x.start, x.end)}
                  </text>
                )}
              </m.g>
            );
          })}

          <text x={X0 - 5} y={busyY + 13} textAnchor="end" className="muted-text" style={{ fontSize: 10.5 }}>
            Busy
          </text>
          <rect x={X0} y={busyY} width={X1 - X0} height={18} rx={4} fill="var(--card-2)" stroke="var(--border)" />
          {busy.map(([a, b]) => {
            const shown = Math.max(0, Math.min(b, pos) - a);
            return (
              <g key={`${a}-${b}`}>
                <rect x={tx(a)} y={busyY} width={(b - a) * sw} height={18} rx={4} fill="none" stroke="var(--fg)" strokeDasharray="3 3" opacity={0.35} />
                <m.rect x={tx(a)} y={busyY} height={18} rx={4} fill="color-mix(in srgb, var(--fg) 26%, var(--card))" initial={false} animate={{ width: shown * sw }} transition={{ duration: reduce ? 0 : 0.06, ease: "linear" }} />
                {pos >= b && (b - a) * sw > 70 && (
                  <text x={tx(a) + 5} y={busyY + 13} style={{ fontSize: 10.5, fontWeight: 700 }}>
                    {span(a, b)}
                  </text>
                )}
              </g>
            );
          })}

          <text x={X0 - 5} y={graphTop + 10} textAnchor="end" className="muted-text" style={{ fontSize: 10.5 }}>
            {scaleMax}
          </text>
          <text x={X0 - 5} y={graphTop + GRAPH_H} textAnchor="end" className="muted-text" style={{ fontSize: 10.5 }}>
            0
          </text>
          <line x1={X0} x2={X1} y1={gy(0)} y2={gy(0)} stroke="var(--border-strong)" />
          {rooms > 0 && done && (
            <g>
              <line x1={X0} x2={X1} y1={gy(rooms)} y2={gy(rooms)} stroke="var(--accent-2)" strokeDasharray="4 3" />
              <text x={X1} y={gy(rooms) - 3} textAnchor="end" style={{ fontSize: 10.5, fontWeight: 750, fill: "var(--accent-2)" }}>
                peak {rooms} = rooms
              </text>
            </g>
          )}
          <path d={stepPath(pos)} fill="none" stroke="var(--accent)" strokeWidth={2.2} strokeLinejoin="round" />
          <text x={X0 + 2} y={graphTop + GRAPH_H + 13} className="muted-text" style={{ fontSize: 10 }}>
            meetings running
          </text>

          {!done && (
            <m.g initial={false} animate={{ x: tx(pos) }} transition={{ duration: reduce ? 0 : 0.06, ease: "linear" }}>
              <line y1={16} y2={graphTop + GRAPH_H} stroke="var(--accent)" strokeWidth={2} />
              <rect x={-14} y={gy(nowCount) - 18} width={28} height={15} rx={7} fill="var(--accent)" />
              <text y={gy(nowCount) - 7} textAnchor="middle" style={{ fontSize: 11, fontWeight: 800, fill: "var(--accent-ink)" }}>
                {nowCount}
              </text>
            </m.g>
          )}
        </svg>
      </div>

      <div role="group" aria-label="Counters" style={{ display: "flex", flexWrap: "wrap", gap: "2px 14px", fontSize: 13, lineHeight: 1.5, marginTop: 6 }}>
        <span>
          Rooms needed: <b>{done ? rooms : `${peakSoFar} so far`}</b>
        </span>
        <span>
          Busy blocks: <b>{busy.length}</b>
        </span>
        <span>
          Sweep: <b>{events.length}</b> events vs <b>{pairChecks(ms.length)}</b> pair checks
        </span>
      </div>
      <p className="readout" aria-live="polite">
        {said}
        <ReducedNote reduce={reduce} what="Reduced motion: Next event moves the sweep line." />
      </p>
      <More label="Move, resize or remove a meeting">
        <div className="controls">
          <Seg<string> label="Meeting" value={sel} onChange={setSel} options={ms.map((x) => ({ value: x.id, label: x.id }))} />
          <div role="group" aria-label={`Change meeting ${sel}`} style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            <button type="button" className="wbtn" onClick={() => move(-1)} aria-label={`Move ${sel} 30 minutes earlier`} disabled={!selM}>
              <ChevronLeft size={14} aria-hidden />
            </button>
            <button type="button" className="wbtn" onClick={() => move(1)} aria-label={`Move ${sel} 30 minutes later`} disabled={!selM}>
              <ChevronRight size={14} aria-hidden />
            </button>
            <button type="button" className="wbtn" onClick={() => resize(-1)} aria-label={`Make ${sel} 30 minutes shorter`} disabled={!selM}>
              <Minus size={14} aria-hidden />
            </button>
            <button type="button" className="wbtn" onClick={() => resize(1)} aria-label={`Make ${sel} 30 minutes longer`} disabled={!selM}>
              <Plus size={14} aria-hidden />
            </button>
            <button type="button" className="wbtn" onClick={remove} aria-label={`Remove ${sel}`} disabled={!selM}>
              <Trash2 size={14} aria-hidden />
            </button>
          </div>
        </div>
      </More>
    </WidgetFrame>
  );
}
