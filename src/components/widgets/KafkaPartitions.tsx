"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { Send } from "lucide-react";
import { hash32, mulberry32 } from "@/lib/rng";
import { useFixedStep } from "@/lib/sim-loop";
import { ReducedNote, SimButtons, useSimGate, useThrottled } from "./lib/sim-kit";
import { Slider, WidgetFrame } from "./WidgetFrame";

/**
 * Kafka's range assignor for one topic: consumer i gets a contiguous run of floor(P/C) partitions,
 * and the first P mod C consumers get one extra. Consumers beyond P get nothing (idle).
 */
export function rangeAssign(partitions: number, consumers: number): number[][] {
  const per = Math.floor(partitions / consumers);
  const extra = partitions % consumers;
  return Array.from({ length: consumers }, (_, i) => {
    const start = i * per + Math.min(i, extra);
    const len = per + (i < extra ? 1 : 0);
    return Array.from({ length: len }, (_, k) => start + k);
  });
}

/** Same key → same partition (hash of the key modulo the partition count). */
export const partitionForKey = (key: string, partitions: number) => hash32(key) % partitions;

export type ProduceMode = "keyed" | "round-robin";
export const KEYS = ["user-1", "user-2", "user-3", "user-4"];
export interface Message {
  id: number;
  key: string;
  seq: number;
  partition: number;
  offset: number;
}
export interface TopicState {
  t: number;
  nextAt: number;
  messages: Message[];
  rr: number;
  seqs: Record<string, number>;
  /** mulberry32 state, kept in the state so producing stays a pure function. */
  rng: number;
  nextId: number;
}
export const initTopic = (seed = 12): TopicState => ({ t: 0, nextAt: 400, messages: [], rr: 0, seqs: {}, rng: seed, nextId: 1 });

/** Append one message for a random user: keyed by hash, or spread round-robin. */
export function produce(s: TopicState, mode: ProduceMode, partitions: number): TopicState {
  const key = KEYS[Math.floor(mulberry32(s.rng)() * KEYS.length)];
  const partition = mode === "keyed" ? partitionForKey(key, partitions) : s.rr % partitions;
  const seq = (s.seqs[key] ?? 0) + 1;
  const offset = s.messages.filter((x) => x.partition === partition).length;
  return {
    ...s,
    rng: (s.rng + 0x6d2b79f5) | 0,
    rr: mode === "round-robin" ? s.rr + 1 : s.rr,
    seqs: { ...s.seqs, [key]: seq },
    messages: [...s.messages, { id: s.nextId, key, seq, partition, offset }].slice(-200),
    nextId: s.nextId + 1,
  };
}

/** For each key, the partitions its messages landed in (one partition = ordered for that key). */
export function keySpread(messages: Message[]) {
  const out: Record<string, number[]> = {};
  for (const msg of messages) out[msg.key] = [...new Set([...(out[msg.key] ?? []), msg.partition])].sort((a, b) => a - b);
  return out;
}

const PERIOD = 700;
export function topicStep(s: TopicState, dt: number, mode: ProduceMode, partitions: number): TopicState {
  let next = { ...s, t: s.t + dt };
  while (next.t >= next.nextAt) next = { ...produce(next, mode, partitions), nextAt: next.nextAt + PERIOD };
  return next;
}

// ---------------------------------------------------------------- picture
const COLORS = ["var(--k-client)", "var(--k-gateway)", "var(--k-database)", "var(--k-queue)"];
const short = (key: string) => `u${key.split("-")[1]}`;

/** Drawing geometry: producer on the left on the desktop pane; producer strip on top, fewer slots, bigger text (`k`) on a phone. */
interface Geo {
  w: number;
  top: number;
  logX: number;
  slotW: number;
  slots: number;
  conX: number;
  k: number;
  narrow: boolean;
}
const WIDE: Geo = { w: 600, top: 28, logX: 140, slotW: 36, slots: 7, conX: 470, k: 1, narrow: false };
const NARROW: Geo = { w: 340, top: 58, logX: 30, slotW: 40, slots: 4, conX: 222, k: 1.2, narrow: true };
const logR = (g: Geo) => g.logX + g.slots * g.slotW + 8;

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
.kp { container: kp / inline-size; }
.kp-sliders { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px 14px; margin: 4px 0 8px; }
.kp-sliders .control { min-width: 0; }
.kp-bar { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin: 0 0 6px; }
.kp-bar > div:last-child { flex-wrap: nowrap !important; }
.kp .legend { font-size: 12px; gap: 2px 12px; }
@container kp (max-width: 479px) {
  .kp-bar .wbtn { padding: 0 9px; }
  .kp-bar .seg button { padding: 5px 8px; }
}
`;

export function KafkaPartitions() {
  const [partitions, setPartitions] = useState(4);
  const [consumers, setConsumers] = useState(3);
  const [mode, setMode] = useState<ProduceMode>("keyed");
  const [running, setRunning] = useState(true);
  const { ref, inView, reduce } = useSimGate<HTMLDivElement>();
  const [boxRef, narrow] = useNarrow(480);
  const g = narrow ? NARROW : WIDE;
  const { w: W, logX: LOG_X, slotW: SLOT_W, slots: SLOTS, conX: CON_X, k } = g;
  const LOG_R = logR(g);

  const step = useCallback((s: TopicState, dt: number) => topicStep(s, dt, mode, partitions), [mode, partitions]);
  const live = running && inView && !reduce;
  const [s, reset] = useFixedStep(() => initTopic(), step, live);

  const assignment = rangeAssign(partitions, consumers);
  const ownerOf = (p: number) => assignment.findIndex((ps) => ps.includes(p));
  const idle = assignment.map((ps, i) => (ps.length ? -1 : i)).filter((i) => i >= 0);
  const spread = keySpread(s.messages);

  // Idle consumers share one row, so ten consumers on four partitions don't make the picture tall.
  const active = consumers - idle.length;
  const conRows = active + (idle.length ? 1 : 0);
  const rows = Math.max(partitions, conRows);
  const ROW = Math.max(26, Math.min(36, 216 / rows));
  const TOP = g.top;
  const H = TOP + rows * ROW + 10;
  const pY = (p: number) => TOP + ((rows - partitions) * ROW) / 2 + p * ROW + ROW / 2;
  const cY = (c: number) => TOP + ((rows - conRows) * ROW) / 2 + c * ROW + ROW / 2;
  const prodY = TOP + (rows * ROW) / 2;
  const prod = g.narrow ? { x: (8 + LOG_R) / 2, y: 46 } : { x: 100, y: prodY };
  const msgH = ROW - 12;

  const visible = Array.from({ length: partitions }, (_, p) => s.messages.filter((x) => x.partition === p).slice(-SLOTS));

  const fmtRange = (ps: number[]) => (ps.length === 1 ? `P${ps[0]}` : `P${ps[0]}–P${ps.at(-1)}`);
  const assignText = assignment
    .map((ps, i) => (ps.length ? `C${i + 1} reads ${fmtRange(ps)}` : null))
    .filter(Boolean)
    .join(", ");
  const scattered = Object.entries(spread).filter(([, ps]) => ps.length > 1);
  const orderText = !s.messages.length
    ? ""
    : mode === "keyed"
      ? `Keyed: each user's messages land in one partition (${Object.entries(spread)
          .map(([key, ps]) => `${short(key)} → P${ps[0]}`)
          .join(", ")}), so one consumer reads them in order.`
      : scattered.length
        ? `Round-robin: ${short(scattered[0][0])}'s messages are spread over ${scattered[0][1].length} partitions${new Set(scattered[0][1].map(ownerOf)).size > 1 ? ` read by ${new Set(scattered[0][1].map(ownerOf)).size} different consumers` : ""}, so they can be processed out of order.`
        : "Round-robin: messages rotate across partitions regardless of key.";
  const idleName = idle.length === 1 ? `C${idle[0] + 1}` : `C${idle[0] + 1}–C${idle.at(-1)! + 1}`;
  const said = useThrottled(`${partitions} partitions, ${consumers} consumers: ${assignText}.${idle.length ? ` ${idleName} ${idle.length === 1 ? "is" : "are"} idle: a partition is read by at most one consumer in a group.` : ""} ${orderText}`, 1200);

  return (
    <WidgetFrame title="Kafka partitions and consumers" sub="A consumer group splits partitions between its consumers; extra consumers sit idle. A key always maps to the same partition, which keeps that key's messages in order.">
      <style href="w-kafka" precedence="widgets">
        {CSS}
      </style>
      <div className="kp" ref={boxRef}>
        <div className="kp-sliders">
          <Slider
            label="Partitions"
            value={partitions}
            min={1}
            max={8}
            onChange={(v) => {
              setPartitions(v);
              reset({ ...initTopic(), rng: s.rng });
            }}
          />
          <Slider label="Consumers" value={consumers} min={1} max={10} onChange={setConsumers} />
        </div>
        <div className="kp-bar">
          <div className="seg" role="group" aria-label="Producer">
            {(
              [
                ["keyed", "Keyed (user id)"],
                ["round-robin", "Round-robin"],
              ] as const
            ).map(([v, l]) => (
              <button
                key={v}
                type="button"
                aria-pressed={mode === v}
                onClick={() => {
                  setMode(v);
                  reset({ ...initTopic(), rng: s.rng });
                }}
              >
                {l}
              </button>
            ))}
          </div>
          <button type="button" className="wbtn primary" onClick={() => reset(produce(s, mode, partitions))}>
            <Send size={14} aria-hidden /> Produce 1
          </button>
          <SimButtons running={live} reduce={reduce} onToggle={() => setRunning((r) => !r)} onStep={() => reset(produce(s, mode, partitions))} stepHint="Produce one message" onReset={() => reset(initTopic())} />
        </div>
        <div ref={ref}>
          <svg viewBox={`0 0 ${W} ${H}`} className="sim-svg" style={{ maxWidth: 640, margin: "0 auto" }} role="img" aria-label={`${partitions} partitions and ${consumers} consumers. ${assignText}.${idle.length ? ` ${idle.length} idle.` : ""}`}>
            <text x={LOG_X} y={14} className="muted-text" style={{ fontSize: 11.5 * k }}>
              partitions (newest →)
            </text>
            <text x={CON_X} y={14} className="muted-text" style={{ fontSize: 11.5 * k }}>
              {g.narrow ? "consumers" : "consumer group"}
            </text>
            {g.narrow ? (
              <>
                <rect x={8} y={22} width={LOG_R - 8} height={24} rx={8} fill="var(--card-2)" stroke="var(--k-service)" strokeWidth={1.5} />
                <text x={prod.x} y={39} textAnchor="middle" style={{ fontWeight: 650, fontSize: 11.5 * k }}>
                  Producer{" "}
                  <tspan className="muted-text" style={{ fontWeight: 400, fontSize: 10.5 * k }}>
                    · {mode === "keyed" ? "hash(key) % P" : "round-robin"}
                  </tspan>
                </text>
              </>
            ) : (
              <>
                <rect x={8} y={prodY - 22} width={92} height={44} rx={10} fill="var(--card-2)" stroke="var(--k-service)" strokeWidth={1.5} />
                <text x={54} y={prodY - 3} textAnchor="middle" style={{ fontWeight: 650 }}>
                  Producer
                </text>
                <text x={54} y={prodY + 13} textAnchor="middle" className="muted-text" style={{ fontSize: 10.5 }}>
                  {mode === "keyed" ? "hash(key) % P" : "round-robin"}
                </text>
              </>
            )}
            {Array.from({ length: partitions }, (_, p) => {
              const y = pY(p);
              const owner = ownerOf(p);
              return (
                <g key={p}>
                  {!g.narrow && <line x1={100} y1={prodY} x2={LOG_X - 22} y2={y} stroke="var(--border)" />}
                  <text x={LOG_X - 6} y={y + 4 * k} textAnchor="end" style={{ fontWeight: 700, fontSize: 11.5 * k }}>
                    P{p}
                  </text>
                  <rect x={LOG_X} y={y - (ROW - 8) / 2} width={LOG_R - LOG_X} height={ROW - 8} rx={6} fill="var(--card-2)" stroke="var(--border-strong)" />
                  {owner >= 0 && <line x1={LOG_R} y1={y} x2={CON_X} y2={cY(owner)} stroke="var(--series-3)" strokeWidth={1.5} opacity={0.7} />}
                </g>
              );
            })}
            <AnimatePresence initial={false}>
              {visible.flatMap((msgs, p) =>
                msgs.map((msg, i) => {
                  const x = LOG_X + 4 + (SLOTS - msgs.length + i) * SLOT_W;
                  const y = pY(p) - msgH / 2;
                  const ki = KEYS.indexOf(msg.key);
                  return (
                    <m.g
                      key={msg.id}
                      initial={reduce ? false : { x: prod.x, y: prod.y - msgH / 2, opacity: 0 }}
                      animate={{ x, y, opacity: 1 }}
                      exit={{ opacity: 0, transition: { duration: reduce ? 0 : 0.2 } }}
                      transition={{ duration: reduce ? 0 : 0.45, ease: "easeOut" }}
                    >
                      <rect width={SLOT_W - 4} height={msgH} rx={4} fill={COLORS[ki]} opacity={0.9} />
                      <text x={(SLOT_W - 4) / 2} y={msgH / 2 + 3.5 * k} textAnchor="middle" style={{ fontSize: (ROW >= 30 ? 10 : 9) * k, fontWeight: 700, fill: "var(--card)" }}>
                        {short(msg.key)}#{msg.seq}
                      </text>
                    </m.g>
                  );
                }),
              )}
            </AnimatePresence>
            {Array.from({ length: conRows }, (_, c) => {
              const y = cY(c);
              const isIdle = c >= active;
              const ps = isIdle ? [] : assignment[c];
              return (
                <g key={c} opacity={isIdle ? 0.5 : 1}>
                  <rect x={CON_X} y={y - (ROW - 6) / 2} width={W - CON_X - 6} height={ROW - 6} rx={8} fill="var(--card-2)" stroke={isIdle ? "var(--border)" : "var(--k-service)"} strokeWidth={1.5} strokeDasharray={isIdle ? "4 3" : undefined} />
                  <text x={CON_X + 8} y={y + 4 * k} style={{ fontWeight: 650, fontSize: 11.5 * k }}>
                    {isIdle ? idleName : `C${c + 1}`}
                  </text>
                  <text x={W - 12} y={y + 4 * k} textAnchor="end" className="muted-text" style={{ fontWeight: isIdle ? 700 : 400, fontSize: 11.5 * k }}>
                    {isIdle ? "idle" : fmtRange(ps)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        <ul className="legend" aria-label="Message keys">
          {KEYS.map((key, i) => (
            <li key={key}>
              <span className="line-key" style={{ background: COLORS[i], height: 10, width: 10 }} aria-hidden />
              {key} ({short(key)}){spread[key] ? `: ${spread[key].map((p) => `P${p}`).join(", ")}` : ""}
            </li>
          ))}
        </ul>
        <p className="readout" aria-live="polite">
          {said}
          <ReducedNote reduce={reduce} what="Paused (reduced motion): Step produces one message." />
        </p>
      </div>
    </WidgetFrame>
  );
}
