"use client";
import { useCallback, useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, m } from "motion/react";
import { mulberry32 } from "@/lib/rng";
import { useFixedStep } from "@/lib/sim-loop";
import { useNarrow } from "@/lib/hooks";
import { ReducedNote, SimButtons, useSimGate, useThrottled } from "./lib/sim-kit";
import { More, Seg, Slider, WidgetFrame } from "./WidgetFrame";

// ---------------------------------------------------------------- model (pure, tested)
export const ROWS = 8;
export const COLS = 11;
export const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const; // the page's order: down, up, right, left
export type Algo = "bfs" | "dfs";
export interface Maze {
  walls: boolean[];
  start: number;
  goal: number;
}
export interface Search {
  algo: Algo;
  /** The queue (read from `head`) or the stack (top = last). */
  frontier: number[];
  head: number;
  /** Steps from the start along the search tree, -1 = never seen. Set when a cell is pushed (marked on push). */
  dist: number[];
  parent: number[];
  /** Cells in the order they were taken out (visited). */
  order: number[];
  current: number | null;
  found: boolean;
  done: boolean;
  /** Neighbour checks made (in-bounds neighbours looked at). */
  checks: number;
  acc: number;
}

export const id = (r: number, c: number) => r * COLS + c;
export const rc = (cell: number) => [Math.floor(cell / COLS), cell % COLS] as const;
export function neighbours(cell: number) {
  const [r, c] = rc(cell);
  const out: number[] = [];
  for (const [dr, dc] of DIRS) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) out.push(id(nr, nc));
  }
  return out;
}

export function initSearch(maze: Maze, algo: Algo): Search {
  const dist = new Array<number>(ROWS * COLS).fill(-1);
  dist[maze.start] = 0; // mark the start when it is pushed
  return { algo, frontier: [maze.start], head: 0, dist, parent: new Array<number>(ROWS * COLS).fill(-1), order: [], current: null, found: false, done: false, checks: 0, acc: 0 };
}

export const pending = (s: Search) => (s.algo === "bfs" ? s.frontier.slice(s.head) : s.frontier);

/** Take one cell out of the queue or stack, then mark and push its open, unseen neighbours. */
export function stepSearch(maze: Maze, s: Search): Search {
  if (s.done) return s;
  const frontier = s.frontier.slice();
  let head = s.head;
  let cell: number | undefined;
  if (s.algo === "bfs") cell = head < frontier.length ? frontier[head++] : undefined;
  else cell = frontier.pop();
  if (cell === undefined) return { ...s, current: null, done: true };
  const order = [...s.order, cell];
  if (cell === maze.goal) return { ...s, frontier, head, order, current: cell, found: true, done: true };
  const dist = s.dist.slice();
  const parent = s.parent.slice();
  let checks = s.checks;
  for (const n of neighbours(cell)) {
    checks++;
    if (dist[n] !== -1 || maze.walls[n]) continue;
    dist[n] = dist[cell] + 1;
    parent[n] = cell;
    frontier.push(n);
  }
  return { ...s, frontier, head, dist, parent, order, current: cell, checks };
}

export function pathTo(s: Search, goal: number): number[] {
  if (!s.found) return [];
  const path = [goal];
  while (s.parent[path[0]] !== -1) path.unshift(s.parent[path[0]]);
  return path;
}

/** Reference answer: true shortest distances by plain BFS (used for "the shortest is …"). */
export function shortest(maze: Maze): number[] {
  const dist = new Array<number>(ROWS * COLS).fill(-1);
  dist[maze.start] = 0;
  const q = [maze.start];
  for (let h = 0; h < q.length; h++) {
    for (const n of neighbours(q[h])) {
      if (dist[n] !== -1 || maze.walls[n]) continue;
      dist[n] = dist[q[h]] + 1;
      q.push(n);
    }
  }
  return dist;
}

export const START = id(1, 1);
export const GOAL = id(6, 9);
/** Random walls (about 27%), never on the start or goal, re-rolled until the goal is reachable. */
export function randomMaze(seed: number, start = START, goal = GOAL): Maze {
  for (let s = seed; ; s++) {
    const r = mulberry32(s * 7919 + 1);
    const walls = Array.from({ length: ROWS * COLS }, (_, i) => i !== start && i !== goal && r() < 0.27);
    const maze = { walls, start, goal };
    if (shortest(maze)[goal] >= 0) return maze;
  }
}

/** Apply a click: toggle (or paint) a wall, or move the start or goal onto an open cell. */
export function edit(maze: Maze, cell: number, tool: Tool, paint?: boolean): Maze {
  if (tool === "wall") {
    if (cell === maze.start || cell === maze.goal) return maze;
    const walls = maze.walls.slice();
    walls[cell] = paint ?? !walls[cell];
    return { ...maze, walls };
  }
  if (cell === maze.start || cell === maze.goal) return maze;
  const walls = maze.walls.slice();
  walls[cell] = false;
  return tool === "start" ? { ...maze, walls, start: cell } : { ...maze, walls, goal: cell };
}
export type Tool = "wall" | "start" | "goal";

// ---------------------------------------------------------------- picture
const CS = 28;
const GRID_W = COLS * CS;
const GRID_H = ROWS * CS;
const CHIP = 25;
/**
 * Wide (desktop pane): the queue or stack is a block of chips beside the maze, so many more of them show.
 * Narrow (phones): one strip of chips under the maze.
 */
const WIDE = { W: GRID_W + 182, H: GRID_H + 8, x0: 4, sx: GRID_W + 22, sy: 44, perRow: 5, show: 35 };
const NARROW = { W: 320, H: GRID_H + 68, x0: (320 - GRID_W) / 2, sx: (320 - GRID_W) / 2, sy: GRID_H + 34, perRow: 11, show: 11 };
type Lay = typeof WIDE;
const Y0 = 4;
const name = (cell: number) => `(${rc(cell)[0]}, ${rc(cell)[1]})`;
const SPEED_MS = [700, 420, 250, 140, 70];

function describe(maze: Maze, s: Search, best: number) {
  const box = s.algo === "bfs" ? "queue" : "stack";
  const left = pending(s).length;
  if (s.found) {
    const len = s.dist[maze.goal];
    return s.algo === "bfs"
      ? `Goal reached after visiting ${s.order.length} cells: ${len} steps, the shortest possible, because BFS reaches cells in order of distance.`
      : `DFS reached the goal after visiting ${s.order.length} cells, along a ${len}-step path. ${len > best ? `The shortest is ${best}: DFS finds a path, not the shortest one.` : "That happens to be the shortest here, by luck of the dive."}`;
  }
  if (s.done) return `The ${box} ran dry after ${s.order.length} cells: walls cut the goal off, so there is no path.`;
  if (s.current === null) return `Paint walls, then press Run. ${s.algo === "bfs" ? "BFS uses a queue, so it finishes every cell at distance d before any at d + 1." : "DFS uses a stack, so it always continues from the newest cell."}`;
  const added = pending(s).filter((c) => s.parent[c] === s.current).length;
  return `${s.algo === "bfs" ? "Took" : "Popped"} ${name(s.current)} at ${s.dist[s.current]} steps from the start; ${added ? `marked and pushed ${added} new neighbour${added > 1 ? "s" : ""}` : "no new neighbours"}. The ${box} holds ${left}.`;
}

// ---------------------------------------------------------------- widget
export function GraphTraversalLab() {
  const [maze, setMaze] = useState<Maze>(() => randomMaze(1));
  const [algo, setAlgo] = useState<Algo>("bfs");
  const [tool, setTool] = useState<Tool>("wall");
  const [speed, setSpeed] = useState(3);
  const [running, setRunning] = useState(false);
  const [cursor, setCursor] = useState<number | null>(null);
  const seed = useRef(1);
  const paint = useRef<boolean | null>(null);
  const { ref, inView, reduce } = useSimGate<HTMLDivElement>();
  const L: Lay = useNarrow(ref, 480) ? NARROW : WIDE;
  const X0 = L.x0;
  const cx = (cell: number) => X0 + rc(cell)[1] * CS + CS / 2;
  const cy = (cell: number) => Y0 + rc(cell)[0] * CS + CS / 2;
  const chipAt = (i: number) => ({ x: L.sx + (i % L.perRow) * (CHIP + 3), y: L.sy + Math.floor(i / L.perRow) * 27 });
  const every = SPEED_MS[speed - 1];
  const tick = useCallback(
    (s: Search, dt: number) => {
      const acc = s.acc + dt;
      return acc < every ? { ...s, acc } : { ...stepSearch(maze, s), acc: 0 };
    },
    [every, maze],
  );
  const [s, reset] = useFixedStep<Search>(() => initSearch(maze, "bfs"), tick, running && inView && !reduce);
  const live = running && !s.done;

  const restart = (mz: Maze, a: Algo = algo) => {
    setRunning(false);
    setMaze(mz);
    reset(initSearch(mz, a));
  };
  const apply = (cell: number, paintTo?: boolean) => {
    const next = edit(maze, cell, tool, paintTo);
    if (next !== maze) restart(next);
  };
  const best = shortest(maze)[maze.goal];
  const path = pathTo(s, maze.goal);
  const front = pending(s);
  const inFront = new Set(front);
  const sentence = describe(maze, s, best);
  const said = useThrottled(sentence, 700);
  const open = maze.walls.filter((w) => !w).length;
  const deepest = Math.max(1, ...s.order.map((c) => s.dist[c]));
  const shown = algo === "bfs" ? front.slice(0, L.show) : front.slice(-L.show);
  const wide = L === WIDE;

  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    const cur = cursor ?? maze.start;
    const [r, c] = rc(cur);
    const moves: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (moves[e.key]) {
      e.preventDefault();
      const [dr, dc] = moves[e.key];
      setCursor(id(Math.min(ROWS - 1, Math.max(0, r + dr)), Math.min(COLS - 1, Math.max(0, c + dc))));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      apply(cur);
    }
  };

  return (
    <WidgetFrame title="Maze flood: BFS vs DFS" sub="Paint walls, move the start and goal, then race a queue against a stack. BFS spreads in rings; DFS dives down one corridor.">
      <div className="controls">
        <SimButtons
          running={live && !reduce}
          reduce={reduce}
          onToggle={() => {
            if (s.done) reset(initSearch(maze, algo));
            setRunning(s.done || !running);
          }}
          onStep={() => reset(stepSearch(maze, s))}
          stepHint="Take one cell out and push its neighbours"
          onReset={() => restart(maze)}
        />
        <Seg<Algo> labelMode="hidden"
          label="Search: BFS uses a queue, DFS a stack"
          value={algo}
          onChange={(a) => {
            setAlgo(a);
            restart(maze, a);
          }}
          options={[
            { value: "bfs", label: "BFS" },
            { value: "dfs", label: "DFS" },
          ]}
        />
        <Seg<Tool> labelMode="inline"
          label="Click places"
          value={tool}
          onChange={setTool}
          options={[
            { value: "wall", label: "Wall" },
            { value: "start", label: "Start" },
            { value: "goal", label: "Goal" },
          ]}
        />
      </div>

      <div ref={ref}>
        <svg
          viewBox={`0 0 ${L.W} ${L.H}`}
          className="sim-svg"
          role="group"
          tabIndex={0}
          onKeyDown={onKey}
          onFocus={() => setCursor((c) => c ?? maze.start)}
          onBlur={() => setCursor(null)}
          onPointerUp={() => (paint.current = null)}
          onPointerLeave={() => (paint.current = null)}
          aria-label={`Maze, ${ROWS} by ${COLS}. Start ${name(maze.start)}, goal ${name(maze.goal)}, ${ROWS * COLS - open} walls. Click a cell, or use the arrow keys and Space, to place a ${tool}. ${s.order.length} cells visited.`}
          style={{ maxWidth: wide ? 640 : 480, margin: "0 auto", touchAction: "none", outline: "none" }}
        >
          <g aria-hidden="true">
            {maze.walls.map((wall, cell) => (
              <rect
                key={cell}
                x={X0 + rc(cell)[1] * CS + 1}
                y={Y0 + rc(cell)[0] * CS + 1}
                width={CS - 2}
                height={CS - 2}
                rx={4}
                fill={wall ? "color-mix(in srgb, var(--fg) 42%, var(--card))" : "var(--card-2)"}
                stroke={wall ? "none" : "var(--border)"}
                style={{ cursor: "pointer" }}
                onPointerDown={(e) => {
                  e.preventDefault();
                  paint.current = tool === "wall" ? !wall : null;
                  apply(cell, paint.current ?? undefined);
                }}
                onPointerEnter={(e) => {
                  if (paint.current !== null && e.buttons === 1) apply(cell, paint.current);
                }}
              />
            ))}
            {s.order.map((cell) => {
              const d = s.dist[cell];
              return (
                <m.rect
                  key={`v${cell}`}
                  pointerEvents="none"
                  x={X0 + rc(cell)[1] * CS + 1}
                  y={Y0 + rc(cell)[0] * CS + 1}
                  width={CS - 2}
                  height={CS - 2}
                  rx={4}
                  fill={`color-mix(in srgb, var(--accent) ${Math.round(42 - (26 * d) / deepest)}%, var(--card))`}
                  initial={reduce ? false : { opacity: 0, scale: 0.3 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: reduce ? 0 : 0.3 }}
                  style={{ transformBox: "fill-box", transformOrigin: "center" }}
                />
              );
            })}
            {front.map((cell) => (
              <rect key={`f${cell}`} pointerEvents="none" x={X0 + rc(cell)[1] * CS + 3} y={Y0 + rc(cell)[0] * CS + 3} width={CS - 6} height={CS - 6} rx={3} fill="color-mix(in srgb, var(--k-client) 14%, var(--card))" stroke="var(--k-client)" strokeWidth={1.6} strokeDasharray="3 2" />
            ))}
            {s.dist.map((d, cell) =>
              d >= 0 && cell !== maze.start && cell !== maze.goal ? (
                <text key={`d${cell}`} pointerEvents="none" x={cx(cell)} y={cy(cell) + 4} textAnchor="middle" style={{ fontSize: 10.5, fontWeight: 650, fill: inFront.has(cell) ? "var(--k-client)" : "var(--fg)", fontVariantNumeric: "tabular-nums" }}>
                  {d}
                </text>
              ) : null,
            )}
            {path.length > 1 && <m.polyline key={`p${s.algo}${path.length}`} pointerEvents="none" points={path.map((c) => `${cx(c)},${cy(c)}`).join(" ")} fill="none" stroke="var(--good)" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.75} initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduce ? 0 : Math.min(1.6, path.length * 0.06) }} />}
            {s.current !== null && (
              <m.rect key={`c${s.order.length}`} pointerEvents="none" x={X0 + rc(s.current)[1] * CS} y={Y0 + rc(s.current)[0] * CS} width={CS} height={CS} rx={5} fill="none" stroke="var(--accent)" strokeWidth={3} initial={reduce ? false : { scale: 1.5, opacity: 0.2 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: reduce ? 0 : 0.25 }} style={{ transformBox: "fill-box", transformOrigin: "center" }} />
            )}
            {[
              { cell: maze.start, t: "S", c: "var(--accent-2)" },
              { cell: maze.goal, t: "G", c: s.found ? "var(--good)" : "var(--critical)" },
            ].map((p) => (
              <m.g key={p.t} pointerEvents="none" initial={false} animate={{ x: cx(p.cell), y: cy(p.cell) }} transition={{ duration: reduce ? 0 : 0.25 }}>
                <circle r={10.5} fill={p.c} />
                <text y={4.5} textAnchor="middle" style={{ fontSize: 12.5, fontWeight: 800, fill: "var(--card)" }}>
                  {p.t}
                </text>
              </m.g>
            ))}
            {cursor !== null && <rect pointerEvents="none" x={X0 + rc(cursor)[1] * CS - 1} y={Y0 + rc(cursor)[0] * CS - 1} width={CS + 2} height={CS + 2} rx={6} fill="none" stroke="var(--fg)" strokeWidth={2} strokeDasharray="4 3" />}
            {wide ? (
              <>
                <text x={L.sx} y={Y0 + 14} style={{ fontSize: 12.5, fontWeight: 700 }}>
                  {algo === "bfs" ? "Queue" : "Stack"} ({front.length})
                </text>
                <text x={L.sx} y={Y0 + 30} className="muted-text" style={{ fontSize: 11.5 }}>
                  {algo === "bfs" ? "front → back" : "bottom → top"}, steps
                </text>
              </>
            ) : (
              <text x={L.sx} y={L.sy - 9} className="muted-text" style={{ fontSize: 12 }}>
                {algo === "bfs" ? `Queue, front → back (${front.length}): steps from start` : `Stack, bottom → top (${front.length}): steps from start`}
              </text>
            )}
            {front.length === 0 && (
              <text x={L.sx} y={L.sy + 16} className="muted-text" style={{ fontSize: 12 }}>
                empty
              </text>
            )}
            <AnimatePresence initial={false}>
              {shown.map((cell, i) => {
                const at = chipAt(i);
                return (
                  <m.g key={`q${cell}`} initial={reduce ? false : { opacity: 0, x: cx(cell) - CHIP / 2, y: cy(cell) - 11 }} animate={{ opacity: 1, x: at.x, y: at.y }} exit={{ opacity: 0, y: at.y - 14, transition: { duration: reduce ? 0 : 0.2 } }} transition={{ duration: reduce ? 0 : 0.3 }}>
                    <rect width={CHIP} height={22} rx={5} fill="color-mix(in srgb, var(--k-client) 14%, var(--card))" stroke="var(--k-client)" />
                    <text x={CHIP / 2} y={15.5} textAnchor="middle" style={{ fontSize: 11.5, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                      {s.dist[cell]}
                    </text>
                  </m.g>
                );
              })}
            </AnimatePresence>
            {front.length > L.show && (
              <text x={wide ? L.sx : L.W - X0} y={wide ? L.sy + Math.ceil(L.show / L.perRow) * 27 + 12 : L.sy - 9} textAnchor={wide ? "start" : "end"} className="muted-text" style={{ fontSize: 11.5 }}>
                +{front.length - L.show} more
              </text>
            )}
          </g>
        </svg>
      </div>

      <p className="muted" style={{ fontSize: 13, margin: "6px 0 0", display: "flex", flexWrap: "wrap", gap: "4px 14px" }}>
        <span>
          Visited: <b style={{ color: "var(--fg)" }}>{s.order.length}</b> of {open} open cells
        </span>
        <span>
          Neighbour checks: <b style={{ color: "var(--fg)" }}>{s.checks}</b>
        </span>
        <span>
          Path:{" "}
          <b style={{ color: "var(--fg)" }}>
            {s.found ? `${path.length - 1} steps ${path.length - 1 === best ? "✓ shortest" : `(shortest ${best})`}` : s.done ? "✕ none" : "searching"}
          </b>
        </span>
      </p>
      <p className="readout" aria-live="polite">
        {said}
        <ReducedNote reduce={reduce} what="Reduced motion: no auto-play; Step visits one cell." />
      </p>
      <More label="Speed and maze">
        <div className="controls">
          <Slider label="Speed" value={speed} min={1} max={5} onChange={setSpeed} />
          <button
            type="button"
            className="wbtn"
            onClick={() => {
              seed.current += 1;
              restart(randomMaze(seed.current, maze.start, maze.goal));
            }}
          >
            New maze
          </button>
          <button type="button" className="wbtn" onClick={() => restart({ ...maze, walls: maze.walls.map(() => false) })}>
            Clear walls
          </button>
        </div>
      </More>
    </WidgetFrame>
  );
}
