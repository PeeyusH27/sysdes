// Authoring API for algorithm animations. A trace runs a small instrumented copy of the algorithm on preset inputs
// at build time and records frames (pure data), which <AlgoViz> plays back with the code line highlighted. Readers can
// also run it on their own input ("Edit input"): the browser loads the viz module through ./registry and calls the
// same `run` (see ./custom), after the optional `validate` and `prepare` hooks.
//
//   export const pairSum = defineTrace({
//     id: "pair-sum", title: "…", description: "…",
//     code: `function pairSum(nums, target) {
//       let left = 0, right = nums.length - 1;   //@init
//       …`,
//     presets: [{ label: "Found", input: { nums: [1, 3, 4, 6, 9], target: 10 } }],
//     prepare: (input) => ({ ...input, nums: [...input.nums].sort((a, b) => a - b) }),   // reader input only
//     run(t, { nums, target }) {
//       let left = 0, right = nums.length - 1;
//       t.step("init", "Start with one pointer at each end.", { views: [arr("nums", nums, { pointers: { left, right } })], vars: { left, right } });
//       …
//     },
//   });
import type { ArrayView, Frame, GraphView, GridView, Json, ListView, MapView, NoteView, Prim, QueueView, SetView, StackView, Tone, TraceSpec, TreeView, View } from "./types";
import { formatInput, inferFields, type FieldHint } from "./input";

/** Most frames a preset may record (presets are hand-picked, so a long one is a mistake). */
export const MAX_FRAMES = 80;
/** Most frames a reader's own input may record; the walkthrough stops there and says so. */
export const MAX_CUSTOM_FRAMES = 400;
const MARK = /\s*\/\/@([\w-]+)\s*$/;

/** Strips `//@label` markers and returns the clean code plus label → 1-based line. */
export function parseCode(src: string) {
  const lines = src.replace(/^\s*\n/, "").replace(/\s+$/, "").split("\n");
  const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => /^ */.exec(l)![0].length));
  const labels: Record<string, number> = {};
  const clean = lines.map((l, i) => {
    const m = MARK.exec(l);
    if (m) {
      if (labels[m[1]]) throw new Error(`Duplicate code label //@${m[1]}`);
      labels[m[1]] = i + 1;
    }
    return l.replace(MARK, "").slice(indent);
  });
  return { code: clean.join("\n"), labels };
}

/** Deep copy into plain JSON-safe data: Infinity → "∞", NaN → "NaN", undefined → null, Map/Set → arrays. */
export function freeze<T>(v: T): T {
  const walk = (x: unknown): unknown => {
    if (x === undefined) return null;
    if (typeof x === "number") return Number.isNaN(x) ? "NaN" : x === Infinity ? "∞" : x === -Infinity ? "-∞" : x;
    if (typeof x === "bigint") return `${x}n`;
    if (x === null || typeof x !== "object") return x;
    if (x instanceof Map) return [...x].map(([k, val]) => [walk(k), walk(val)]);
    if (x instanceof Set) return [...x].map(walk);
    if (Array.isArray(x)) return x.map(walk);
    return Object.fromEntries(Object.entries(x).map(([k, val]) => [k, walk(val)]));
  };
  return walk(v) as T;
}

/** Thrown inside `run` when a reader's input reaches MAX_CUSTOM_FRAMES; the frames so far are kept. */
export class FrameLimit extends Error {
  constructor() {
    super("frame limit");
  }
}

export class Tracer {
  readonly frames: Frame[] = [];
  constructor(
    private readonly labels: Record<string, number>,
    private readonly where: string,
    /** Reader input: stop quietly at this many frames instead of failing. */
    private readonly cap?: number,
  ) {}

  /** Records one frame. `at` is a //@label in the code. */
  step(at: string, caption: string, state: { views: View[]; vars?: Record<string, unknown> }) {
    const line = this.labels[at];
    if (!line) throw new Error(`${this.where}: unknown code label "${at}" (add //@${at} to a line of code)`);
    if (this.cap !== undefined) {
      if (this.frames.length >= this.cap) throw new FrameLimit();
    } else if (this.frames.length >= MAX_FRAMES) throw new Error(`${this.where}: more than ${MAX_FRAMES} frames; use a smaller preset input`);
    this.frames.push({ line, caption, views: freeze(state.views), vars: state.vars ? (freeze(state.vars) as Record<string, Json>) : undefined });
  }
}

export interface TraceDef<I> {
  id: string;
  title: string;
  /** One sentence for screen readers and the text alternative. */
  description: string;
  /** The code shown next to the animation. Mark lines with //@label. */
  code: string;
  presets: { label: string; input: I }[];
  run: (t: Tracer, input: I) => void;
  /**
   * "Edit input" form hints per input key: caps, help text, column kinds. `false` hides a key (its value comes from the
   * preset, or `prepare` derives it). Every other key gets a field inferred from the preset values.
   */
  fields?: { [K in keyof I & string]?: FieldHint | false };
  /**
   * Reader input only: return a short sentence when the input breaks a precondition of the algorithm or would not
   * fit the views (an unsorted array is better fixed in `prepare`). Runs before `prepare`. Presets must pass it.
   */
  validate?: (input: I) => string | null | undefined | false;
  /**
   * Reader input only: normalise a valid input before it runs (sort it, lay out a graph, fill hidden fields).
   * Call `say` to tell the reader what changed and why.
   */
  prepare?: (input: I, say: (note: string) => void) => I;
}

/** The authoring definition behind each spec, so the browser can re-run a trace on reader input (see ./custom). */
const SOURCES = new WeakMap<TraceSpec, { def: TraceDef<unknown>; labels: Record<string, number> }>();
export const traceSource = (spec: TraceSpec) => SOURCES.get(spec);

export function defineTrace<I>(def: TraceDef<I>): TraceSpec {
  const { code, labels } = parseCode(def.code);
  const inputs = def.presets.map((p) => p.input);
  const fields = inferFields(inputs, def.fields as Record<string, FieldHint | false>);
  const presets = def.presets.map((p) => {
    const t = new Tracer(labels, `${def.id} › ${p.label}`);
    def.run(t, structuredClone(p.input));
    if (t.frames.length < 2) throw new Error(`${def.id} › ${p.label}: a preset needs at least 2 frames`);
    return fields.length ? { label: p.label, frames: t.frames, form: formatInput(fields, p.input) } : { label: p.label, frames: t.frames };
  });
  const spec: TraceSpec = { id: def.id, title: def.title, description: def.description, code, presets, fields };
  SOURCES.set(spec, { def: def as TraceDef<unknown>, labels });
  return spec;
}

// ------------------------------------------------------------------ view builders
type Tones<K extends string | number> = Partial<Record<K, Tone>>;

/** Array cells with named pointers, an optional window band and per-index tones. */
export function arr(
  label: string,
  values: readonly unknown[],
  o: { id?: string; pointers?: Record<string, number | null>; window?: [number, number] | null; tones?: Tones<number>; indices?: boolean } = {},
): ArrayView {
  return { kind: "array", id: o.id ?? label, label, values: values.map((v) => v as Prim), pointers: o.pointers, window: o.window, tones: o.tones as Record<number, Tone>, indices: o.indices };
}

/** Tones for every index in [from, to]. */
export function span(from: number, to: number, tone: Tone): Record<number, Tone> {
  const out: Record<number, Tone> = {};
  for (let i = from; i <= to; i++) out[i] = tone;
  return out;
}

/** 2D table (DP tables, matrices, grids). `tones` as [row, col, tone] triples. */
export function grid(label: string, cells: readonly (readonly unknown[])[], o: { id?: string; rowLabels?: unknown[]; colLabels?: unknown[]; tones?: [number, number, Tone][] } = {}): GridView {
  const tones: Record<string, Tone> = {};
  for (const [r, c, t] of o.tones ?? []) tones[`${r},${c}`] = t;
  return { kind: "grid", id: o.id ?? label, label, cells: cells.map((row) => row.map((v) => v as Prim)), rowLabels: o.rowLabels as Prim[], colLabels: o.colLabels as Prim[], tones };
}

/** A Map, plain object or entry list. `tones` keyed by the entry's key. */
export function hashmap(label: string, data: Map<unknown, unknown> | Record<string, unknown> | [unknown, unknown][], o: { id?: string; tones?: [unknown, Tone][] } = {}): MapView {
  const entries = data instanceof Map ? [...data] : Array.isArray(data) ? data : Object.entries(data);
  const tones: Record<string, Tone> = {};
  for (const [k, t] of o.tones ?? []) tones[String(k)] = t;
  return { kind: "map", id: o.id ?? label, label, entries: entries.map(([k, v]) => [k as Prim, v as Prim]), tones };
}

export function hashset(label: string, data: Iterable<unknown>, o: { id?: string; tones?: [unknown, Tone][] } = {}): SetView {
  const tones: Record<string, Tone> = {};
  for (const [k, t] of o.tones ?? []) tones[String(k)] = t;
  return { kind: "set", id: o.id ?? label, label, items: [...data] as Prim[], tones };
}

/** Bottom first (the last item is the top of the stack). */
export function stack(label: string, items: readonly unknown[], o: { id?: string; tones?: Tones<number> } = {}): StackView {
  return { kind: "stack", id: o.id ?? label, label, items: [...items] as Prim[], tones: o.tones as Record<number, Tone> };
}

/** Front first. */
export function queue(label: string, items: readonly unknown[], o: { id?: string; tones?: Tones<number> } = {}): QueueView {
  return { kind: "queue", id: o.id ?? label, label, items: [...items] as Prim[], tones: o.tones as Record<number, Tone> };
}

export function note(text: string, tone?: Tone, id = "note"): NoteView {
  return { kind: "note", id, text, tone };
}

// ------------------------------------------------------------------ linked lists
export interface LNode {
  val: unknown;
  next: LNode | null;
}

/** Builds real nodes for a tracer to manipulate: returns them in order (nodes[0] is the head). */
export function buildList(values: readonly unknown[]): LNode[] {
  const nodes: LNode[] = values.map((val) => ({ val, next: null }));
  nodes.forEach((n, i) => (n.next = nodes[i + 1] ?? null));
  return nodes;
}

/**
 * Snapshot of a linked list. `nodes` fixes the left-to-right drawing order (usually the original order), and each
 * node's current `.next` becomes an arrow, so a half-reversed list shows arrows pointing both ways.
 */
export function linked(label: string, nodes: readonly LNode[], o: { id?: string; pointers?: Record<string, LNode | null | undefined>; tones?: [LNode, Tone][] } = {}): ListView {
  const idOf = new Map(nodes.map((n, i) => [n, `n${i}`]));
  const next: Record<string, string | null> = {};
  nodes.forEach((n, i) => (next[`n${i}`] = n.next ? (idOf.get(n.next) ?? null) : null));
  const pointers: Record<string, string | null> = {};
  for (const [k, n] of Object.entries(o.pointers ?? {})) pointers[k] = n ? (idOf.get(n) ?? null) : null;
  const tones: Record<string, Tone> = {};
  for (const [n, t] of o.tones ?? []) if (idOf.has(n)) tones[idOf.get(n)!] = t;
  return { kind: "list", id: o.id ?? label, label, nodes: nodes.map((n, i) => ({ id: `n${i}`, value: n.val as Prim })), next, pointers, tones };
}

// ------------------------------------------------------------------ binary trees
export interface TNode {
  val: unknown;
  left: TNode | null;
  right: TNode | null;
}

/** Level order with nulls, e.g. [3, 9, 20, null, null, 15, 7] → real nodes. */
export function buildTree(values: readonly unknown[]): TNode | null {
  if (!values.length || values[0] === null) return null;
  const root: TNode = { val: values[0], left: null, right: null };
  const q = [root];
  let head = 0;
  for (let i = 1; i < values.length; ) {
    const node = q[head++];
    if (!node) break;
    if (values[i] !== null && values[i] !== undefined) q.push((node.left = { val: values[i], left: null, right: null }));
    i++;
    if (i < values.length && values[i] !== null && values[i] !== undefined) q.push((node.right = { val: values[i], left: null, right: null }));
    i++;
  }
  return root;
}

/** Gives every node object a stable id, so nodes keep their identity (and animate) when the tree changes shape. */
export class NodeIds<T extends object = TNode> {
  private ids = new WeakMap<T, string>();
  private n = 0;
  constructor(private prefix = "t") {}
  of(node: T) {
    let id = this.ids.get(node);
    if (!id) this.ids.set(node, (id = `${this.prefix}${this.n++}`));
    return id;
  }
}

/** Snapshot of a binary tree from its root. Pass the same `ids` to every call in a trace. */
export function tree(
  label: string,
  root: TNode | null,
  o: { id?: string; ids?: NodeIds; pointers?: Record<string, TNode | null | undefined>; tones?: [TNode, Tone][]; badges?: [TNode, unknown][] } = {},
): TreeView {
  const ids = o.ids ?? new NodeIds();
  const nodes: TreeView["nodes"] = [];
  const seen = new Set<TNode>();
  const walk = (n: TNode | null) => {
    if (!n || seen.has(n)) return;
    seen.add(n);
    nodes.push({ id: ids.of(n), value: n.val as Prim, left: n.left ? ids.of(n.left) : null, right: n.right ? ids.of(n.right) : null });
    walk(n.left);
    walk(n.right);
  };
  walk(root);
  const pointers: Record<string, string | null> = {};
  for (const [k, n] of Object.entries(o.pointers ?? {})) pointers[k] = n ? ids.of(n) : null;
  const tones: Record<string, Tone> = {};
  for (const [n, t] of o.tones ?? []) tones[ids.of(n)] = t;
  const badges: Record<string, Prim> = {};
  for (const [n, b] of o.badges ?? []) badges[ids.of(n)] = b as Prim;
  return { kind: "tree", id: o.id ?? label, label, nodes, root: root ? ids.of(root) : null, pointers, tones, badges };
}

/** A heap (array) drawn as a complete binary tree: node ids are "h<index>". */
export function heapTree(label: string, heap: readonly unknown[], o: { id?: string; tones?: Tones<number>; badges?: Record<number, unknown> } = {}): TreeView {
  const nodes = heap.map((v, i) => ({ id: `h${i}`, value: v as Prim, left: 2 * i + 1 < heap.length ? `h${2 * i + 1}` : null, right: 2 * i + 2 < heap.length ? `h${2 * i + 2}` : null }));
  const tones: Record<string, Tone> = {};
  for (const [i, t] of Object.entries(o.tones ?? {})) if (t) tones[`h${i}`] = t;
  const badges: Record<string, Prim> = {};
  for (const [i, b] of Object.entries(o.badges ?? {})) badges[`h${i}`] = b as Prim;
  return { kind: "tree", id: o.id ?? label, label, nodes, root: heap.length ? "h0" : null, tones, badges };
}

// ------------------------------------------------------------------ graphs
export type GraphLayout = Record<string, { x: number; y: number }>;

/** Positions on a circle (x, y in 0..100), handy for small graphs. */
export function circleLayout(ids: readonly (string | number)[]): GraphLayout {
  const out: GraphLayout = {};
  ids.forEach((id, i) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / ids.length;
    out[String(id)] = { x: Math.round(50 + 42 * Math.cos(a)), y: Math.round(50 + 42 * Math.sin(a)) };
  });
  return out;
}

export function graph(
  label: string,
  g: { nodes: { id: string | number; label?: string; x: number; y: number }[]; edges: { from: string | number; to: string | number; w?: unknown }[]; directed?: boolean },
  o: { id?: string; tones?: [string | number, Tone][]; edgeTones?: [string | number, string | number, Tone][]; badges?: [string | number, unknown][] } = {},
): GraphView {
  const tones: Record<string, Tone> = {};
  for (const [n, t] of o.tones ?? []) tones[String(n)] = t;
  const edgeTones: Record<string, Tone> = {};
  for (const [a, b, t] of o.edgeTones ?? []) edgeTones[`${a}-${b}`] = t;
  const badges: Record<string, Prim> = {};
  for (const [n, b] of o.badges ?? []) badges[String(n)] = b as Prim;
  return {
    kind: "graph",
    id: o.id ?? label,
    label,
    nodes: g.nodes.map((n) => ({ id: String(n.id), label: n.label ?? String(n.id), x: n.x, y: n.y })),
    edges: g.edges.map((e) => ({ from: String(e.from), to: String(e.to), w: e.w as Prim })),
    directed: g.directed,
    tones,
    edgeTones,
    badges,
  };
}

// ------------------------------------------------------------------ layouts for reader-made graphs
type Pos = [number, number];
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

/** Layer of every node by longest path from a source, or null when the directed graph has a cycle. */
export function dagLayers(n: number, edges: readonly (readonly number[])[]): number[] | null {
  const indeg = new Array(n).fill(0);
  const out: number[][] = range(n).map(() => []);
  for (const [a, b] of edges) {
    out[a].push(b);
    indeg[b]++;
  }
  const layer = new Array(n).fill(0);
  const q = range(n).filter((v) => indeg[v] === 0);
  for (let h = 0; h < q.length; h++) {
    for (const v of out[q[h]]) {
      layer[v] = Math.max(layer[v], layer[q[h]] + 1);
      if (--indeg[v] === 0) q.push(v);
    }
  }
  return q.length === n ? layer : null;
}

/** Layer of every node by BFS distance from `start` (undirected); unreachable nodes go one layer past the rest. */
export function bfsLayers(n: number, edges: readonly (readonly number[])[], start: number): number[] {
  const adj: number[][] = range(n).map(() => []);
  for (const [a, b] of edges) {
    adj[a].push(b);
    adj[b].push(a);
  }
  const d = new Array(n).fill(-1);
  d[start] = 0;
  const q = [start];
  for (let h = 0; h < q.length; h++) {
    for (const v of adj[q[h]]) {
      if (d[v] !== -1) continue;
      d[v] = d[q[h]] + 1;
      q.push(v);
    }
  }
  const far = Math.max(...d) + 1;
  return d.map((x) => (x === -1 ? far : x));
}

/**
 * Columns by layer (left to right), nodes spread down each column; lone nodes zig-zag so skipped edges stay visible.
 * With `edges`, each column is ordered by where its neighbours sit in the previous column, which avoids most crossings.
 */
export function layeredLayout(layer: readonly number[], edges: readonly (readonly number[])[] = []): Pos[] {
  const L = Math.max(0, ...layer);
  const cols: number[][] = Array.from({ length: L + 1 }, () => []);
  layer.forEach((l, v) => cols[l].push(v));
  const rank = new Map<number, number>();
  cols.forEach((vs, l) => {
    if (l > 0) {
      const score = (v: number) => {
        const near = edges.flatMap(([a, b]) => (a === v ? [b] : b === v ? [a] : [])).filter((u) => layer[u] === l - 1);
        return near.length ? near.reduce((t, u) => t + rank.get(u)!, 0) / near.length : Infinity;
      };
      const by = new Map(vs.map((v) => [v, score(v)]));
      vs.sort((a, b) => by.get(a)! - by.get(b)! || a - b);
    }
    vs.forEach((v, j) => rank.set(v, j));
  });
  const pos: Pos[] = layer.map(() => [50, 50]);
  cols.forEach((vs, l) => {
    const x = L === 0 ? 50 : 6 + (88 * l) / L;
    vs.forEach((v, j) => {
      const y = vs.length === 1 ? 50 + (L === 0 ? 0 : l % 2 ? 16 : -16) : 8 + (84 * j) / (vs.length - 1) + (l % 2 ? 4 : -4);
      pos[v] = [Math.round(x), Math.round(Math.min(100, Math.max(0, y)))];
    });
  });
  return pos;
}

/** Positions for a reader's graph: layers for a DAG or a BFS from `start`, a circle otherwise. */
export function autoLayout(n: number, edges: readonly (readonly number[])[], o: { directed?: boolean; start?: number } = {}): Pos[] {
  const layer = o.directed ? dagLayers(n, edges) : o.start !== undefined ? bfsLayers(n, edges, o.start) : null;
  if (layer) return layeredLayout(layer, edges);
  const c = circleLayout(range(n));
  return range(n).map((i) => [c[i].x, c[i].y]);
}

/** A parent-pointer forest drawn top-down: roots on top, each parent above the middle of its children. */
export function forestLayout(parent: readonly number[]): Pos[] {
  const n = parent.length;
  const kids: number[][] = range(n).map(() => []);
  parent.forEach((p, i) => p !== i && kids[p]?.push(i));
  const depth = new Array(n).fill(0);
  const x = new Array(n).fill(0);
  let slot = 0;
  const place = (v: number, d: number, guard: number) => {
    depth[v] = d;
    if (!kids[v].length || guard > n) {
      x[v] = slot++;
      return;
    }
    kids[v].forEach((k) => place(k, d + 1, guard + 1));
    x[v] = (x[kids[v][0]] + x[kids[v][kids[v].length - 1]]) / 2;
  };
  range(n)
    .filter((v) => parent[v] === v)
    .forEach((r) => place(r, 0, 0));
  const D = Math.max(0, ...depth);
  return range(n).map((v) => [Math.round(slot <= 1 ? 50 : 8 + (84 * x[v]) / (slot - 1)), Math.round(D === 0 ? 50 : 6 + (88 * depth[v]) / D)]);
}
