/** A value shown in a cell, chip or node. Non-finite numbers are stored as "∞" / "-∞" strings. */
export type Prim = string | number | boolean | null;
export type Json = Prim | Json[] | { [k: string]: Json };

/**
 * active: the element being looked at now · compare: the element it is compared with · found: part of the answer
 * bad: rejected / conflict · done: finished, will not be looked at again · window: inside the current range
 * muted: out of play · pivot: a special element (pivot, mid, root) · new: just added
 */
export type Tone = "active" | "compare" | "found" | "bad" | "done" | "window" | "muted" | "pivot" | "new";
export const TONES: Tone[] = ["active", "compare", "found", "bad", "done", "window", "muted", "pivot", "new"];

interface ViewBase {
  /** Keeps a view's identity between frames (so elements animate instead of re-mounting). Defaults to the label. */
  id: string;
  label?: string;
}

export interface ArrayView extends ViewBase {
  kind: "array";
  values: Prim[];
  /** name → index. -1 or values.length show a dashed ghost cell (e.g. a pointer that ran off the end). */
  pointers?: Record<string, number | null>;
  /** Inclusive [start, end] range drawn as a band behind the cells. */
  window?: [number, number] | null;
  tones?: Record<number, Tone>;
  /** Show index numbers under the cells (default true). */
  indices?: boolean;
}

export interface GridView extends ViewBase {
  kind: "grid";
  cells: Prim[][];
  rowLabels?: Prim[];
  colLabels?: Prim[];
  /** "r,c" → tone */
  tones?: Record<string, Tone>;
}

export interface MapView extends ViewBase {
  kind: "map";
  entries: [Prim, Prim][];
  /** String(key) → tone */
  tones?: Record<string, Tone>;
}

export interface SetView extends ViewBase {
  kind: "set";
  items: Prim[];
  /** String(item) → tone */
  tones?: Record<string, Tone>;
}

export interface StackView extends ViewBase {
  kind: "stack";
  /** Bottom first: the last item is the top. */
  items: Prim[];
  tones?: Record<number, Tone>;
}

export interface QueueView extends ViewBase {
  kind: "queue";
  /** Front first. */
  items: Prim[];
  tones?: Record<number, Tone>;
}

export interface ListView extends ViewBase {
  kind: "list";
  /** Drawn left to right in this order; arrows follow `next`, so reversed links point left. */
  nodes: { id: string; value: Prim }[];
  next: Record<string, string | null>;
  /** name → node id, or null (drawn on a "null" ghost at the left). */
  pointers?: Record<string, string | null>;
  tones?: Record<string, Tone>;
}

export interface TreeView extends ViewBase {
  kind: "tree";
  nodes: { id: string; value: Prim; left: string | null; right: string | null }[];
  root: string | null;
  tones?: Record<string, Tone>;
  pointers?: Record<string, string | null>;
  /** Small label above a node (height, depth, running result…). */
  badges?: Record<string, Prim>;
}

export interface GraphView extends ViewBase {
  kind: "graph";
  /** x and y in 0..100 (x across, y down). */
  nodes: { id: string; label?: string; x: number; y: number }[];
  edges: { from: string; to: string; w?: Prim }[];
  directed?: boolean;
  tones?: Record<string, Tone>;
  /** "from-to" → tone (either order for undirected graphs). */
  edgeTones?: Record<string, Tone>;
  /** Small label under a node (distance, in-degree, component…). */
  badges?: Record<string, Prim>;
}

export interface NoteView extends ViewBase {
  kind: "note";
  text: string;
  tone?: Tone;
}

export type View = ArrayView | GridView | MapView | SetView | StackView | QueueView | ListView | TreeView | GraphView | NoteView;

export interface Frame {
  /** 1-based line in `code` to highlight. */
  line: number;
  /** One or two full sentences: what happens and why. */
  caption: string;
  views: View[];
  /** Variable watch panel: name → value. */
  vars?: Record<string, Json>;
}

export interface TracePreset {
  label: string;
  frames: Frame[];
}

export interface TraceSpec {
  id: string;
  title: string;
  description: string;
  /** Displayed code (markers stripped). */
  code: string;
  presets: TracePreset[];
}
