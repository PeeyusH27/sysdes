"use client";
import { useCallback, useState } from "react";
import { HeartPulse, Scissors, Skull, Unplug } from "lucide-react";
import { useFixedStep } from "@/lib/sim-loop";
import { draw } from "./lib/draw-rng";
import { advance, ReducedNote, SimButtons, useSimGate, useThrottled } from "./lib/sim-kit";
import { Seg, WidgetFrame } from "./WidgetFrame";

/* ------------------------------------------------------------------ pure Raft (leader election only, no log) */

export type Role = "follower" | "candidate" | "leader";
export interface RNode {
  id: number;
  role: Role;
  term: number;
  votedFor: number | null;
  votes: number[];
  /** election deadline (followers and candidates) */
  deadline: number;
  /** when the node's current timeout started, for drawing the timer ring */
  armedAt: number;
  nextBeat: number;
  leaderId: number | null;
  alive: boolean;
  cut: boolean;
}
export type MsgKind = "vote-req" | "vote" | "beat" | "nack";
export interface RMsg {
  id: number;
  from: number;
  to: number;
  kind: MsgKind;
  term: number;
  granted?: boolean;
  sentAt: number;
  arriveAt: number;
}
export interface RaftState {
  t: number;
  seed: number;
  nodes: RNode[];
  msgs: RMsg[];
  nextMsg: number;
  log: { n: number; at: number; text: string }[];
  logN: number;
}

export const N = 5;
export const MAJORITY = Math.floor(N / 2) + 1;
/** Leader heartbeat interval. */
export const HEARTBEAT_MS = 1_200;
/** Randomized election timeout range: much longer than heartbeat + network delay. */
export const TIMEOUT_MIN = 3_000;
export const TIMEOUT_MAX = 6_000;
const LATENCY_MIN = 500;
const LATENCY_MAX = 800;

const name = (i: number) => `S${i + 1}`;

function rnd(d: RaftState) {
  const [v, next] = draw(d.seed);
  d.seed = next;
  return v;
}
function arm(d: RaftState, n: RNode, min = TIMEOUT_MIN, max = TIMEOUT_MAX) {
  n.armedAt = d.t;
  n.deadline = d.t + min + rnd(d) * (max - min);
}
function say(d: RaftState, text: string) {
  d.logN++;
  d.log = [{ n: d.logN, at: d.t, text }, ...d.log].slice(0, 5);
}
function send(d: RaftState, from: number, to: number, kind: MsgKind, term: number, granted?: boolean) {
  const latency = LATENCY_MIN + rnd(d) * (LATENCY_MAX - LATENCY_MIN);
  d.msgs.push({ id: d.nextMsg++, from, to, kind, term, granted, sentAt: d.t, arriveAt: d.t + latency });
}

/** Can a message get from a to b right now? A partitioned node is cut off from everyone. */
export const reachable = (s: RaftState, a: number, b: number) => s.nodes[a].alive && s.nodes[b].alive && !s.nodes[a].cut && !s.nodes[b].cut;

export function initRaft(seed = 4): RaftState {
  const d: RaftState = { t: 0, seed, nodes: [], msgs: [], nextMsg: 1, log: [], logN: 0 };
  for (let i = 0; i < N; i++) {
    const n: RNode = { id: i, role: "follower", term: 0, votedFor: null, votes: [], deadline: 0, armedAt: 0, nextBeat: 0, leaderId: null, alive: true, cut: false };
    arm(d, n, 1_500, 4_000); // the very first election comes a little sooner
    d.nodes.push(n);
  }
  say(d, "Five followers, no leader yet. Each waits for a randomized election timeout.");
  return d;
}

const clone = (s: RaftState): RaftState => ({ ...s, nodes: s.nodes.map((n) => ({ ...n, votes: [...n.votes] })), msgs: [...s.msgs], log: [...s.log] });

function stepDown(d: RaftState, n: RNode, term: number) {
  if (n.role === "leader") say(d, `${name(n.id)} sees term ${term} and steps down.`);
  n.term = term;
  n.role = "follower";
  n.votedFor = null;
  n.votes = [];
  if (n.deadline < d.t) arm(d, n);
}

function receive(d: RaftState, m: RMsg) {
  const n = d.nodes[m.to];
  if (m.term > n.term) {
    const wasLeader = n.role === "leader";
    stepDown(d, n, m.term);
    if (wasLeader) arm(d, n);
  }
  switch (m.kind) {
    case "vote-req": {
      const grant = m.term === n.term && (n.votedFor === null || n.votedFor === m.from) && n.role !== "leader";
      if (grant) {
        n.votedFor = m.from;
        arm(d, n); // granting a vote resets the election timer
      }
      send(d, n.id, m.from, "vote", n.term, grant);
      return;
    }
    case "vote": {
      if (n.role !== "candidate" || m.term !== n.term || !m.granted || n.votes.includes(m.from)) return;
      n.votes.push(m.from);
      if (n.votes.length >= MAJORITY) {
        n.role = "leader";
        n.leaderId = n.id;
        n.nextBeat = d.t;
        say(d, `${name(n.id)} wins term ${n.term} with ${n.votes.length} of ${N} votes and becomes leader.`);
      }
      return;
    }
    case "beat": {
      if (m.term < n.term) {
        send(d, n.id, m.from, "nack", n.term); // tell a stale leader about the newer term
        return;
      }
      if (n.role === "candidate") say(d, `${name(n.id)} hears from leader ${name(m.from)} and goes back to follower.`);
      n.role = "follower";
      n.leaderId = m.from;
      arm(d, n);
      return;
    }
    case "nack":
      return; // the term check above already made a stale leader step down
  }
}

/** Advance the cluster by `dt` ms. */
export function stepRaft(s: RaftState, dt: number): RaftState {
  const d = clone(s);
  d.t += dt;
  // deliver
  const due = d.msgs.filter((m) => m.arriveAt <= d.t).sort((a, b) => a.arriveAt - b.arriveAt || a.id - b.id);
  d.msgs = d.msgs.filter((m) => m.arriveAt > d.t);
  for (const m of due) if (reachable(d, m.from, m.to)) receive(d, m);
  // timers
  for (const n of d.nodes) {
    if (!n.alive) continue;
    if (n.role === "leader") {
      if (d.t >= n.nextBeat) {
        for (let k = 0; k < N; k++) if (k !== n.id) send(d, n.id, k, "beat", n.term);
        n.nextBeat = d.t + HEARTBEAT_MS;
      }
    } else if (d.t >= n.deadline) {
      n.term += 1;
      n.role = "candidate";
      n.votedFor = n.id;
      n.votes = [n.id];
      n.leaderId = null;
      arm(d, n);
      say(d, `${name(n.id)} timed out and asks for votes in term ${n.term}${n.cut ? " (but nobody can hear it)" : ""}.`);
      for (let k = 0; k < N; k++) if (k !== n.id) send(d, n.id, k, "vote-req", n.term);
    }
  }
  return d;
}

export const leaderOf = (s: RaftState) => s.nodes.find((n) => n.alive && n.role === "leader" && !n.cut) ?? null;

export function killLeader(s: RaftState): RaftState {
  const l = leaderOf(s);
  if (!l) return s;
  const d = clone(s);
  d.nodes[l.id].alive = false;
  say(d, `Leader ${name(l.id)} crashed. Followers will time out and elect a new one.`);
  return d;
}

/** Cut off one follower (seeded pick). */
export function partitionNode(s: RaftState): RaftState {
  const options = s.nodes.filter((n) => n.alive && !n.cut && n.role !== "leader");
  if (!options.length) return s;
  const d = clone(s);
  const pick = options[Math.floor(rnd(d) * options.length)];
  d.nodes[pick.id].cut = true;
  say(d, `${name(pick.id)} is partitioned: it can't reach anyone, and nobody can reach it.`);
  return d;
}

export function heal(s: RaftState): RaftState {
  const d = clone(s);
  const back = d.nodes.filter((n) => n.cut || !n.alive);
  for (const n of d.nodes) {
    if (!n.alive) {
      n.alive = true;
      n.role = "follower";
      arm(d, n);
    }
    n.cut = false;
  }
  if (back.length) say(d, `${back.map((n) => name(n.id)).join(", ")} rejoined the cluster.`);
  return d;
}

/* ------------------------------------------------------------------ view */

const CX = 210;
const CY = 158;
const RING = 112;
const pos = (i: number) => {
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / N;
  return { x: CX + Math.cos(a) * RING, y: CY + Math.sin(a) * RING };
};
const MSG_COLOR: Record<MsgKind, string> = { "vote-req": "var(--series-2)", vote: "var(--series-1)", beat: "var(--series-3)", nack: "var(--muted)" };

export function RaftElection() {
  const [speed, setSpeed] = useState(1);
  const [running, setRunning] = useState(true);
  const { ref, inView, reduce } = useSimGate<HTMLDivElement>();
  const step = useCallback((s: RaftState, dt: number) => stepRaft(s, dt * speed), [speed]);
  const [s, reset] = useFixedStep<RaftState>(() => initRaft(), step, running && inView && !reduce);

  const leader = leaderOf(s);
  const cut = s.nodes.find((n) => n.cut);
  const dead = s.nodes.filter((n) => !n.alive);
  const candidates = s.nodes.filter((n) => n.alive && n.role === "candidate" && !n.cut);
  const maxTerm = Math.max(...s.nodes.map((n) => n.term));

  let sentence: string;
  if (leader) {
    sentence = `Leader: ${name(leader.id)} in term ${leader.term}. Heartbeats every ${HEARTBEAT_MS / 1000} s reset the followers' election timers.`;
    if (cut && cut.term > leader.term) sentence += ` ${name(cut.id)} is cut off and its term has run ahead to ${cut.term}: when it rejoins, that higher term will force a new election (Pre-Vote prevents this).`;
    else if (cut) sentence += ` ${name(cut.id)} is cut off; it keeps timing out and bumping its term.`;
  } else if (candidates.length) {
    const c = candidates[0];
    sentence = `No leader. ${candidates.map((x) => name(x.id)).join(" and ")} ${candidates.length > 1 ? "are candidates" : "is a candidate"} in term ${c.term} with ${c.votes.length} of ${MAJORITY} votes needed.`;
  } else {
    sentence = `No leader yet (highest term ${maxTerm}). Followers wait for their randomized timeouts (${TIMEOUT_MIN / 1000}–${TIMEOUT_MAX / 1000} s).`;
  }
  if (dead.length)
    sentence +=
      N - dead.length >= MAJORITY
        ? ` Down: ${dead.map((n) => name(n.id)).join(", ")}. The other ${N - dead.length} still form a majority, so the cluster keeps working.`
        : ` Down: ${dead.map((n) => name(n.id)).join(", ")}. Only ${N - dead.length} left: no majority, so no leader can be elected.`;
  const said = useThrottled(sentence, 900);

  return (
    <WidgetFrame title="Raft leader election" sub="Five nodes. A follower that hears no heartbeat before its random timeout becomes a candidate, bumps the term and asks for votes; a majority (3) makes it leader.">
      <div className="controls">
        <button type="button" className="wbtn danger" onClick={() => reset(killLeader(s))} disabled={!leader}>
          <Skull size={14} aria-hidden /> Kill leader
        </button>
        <button type="button" className="wbtn" onClick={() => reset(cut ? heal(s) : partitionNode(s))}>
          {cut ? <Unplug size={14} aria-hidden /> : <Scissors size={14} aria-hidden />} {cut ? `Heal partition (${name(cut.id)})` : "Partition a node"}
        </button>
        <button type="button" className="wbtn" onClick={() => reset(heal(s))} disabled={!dead.length}>
          <HeartPulse size={14} aria-hidden /> Revive crashed
        </button>
        <Seg<number>
          label="Speed"
          value={speed}
          onChange={setSpeed}
          options={[
            { value: 0.5, label: "0.5×" },
            { value: 1, label: "1×" },
            { value: 2, label: "2×" },
          ]}
        />
        <SimButtons
          running={running && inView}
          reduce={reduce}
          onToggle={() => setRunning((r) => !r)}
          onStep={() => reset(advance(s, stepRaft, 10))}
          stepHint="Advance 0.5 simulated seconds"
          onReset={() => reset(initRaft())}
        />
      </div>

      <div ref={ref}>
        <svg viewBox="0 0 420 320" className="sim-svg" style={{ maxWidth: 480, margin: "0 auto" }} role="img" aria-label={sentence}>
          {s.nodes.map((a) =>
            s.nodes
              .filter((b) => b.id > a.id)
              .map((b) => {
                const p = pos(a.id);
                const q = pos(b.id);
                const ok = reachable(s, a.id, b.id);
                return <line key={`${a.id}-${b.id}`} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="var(--border)" strokeWidth={1} strokeDasharray={ok ? undefined : "3 5"} opacity={ok ? 1 : 0.6} />;
              }),
          )}
          {/* messages */}
          {s.msgs.map((m) => {
            const p = pos(m.from);
            const q = pos(m.to);
            const k = Math.min(1, Math.max(0, (s.t - m.sentAt) / (m.arriveAt - m.sentAt)));
            const lost = !reachable(s, m.from, m.to);
            if (lost && k > 0.5) return null;
            return (
              <circle
                key={m.id}
                r={m.kind === "beat" ? 4 : 5}
                fill={m.kind === "vote" && !m.granted ? "var(--card)" : MSG_COLOR[m.kind]}
                stroke={m.kind === "vote" && !m.granted ? "var(--muted)" : "var(--card)"}
                strokeWidth={1.5}
                style={{ transform: `translate(${p.x + (q.x - p.x) * k}px, ${p.y + (q.y - p.y) * k}px)`, transition: reduce ? undefined : "transform 60ms linear" }}
              />
            );
          })}
          {/* nodes */}
          {s.nodes.map((n) => {
            const { x, y } = pos(n.id);
            const stroke = !n.alive ? "var(--critical)" : n.role === "leader" ? "var(--accent)" : n.role === "candidate" ? "var(--warning)" : "var(--border-strong)";
            const frac = n.alive && n.role !== "leader" ? Math.min(1, Math.max(0, (n.deadline - s.t) / Math.max(1, n.deadline - n.armedAt))) : 0;
            const circ = 2 * Math.PI * 36;
            const role = !n.alive ? "down" : n.role;
            const below = y > CY;
            return (
              <g key={n.id} opacity={n.alive ? 1 : 0.6}>
                {frac > 0 && (
                  <circle cx={x} cy={y} r={36} fill="none" stroke="var(--border-strong)" strokeWidth={3} strokeDasharray={`${circ * frac} ${circ}`} transform={`rotate(-90 ${x} ${y})`} opacity={0.7} />
                )}
                <circle cx={x} cy={y} r={30} fill={n.role === "leader" && n.alive ? "color-mix(in srgb, var(--accent) 16%, var(--card-2))" : "var(--card-2)"} stroke={stroke} strokeWidth={n.role === "leader" ? 3 : 2} strokeDasharray={!n.alive || n.cut ? "5 4" : undefined} />
                <text x={x} y={y - 2} textAnchor="middle" style={{ fontWeight: 700, fontSize: 14 }}>
                  {name(n.id)}
                </text>
                <text x={x} y={y + 14} textAnchor="middle" className="muted-text" style={{ fontSize: 10.5 }}>
                  term {n.term}
                </text>
                <text
                  x={x}
                  y={below ? y + 52 : y - 44}
                  textAnchor="middle"
                  style={{ fontSize: 11, fontWeight: 700, fill: !n.alive ? "var(--critical-ink)" : n.role === "leader" ? "var(--good-ink)" : n.role === "candidate" ? "var(--warning-ink)" : "var(--muted)" }}
                >
                  {role === "leader" ? "★ leader" : role}
                  {n.cut ? " · cut off" : ""}
                  {n.alive && n.role === "candidate" ? ` (${n.votes.length}/${MAJORITY})` : ""}
                </text>
              </g>
            );
          })}
          <text x={CX} y={CY + 4} textAnchor="middle" className="muted-text" style={{ fontSize: 11 }}>
            {leader ? `term ${leader.term}` : "electing…"}
          </text>
        </svg>
      </div>
      <ul className="legend" aria-label="Legend">
        <li>
          <span className="line-key" style={{ background: "var(--series-3)", width: 8, height: 8, borderRadius: 4 }} aria-hidden /> heartbeat
        </li>
        <li>
          <span className="line-key" style={{ background: "var(--series-2)", width: 8, height: 8, borderRadius: 4 }} aria-hidden /> vote request
        </li>
        <li>
          <span className="line-key" style={{ background: "var(--series-1)", width: 8, height: 8, borderRadius: 4 }} aria-hidden /> vote granted (hollow = refused)
        </li>
        <li>ring = time left before the node times out</li>
      </ul>
      {s.log.length > 0 && (
        <ol style={{ listStyle: "none", padding: 0, margin: "8px 0 0", display: "grid", gap: 2, fontSize: 13 }} aria-label="Event log">
          {s.log.slice(0, 4).map((e) => (
            <li key={e.n}>
              <span className="muted" style={{ fontVariantNumeric: "tabular-nums" }}>
                {(e.at / 1000).toFixed(1)} s
              </span>{" "}
              {e.text}
            </li>
          ))}
        </ol>
      )}
      <p className="readout" aria-live="polite">
        {said}
        <ReducedNote reduce={reduce} what="Paused (reduced motion): Step advances 0.5 s." />
      </p>
    </WidgetFrame>
  );
}
