// Authoring API for algorithm animations. A trace runs a small instrumented copy of the algorithm on preset inputs
// at build time and records frames (pure data), which <AlgoViz> plays back with the code line highlighted.
//
//   export const pairSum = defineTrace({
//     id: "pair-sum", title: "…", description: "…",
//     code: `function pairSum(nums, target) {
//       let left = 0, right = nums.length - 1;   //@init
//       …`,
//     presets: [{ label: "Found", input: { nums: [1, 3, 4, 6, 9], target: 10 } }],
//     run(t, { nums, target }) {
//       let left = 0, right = nums.length - 1;
//       t.step("init", "Start with one pointer at each end.", { views: [arr("nums", nums, { pointers: { left, right } })], vars: { left, right } });
//       …
//     },
//   });
import type { ArrayView, Frame, GraphView, GridView, Json, ListView, MapView, NoteView, Prim, QueueView, SetView, StackView, Tone, TraceSpec, TreeView, View } from "./types";

export const MAX_FRAMES = 80;
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

export class Tracer {
  readonly frames: Frame[] = [];
  constructor(
    private readonly labels: Record<string, number>,
    private readonly where: string,
  ) {}

  /** Records one frame. `at` is a //@label in the code. */
  step(at: string, caption: string, state: { views: View[]; vars?: Record<string, unknown> }) {
    const line = this.labels[at];
    if (!line) throw new Error(`${this.where}: unknown code label "${at}" (add //@${at} to a line of code)`);
    if (this.frames.length >= MAX_FRAMES) throw new Error(`${this.where}: more than ${MAX_FRAMES} frames; use a smaller preset input`);
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
}

export function defineTrace<I>(def: TraceDef<I>): TraceSpec {
  const { code, labels } = parseCode(def.code);
  const presets = def.presets.map((p) => {
    const t = new Tracer(labels, `${def.id} › ${p.label}`);
    def.run(t, structuredClone(p.input));
    if (t.frames.length < 2) throw new Error(`${def.id} › ${p.label}: a preset needs at least 2 frames`);
    return { label: p.label, frames: t.frames };
  });
  return { id: def.id, title: def.title, description: def.description, code, presets };
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
