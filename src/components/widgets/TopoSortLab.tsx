"use client";
import { useCallback, useId, useState, type KeyboardEvent } from "react";
import { AnimatePresence, m } from "motion/react";
import { useFixedStep } from "@/lib/sim-loop";
import { useNarrow } from "@/lib/hooks";
import { ReducedNote, SimButtons, useSimGate, useThrottled } from "./lib/sim-kit";
import { More, Seg, WidgetFrame } from "./WidgetFrame";

// ---------------------------------------------------------------- model (pure, tested)
export type Edge = readonly [from: number, to: number]; // "from" must come before "to"
export const COURSES = [
  { label: "Intro", x: 40, y: 58 },
  { label: "Math", x: 40, y: 162 },
  { label: "Data str", x: 120, y: 58 },
  { label: "Systems", x: 120, y: 110 },
  { label: "Discrete", x: 120, y: 162 },
  { label: "Database", x: 200, y: 84 },
  { label: "Algo", x: 200, y: 136 },
  { label: "Capstone", x: 280, y: 110 },
] as const;
export const N = COURSES.length;
export const DEFAULT_EDGES: Edge[] = [
  [0, 2],
  [0, 3],
  [1, 4],
  [2, 5],
  [3, 5],
  [2, 6],
  [4, 6],
  [5, 7],
  [6, 7],
];
/** A quick way to break it: Capstone before Data str closes Data str → Algo → Capstone → Data str. */
export const CYCLE_EDGE: Edge = [7, 2];

export type Mode = "one" | "level";
export type TopoEvent =
  | { kind: "take"; node: number; released: number[]; lowered: number[] }
  | { kind: "round"; nodes: number[]; released: number[] }
  | { kind: "blocked"; node: number; waits: number[] }
  | { kind: "edge"; edge: Edge; added: boolean };
export interface TopoState {
  edges: Edge[];
  indeg: number[];
  queue: number[];
  order: number[];
  /** Semester of each placed node (level mode), or the round it became ready in. */
  sem: number[];
  rounds: number;
  last: TopoEvent | null;
  acc: number;
}

export const succ = (edges: Edge[], u: number) => edges.filter(([a]) => a === u).map(([, b]) => b);
export function initTopo(edges: Edge[], last: TopoEvent | null = null): TopoState {
  const indeg = new Array<number>(N).fill(0);
  for (const [, b] of edges) indeg[b]++;
  const queue = indeg.flatMap((d, v) => (d === 0 ? [v] : []));
  return {
    edges,
    indeg,
    queue,
    order: [],
    sem: new Array<number>(N).fill(0),
    rounds: 0,
    last,
    acc: 0,
  };
}
export const isDone = (s: TopoState) => s.queue.length === 0;
export const isStuck = (s: TopoState) => isDone(s) && s.order.length < N;

/** Place `node` (it must be ready), lowering the in-degree of everything that waits for it. */
export function take(s: TopoState, node: number): TopoState {
  if (!s.queue.includes(node)) {
    if (s.order.includes(node)) return s;
    const waits = s.edges.filter(([a, b]) => b === node && !s.order.includes(a)).map(([a]) => a);
    return { ...s, last: { kind: "blocked", node, waits } };
  }
  const indeg = s.indeg.slice();
  const queue = s.queue.filter((v) => v !== node);
  const released: number[] = [];
  const lowered: number[] = [];
  for (const v of succ(s.edges, node)) {
    indeg[v]--;
    lowered.push(v);
    if (indeg[v] === 0) {
      queue.push(v);
      released.push(v);
    }
  }
  const sem = s.sem.slice();
  const prereqs = s.edges.filter(([, b]) => b === node).map(([a]) => sem[a]);
  sem[node] = 1 + Math.max(0, ...prereqs);
  return {
    ...s,
    indeg,
    queue,
    order: [...s.order, node],
    sem,
    rounds: Math.max(s.rounds, sem[node]),
    last: { kind: "take", node, released, lowered },
  };
}

/** Kahn's one at a time: take the front of the queue. */
export const stepOne = (s: TopoState) => (isDone(s) ? s : take(s, s.queue[0]));

/** Kahn's level by level: everything ready now is one semester. */
export function stepRound(s: TopoState): TopoState {
  if (isDone(s)) return s;
  const nodes = s.queue.slice();
  let out = s;
  for (const v of nodes) out = take(out, v);
  const released = out.queue.filter((v) => !nodes.includes(v));
  const sem = out.sem.slice();
  for (const v of nodes) sem[v] = s.rounds + 1;
  return {
    ...out,
    sem,
    rounds: s.rounds + 1,
    last: { kind: "round", nodes, released },
  };
}

export function runAll(s: TopoState, mode: Mode) {
  let out = s;
  for (let guard = 0; !isDone(out) && guard <= N; guard++) out = mode === "one" ? stepOne(out) : stepRound(out);
  return out;
}

/** DFS with three colours: one directed cycle as a node list (first node repeated at the end), or null. */
export function findCycle(edges: Edge[]): number[] | null {
  const color = new Array<number>(N).fill(0); // 0 white, 1 gray, 2 black
  const stack: number[] = [];
  const dfs = (u: number): number[] | null => {
    color[u] = 1;
    stack.push(u);
    for (const v of succ(edges, u)) {
      if (color[v] === 1) return [...stack.slice(stack.indexOf(v)), v];
      if (color[v] === 0) {
        const found = dfs(v);
        if (found) return found;
      }
    }
    stack.pop();
    color[u] = 2;
    return null;
  };
  for (let v = 0; v < N; v++) {
    if (color[v] !== 0) continue;
    const found = dfs(v);
    if (found) return found;
  }
  return null;
}

/** Add the edge, or remove it if it is already there. Self-loops are ignored. */
export function toggleEdge(edges: Edge[], from: number, to: number): Edge[] {
  if (from === to) return edges;
  const has = edges.some(([a, b]) => a === from && b === to);
  return has ? edges.filter(([a, b]) => !(a === from && b === to)) : [...edges, [from, to] as const];
}

// ---------------------------------------------------------------- picture
/**
 * Two layouts of one drawing. Wide (desktop pane): the course graph on the left, the ready queue and the order on the
 * right, so the whole lab fits one screen. Narrow (phones): the queue and the order stack under the graph.
 */
const GRAPH_W = 320;
const GRAPH_H = 206;
const PW = 68;
const PH = 26;
const CW = 74;
const CHIP_H = 22;
const WIDE = { W: 560, H: GRAPH_H, gy: 0, px: GRAPH_W + 10, cols: 3, qy: 26, qRows: 2, oy: 106 };
/** Narrow: the graph moves up into its empty top margin (gy), the queue and the order follow it. */
const NARROW = { W: GRAPH_W, H: GRAPH_H + 102, gy: -24, px: 2, cols: 4, qy: GRAPH_H - 6, qRows: 1, oy: GRAPH_H + 46 };
type Lay = typeof WIDE;
const EDGE = "color-mix(in srgb, var(--fg) 38%, var(--card))";
const label = (v: number) => COURSES[v].label;
const list = (vs: number[]) => (vs.length <= 1 ? vs.map(label).join("") : `${vs.slice(0, -1).map(label).join(", ")} and ${label(vs.at(-1)!)}`);
const chipAt = (L: Lay, i: number, y: number) => ({ x: L.px + (i % L.cols) * (CW + 4), y: y + Math.floor(i / L.cols) * 26 });

/** Forward arrows run right; same-column arrows bow sideways; backward arrows (the ones that can close a cycle) arc over or under. */
function edgePath([a, b]: Edge) {
  const p = COURSES[a];
  const q = COURSES[b];
  if (q.x > p.x) return `M${p.x + PW / 2} ${p.y} L${q.x - PW / 2 - 3} ${q.y}`;
  if (q.x === p.x) {
    const down = q.y > p.y ? 1 : -1;
    const sy = p.y + (down * PH) / 2;
    const ey = q.y - down * (PH / 2 + 3);
    return `M${p.x + 14} ${sy} Q ${p.x + 44} ${(sy + ey) / 2} ${q.x + 14} ${ey}`;
  }
  const up = q.y <= p.y ? -1 : 1; // arc over the top, or under the bottom when the target sits lower
  const sy = p.y + (up * PH) / 2;
  const ey = q.y + up * (PH / 2 + 3);
  return `M${p.x - 8} ${sy} Q ${(p.x + q.x) / 2} ${up < 0 ? Math.min(sy, ey) - 56 : Math.max(sy, ey) + 44} ${q.x + 12} ${ey}`;
}

function describe(s: TopoState, cycle: number[] | null) {
  const e = s.last;
  const cyc = cycle ? `${cycle.map(label).join(" → ")}` : "";
  if (isStuck(s)) return `Stuck: the queue is empty with ${s.order.length} of ${N} courses placed. Every leftover course waits on another leftover one: a cycle (${cyc}).`;
  if (isDone(s)) return `All ${N} courses placed, every arrow pointing forward. ${s.rounds} semesters: the length of the longest prerequisite chain.`;
  if (!e) return `${list(s.queue)} ${s.queue.length === 1 ? "has" : "have"} no prerequisites (in-degree 0), so the queue starts with ${s.queue.length === 1 ? "it" : "them"}. Press Step, or click a ready course.`;
  if (e.kind === "edge")
    return `${e.added ? "Added" : "Removed"} ${label(e.edge[0])} → ${label(e.edge[1])}. ${cycle ? `That closes a cycle (${cyc}), so no order exists: Kahn's will get stuck.` : `${label(e.edge[1])} now waits for ${s.indeg[e.edge[1]]} course${s.indeg[e.edge[1]] === 1 ? "" : "s"}.`}`;
  if (e.kind === "blocked") return `✕ Not yet: ${label(e.node)} still needs ${list(e.waits)}.`;
  if (e.kind === "round") return `Semester ${s.rounds}: ${list(e.nodes)}. ${e.released.length ? `That frees ${list(e.released)}.` : "Nothing new is free."}`;
  const drops = e.lowered.filter((v) => !e.released.includes(v));
  return `Took ${label(e.node)}. ${e.released.length ? `${list(e.released)} reach${e.released.length === 1 ? "es" : ""} in-degree 0 and join${e.released.length === 1 ? "s" : ""} the queue.` : ""}${drops.length ? ` ${list(drops)} still wait${drops.length === 1 ? "s" : ""}.` : ""}${!e.lowered.length ? " Nothing depended on it." : ""}`;
}

// ---------------------------------------------------------------- widget
export function TopoSortLab() {
  const uid = useId().replace(/:/g, "");
  const [mode, setMode] = useState<Mode>("one");
  const [click, setClick] = useState<"take" | "edge">("take");
  const [from, setFrom] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const { ref, inView, reduce } = useSimGate<HTMLDivElement>();
  const L = useNarrow(ref, 480) ? NARROW : WIDE;
  const tick = useCallback(
    (s: TopoState, dt: number) => {
      const acc = s.acc + dt;
      if (acc < 1000) return { ...s, acc };
      return { ...(mode === "one" ? stepOne(s) : stepRound(s)), acc: 0 };
    },
    [mode],
  );
  const [s, reset] = useFixedStep<TopoState>(() => initTopo(DEFAULT_EDGES), tick, running && inView && !reduce);
  const cycle = findCycle(s.edges);
  const done = isDone(s);
  const stuck = isStuck(s);
  const sentence = describe(s, cycle);
  const said = useThrottled(sentence, 700);
  const placed = new Set(s.order);
  const cycleEdges = new Set(cycle ? cycle.slice(1).map((v, i) => `${cycle[i]}-${v}`) : []);
  const lastTaken = s.last?.kind === "take" ? [s.last.node] : s.last?.kind === "round" ? s.last.nodes : [];
  const hasCycleEdge = s.edges.some(([a, b]) => a === CYCLE_EDGE[0] && b === CYCLE_EDGE[1]);

  const setEdges = (edges: Edge[], last: TopoEvent | null) => {
    setRunning(false);
    setFrom(null);
    reset(initTopo(edges, last));
  };
  const onCourse = (v: number) => {
    if (click === "take") reset(take(s, v));
    else if (from === null || from === v) setFrom(from === v ? null : v);
    else addEdge(from, v);
  };
  const addEdge = (a: number, b: number) => {
    const edges = toggleEdge(s.edges, a, b);
    setEdges(edges, {
      kind: "edge",
      edge: [a, b],
      added: edges.length > s.edges.length,
    });
  };
  const onKey = (v: number) => (e: KeyboardEvent<SVGGElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onCourse(v);
    }
  };
  const qShow = L.cols * L.qRows;
  const chips = [
    ...s.order.map((v, i) => ({
      v,
      at: chipAt(L, i, L.oy),
      tone: "placed" as const,
    })),
    ...s.queue.slice(0, qShow).map((v, i) => ({ v, at: chipAt(L, i, L.qy), tone: "ready" as const })),
  ];

  return (
    <WidgetFrame title="Course planner: Kahn's algorithm" sub="Each badge counts the prerequisites still missing. Courses at 0 wait in the queue; taking one lowers the badges it points to.">
      <div className="controls">
        <SimButtons
          running={running && !done && !reduce}
          reduce={reduce}
          onToggle={() => {
            if (done) reset(initTopo(s.edges));
            setRunning(done || !running);
          }}
          onStep={() => reset(mode === "one" ? stepOne(s) : stepRound(s))}
          stepHint={mode === "one" ? "Take the course at the front of the queue" : "Take every ready course as one semester"}
          onReset={() => setEdges(s.edges, null)}
        />
        <Seg<Mode>
          labelMode="hidden"
          label="Kahn's: take"
          value={mode}
          onChange={(v) => {
            setMode(v);
            setEdges(s.edges, null);
          }}
          options={[
            { value: "one", label: "One at a time" },
            { value: "level", label: "Semesters" },
          ]}
        />
        <button type="button" className="wbtn" onClick={() => addEdge(...CYCLE_EDGE)}>
          {hasCycleEdge ? "Remove the cycle" : "Make a cycle"}
        </button>
      </div>

      <div ref={ref}>
        <svg
          viewBox={`0 0 ${L.W} ${L.H}`}
          className="sim-svg"
          role="group"
          aria-label={`Course graph with ${s.edges.length} prerequisite arrows. Placed: ${s.order.map(label).join(", ") || "none"}. Ready: ${s.queue.map(label).join(", ") || "none"}.${cycle ? " The arrows contain a cycle." : ""}`}
          style={{ maxWidth: L === WIDE ? 640 : 420, margin: "0 auto" }}
        >
          <defs>
            {["n", "hot", "bad"].map((k) => (
              <marker key={k} id={`${uid}${k}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
                <path d="M0 0L10 5L0 10z" fill={k === "hot" ? "var(--accent)" : k === "bad" ? "var(--critical)" : EDGE} />
              </marker>
            ))}
          </defs>
          <g transform={`translate(0 ${L.gy})`}>
            <g aria-hidden="true">
              {L === WIDE && <line x1={GRAPH_W + 2} x2={GRAPH_W + 2} y1={10} y2={L.H - 10} stroke="var(--border)" />}
              {s.edges.map(([a, b]) => {
                const bad = cycleEdges.has(`${a}-${b}`);
                const used = placed.has(a);
                const hot = lastTaken.includes(a);
                const k = bad ? "bad" : hot ? "hot" : "n";
                return (
                  <path
                    key={`${a}-${b}`}
                    d={edgePath([a, b])}
                    fill="none"
                    stroke={bad ? "var(--critical)" : hot ? "var(--accent)" : EDGE}
                    strokeWidth={hot || bad ? 2.6 : 1.7}
                    strokeDasharray={bad ? "5 4" : used && !hot ? "2 4" : undefined}
                    opacity={used && !hot && !bad ? 0.55 : 1}
                    markerEnd={`url(#${uid}${k})`}
                  />
                );
              })}
            </g>
            {COURSES.map((c, v) => {
              const isPlaced = placed.has(v);
              const ready = s.queue.includes(v);
              const left = stuck && !isPlaced;
              const blocked = s.last?.kind === "blocked" && s.last.node === v;
              const stroke = from === v ? "var(--k-client)" : blocked || left ? "var(--critical)" : ready ? "var(--accent)" : isPlaced ? "var(--border)" : "var(--border-strong)";
              return (
                <g
                  key={v}
                  role="button"
                  tabIndex={0}
                  aria-label={`${c.label}: ${isPlaced ? `placed, number ${s.order.indexOf(v) + 1}` : ready ? "ready" : `waits for ${s.indeg[v]} more`}`}
                  onClick={() => onCourse(v)}
                  onKeyDown={onKey(v)}
                  style={{ cursor: "pointer" }}
                  transform={`translate(${c.x} ${c.y})`}
                >
                  <rect
                    x={-PW / 2}
                    y={-PH / 2}
                    width={PW}
                    height={PH}
                    rx={13}
                    fill={isPlaced ? "var(--card-2)" : ready ? "color-mix(in srgb, var(--accent) 16%, var(--card))" : "var(--card)"}
                    stroke={stroke}
                    strokeWidth={ready || from === v || blocked || left ? 2.4 : 1.5}
                    strokeDasharray={left ? "4 3" : undefined}
                    opacity={isPlaced ? 0.7 : 1}
                  />
                  <text y={4} textAnchor="middle" style={{ fontSize: 11.5, fontWeight: 650, fill: isPlaced ? "var(--muted)" : "var(--fg)" }}>
                    {c.label}
                  </text>
                </g>
              );
            })}
            {/* Badges sit outside the buttons, so each button's visible text is just its course name. */}
            <g aria-hidden="true" pointerEvents="none">
              {COURSES.map((c, v) => {
                const deg = s.indeg[v];
                const left = stuck && !placed.has(v);
                const done = placed.has(v);
                return (
                  <g key={v} transform={`translate(${c.x + PW / 2 - 4} ${c.y - PH / 2})`}>
                    <m.g key={`${v}-${done ? "done" : deg}`} initial={reduce ? false : { scale: 1.7 }} animate={{ scale: 1 }} transition={{ duration: reduce ? 0 : 0.35 }}>
                      <circle r={8.5} fill={done ? "var(--card)" : deg === 0 ? "var(--accent)" : left ? "var(--critical)" : "var(--card)"} stroke={done ? "var(--good)" : deg === 0 ? "var(--accent)" : left ? "var(--critical)" : "var(--border-strong)"} />
                      <text y={3.8} textAnchor="middle" style={{ fontSize: 10.5, fontWeight: 800, fill: done ? "var(--good-ink)" : deg === 0 || left ? "var(--card)" : "var(--fg)" }}>
                        {done ? "✓" : deg}
                      </text>
                    </m.g>
                  </g>
                );
              })}
            </g>
          </g>
          <g aria-hidden="true">
            <text x={L.px} y={L.qy - 8} className="muted-text" style={{ fontSize: 12 }}>
              Ready queue (in-degree 0)
              {s.queue.length > qShow ? `, +${s.queue.length - qShow}` : ""}
            </text>
            {s.queue.length === 0 && (
              <text
                x={L.px}
                y={L.qy + 16}
                style={{
                  fontSize: 12,
                  fontWeight: 650,
                  fill: stuck ? "var(--critical-ink)" : "var(--muted)",
                }}
              >
                {stuck ? `✕ empty, ${N - s.order.length} left: cycle` : "empty"}
              </text>
            )}
            <text x={L.px} y={L.oy - 8} className="muted-text" style={{ fontSize: 12 }}>
              {mode === "one" ? "Order so far" : `Semesters so far: ${s.rounds}`}
            </text>
            <AnimatePresence initial={false}>
              {chips.map(({ v, at, tone }) => (
                <m.g
                  key={`c${v}`}
                  initial={
                    reduce
                      ? false
                      : {
                          x: COURSES[v].x - CW / 2,
                          y: COURSES[v].y + L.gy - 11,
                          opacity: 0,
                        }
                  }
                  animate={{ x: at.x, y: at.y, opacity: 1 }}
                  exit={{
                    opacity: 0,
                    transition: { duration: reduce ? 0 : 0.2 },
                  }}
                  transition={{
                    duration: reduce ? 0 : 0.45,
                    ease: [0.4, 0, 0.2, 1],
                  }}
                >
                  <rect
                    width={CW}
                    height={CHIP_H}
                    rx={6}
                    fill={tone === "ready" ? "color-mix(in srgb, var(--accent) 16%, var(--card))" : "var(--card-2)"}
                    stroke={tone === "ready" ? "var(--accent)" : "var(--border-strong)"}
                  />
                  <text x={CW / 2} y={15} textAnchor="middle" style={{ fontSize: 11, fontWeight: 650 }}>
                    {tone === "ready" ? label(v) : mode === "one" ? `${s.order.indexOf(v) + 1}. ${label(v)}` : `S${s.sem[v]} ${label(v)}`}
                  </text>
                </m.g>
              ))}
            </AnimatePresence>
          </g>
        </svg>
      </div>

      <p className="muted" style={{ fontSize: 13, margin: "4px 0 0" }}>
        {click === "edge" ? (
          from === null ? (
            "Click the course that must come first."
          ) : (
            `Now click the course that needs ${label(from)} (or ${label(from)} again to cancel).`
          )
        ) : cycle ? (
          <span className="bad-ink">✕ The arrows contain a cycle: {cycle.map(label).join(" → ")}.</span>
        ) : done ? (
          "Every course is placed. Reset to go again, or change a prerequisite."
        ) : (
          "Your turn: click any course whose badge shows 0."
        )}
      </p>
      <p className="readout" aria-live="polite">
        {said}
        <ReducedNote reduce={reduce} what="Reduced motion: no auto-play; Step takes one course." />
      </p>
      <More label="Edit prerequisites">
        <div className="controls">
          <Seg<"take" | "edge">
            label="Click a course to"
            value={click}
            onChange={(v) => {
              setClick(v);
              setFrom(null);
            }}
            options={[
              { value: "take", label: "Take it" },
              { value: "edge", label: "Add or remove a prerequisite" },
            ]}
          />
          <button type="button" className="wbtn" onClick={() => setEdges(DEFAULT_EDGES, null)}>
            Default courses
          </button>
        </div>
      </More>
    </WidgetFrame>
  );
}
