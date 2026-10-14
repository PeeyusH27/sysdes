"use client";
import { useState } from "react";
import { Check, CheckCheck, CircleAlert, CircleCheck, Clock, Info, Send, Server, TriangleAlert, Wifi, WifiOff, X } from "lucide-react";
import { useFixedStep } from "@/lib/sim-loop";
import { useBoxWidth } from "@/lib/hooks";
import { draw } from "./lib/draw-rng";
import { ReducedNote, SimButtons, useSimGate, useThrottled } from "./lib/sim-kit";
import { More, Slider, WidgetFrame } from "./WidgetFrame";

/* ------------------------------------------------------------------ pure model */

export type Who = "alice" | "bob";
export type Tick = "sending" | "sent" | "delivered" | "read";
type NodeId = Who | "server";
const RANK: Record<Tick, number> = { sending: 0, sent: 1, delivered: 2, read: 3 };
const NAME: Record<NodeId, string> = { alice: "Alice", bob: "Bob", server: "Server" };
const other = (w: Who): Who => (w === "alice" ? "bob" : "alice");

/** How long the recipient takes to read a delivered message (the chat is open on their screen). */
export const READ_DELAY_MS = 1_200;
/** Resend when no ack arrives within a worst-case round trip plus a margin. */
export const retryTimeout = (latency: number) => Math.round(2.6 * latency + 500);

export interface OutMsg {
  clientId: string;
  text: string;
  status: Tick;
  seq: number | null;
  attempts: number;
  retryAt: number | null;
  createdAt: number;
}
export interface InMsg {
  seq: number;
  clientId: string;
  text: string;
  readDue: number;
  readAt: number | null;
}
export interface ServerMsg {
  seq: number;
  clientId: string;
  from: Who;
  to: Who;
  text: string;
  delivered: boolean;
  read: boolean;
}
export type PacketKind = "send" | "ack" | "deliver" | "receipt";
export interface Packet {
  id: number;
  kind: PacketKind;
  from: NodeId;
  to: NodeId;
  clientId: string;
  seq: number | null;
  text: string;
  receipt?: "delivered" | "read";
  sentAt: number;
  arriveAt: number;
  drop: boolean;
}
export interface ChatEvent {
  n: number;
  at: number;
  text: string;
  tone: "info" | "ok" | "warn" | "bad";
}
export interface ChatState {
  t: number;
  seed: number;
  nextPacket: number;
  nextClient: number;
  eventCount: number;
  net: { latency: number; drop: number };
  online: Record<Who, boolean>;
  out: Record<Who, OutMsg[]>;
  inbox: Record<Who, InMsg[]>;
  server: { seq: number; msgs: ServerMsg[] };
  packets: Packet[];
  events: ChatEvent[];
  stats: { duplicates: number; retries: number; lost: number };
}

export type ChatAction =
  | { type: "send"; from: Who; text: string }
  | { type: "tick"; dt: number }
  | { type: "next" }
  | { type: "online"; who: Who; online: boolean }
  | { type: "net"; latency?: number; drop?: number };

export const initChat = (seed = 7, net = { latency: 400, drop: 0.2 }): ChatState => ({
  t: 0,
  seed,
  nextPacket: 1,
  nextClient: 1,
  eventCount: 0,
  net,
  online: { alice: true, bob: true },
  out: { alice: [], bob: [] },
  inbox: { alice: [], bob: [] },
  server: { seq: 0, msgs: [] },
  packets: [],
  events: [],
  stats: { duplicates: 0, retries: 0, lost: 0 },
});

const clone = (s: ChatState): ChatState => ({
  ...s,
  net: { ...s.net },
  online: { ...s.online },
  out: { alice: s.out.alice.map((m) => ({ ...m })), bob: s.out.bob.map((m) => ({ ...m })) },
  inbox: { alice: s.inbox.alice.map((m) => ({ ...m })), bob: s.inbox.bob.map((m) => ({ ...m })) },
  server: { seq: s.server.seq, msgs: s.server.msgs.map((m) => ({ ...m })) },
  packets: s.packets.map((p) => ({ ...p })),
  events: [...s.events],
  stats: { ...s.stats },
});

function log(d: ChatState, text: string, tone: ChatEvent["tone"] = "info") {
  d.eventCount++;
  d.events = [{ n: d.eventCount, at: d.t, text, tone }, ...d.events].slice(0, 6);
}

function rand(d: ChatState) {
  const [v, next] = draw(d.seed);
  d.seed = next;
  return v;
}

/** Put a packet on the wire with ±30% latency jitter. Only sends and acks can be dropped. */
function emit(d: ChatState, p: Omit<Packet, "id" | "sentAt" | "arriveAt" | "drop">) {
  const latency = d.net.latency * (0.7 + 0.6 * rand(d));
  const droppable = p.kind === "send" || p.kind === "ack";
  const drop = droppable && rand(d) < d.net.drop;
  d.packets.push({ ...p, id: d.nextPacket++, sentAt: d.t, arriveAt: d.t + Math.max(1, Math.round(latency)), drop });
}

const pendingReads = (d: ChatState, who: Who) => d.inbox[who].filter((m) => m.readAt === null);

/** The earliest moment something happens (a packet lands, a retry fires, a message gets read), or null when idle. */
export function nextEventAt(s: ChatState): number | null {
  let best = Infinity;
  for (const p of s.packets) best = Math.min(best, p.arriveAt);
  for (const who of ["alice", "bob"] as Who[]) {
    for (const m of s.out[who]) if (m.status === "sending" && m.retryAt !== null) best = Math.min(best, m.retryAt);
    if (s.online[who]) for (const m of pendingReads(s, who)) best = Math.min(best, m.readDue);
  }
  return best === Infinity ? null : best;
}

function land(d: ChatState, p: Packet) {
  const label = p.kind === "send" ? `Message ${p.clientId}` : p.kind === "ack" ? `Ack for ${p.clientId}` : p.kind;
  if (p.drop) {
    d.stats.lost++;
    log(d, `${label} was lost on the way to ${NAME[p.to]}.`, "bad");
    return;
  }
  if (p.kind === "send") {
    const sender = p.from as Who;
    const existing = d.server.msgs.find((m) => m.clientId === p.clientId);
    if (existing) {
      d.stats.duplicates++;
      log(d, `Duplicate ${p.clientId} ignored: already stored as #${existing.seq}. The server just acks again.`, "warn");
      emit(d, { kind: "ack", from: "server", to: sender, clientId: p.clientId, seq: existing.seq, text: "" });
      return;
    }
    const to = other(sender);
    const seq = ++d.server.seq;
    d.server.msgs.push({ seq, clientId: p.clientId, from: sender, to, text: p.text, delivered: false, read: false });
    log(d, `Server stored ${p.clientId} as #${seq} and acks ${NAME[sender]}.`, "ok");
    emit(d, { kind: "ack", from: "server", to: sender, clientId: p.clientId, seq, text: "" });
    if (d.online[to]) emit(d, { kind: "deliver", from: "server", to, clientId: p.clientId, seq, text: p.text });
    else log(d, `${NAME[to]} is offline: #${seq} waits on the server (a push notification goes out).`, "info");
    return;
  }
  if (p.kind === "ack") {
    const m = d.out[p.to as Who].find((x) => x.clientId === p.clientId);
    if (!m) return;
    if (m.status === "sending") {
      m.status = "sent";
      m.seq = p.seq;
      m.retryAt = null;
      log(d, `${NAME[p.to]} got the ack: ${p.clientId} is #${p.seq}, shown as sent.`, "ok");
    } else log(d, `${NAME[p.to]} ignored a repeated ack for ${p.clientId}.`, "info");
    return;
  }
  if (p.kind === "deliver") {
    const who = p.to as Who;
    if (!d.online[who]) {
      log(d, `${NAME[who]} went offline before #${p.seq} arrived; the server resends it on reconnect.`, "warn");
      return;
    }
    if (d.inbox[who].some((m) => m.seq === p.seq)) {
      log(d, `${NAME[who]} already has #${p.seq}; the copy is dropped.`, "info");
      return;
    }
    d.inbox[who].push({ seq: p.seq!, clientId: p.clientId, text: p.text, readDue: d.t + READ_DELAY_MS, readAt: null });
    d.inbox[who].sort((a, b) => a.seq - b.seq); // order by the server's sequence, not arrival time
    emit(d, { kind: "receipt", receipt: "delivered", from: who, to: "server", clientId: p.clientId, seq: p.seq, text: "" });
    return;
  }
  // receipts: phone → server → original sender
  if (p.to === "server") {
    const sm = d.server.msgs.find((m) => m.seq === p.seq);
    if (!sm) return;
    if (p.receipt === "delivered") sm.delivered = true;
    if (p.receipt === "read") sm.delivered = sm.read = true;
    emit(d, { kind: "receipt", receipt: p.receipt, from: "server", to: sm.from, clientId: sm.clientId, seq: sm.seq, text: "" });
    return;
  }
  const m = d.out[p.to as Who].find((x) => x.clientId === p.clientId);
  const status: Tick = p.receipt === "read" ? "read" : "delivered";
  if (m && RANK[status] > RANK[m.status]) {
    m.status = status;
    m.seq ??= p.seq;
    m.retryAt = null;
    log(d, `${NAME[p.to]} sees #${p.seq} ${status}.`, "ok");
  }
}

function processAt(d: ChatState, now: number) {
  d.t = now;
  const due = d.packets.filter((p) => p.arriveAt <= now).sort((a, b) => a.arriveAt - b.arriveAt || a.id - b.id);
  d.packets = d.packets.filter((p) => p.arriveAt > now);
  for (const p of due) land(d, p);
  for (const who of ["alice", "bob"] as Who[]) {
    for (const m of d.out[who]) {
      if (m.status !== "sending" || m.retryAt === null || m.retryAt > now) continue;
      m.retryAt = now + retryTimeout(d.net.latency);
      if (!d.online[who]) continue; // keep the message queued on the phone until it reconnects
      m.attempts++;
      d.stats.retries++;
      log(d, `No ack for ${m.clientId} yet: ${NAME[who]} retries (attempt ${m.attempts}) with the same clientId.`, "warn");
      emit(d, { kind: "send", from: who, to: "server", clientId: m.clientId, seq: null, text: m.text });
    }
    if (!d.online[who]) continue;
    for (const m of d.inbox[who]) {
      if (m.readAt !== null || m.readDue > now) continue;
      m.readAt = now;
      emit(d, { kind: "receipt", receipt: "read", from: who, to: "server", clientId: m.clientId, seq: m.seq, text: "" });
    }
  }
}

function advanceTo(s: ChatState, target: number): ChatState {
  let next = nextEventAt(s);
  if (next === null || next > target) return { ...s, t: target };
  const d = clone(s);
  for (let guard = 0; next !== null && next <= target && guard < 1000; guard++) {
    processAt(d, Math.max(d.t, next));
    next = nextEventAt(d);
  }
  d.t = target;
  return d;
}

/** Pure reducer: every random choice comes from `state.seed`, so a run replays exactly. */
export function chatReducer(s: ChatState, a: ChatAction): ChatState {
  switch (a.type) {
    case "tick":
      return advanceTo(s, s.t + a.dt);
    case "next": {
      const at = nextEventAt(s);
      return at === null ? s : advanceTo(s, Math.max(s.t, at));
    }
    case "net":
      return { ...s, net: { latency: a.latency ?? s.net.latency, drop: a.drop ?? s.net.drop } };
    case "send": {
      const text = a.text.trim();
      if (!text) return s;
      const d = clone(s);
      const clientId = `${a.from[0]}${d.nextClient++}`;
      d.out[a.from].push({ clientId, text, status: "sending", seq: null, attempts: 1, retryAt: d.t + retryTimeout(d.net.latency), createdAt: d.t });
      if (d.online[a.from]) {
        log(d, `${NAME[a.from]} sends “${text}” with clientId ${clientId}.`);
        emit(d, { kind: "send", from: a.from, to: "server", clientId, seq: null, text });
      } else log(d, `${NAME[a.from]} is offline: “${text}” waits on the phone.`);
      return d;
    }
    case "online": {
      if (s.online[a.who] === a.online) return s;
      const d = clone(s);
      d.online[a.who] = a.online;
      if (!a.online) {
        log(d, `${NAME[a.who]} went offline.`, "warn");
        return d;
      }
      const waiting = d.server.msgs.filter((m) => m.to === a.who && !m.delivered);
      log(d, `${NAME[a.who]} is back online: the server syncs ${waiting.length} waiting message${waiting.length === 1 ? "" : "s"}.`, "ok");
      for (const m of waiting) emit(d, { kind: "deliver", from: "server", to: a.who, clientId: m.clientId, seq: m.seq, text: m.text });
      for (const m of d.out[a.who]) if (m.status === "sending") m.retryAt = d.t; // flush the phone's outbox now
      return d;
    }
  }
}

/** One phone's conversation, ordered by server sequence; unacked messages stay at the bottom. */
export function conversation(s: ChatState, who: Who) {
  const rows = [
    ...s.out[who].map((m) => ({ own: true, key: m.clientId, text: m.text, seq: m.seq, status: m.status as Tick | null, createdAt: m.createdAt, attempts: m.attempts })),
    ...s.inbox[who].map((m) => ({ own: false, key: m.clientId, text: m.text, seq: m.seq as number | null, status: null as Tick | null, createdAt: 0, attempts: 1 })),
  ];
  return rows.sort((a, b) => (a.seq ?? Infinity) - (b.seq ?? Infinity) || a.createdAt - b.createdAt);
}

/* ------------------------------------------------------------------ view */

const tickStep = (s: ChatState, dt: number) => chatReducer(s, { type: "tick", dt });

const SUGGEST: Record<Who, string[]> = {
  alice: ["Hey Bob!", "Lunch at 1?", "Bring the slides", "Running 5 min late", "See you there"],
  bob: ["Hi Alice", "Sure, sounds good", "Got them", "No worries", "On my way"],
};

const TICK_META: Record<Tick, { icon: typeof Check; word: string; cls?: string }> = {
  sending: { icon: Clock, word: "sending…" },
  sent: { icon: Check, word: "sent" },
  delivered: { icon: CheckCheck, word: "delivered" },
  read: { icon: CheckCheck, word: "read", cls: "ok-ink" },
};

const CSS = `
.chat-phones { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 4px; }
.chat-phone { container-type: inline-size; border: 1.5px solid var(--border-strong); border-radius: 18px; background: var(--card-2); padding: 6px 8px 8px; display: grid; grid-template-columns: minmax(0, 1fr); grid-template-rows: auto 1fr auto; min-width: 0; }
.chat-head { display: flex; align-items: center; justify-content: space-between; gap: 6px; font-weight: 650; font-size: 13.5px; line-height: 1.4; padding: 0 4px 4px; border-bottom: 1px solid var(--border); }
.chat-list { height: 188px; overflow-y: auto; display: flex; flex-direction: column; gap: 5px; padding: 6px 2px; }
.chat-bubble { max-width: 92%; border-radius: 12px; padding: 4px 8px; font-size: 12.5px; line-height: 1.35; border: 1px solid var(--border); background: var(--card); overflow-wrap: anywhere; }
.chat-bubble[data-own] { align-self: flex-end; background: color-mix(in srgb, var(--accent) 12%, var(--card)); border-color: color-mix(in srgb, var(--accent) 35%, var(--border)); }
.chat-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 0 4px; justify-content: flex-end; font-size: 10.5px; line-height: 1.4; color: var(--muted); margin-top: 1px; }
.chat-seq { font: 600 10.5px var(--font-mono); color: var(--muted); margin-right: auto; }
.chat-form { display: flex; gap: 4px; padding-top: 6px; border-top: 1px solid var(--border); }
.chat-form input { flex: 1; min-width: 0; height: 30px; border: 1px solid var(--border); background: var(--card); color: var(--fg); border-radius: 8px; padding: 0 8px; font-size: 13px; }
.chat-form button { flex: none; width: 34px; height: 30px; display: grid; place-items: center; border-radius: 8px; border: 1px solid var(--accent); background: var(--accent); color: var(--accent-ink); cursor: pointer; }
@container (max-width: 150px) { .chat-st-word { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; } }
.chat-log { list-style: none; padding: 0; margin: 0; display: grid; gap: 3px; font-size: 13px; line-height: 1.45; }
.chat-log li { display: flex; gap: 6px; align-items: baseline; }
.chat-log svg { flex: none; position: relative; top: 2px; }
.chat-wire { display: block; width: 100%; }
@container (max-width: 420px) { .chat-list { height: 150px; } .chat-bubble { font-size: 12px; } }
`;

const WIRE_H = 60;

function packetLabel(p: Packet) {
  if (p.kind === "send") return p.clientId;
  if (p.kind === "ack") return `ack #${p.seq}`;
  if (p.kind === "deliver") return `#${p.seq}`;
  return p.receipt === "read" ? "read" : "✓✓";
}
const packetColor: Record<PacketKind, string> = { send: "var(--series-1)", ack: "var(--series-3)", deliver: "var(--series-1)", receipt: "var(--series-2)" };

function Phone({ s, who, onSend }: { s: ChatState; who: Who; onSend: (text: string) => void }) {
  const [draft, setDraft] = useState(SUGGEST[who][0]);
  const [k, setK] = useState(1);
  const rows = conversation(s, who);
  const online = s.online[who];
  return (
    <section className="chat-phone" aria-label={`${NAME[who]}'s phone`}>
      <div className="chat-head">
        <span>{NAME[who]}</span>
        <span className={`pill ${online ? "ok-ink" : "bad-ink"}`}>
          {online ? <Wifi size={11} aria-hidden /> : <WifiOff size={11} aria-hidden />} <span className="chat-st-word">{online ? "online" : "offline"}</span>
        </span>
      </div>
      <div className="chat-list" role="log" aria-label={`${NAME[who]}'s conversation`}>
        {rows.length === 0 && <p className="muted" style={{ fontSize: 12, margin: "auto", textAlign: "center" }}>No messages yet</p>}
        {rows.map((r) => {
          const meta = r.status ? TICK_META[r.status] : null;
          const Icon = meta?.icon;
          return (
            <div key={`${r.own ? "o" : "i"}${r.key}`} className="chat-bubble" data-own={r.own || undefined}>
              {r.text}
              <div className="chat-meta">
                <span className="chat-seq">{r.seq !== null ? `#${r.seq}` : "#–"}</span>
                {meta && Icon && (
                  <span className={meta.cls} style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
                    <Icon size={12} aria-hidden /> {meta.word}
                    {r.status === "sending" && r.attempts > 1 ? ` (try ${r.attempts})` : ""}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <form
        className="chat-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.trim()) return;
          onSend(draft);
          setDraft(SUGGEST[who][k % SUGGEST[who].length]);
          setK(k + 1);
        }}
      >
        <label className="sr-only" htmlFor={`chat-${who}`}>
          Message from {NAME[who]}
        </label>
        <input id={`chat-${who}`} value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={60} autoComplete="off" />
        <button type="submit" aria-label={`Send as ${NAME[who]}`}>
          <Send size={14} aria-hidden />
        </button>
      </form>
    </section>
  );
}

const TONE_ICON = { info: Info, ok: CircleCheck, warn: TriangleAlert, bad: CircleAlert } as const;
const TONE_CLS = { info: "muted", ok: "ok-ink", warn: "warn-ink", bad: "bad-ink" } as const;

export function ChatSim() {
  const { ref, inView, reduce } = useSimGate<HTMLDivElement>();
  const [busyFlag, setBusyFlag] = useState(false);
  const [s, reset] = useFixedStep<ChatState>(() => initChat(), tickStep, busyFlag && inView && !reduce);
  const busy = nextEventAt(s) !== null;
  if (busy !== busyFlag) setBusyFlag(busy); // the clock only runs while something is in flight
  const W = Math.max(260, useBoxWidth(ref) || 600);
  const X_OF: Record<NodeId, number> = { alice: 22, server: W / 2, bob: W - 22 };

  const act = (a: ChatAction) => reset(chatReducer(s, a));
  const latest = s.events[0];
  const said = useThrottled(latest?.text ?? "Type a message on either phone and press send.", 600);
  const waiting = s.server.msgs.filter((m) => !m.delivered).length;

  return (
    <WidgetFrame title="Chat delivery simulator" sub="Lost acks cause retries; the server dedupes them by clientId.">
      <style href="w-chat-sim" precedence="widgets">
        {CSS}
      </style>
      <div className="controls">
        <Slider label="Drop rate" value={Math.round(s.net.drop * 100)} min={0} max={60} step={5} onChange={(v) => act({ type: "net", drop: v / 100 })} format={(v) => `${v}%`} valueText={`${Math.round(s.net.drop * 100)}% of sends and acks dropped`} />
        <Slider label="Latency" value={s.net.latency} min={50} max={1500} step={50} onChange={(v) => act({ type: "net", latency: v })} format={(v) => `${v} ms`} valueText={`Network latency ${s.net.latency} ms`} />
        <button type="button" className={`wbtn ${s.online.bob ? "" : "danger"}`} aria-pressed={!s.online.bob} onClick={() => act({ type: "online", who: "bob", online: !s.online.bob })}>
          <WifiOff size={14} aria-hidden /> Bob offline
        </button>
        <SimButtons
          running={busy && inView && !reduce}
          reduce={reduce}
          onStep={() => act({ type: "next" })}
          stepLabel="Next event"
          stepHint="Jump to the next network event"
          onReset={() => reset(initChat(7, s.net))}
        />
      </div>

      <div ref={ref}>
        <svg viewBox={`0 0 ${W} ${WIRE_H}`} className="sim-svg chat-wire" role="img" aria-label={`${s.packets.length} packets in flight. Server sequence is at ${s.server.seq}.${waiting ? ` ${waiting} undelivered.` : ""}`}>
          <line x1={X_OF.alice} x2={X_OF.bob} y1={30} y2={30} stroke="var(--border-strong)" strokeWidth={1.5} />
          {(["alice", "bob"] as Who[]).map((w) => (
            <g key={w}>
              <circle cx={X_OF[w]} cy={30} r={16} fill="var(--card-2)" stroke="var(--k-client)" strokeWidth={1.6} strokeDasharray={s.online[w] ? undefined : "4 3"} />
              <text x={X_OF[w]} y={34} textAnchor="middle" style={{ fontWeight: 700 }}>
                {NAME[w][0]}
              </text>
            </g>
          ))}
          <rect x={X_OF.server - 50} y={14} width={100} height={32} rx={8} fill="var(--card-2)" stroke="var(--k-service)" strokeWidth={1.6} />
          <Server x={X_OF.server - 44} y={22} width={15} height={15} aria-hidden style={{ color: "var(--k-service)" }} />
          <text x={X_OF.server + 9} y={waiting ? 28 : 34} textAnchor="middle" style={{ fontWeight: 650 }}>
            seq {s.server.seq}
          </text>
          {waiting > 0 && (
            <text x={X_OF.server + 9} y={41} textAnchor="middle" style={{ fontSize: 10, fill: "var(--warning-ink)", fontWeight: 650 }}>
              {waiting} undelivered
            </text>
          )}
          {s.packets.map((p) => {
            const prog = Math.min(1, Math.max(0, (s.t - p.sentAt) / Math.max(1, p.arriveAt - p.sentAt)));
            const lost = p.drop && prog >= 0.5;
            const pos = p.drop ? Math.min(prog, 0.5) : prog;
            const x = X_OF[p.from] + (X_OF[p.to] - X_OF[p.from]) * pos;
            const up = p.kind === "ack" || p.kind === "receipt";
            return (
              <g key={p.id} style={{ transform: `translate(${x}px, ${up ? 19 : 41}px)`, transition: reduce ? undefined : "transform 60ms linear" }}>
                {lost ? (
                  <>
                    <X x={-6} y={-6} width={12} height={12} aria-hidden style={{ color: "var(--critical)" }} />
                    <text x={8} y={4} style={{ fontSize: 10, fill: "var(--critical-ink)", fontWeight: 700 }}>
                      lost
                    </text>
                  </>
                ) : (
                  <>
                    <circle r={5} fill={packetColor[p.kind]} stroke="var(--card)" strokeWidth={1.5} />
                    <text x={0} y={up ? -8 : 16} textAnchor="middle" style={{ fontSize: 10, fontWeight: 650 }}>
                      {packetLabel(p)}
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="chat-phones">
        <Phone s={s} who="alice" onSend={(text) => act({ type: "send", from: "alice", text })} />
        <Phone s={s} who="bob" onSend={(text) => act({ type: "send", from: "bob", text })} />
      </div>

      <p className="readout" aria-live="polite">
        {said} <span className="muted">Totals: {s.stats.retries} retries, {s.stats.duplicates} duplicates ignored, {s.stats.lost} packets lost.</span>
        <ReducedNote reduce={reduce} what="Clock paused (reduced motion): press Next event to move the network along." />
      </p>
      <More label={`Server and network log${s.events.length ? ` (${s.events.length})` : ""}`}>
        {s.events.length === 0 && <p className="muted" style={{ fontSize: 13, margin: 0 }}>Nothing yet: send a message.</p>}
        <ol className="chat-log" aria-label="Server and network log, newest first">
          {s.events.map((e) => {
            const Icon = TONE_ICON[e.tone];
            return (
              <li key={e.n}>
                <Icon size={13} aria-hidden className={TONE_CLS[e.tone]} />
                <span>
                  <span className="muted" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {(e.at / 1000).toFixed(1)} s
                  </span>{" "}
                  {e.text}
                </span>
              </li>
            );
          })}
        </ol>
      </More>
    </WidgetFrame>
  );
}
