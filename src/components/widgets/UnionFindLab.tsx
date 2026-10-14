"use client";
import { useCallback, useEffect, useId, useState, type KeyboardEvent, type RefObject } from "react";
import { m } from "motion/react";
import { mulberry32 } from "@/lib/rng";
import { useFixedStep } from "@/lib/sim-loop";
import { ReducedNote, SimButtons, useSimGate, useThrottled } from "./lib/sim-kit";
import { More, WidgetFrame } from "./WidgetFrame";

// ---------------------------------------------------------------- model (pure, tested)
export const N = 10;
export const SEED = 16;
export interface Opts {
  byRank: boolean;
  compress: boolean;
}
export type UFEvent =
  | { kind: "union"; a: number; b: number; pathA: number[]; pathB: number[]; child: number; root: number; tie: boolean; prev: number[] }
  | { kind: "same"; a: number; b: number; pathA: number[]; pathB: number[]; root: number; prev: number[] }
  | { kind: "find"; x: number; path: number[]; prev: number[] }
  | { kind: "chain" };
export interface UFState {
  parent: number[];
  /** Upper bound on each root's tree height (kept even when union by rank is off, so it stays a bound). */
  rank: number[];
  count: number;
  /** Parent links followed by every find so far, and how many unions/finds were asked. */
  hops: number;
  ops: number;
  seq: number;
  last: UFEvent | null;
  acc: number;
}

export const initUF = (): UFState => ({ parent: Array.from({ length: N }, (_, i) => i), rank: new Array<number>(N).fill(0), count: N, hops: 0, ops: 0, seq: 0, last: null, acc: 0 });

/** The nodes visited from x up to its root, both included. */
export function climb(parent: number[], x: number) {
  const path = [x];
  while (parent[path.at(-1)!] !== path.at(-1)) path.push(parent[path.at(-1)!]);
  return path;
}
/** find(x): the root, plus path compression (every node on the path now points at the root) when on. */
function findIn(parent: number[], x: number, compress: boolean) {
  const path = climb(parent, x);
  const root = path.at(-1)!;
  if (compress) for (const v of path) parent[v] = root;
  return { path, root };
}

export function find(s: UFState, x: number, opts: Opts): UFState {
  const parent = s.parent.slice();
  const { path } = findIn(parent, x, opts.compress);
  return { ...s, parent, hops: s.hops + path.length - 1, ops: s.ops + 1, last: { kind: "find", x, path, prev: s.parent } };
}

/** union(a, b), as in the page's class: find both roots; with rank, the shorter tree goes under the taller; without, a's root goes under b's. */
export function union(s: UFState, a: number, b: number, opts: Opts): UFState {
  const parent = s.parent.slice();
  const rank = s.rank.slice();
  const A = findIn(parent, a, opts.compress);
  const B = findIn(parent, b, opts.compress);
  const hops = s.hops + A.path.length - 1 + B.path.length - 1;
  const base = { ...s, parent, rank, hops, ops: s.ops + 1 };
  if (A.root === B.root) return { ...base, last: { kind: "same", a, b, pathA: A.path, pathB: B.path, root: A.root, prev: s.parent } };
  let [root, child] = [B.root, A.root];
  if (opts.byRank) [root, child] = rank[A.root] < rank[B.root] ? [B.root, A.root] : [A.root, B.root];
  const tie = rank[root] === rank[child];
  parent[child] = root;
  rank[root] = Math.max(rank[root], rank[child] + 1);
  return { ...base, count: s.count - 1, last: { kind: "union", a, b, pathA: A.path, pathB: B.path, child, root, tie, prev: s.parent } };
}

/** The Step button: a seeded random friendship. */
export function randomPair(seq: number): [number, number] {
  const r = mulberry32(SEED + Math.imul(seq + 1, 0x9e3779b1));
  const a = Math.floor(r() * N);
  const b = Math.floor(r() * (N - 1));
  return [a, b >= a ? b + 1 : b];
}
export function stepUF(s: UFState, opts: Opts): UFState {
  if (s.count === 1) return s;
  const [a, b] = randomPair(s.seq);
  return { ...union(s, a, b, opts), seq: s.seq + 1 };
}

/** The worst case: link 0 under 1, 1 under 2, … with neither trick, so 0 sits 9 links below the root. */
export function chain(): UFState {
  let s = initUF();
  for (let i = 0; i + 1 < N; i++) s = union(s, i, i + 1, { byRank: false, compress: false });
  return { ...s, hops: 0, ops: 0, last: { kind: "chain" } };
}

export const depth = (parent: number[], x: number) => climb(parent, x).length - 1;
export const tallest = (parent: number[]) => Math.max(...parent.map((_, x) => depth(parent, x)));

// ---------------------------------------------------------------- picture
const R = 12;
const TOP = 26;
/**
 * Wide (desktop pane): the forest on the left, parent[] as two rows of five on the right, so even the 9-link chain
 * fits one screen. Narrow (phones): the forest on top and parent[] in one row under it.
 */
const WIDE = { W: 600, FW: 400, wide: true };
const NARROW = { W: 320, FW: 320, wide: false };
type Lay = typeof WIDE;
const PX = 416;

/** Trees side by side (ordered by their smallest member), roots on top, a little gap after every tree with more than one node. */
function layout(parent: number[], FW: number) {
  const kids = Array.from({ length: N }, () => [] as number[]);
  const roots: number[] = [];
  parent.forEach((p, v) => (p === v ? roots.push(v) : kids[p].push(v)));
  const minOf = (v: number): number => Math.min(v, ...kids[v].map(minOf));
  roots.sort((a, b) => minOf(a) - minOf(b));
  kids.forEach((k) => k.sort((a, b) => minOf(a) - minOf(b)));
  const slot: number[] = [];
  const d: number[] = [];
  let at = 0;
  const place = (v: number, level: number) => {
    d[v] = level;
    if (!kids[v].length) slot[v] = at++;
    else {
      kids[v].forEach((c) => place(c, level + 1));
      slot[v] = (slot[kids[v][0]] + slot[kids[v].at(-1)!]) / 2;
    }
  };
  roots.forEach((r, i) => {
    if (i > 0 && (kids[r].length || kids[roots[i - 1]].length)) at += 0.45;
    place(r, 0);
  });
  const step = Math.min(32, (FW - 2 * R - 4) / Math.max(1, at - 1));
  const x0 = (FW - step * (at - 1)) / 2;
  const maxDepth = Math.max(...d);
  const level = maxDepth > 4 ? 28 : 36;
  return { pos: slot.map((sl, v) => ({ x: x0 + sl * step, y: TOP + d[v] * level })), maxDepth, level };
}

/** A segmented control with its name inline (or announced only), so a toolbar row stays one row. */
function Pick<T extends string>({ label, show = false, value, options, onChange }: { label: string; show?: boolean; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
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

const climbed = (x: number, path: number[]) => (path.length === 1 ? `${x} is a root` : `find(${x}) climbs ${path.join(" → ")}`);
function describe(s: UFState, opts: Opts) {
  const e = s.last;
  const hop = (n: number) => `${n} hop${n === 1 ? "" : "s"}`;
  const flat = (path: number[], prev: number[]) => path.filter((v) => prev[v] !== path.at(-1) && v !== path.at(-1)).length;
  if (!e) return `Ten people, ten groups: everyone is their own root. Click two people to make them friends, or press Step for a random friendship.`;
  if (e.kind === "chain") return `A chain: every union hung one root under the next, so 0 is 9 links below root 9. Now turn path compression on, switch the click to Find, and find 0.`;
  if (e.kind === "find") {
    const f = flat(e.path, e.prev);
    return `${climbed(e.x, e.path)}: ${hop(e.path.length - 1)}. ${opts.compress ? (f ? `Compression points ${f} node${f === 1 ? "" : "s"} straight at the root, so the next find from there is 1 hop.` : "The path was already flat.") : "Compression is off, so the next find pays the same again."}`;
  }
  const finds = `${climbed(e.a, e.pathA)}; ${climbed(e.b, e.pathB)}`;
  if (e.kind === "same") return `${e.a} and ${e.b} already share root ${e.root} (${finds}): no merge. In a graph, this edge would close a cycle.`;
  const why = !opts.byRank ? "" : e.tie ? ` (equal ranks, so ${e.root}'s rank grows by one)` : " (the shorter tree goes under the taller)";
  return `${finds}. Root ${e.child} goes under root ${e.root}${why}. ${s.count === 1 ? "Everyone is now in one friend circle." : `${s.count} groups left.`}`;
}

// ---------------------------------------------------------------- widget
export function UnionFindLab() {
  const uid = useId().replace(/:/g, "");
  const [opts, setOpts] = useState<Opts>({ byRank: true, compress: true });
  const [click, setClick] = useState<"union" | "find">("union");
  const [sel, setSel] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const { ref, inView, reduce } = useSimGate<HTMLDivElement>();
  const L: Lay = useNarrow(ref) ? NARROW : WIDE;
  const tick = useCallback(
    (s: UFState, dt: number) => {
      const acc = s.acc + dt;
      return acc < 1300 ? { ...s, acc } : { ...stepUF(s, opts), acc: 0 };
    },
    [opts],
  );
  const [s, reset] = useFixedStep<UFState>(initUF, tick, running && inView && !reduce);
  const { pos, maxDepth, level } = layout(s.parent, L.FW);
  // Grow at once, but shrink only after the nodes have glided up, so nothing overlaps the array mid-glide.
  const need = Math.max(3, maxDepth) * level;
  const [held, setHeld] = useState(need);
  useEffect(() => {
    if (held === need) return;
    const t = setTimeout(() => setHeld(need), need > held || reduce ? 0 : 950);
    return () => clearTimeout(t);
  }, [need, held, reduce]);
  const ARR_Y = TOP + Math.max(need, held) + 48;
  const H = L.wide ? Math.max(150, TOP + Math.max(need, held) + R + 12) : ARR_Y + 46;
  const cell = (v: number) => (L.wide ? { x: PX + (v % 5) * 36, y: 46 + Math.floor(v / 5) * 56 } : { x: 6 + v * 31, y: ARR_Y });
  const e = s.last;
  const prevPos = e && "prev" in e ? layout(e.prev, L.FW).pos : pos;
  const paths = e?.kind === "find" ? [e.path] : e?.kind === "union" || e?.kind === "same" ? [e.pathA, e.pathB] : [];
  const onPath = new Set(paths.flat());
  const changed = new Set(e && "prev" in e ? s.parent.flatMap((p, v) => (p !== e.prev[v] ? [v] : [])) : []);
  const sentence = describe(s, opts);
  const said = useThrottled(sentence, 700);
  const climbS = reduce ? 0 : 0.45;
  const done = s.count === 1;

  const onPerson = (v: number) => {
    if (click === "find") reset(find(s, v, opts));
    else if (sel === null || sel === v) setSel(sel === v ? null : v);
    else {
      setSel(null);
      reset(union(s, sel, v, opts));
    }
  };
  const onKey = (v: number) => (ev: KeyboardEvent<SVGGElement>) => {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      onPerson(v);
    }
  };
  const setOpt = (k: keyof Opts) => (v: "on" | "off") => setOpts((o) => ({ ...o, [k]: v === "on" }));
  const onOff = [
    { value: "on" as const, label: "On" },
    { value: "off" as const, label: "Off" },
  ];
  const byRank = <Pick<"on" | "off"> label="Union by rank" show value={opts.byRank ? "on" : "off"} onChange={setOpt("byRank")} options={onOff} />;

  return (
    <WidgetFrame title="Friend circles: union-find" sub="Each arrow points at a parent; a root names its group. Merge groups, climb to roots, and watch path compression flatten the trees.">
      <div className="controls" style={{ alignItems: "center" }}>
        <SimButtons
          running={running && !done && !reduce}
          reduce={reduce}
          onToggle={() => setRunning((r) => !r)}
          onStep={() => reset(stepUF(s, opts))}
          stepLabel="Random friend"
          stepHint="Union two random people"
          onReset={() => {
            setSel(null);
            reset(initUF());
          }}
        />
        <Pick<"union" | "find">
          label="Click people to"
          value={click}
          onChange={(v) => {
            setClick(v);
            setSel(null);
          }}
          options={[
            { value: "union", label: "Befriend two (union)" },
            { value: "find", label: "Find a root" },
          ]}
        />
      </div>
      <div className="controls" style={{ marginTop: 0, alignItems: "center" }}>
        <button
          type="button"
          className="wbtn"
          onClick={() => {
            setRunning(false);
            setSel(null);
            setOpts({ byRank: false, compress: false });
            reset(chain());
          }}
        >
          Worst case: a chain
        </button>
        <Pick<"on" | "off"> label="Path compression" show value={opts.compress ? "on" : "off"} onChange={setOpt("compress")} options={onOff} />
        {L.wide && byRank}
      </div>

      <div ref={ref}>
        <svg
          viewBox={`0 0 ${L.W} ${H}`}
          className="sim-svg"
          role="group"
          aria-label={`${s.count} groups. Parents: ${s.parent.map((p, v) => `${v}→${p}`).join(", ")}. Tallest tree ${tallest(s.parent)} links.`}
          style={{ maxWidth: L.wide ? 660 : 470, margin: "0 auto" }}
        >
          <defs>
            {["n", "hot"].map((k) => (
              <marker key={k} id={`${uid}${k}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M0 0L10 5L0 10z" fill={k === "hot" ? "var(--accent)" : "color-mix(in srgb, var(--fg) 45%, var(--card))"} />
              </marker>
            ))}
          </defs>
          <g aria-hidden="true">
            {s.parent.map((p, v) => {
              if (p === v) return null;
              const a = pos[v];
              const b = pos[p];
              const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
              const [ux, uy] = [(b.x - a.x) / len, (b.y - a.y) / len];
              const hot = changed.has(v);
              return (
                <m.line
                  key={v}
                  initial={reduce ? false : { opacity: 0 }}
                  animate={{ x1: a.x + ux * R, y1: a.y + uy * R, x2: b.x - ux * (R + 2), y2: b.y - uy * (R + 2), opacity: 1 }}
                  transition={{ duration: reduce ? 0 : 0.4, delay: climbS, opacity: { delay: climbS + 0.3, duration: reduce ? 0 : 0.2 } }}
                  stroke={hot ? "var(--accent)" : "color-mix(in srgb, var(--fg) 45%, var(--card))"}
                  strokeWidth={hot ? 2.6 : 1.6}
                  markerEnd={`url(#${uid}${hot ? "hot" : "n"})`}
                />
              );
            })}
            {!reduce &&
              paths.map((path, i) =>
                path.length > 1 ? (
                  <m.circle
                    key={`${s.ops}-${i}`}
                    r={5}
                    fill="var(--accent-2)"
                    initial={{ cx: prevPos[path[0]].x, cy: prevPos[path[0]].y, opacity: 1 }}
                    animate={{ cx: path.map((v) => prevPos[v].x), cy: path.map((v) => prevPos[v].y), opacity: [1, 1, 0] }}
                    transition={{ duration: climbS + 0.25, ease: "linear" }}
                  />
                ) : null,
              )}
          </g>
          {s.parent.map((p, v) => {
            const root = p === v;
            const hot = onPath.has(v);
            const stroke = sel === v ? "var(--k-client)" : hot ? "var(--accent)" : root ? "var(--accent-2)" : "var(--border-strong)";
            return (
              <m.g
                key={v}
                role="button"
                tabIndex={0}
                aria-label={`Person ${v}${root ? ", a root" : `, parent ${p}`}${sel === v ? ", selected" : ""}`}
                onClick={() => onPerson(v)}
                onKeyDown={onKey(v)}
                style={{ cursor: "pointer" }}
                initial={false}
                animate={{ x: pos[v].x, y: pos[v].y }}
                transition={{ duration: reduce ? 0 : 0.4, delay: climbS }}
              >
                <circle
                  r={R}
                  fill={hot ? "color-mix(in srgb, var(--accent) 18%, var(--card))" : root ? "color-mix(in srgb, var(--accent-2) 14%, var(--card))" : "var(--card)"}
                  stroke={stroke}
                  strokeWidth={root || hot || sel === v ? 2.4 : 1.5}
                />
                <text y={4.5} textAnchor="middle" style={{ fontSize: 12.5, fontWeight: 750 }}>
                  {v}
                </text>
              </m.g>
            );
          })}
          {/* "root" tags sit outside the buttons, so each button's visible text is just the person's number. */}
          <g aria-hidden="true" pointerEvents="none">
            {s.parent.map((p, v) =>
              p === v ? (
                <m.text key={v} textAnchor="middle" initial={false} animate={{ x: pos[v].x, y: pos[v].y - R - 4 }} transition={{ duration: reduce ? 0 : 0.4, delay: climbS }} style={{ fontSize: 10.5, fontWeight: 700, fill: "var(--accent-2)" }}>
                  root
                </m.text>
              ) : null,
            )}
          </g>
          <g aria-hidden="true">
            {L.wide && <line x1={PX - 14} x2={PX - 14} y1={8} y2={H - 8} stroke="var(--border)" />}
            <text x={L.wide ? PX : 4} y={L.wide ? 14 : ARR_Y - 22} className="muted-text" style={{ fontSize: 12 }}>
              {L.wide ? "parent[i], last change in colour" : "parent[i] (changed by the last operation in colour)"}
            </text>
            {s.parent.map((p, v) => {
              const { x, y } = cell(v);
              const hot = changed.has(v);
              return (
                <g key={v}>
                  <text x={x + 14} y={y - 6} textAnchor="middle" className="muted-text" style={{ fontSize: 10.5 }}>
                    {v}
                  </text>
                  <rect x={x} y={y} width={28} height={26} rx={5} fill={hot ? "color-mix(in srgb, var(--accent) 18%, var(--card))" : "var(--card-2)"} stroke={hot ? "var(--accent)" : "var(--border)"} />
                  <text x={x + 14} y={y + 17.5} textAnchor="middle" style={{ fontSize: 12.5, fontWeight: 700, fill: hot ? "var(--accent)" : "var(--fg)" }}>
                    {p}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      <p className="muted" style={{ fontSize: 13, margin: "6px 0 0", display: "flex", flexWrap: "wrap", gap: "4px 14px" }}>
        <span>
          Groups <b style={{ color: "var(--fg)" }}>{s.count}</b>
        </span>
        <span>
          Tallest <b style={{ color: "var(--fg)" }}>{tallest(s.parent)}</b> link{tallest(s.parent) === 1 ? "" : "s"}
        </span>
        <span>
          <b style={{ color: "var(--fg)" }}>{s.hops}</b> hops in {s.ops} op{s.ops === 1 ? "" : "s"}
        </span>
        {click === "union" && sel !== null && <span style={{ color: "var(--k-client)" }}>Now click {sel}&apos;s new friend (or {sel} to cancel).</span>}
      </p>
      <p className="readout" aria-live="polite">
        {said}
        <ReducedNote reduce={reduce} what="Reduced motion: no auto-play; Random friend makes one union." />
      </p>
      {/* Phones: the second toggle waits behind a click, so the forest and the main controls fit one screen. */}
      {!L.wide && (
        <More label="Union by rank">
          <div className="controls" style={{ alignItems: "center" }}>
            {byRank}
            <span className="muted" style={{ fontSize: 12.5 }}>
              On: the shorter tree goes under the taller one, so no tree grows past log₂ n.
            </span>
          </div>
        </More>
      )}
    </WidgetFrame>
  );
}
