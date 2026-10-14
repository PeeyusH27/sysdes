"use client";
import { useCallback, useMemo, useState } from "react";
import { m } from "motion/react";
import { MousePointerClick } from "lucide-react";
import { mulberry32 } from "@/lib/rng";
import { useFixedStep } from "@/lib/sim-loop";
import { useBoxWidth } from "@/lib/hooks";
import { ReducedNote, SimButtons, useSimGate, useThrottled } from "./lib/sim-kit";
import { More, Seg, Slider, WidgetFrame } from "./WidgetFrame";

export type Who = "Alice" | "Bob";
export type Mode = "conditional" | "naive";
export interface Msg {
  who: Who;
  out: boolean; // client → database
  start: number;
  end: number;
  label: string;
}
export interface LogLine {
  at: number;
  who: Who;
  sql: string;
  result: string;
  tone: "ok" | "bad" | "wait" | "info";
}
export interface RaceOutcome {
  log: LogLine[];
  msgs: Msg[];
  /** Times at which an UPDATE changed the row, and for whom. */
  writes: { at: number; who: Who }[];
  told: Record<Who, { at: number; booked: boolean }>;
  winner: Who | null;
  doubleBooked: boolean;
  end: number;
}

/** Time the database spends running and committing one statement (holding the row lock), ms. */
export const EXEC_MS = 8;
const SEAT = "A5";
const conditionalSql = (who: Who) => `UPDATE seats SET status = 'held', holder = '${who.toLowerCase()}' WHERE id = '${SEAT}' AND status = 'available';`;
const selectSql = `SELECT status FROM seats WHERE id = '${SEAT}';`;
const blindSql = (who: Who) => `UPDATE seats SET status = 'held', holder = '${who.toLowerCase()}' WHERE id = '${SEAT}';`;

/**
 * Pure race between two clients clicking the same seat at t = 0. `delay` is each client's one-way
 * network delay to the database (ms). The database runs statements one at a time per row.
 */
export function seatRace(mode: Mode, delay: Record<Who, number>): RaceOutcome {
  const who: Who[] = ["Alice", "Bob"];
  const log: LogLine[] = [];
  const msgs: Msg[] = [];
  const writes: { at: number; who: Who }[] = [];
  const told = {} as RaceOutcome["told"];

  if (mode === "conditional") {
    const [first, second] = [...who].sort((a, b) => delay[a] - delay[b] || (a === "Alice" ? -1 : 1));
    const done1 = delay[first] + EXEC_MS;
    const start2 = Math.max(delay[second], done1);
    const done2 = start2 + EXEC_MS;
    log.push({ at: delay[first], who: first, sql: conditionalSql(first), result: "rowCount 1: seat held", tone: "ok" });
    if (delay[second] < done1) log.push({ at: delay[second], who: second, sql: conditionalSql(second), result: `waits for the row lock (${first}'s statement holds it)`, tone: "wait" });
    log.push({ at: start2, who: second, sql: conditionalSql(second), result: "rowCount 0: status is no longer 'available'", tone: "bad" });
    writes.push({ at: done1, who: first });
    told[first] = { at: done1 + delay[first], booked: true };
    told[second] = { at: done2 + delay[second], booked: false };
    for (const w of who) msgs.push({ who: w, out: true, start: 0, end: delay[w], label: "UPDATE" });
    msgs.push({ who: first, out: false, start: done1, end: told[first].at, label: "1 row" });
    msgs.push({ who: second, out: false, start: done2, end: told[second].at, label: "0 rows" });
  } else {
    // SELECT, then (if it looked free) an unconditional UPDATE: the check and the write are separate.
    const updateAt = (w: Who) => 3 * delay[w];
    // A SELECT sees 'held' only if the other client's UPDATE had already committed when it ran.
    const selectSeesFree = (w: Who) => {
      const other: Who = w === "Alice" ? "Bob" : "Alice";
      return updateAt(other) + EXEC_MS > delay[w];
    };
    for (const w of who) {
      const free = selectSeesFree(w);
      log.push({ at: delay[w], who: w, sql: selectSql, result: free ? "'available'" : "'held'", tone: free ? "info" : "bad" });
      msgs.push({ who: w, out: true, start: 0, end: delay[w], label: "SELECT" });
      msgs.push({ who: w, out: false, start: delay[w], end: 2 * delay[w], label: free ? "free" : "held" });
      if (free) {
        log.push({ at: updateAt(w), who: w, sql: blindSql(w), result: "rowCount 1: booked", tone: "ok" });
        writes.push({ at: updateAt(w) + EXEC_MS, who: w });
        msgs.push({ who: w, out: true, start: 2 * delay[w], end: updateAt(w), label: "UPDATE" });
        msgs.push({ who: w, out: false, start: updateAt(w) + EXEC_MS, end: updateAt(w) + EXEC_MS + delay[w], label: "1 row" });
        told[w] = { at: updateAt(w) + EXEC_MS + delay[w], booked: true };
      } else {
        told[w] = { at: 2 * delay[w], booked: false };
      }
    }
  }
  log.sort((a, b) => a.at - b.at);
  writes.sort((a, b) => a.at - b.at);
  const booked = who.filter((w) => told[w].booked);
  return {
    log,
    msgs,
    writes,
    told,
    winner: booked.length === 1 ? booked[0] : null,
    doubleBooked: booked.length > 1,
    end: Math.max(...who.map((w) => told[w].at)) + 20,
  };
}

/** Who holds the seat at time t (last committed write wins). */
export const holderAt = (o: RaceOutcome | null, t: number): Who | null => (o ? (o.writes.filter((w) => w.at <= t).at(-1)?.who ?? null) : null);

// ---------------------------------------------------------------- picture
const SLOW = 8; // real ms per simulated ms
const ROWS = ["A", "B", "C"];
const TAKEN = new Set(["A2", "A3", "B5", "B6", "C1", "C8", "C4"]);

/**
 * Two drawings of the same scene: landscape (clients on the left, the database with its seat map on the right) for
 * the desktop pane, and a stacked one (clients on top, database below) for a phone.
 */
interface Layout {
  W: number;
  H: number;
  client: Record<Who, { x: number; y: number; w: number; h: number }>;
  /** Where a client's wire leaves its box, and where every wire meets the database. */
  port: Record<Who, { x: number; y: number }>;
  dbPort: { x: number; y: number };
  db: { x: number; y: number; w: number; h: number };
  seats: { x: number; y: number; size: number; gap: number };
  /** Lines of text inside the database box. */
  dbText: { title: number; status: number; sub: number };
  clock: { x: number; y: number };
}
const WIDE: Layout = {
  W: 600,
  H: 178,
  client: { Alice: { x: 8, y: 8, w: 168, h: 52 }, Bob: { x: 8, y: 112, w: 168, h: 52 } },
  port: { Alice: { x: 176, y: 34 }, Bob: { x: 176, y: 138 } },
  dbPort: { x: 384, y: 86 },
  db: { x: 384, y: 6, w: 208, h: 160 },
  seats: { x: 412, y: 38, size: 17, gap: 3 },
  dbText: { title: 27, status: 122, sub: 142 },
  clock: { x: 280, y: 172 },
};
const TALL: Layout = {
  W: 320,
  H: 252,
  client: { Alice: { x: 4, y: 6, w: 150, h: 52 }, Bob: { x: 166, y: 6, w: 150, h: 52 } },
  port: { Alice: { x: 79, y: 58 }, Bob: { x: 241, y: 58 } },
  dbPort: { x: 160, y: 124 },
  db: { x: 44, y: 124, w: 232, h: 124 },
  seats: { x: 78, y: 152, size: 17, gap: 3 },
  dbText: { title: 143, status: 225, sub: 241 },
  clock: { x: 160, y: 100 },
};

function SeatMap({ L, holder }: { L: Layout; holder: Who | null }) {
  const { x: x0, y: y0, size, gap } = L.seats;
  return (
    <g>
      {ROWS.map((r, ri) => (
        <g key={r}>
          <text x={x0 - 8} y={y0 + ri * (size + gap) + size - 4} textAnchor="middle" className="muted-text" style={{ fontSize: 10.5, fontWeight: 650 }}>
            {r}
          </text>
          {Array.from({ length: 8 }, (_, ci) => {
            const id = `${r}${ci + 1}`;
            const x = x0 + ci * (size + gap);
            const y = y0 + ri * (size + gap);
            const taken = TAKEN.has(id);
            const target = id === SEAT;
            return (
              <g key={id}>
                <rect x={x} y={y} width={size} height={size} rx={4} fill={target && holder ? "var(--series-1)" : taken ? "var(--border)" : "var(--card)"} stroke={target ? "var(--accent-2)" : "var(--border-strong)"} strokeWidth={target ? 2.2 : 1} />
                <text x={x + size / 2} y={y + size - 5} textAnchor="middle" style={{ fontSize: 9.5, fontWeight: target ? 750 : 500, fill: target && holder ? "var(--accent-ink)" : taken ? "var(--muted)" : "var(--fg)" }}>
                  {target && holder ? holder[0] : taken ? "✕" : ci + 1}
                </text>
              </g>
            );
          })}
        </g>
      ))}
    </g>
  );
}

function Packet({ L, msg, t, reduce }: { L: Layout; msg: Msg; t: number; reduce: boolean }) {
  if (reduce || t < msg.start || t >= msg.end) return null;
  const p = (t - msg.start) / Math.max(1, msg.end - msg.start);
  const a = msg.out ? L.port[msg.who] : L.dbPort;
  const b = msg.out ? L.dbPort : L.port[msg.who];
  const cx = a.x + (b.x - a.x) * p;
  const cy = a.y + (b.y - a.y) * p;
  const color = msg.who === "Alice" ? "var(--series-1)" : "var(--series-3)";
  return (
    <m.g initial={false} animate={{ x: cx, y: cy }} transition={{ duration: 0.06, ease: "linear" }}>
      <circle r={7} fill={color} stroke="var(--card)" strokeWidth={2} />
      <text y={-11} textAnchor="middle" style={{ fontSize: 10.5, fontWeight: 700 }}>
        {msg.label}
      </text>
    </m.g>
  );
}

interface Play {
  t: number;
}

export function SeatRace() {
  const [mode, setMode] = useState<Mode>("conditional");
  const [aliceMs, setAliceMs] = useState(40);
  const [bobMs, setBobMs] = useState(60);
  const [outcome, setOutcome] = useState<RaceOutcome | null>(null);
  const [playing, setPlaying] = useState(false);
  const rand = useMemo(() => mulberry32(5), []);
  const { ref, inView, reduce } = useSimGate<HTMLDivElement>();
  const width = useBoxWidth(ref);
  const L = width && width < 520 ? TALL : WIDE;

  const end = outcome?.end ?? 0;
  const step = useCallback((s: Play, dt: number): Play => (s.t >= end ? s : { t: Math.min(end, s.t + dt / SLOW) }), [end]);
  const [play, reset] = useFixedStep<Play>({ t: 0 }, step, playing && inView && !reduce);
  const t = outcome ? play.t : 0;

  const newRace = () => {
    // A sub-millisecond jitter breaks exact ties the way real networks do.
    const o = seatRace(mode, { Alice: aliceMs + +(rand() * 0.9).toFixed(1), Bob: bobMs + +(rand() * 0.9).toFixed(1) });
    setOutcome(o);
    return o;
  };
  const race = () => {
    const o = newRace();
    reset({ t: reduce ? o.end : 0 });
    setPlaying(!reduce);
  };
  const times = outcome ? [...new Set([...outcome.log.map((l) => l.at), ...outcome.msgs.map((x) => x.end), outcome.end])].sort((a, b) => a - b) : [];
  const nextT = times.find((x) => x > t + 1e-9) ?? end;

  const holder = holderAt(outcome, t);
  const visible = outcome ? outcome.log.filter((l) => l.at <= t) : [];
  const finished = !!outcome && t >= end;
  const status = (w: Who) => {
    if (!outcome) return "idle";
    const told = outcome.told[w];
    if (t < told.at) return "waiting…";
    return told.booked ? (outcome.doubleBooked ? "✓ Booked (but so is the other!)" : "✓ Seat held") : "✕ Seat taken";
  };
  const statusInk = (w: Who) => (!outcome || t < outcome.told[w].at ? "var(--muted)" : outcome.told[w].booked && !outcome.doubleBooked ? "var(--good-ink)" : outcome.told[w].booked ? "var(--warning-ink)" : "var(--critical-ink)");

  let sentence = `Press the button: Alice (${aliceMs} ms away) and Bob (${bobMs} ms away) both try to book ${SEAT} at the same instant.`;
  if (outcome && finished) {
    if (outcome.doubleBooked) {
      const last = outcome.writes.at(-1)!.who;
      sentence = `Double booking: both SELECTs saw 'available' before either UPDATE ran, so both UPDATEs matched 1 row. Both users were told they have ${SEAT}; the database says ${last} (the last write overwrote the first).`;
    } else if (outcome.winner) {
      const loser: Who = outcome.winner === "Alice" ? "Bob" : "Alice";
      sentence =
        mode === "conditional"
          ? `${outcome.winner}'s UPDATE reached the database first and matched 1 row. ${loser}'s identical UPDATE ran next, matched 0 rows because status was no longer 'available', and got "Seat taken". Exactly one winner, whatever the timing.`
          : `${loser}'s SELECT ran after ${outcome.winner}'s UPDATE had committed, so it saw 'held'. The gap between check and write was wide enough this time; shrink the difference in delays and both will book.`;
    }
  } else if (outcome) {
    const last = visible.at(-1);
    sentence = `Racing… t = ${t.toFixed(0)} ms.${last ? ` ${last.who}: ${last.result}.` : ""}`;
  }
  const said = useThrottled(sentence, 600);

  return (
    <WidgetFrame title="Seat race" sub={`Both click ${SEAT} at once. Which query lets only one of them win?`}>
      <div className="controls">
        <Seg<Mode>
          label="Booking query"
          value={mode}
          onChange={(v) => {
            setMode(v);
            setOutcome(null);
            setPlaying(false);
          }}
          options={[
            { value: "conditional", label: "Conditional UPDATE" },
            { value: "naive", label: "SELECT, then UPDATE" },
          ]}
        />
      </div>
      <div className="controls" style={{ marginTop: 0 }}>
        <button type="button" className="wbtn primary" onClick={race}>
          <MousePointerClick size={14} aria-hidden /> Alice and Bob click {SEAT}
        </button>
        <SimButtons
          running={playing && !finished && !reduce}
          reduce={reduce}
          onToggle={
            !outcome
              ? undefined
              : finished
                ? () => {
                    reset({ t: 0 });
                    setPlaying(true);
                  }
                : () => setPlaying((p) => !p)
          }
          onStep={() => {
            if (!outcome) {
              // Step before any race: start one, paused at its first event.
              const o = newRace();
              setPlaying(false);
              reset({ t: Math.min(...o.log.map((l) => l.at)) });
            } else reset({ t: finished ? 0 : nextT });
          }}
          stepHint={!outcome ? "Start a race, paused at the first event" : finished ? "Replay from the start" : "Jump to the next event"}
          onReset={() => {
            setOutcome(null);
            setPlaying(false);
            reset({ t: 0 });
          }}
        />
      </div>
      <div ref={ref}>
        <svg viewBox={`0 0 ${L.W} ${L.H}`} className="sim-svg" style={{ maxWidth: L === WIDE ? 640 : 400, margin: "0 auto" }} role="img" aria-label={`Alice: ${status("Alice")}. Bob: ${status("Bob")}. Seat ${SEAT}: ${holder ? `held by ${holder}` : "available"}.`}>
          {(["Alice", "Bob"] as Who[]).map((w) => {
            const c = L.client[w];
            return (
              <g key={w}>
                <line x1={L.port[w].x} y1={L.port[w].y} x2={L.dbPort.x} y2={L.dbPort.y} stroke="var(--border-strong)" strokeWidth={1.5} />
                <rect x={c.x} y={c.y} width={c.w} height={c.h} rx={10} fill="var(--card-2)" stroke={w === "Alice" ? "var(--series-1)" : "var(--series-3)"} strokeWidth={1.8} />
                <text x={c.x + c.w / 2} y={c.y + 21} textAnchor="middle" style={{ fontWeight: 700, fontSize: 13 }}>
                  {w} · {w === "Alice" ? aliceMs : bobMs} ms
                </text>
                <text x={c.x + c.w / 2} y={c.y + 39} textAnchor="middle" style={{ fontSize: 11.5, fontWeight: 650, fill: statusInk(w) }}>
                  {status(w).replace(" (but so is the other!)", "")}
                </text>
              </g>
            );
          })}
          <rect x={L.db.x} y={L.db.y} width={L.db.w} height={L.db.h} rx={12} fill="var(--card-2)" stroke="var(--k-database)" strokeWidth={1.8} />
          <text x={L.db.x + L.db.w / 2} y={L.dbText.title} textAnchor="middle" style={{ fontWeight: 700, fontSize: 13 }}>
            Database
          </text>
          <SeatMap L={L} holder={holder} />
          <text x={L.db.x + L.db.w / 2} y={L.dbText.status} textAnchor="middle" style={{ fontWeight: 650 }}>
            seat {SEAT}: {holder ? `held (${holder.toLowerCase()})` : "available"}
          </text>
          <text x={L.db.x + L.db.w / 2} y={L.dbText.sub} textAnchor="middle" className="muted-text" style={{ fontSize: 10.5 }}>
            {mode === "conditional" ? "one statement at a time per row" : "check and write are separate"}
          </text>
          {outcome?.msgs.map((msg, i) => (
            <Packet key={i} L={L} msg={msg} t={t} reduce={reduce} />
          ))}
          {outcome && (
            <text x={L.clock.x} y={L.clock.y} textAnchor="middle" className="muted-text">
              t = {t.toFixed(0)} ms (slowed {SLOW}×)
            </text>
          )}
        </svg>
      </div>
      <p className="readout" aria-live="polite">
        {outcome && finished && (
          <span className={`pill ${outcome.doubleBooked ? "bad-ink" : "ok-ink"}`} style={{ marginRight: 6 }}>
            {outcome.doubleBooked ? "✕ double-booked" : "✓ one winner"}
          </span>
        )}
        {said}
        <ReducedNote reduce={reduce} what="No packets (reduced motion): the SQL log shows every statement; Step replays it event by event." />
      </p>
      <More label="Network delays">
        <div className="controls">
          <Slider label="Alice's network delay" value={aliceMs} min={10} max={200} step={5} onChange={setAliceMs} format={(v) => `${v} ms`} />
          <Slider label="Bob's network delay" value={bobMs} min={10} max={200} step={5} onChange={setBobMs} format={(v) => `${v} ms`} />
        </div>
      </More>
      <More label={`SQL log${visible.length ? ` (${visible.length})` : ""}`}>
        {visible.length === 0 && <p className="muted" style={{ fontSize: 13, margin: 0 }}>No statements yet.</p>}
        <ol aria-label="SQL statements in the order the database ran them" style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6, fontSize: 13, lineHeight: 1.45 }}>
          {visible.map((l, i) => (
            <li key={i}>
              <span className="muted" style={{ fontVariantNumeric: "tabular-nums" }}>{l.at.toFixed(1)} ms</span> <b>{l.who}</b>:{" "}
              <span className={l.tone === "ok" ? "ok-ink" : l.tone === "bad" ? "bad-ink" : l.tone === "wait" ? "warn-ink" : undefined}>
                {l.tone === "ok" ? "✓ " : l.tone === "bad" ? "✕ " : l.tone === "wait" ? "⏳ " : ""}
                {l.result}
              </span>
              <br />
              <code style={{ fontSize: 12, overflowWrap: "anywhere" }}>{l.sql}</code>
            </li>
          ))}
        </ol>
      </More>
    </WidgetFrame>
  );
}
