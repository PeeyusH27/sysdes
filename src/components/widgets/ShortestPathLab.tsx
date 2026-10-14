"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { AnimatePresence, m } from "motion/react";
import { RotateCcw, Shuffle } from "lucide-react";
import { mulberry32 } from "@/lib/rng";
import { useFixedStep } from "@/lib/sim-loop";
import { ReducedNote, SimButtons, useSimGate, useThrottled } from "./lib/sim-kit";
import { More, Slider, WidgetFrame } from "./WidgetFrame";

// ---------------------------------------------------------------- model (pure, tested)
export interface Road {
  a: number;
  b: number;
  w: number;
}
export interface Entry {
  d: number;
  v: number;
  seq: number;
}
export interface Relax {
  v: number;
  road: number;
  from: number;
  to: number;
  better: boolean;
}
export type Last = { kind: "start" } | { kind: "settle"; u: number; relax: Relax[] } | { kind: "stale"; u: number; d: number };
export interface DState {
  src: number;
  dist: number[];
  prev: number[];
  settled: boolean[];
  heap: Entry[];
  order: number[];
  seq: number;
  checks: number;
  pops: number;
  stale: number;
  last: Last;
}

export const NAMES = ["A", "B", "C", "D", "E", "F"];
const POS: [number, number][] = [
  [48, 140],
  [158, 56],
  [158, 224],
  [276, 140],
  [394, 56],
  [394, 224],
];
export const ROADS: Road[] = [
  { a: 0, b: 1, w: 4 },
  { a: 0, b: 2, w: 2 },
  { a: 1, b: 2, w: 1 },
  { a: 1, b: 3, w: 5 },
  { a: 2, b: 3, w: 8 },
  { a: 1, b: 4, w: 10 },
  { a: 3, b: 4, w: 3 },
  { a: 3, b: 5, w: 6 },
  { a: 4, b: 5, w: 1 },
  { a: 2, b: 5, w: 12 },
];
export const MAX_W = 15;

export const neighbours = (roads: Road[], u: number) => roads.flatMap((r, i) => (r.a === u ? [{ v: r.b, w: r.w, road: i }] : r.b === u ? [{ v: r.a, w: r.w, road: i }] : [])).sort((x, y) => x.v - y.v);

export function initState(n: number, src: number): DState {
  const dist = Array<number>(n).fill(Infinity);
  dist[src] = 0;
  return {
    src,
    dist,
    prev: Array<number>(n).fill(-1),
    settled: Array<boolean>(n).fill(false),
    heap: [{ d: 0, v: src, seq: 0 }],
    order: [],
    seq: 1,
    checks: 0,
    pops: 0,
    stale: 0,
    last: { kind: "start" },
  };
}

const byDist = (x: Entry, y: Entry) => x.d - y.d || x.seq - y.seq;
export const sortedHeap = (s: DState) => [...s.heap].sort(byDist);
/** An entry is stale when its node is settled or a cheaper route was pushed after it (lazy deletion). */
export const isStale = (s: DState, e: Entry) => s.settled[e.v] || e.d > s.dist[e.v];
export const frontier = (s: DState) => s.dist.flatMap((d, v) => (!s.settled[v] && d < Infinity ? [v] : []));
export const complete = (s: DState) => s.heap.length === 0;

function settle(roads: Road[], s: DState, u: number, heap: Entry[]): DState {
  const dist = [...s.dist];
  const prev = [...s.prev];
  const settled = [...s.settled];
  settled[u] = true;
  let seq = s.seq;
  const relax: Relax[] = [];
  for (const { v, w, road } of neighbours(roads, u)) {
    const from = dist[v];
    const to = dist[u] + w;
    const better = to < from;
    if (better) {
      dist[v] = to;
      prev[v] = u;
      heap.push({ d: to, v, seq: seq++ });
    }
    relax.push({ v, road, from, to, better });
  }
  return { ...s, dist, prev, settled, heap, seq, order: [...s.order, u], checks: s.checks + relax.length, pops: s.pops + 1, last: { kind: "settle", u, relax } };
}

/** One heap pop: skip it if stale, otherwise settle the node and relax all its roads. */
export function stepDijkstra(roads: Road[], s: DState): DState {
  if (complete(s)) return s;
  const top = sortedHeap(s)[0];
  const heap = s.heap.filter((e) => e.seq !== top.seq);
  if (isStale(s, top)) return { ...s, heap, pops: s.pops + 1, stale: s.stale + 1, last: { kind: "stale", u: top.v, d: top.d } };
  return settle(roads, s, top.v, heap);
}

/** "You pick" mode: settle `u` only if it is a closest unsettled node. Stale entries are cleared. */
export function pickNode(roads: Road[], s: DState, u: number): DState | null {
  const f = frontier(s);
  if (!f.includes(u) || s.dist[u] !== Math.min(...f.map((v) => s.dist[v]))) return null;
  const next = settle(
    roads,
    s,
    u,
    s.heap.filter((e) => e.v !== u),
  );
  const heap = next.heap.filter((e) => !isStale(next, e));
  return { ...next, heap, stale: next.stale + next.heap.length - heap.length };
}

export function runAll(roads: Road[], n: number, src: number) {
  let s = initState(n, src);
  for (let i = 0; i < 10_000 && !complete(s); i++) s = stepDijkstra(roads, s);
  return s;
}

export function routeTo(s: DState, t: number): number[] | null {
  if (s.dist[t] === Infinity) return null;
  const path = [t];
  while (path[0] !== s.src) {
    const p = s.prev[path[0]];
    if (p < 0 || path.length > s.dist.length) return null;
    path.unshift(p);
  }
  return path;
}

export const roadBetween = (roads: Road[], a: number, b: number) => roads.findIndex((r) => (r.a === a && r.b === b) || (r.a === b && r.b === a));

/** Brute force: every simple route from s to t (what you'd add up without Dijkstra). */
export function allRoutes(roads: Road[], n: number, s: number, t: number) {
  const out: { path: number[]; cost: number }[] = [];
  const seen = Array<boolean>(n).fill(false);
  const go = (u: number, path: number[], cost: number) => {
    if (u === t) return void out.push({ path: [...path], cost });
    seen[u] = true;
    for (const { v, w } of neighbours(roads, u)) if (!seen[v]) go(v, [...path, v], cost + w);
    seen[u] = false;
  };
  go(s, [s], 0);
  return out;
}

export const shuffleWeights = (roads: Road[], seed: number) => {
  const rnd = mulberry32(seed);
  return roads.map((r) => ({ ...r, w: 1 + Math.floor(rnd() * 12) }));
};

// ---------------------------------------------------------------- view helpers
const N = NAMES.length;
const SRC = 0;
const MAP_W = 440;
const MAP_H = 276;
const R = 20;
/**
 * Wide (desktop pane): the heap is a column beside the map, closest entry on top. Narrow (phones): the heap is a strip
 * under the map and the type is drawn 1.3× bigger, since the whole drawing shrinks to the phone's width.
 */
const WIDE = { W: 600, H: MAP_H, k: 1 };
const NARROW = { W: MAP_W, H: MAP_H + 84, k: 1.3 };
const HX = MAP_W + 16;
const ROWS = 8;
const fmtD = (d: number) => (d === Infinity ? "∞" : String(d));
const pathText = (p: number[]) => p.map((v) => NAMES[v]).join(" → ");

/** A segmented control with its name inline (or announced only), so the toolbar stays one row. */
function Pick<T extends string | number>({ label, show = false, value, options, onChange }: { label: string; show?: boolean; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {show && (
        <span className="muted" style={{ fontSize: 12.5 }} aria-hidden>
          {label}
        </span>
      )}
      <div className="seg" role="group" aria-label={label}>
        {options.map((o) => (
          <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** True once the element is narrower than `px` (false on the server and until measured). */
function useNarrow(ref: RefObject<HTMLElement | null>, px = 480) {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setNarrow(e.contentRect.width < px));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, px]);
  return narrow;
}

function describe(s: DState, goal: number, pick: boolean, routes: number) {
  const route = routeTo(s, goal);
  const goalLine = s.settled[goal] && route ? ` ${NAMES[goal]} is settled, so its cost is final: ${pathText(route)} = ${s.dist[goal]}.` : "";
  if (complete(s)) {
    if (!route) return `Heap empty. ${NAMES[goal]} can't be reached.`;
    return `Heap empty, every distance is final. Best route ${pathText(route)} costs ${s.dist[goal]}, after ${s.checks} road checks. Brute force would add up all ${routes} routes.`;
  }
  const last = s.last;
  if (last.kind === "start")
    return pick
      ? "Your turn. Settle the unsettled town with the smallest distance: only A has one, 0."
      : "A starts at 0, everything else at ∞. Press Step: Dijkstra pops the closest entry from the heap.";
  if (last.kind === "stale") return `Popped [${last.d}, ${NAMES[last.u]}], but ${NAMES[last.u]} is already settled at ${s.dist[last.u]}. Stale entry: skip it.${goalLine}`;
  const parts = last.relax.map((r) => (r.better ? `${NAMES[r.v]} ${fmtD(r.from)} → ${r.to}` : `${NAMES[r.v]} stays ${fmtD(r.from)}`));
  return `Settled ${NAMES[last.u]} at ${s.dist[last.u]}: no cheaper way in exists. Relaxed its roads: ${parts.join(", ")}.${goalLine}`;
}

// ---------------------------------------------------------------- widget
export function ShortestPathLab() {
  const [roads, setRoads] = useState<Road[]>(ROADS);
  const [goal, setGoal] = useState(5);
  const [mode, setMode] = useState<"watch" | "pick">("watch");
  const [sel, setSel] = useState(3);
  const [seed, setSeed] = useState(1);
  const [running, setRunning] = useState(false);
  const [miss, setMiss] = useState<{ u: number; n: number } | null>(null);
  const { ref, inView, reduce } = useSimGate<HTMLDivElement>();
  const L = useNarrow(ref) ? NARROW : WIDE;
  const k = L.k;
  const more = useRef<HTMLDivElement>(null);

  const step = useCallback((s: DState) => stepDijkstra(roads, s), [roads]);
  const [st, reset] = useFixedStep<DState>(() => initState(N, SRC), step, running && inView && !reduce && mode === "watch", 1100);
  const done = complete(st);
  const routes = useMemo(() => allRoutes(roads, N, SRC, goal).length, [roads, goal]);
  const route = st.settled[goal] ? routeTo(st, goal) : null;
  const routeRoads = new Set(route ? route.slice(1).map((v, i) => roadBetween(roads, route[i], v)) : []);
  const tree = new Set(st.order.filter((v) => v !== SRC).map((v) => roadBetween(roads, v, st.prev[v])));
  const pickMode = mode === "pick";
  const heap = pickMode ? [...st.heap].sort((a, b) => a.seq - b.seq) : sortedHeap(st);
  const last = st.last;
  const lit = last.kind === "settle" ? last.u : last.kind === "stale" ? last.u : -1;
  const better = new Set(last.kind === "settle" ? last.relax.filter((r) => r.better).map((r) => r.v) : []);

  const edit = (next: Road[]) => {
    setRoads(next);
    setMiss(null);
    reset(done && mode === "watch" ? runAll(next, N, SRC) : initState(N, SRC));
  };
  const restart = () => {
    setMiss(null);
    setRunning(false);
    reset(initState(N, SRC));
  };
  const pick = (u: number) => {
    const next = pickNode(roads, st, u);
    if (next) {
      setMiss(null);
      reset(next);
    } else setMiss((p) => ({ u, n: (p?.n ?? 0) + 1 }));
  };
  /** Clicking a road's length selects it and opens the road editor. */
  const choose = (i: number) => {
    setSel(i);
    const d = more.current?.querySelector("details");
    if (d) d.open = true;
  };

  let sentence = describe(st, goal, mode === "pick", routes);
  if (mode === "pick" && miss && !done) {
    const f = frontier(st);
    const best = f.reduce((a, v) => (st.dist[v] < st.dist[a] ? v : a), f[0]);
    sentence = `Not ${NAMES[miss.u]} yet: ${NAMES[best]} is closer (${st.dist[best]} < ${st.dist[miss.u]}). Dijkstra always settles the closest unsettled town.`;
  }
  const said = useThrottled(sentence, 700);

  const label = `Road map, start A, goal ${NAMES[goal]}. Distances: ${NAMES.map((n, v) => `${n} ${fmtD(st.dist[v])}${st.settled[v] ? " settled" : ""}`).join(", ")}. Heap: ${heap.map((e) => `${e.d} ${NAMES[e.v]}${isStale(st, e) ? " stale" : ""}`).join(", ") || "empty"}.`;
  const wide = L === WIDE;
  const twoCols = heap.length > ROWS;
  const slot = Math.min(58 * k, (MAP_W - 10 - 54 * k) / Math.max(1, heap.length - 1));
  const heapAt = (i: number) => (wide ? { x: HX + (twoCols ? Math.floor(i / ROWS) * 70 : 0), y: 30 + (i % ROWS) * 28 } : { x: 10 + i * slot, y: MAP_H + 24 });
  const chipW = wide ? 64 : 54 * k;
  const chipH = wide ? 24 : 28 * k;

  return (
    <WidgetFrame title="Dijkstra's road trip" sub="Six towns, ten two-way roads. Watch Dijkstra settle the closest town first, or be the heap yourself. Change a road and the route reroutes.">
      <div className="controls">
        <Pick<"watch" | "pick">
          label="Mode"
          value={mode}
          onChange={(v) => {
            setMode(v);
            restart();
          }}
          options={[
            { value: "watch", label: "Watch" },
            { value: "pick", label: "You pick" },
          ]}
        />
        {mode === "watch" && (
          <SimButtons
            running={running && !done}
            reduce={reduce}
            onToggle={() => {
              if (done) restart();
              setRunning((r) => !r || done);
            }}
            onStep={() => reset(stepDijkstra(roads, st))}
            stepHint="Pop the closest heap entry"
            onReset={restart}
          />
        )}
        {mode === "pick" && (
          <button type="button" className="wbtn" onClick={restart}>
            <RotateCcw size={14} aria-hidden /> Start over
          </button>
        )}
        <Pick<number> label="Goal" show value={goal} onChange={setGoal} options={[1, 2, 3, 4, 5].map((v) => ({ value: v, label: NAMES[v] }))} />
      </div>

      {mode === "pick" && !done ? (
        <div className="controls" role="group" aria-label="Settle a town" style={{ margin: "0 0 4px", alignItems: "center", gap: 6 }}>
          <span className="muted" style={{ fontSize: 13 }}>
            Settle next:
          </span>
          {frontier(st).map((v) => (
            <button key={v} type="button" className="wbtn" onClick={() => pick(v)}>
              {NAMES[v]} · {st.dist[v]}
            </button>
          ))}
        </div>
      ) : (
        <p className="muted" style={{ fontSize: 13, margin: "0 0 4px" }}>
          Start A · goal {NAMES[goal]} (outer ring) · filled = settled · dashed = in the heap
          {route && (
            <>
              {" "}
              · route{" "}
              <b>
                {pathText(route)} = {st.dist[goal]}
              </b>
            </>
          )}
        </p>
      )}
      <div ref={ref}>
        <svg viewBox={`0 0 ${L.W} ${L.H}`} className="sim-svg" role="img" aria-label={label} style={{ maxWidth: wide ? 660 : 560, margin: "0 auto" }}>
          {wide && <line x1={MAP_W + 4} x2={MAP_W + 4} y1={8} y2={MAP_H - 8} stroke="var(--border)" />}
          {roads.map((r, i) => {
            const [x1, y1] = POS[r.a];
            const [x2, y2] = POS[r.b];
            const onRoute = routeRoads.has(i);
            return (
              <g key={i}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={onRoute ? "var(--series-2)" : tree.has(i) ? "var(--accent)" : "var(--border-strong)"}
                  strokeWidth={onRoute ? 6 : tree.has(i) ? 3.5 : 2.5}
                  strokeLinecap="round"
                  opacity={onRoute || tree.has(i) ? 0.9 : 1}
                />
                <g transform={`translate(${(x1 + x2) / 2} ${(y1 + y2) / 2}) scale(${k})`} onClick={() => choose(i)} style={{ cursor: "pointer" }}>
                  <rect x={-14} y={-11} width={28} height={22} rx={7} fill="var(--card)" stroke={i === sel ? "var(--accent)" : "var(--border)"} strokeWidth={i === sel ? 2 : 1} />
                  <text y={5} textAnchor="middle" style={{ fontSize: 14, fontWeight: i === sel ? 800 : 600 }}>
                    {r.w}
                  </text>
                </g>
              </g>
            );
          })}
          {!reduce &&
            last.kind === "settle" &&
            last.relax.map((rx) => (
              <m.g
                key={`${st.pops}-${rx.road}`}
                initial={{ x: POS[last.u][0], y: POS[last.u][1], opacity: 1 }}
                animate={{ x: POS[rx.v][0], y: POS[rx.v][1], opacity: [1, 1, 0] }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
              >
                <circle r={7} fill={rx.better ? "var(--good)" : "var(--muted)"} />
              </m.g>
            ))}
          {NAMES.map((name, v) => {
            const [x, y] = POS[v];
            const settled = st.settled[v];
            const front = !settled && st.dist[v] < Infinity;
            const by = (y < 100 ? -35 : 35) * (k > 1 ? 1.08 : 1);
            const shake = miss?.u === v && !reduce;
            return (
              <g key={name}>
                {v === lit && !reduce && (
                  <m.circle
                    key={`p${st.pops}`}
                    cx={x}
                    cy={y}
                    fill="none"
                    stroke={last.kind === "stale" ? "var(--muted)" : "var(--accent)"}
                    strokeWidth={3}
                    initial={{ r: R, opacity: 0.8 }}
                    animate={{ r: R + 16, opacity: 0 }}
                    transition={{ duration: 0.9 }}
                  />
                )}
                {v === goal && <circle cx={x} cy={y} r={R * k + 5} fill="none" stroke="var(--fg)" strokeOpacity={0.55} strokeWidth={1.5} />}
                <g transform={`translate(${x} ${y})`}>
                  <m.g key={shake ? miss.n : 0} initial={{ x: 0 }} animate={{ x: shake ? [0, -6, 6, -4, 4, 0] : 0 }} transition={{ duration: 0.4 }}>
                    <circle
                      r={R * k}
                      fill={settled ? "var(--accent)" : "var(--card-2)"}
                      stroke={settled ? "var(--accent)" : front ? "var(--series-2)" : "var(--border-strong)"}
                      strokeWidth={2}
                      strokeDasharray={front ? "5 3" : undefined}
                    />
                    <text y={6 * k} textAnchor="middle" style={{ fontSize: 17 * k, fontWeight: 800, fill: settled ? "var(--accent-ink)" : "var(--fg)" }}>
                      {name}
                    </text>
                    <g transform={`translate(0 ${by}) scale(${k})`}>
                      <rect
                        x={-25}
                        y={-11}
                        width={50}
                        height={22}
                        rx={11}
                        fill={better.has(v) ? "color-mix(in srgb, var(--good) 22%, var(--card))" : "var(--card)"}
                        stroke={settled ? "var(--accent)" : "var(--border)"}
                      />
                      <text y={5} textAnchor="middle" style={{ fontSize: 13.5, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                        {fmtD(st.dist[v])}
                        {better.has(v) ? " ↓" : settled ? " ✓" : ""}
                      </text>
                    </g>
                  </m.g>
                </g>
              </g>
            );
          })}
          <text x={wide ? HX : 10} y={wide ? 16 : MAP_H + 16} className="muted-text" style={{ fontSize: 12.5 * k }}>
            {pickMode ? (wide ? "Waiting, unsorted" : "Waiting list, unsorted: you find the closest") : wide ? "Min-heap, closest first" : "Min-heap [distance, town], closest first"}
            {heap.length ? "" : ": empty"}
          </text>
          <AnimatePresence initial={false}>
            {heap.map((e, i) => {
              const stale = isStale(st, e);
              const at = heapAt(i);
              return (
                <m.g
                  key={e.seq}
                  initial={reduce ? false : { x: POS[e.v][0] - 22, y: POS[e.v][1], opacity: 0 }}
                  animate={{ x: at.x, y: at.y, opacity: 1 }}
                  exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { x: wide ? at.x - 20 : at.x, y: wide ? at.y : at.y - 24, opacity: 0, transition: { duration: 0.4 } }}
                  transition={{ duration: reduce ? 0 : 0.5, ease: "easeOut" }}
                >
                  <rect
                    width={chipW}
                    height={chipH}
                    rx={7}
                    fill={i === 0 && !pickMode ? "color-mix(in srgb, var(--accent) 14%, var(--card))" : "var(--card)"}
                    stroke={stale ? "var(--border)" : i === 0 && !pickMode ? "var(--accent)" : "var(--border-strong)"}
                    strokeDasharray={stale ? "3 3" : undefined}
                  />
                  <text x={chipW / 2} y={chipH / 2 + 5 * k} textAnchor="middle" style={{ fontSize: 14 * k, fontWeight: 700, opacity: stale ? 0.55 : 1, textDecoration: stale ? "line-through" : undefined }}>
                    {e.d}, {NAMES[e.v]}
                  </text>
                  {stale && (wide ? !twoCols : true) && (
                    <text x={wide ? chipW + 6 : chipW / 2} y={wide ? 16.5 : chipH + 12 * k} textAnchor={wide ? "start" : "middle"} className="muted-text" style={{ fontSize: 11.5 * k }}>
                      stale
                    </text>
                  )}
                </m.g>
              );
            })}
          </AnimatePresence>
        </svg>
      </div>

      <p className="muted" style={{ fontSize: 13, margin: "6px 0 0", fontVariantNumeric: "tabular-nums" }}>
        Road checks <b>{st.checks}</b> · heap pops <b>{st.pops}</b> ({st.stale} stale) · brute force: <b>{routes}</b> routes A to {NAMES[goal]}
      </p>
      <p className="readout" aria-live="polite">
        {said}
        <ReducedNote reduce={reduce && mode === "watch"} what="Reduced motion: no auto-play; Step pops one entry at a time." />
      </p>
      <div ref={more}>
        <More label="Change road lengths">
          <div className="controls">
            <label className="control" style={{ flex: "0 1 130px", minWidth: 110 }}>
              <span>Road</span>
              <select value={sel} onChange={(e) => setSel(Number(e.target.value))}>
                {roads.map((r, i) => (
                  <option key={i} value={i}>
                    {NAMES[r.a]}–{NAMES[r.b]} ({r.w})
                  </option>
                ))}
              </select>
            </label>
            <Slider label={`Length of ${NAMES[roads[sel].a]}–${NAMES[roads[sel].b]}`} value={roads[sel].w} min={1} max={MAX_W} onChange={(w) => edit(roads.map((r, i) => (i === sel ? { ...r, w } : r)))} />
            <button
              type="button"
              className="wbtn"
              onClick={() => {
                edit(shuffleWeights(roads, seed));
                setSeed((x) => x + 1);
              }}
            >
              <Shuffle size={14} aria-hidden /> Shuffle lengths
            </button>
          </div>
          <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>
            Tip: click a length on the map to pick its road.
          </p>
        </More>
      </div>
    </WidgetFrame>
  );
}
