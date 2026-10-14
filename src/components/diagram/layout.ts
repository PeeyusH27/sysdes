import type { FlowEdge, FlowSpec } from "./types";

export const NODE = { w: 136, h: 46 };
const GAP = { horizontal: { x: 176, y: 86 }, vertical: { x: 158, y: 98 } } as const;
const PAD = 30;

export type Orientation = keyof typeof GAP;
export type Pt = { x: number; y: number };
export type LaidOutEdge = FlowEdge & { id: string; d: string; mid: Pt };

export function layoutFlow(spec: FlowSpec, orientation: Orientation) {
  const g = GAP[orientation];
  const pos = new Map<string, Pt>();
  for (const n of spec.nodes) {
    const [a, b] = orientation === "horizontal" ? [n.col, n.row] : [n.row, n.col]; // transpose on phones
    pos.set(n.id, { x: PAD + a * g.x + NODE.w / 2, y: PAD + b * g.y + NODE.h / 2 });
  }
  const pts = [...pos.values()];
  const width = Math.max(...pts.map((p) => p.x)) + NODE.w / 2 + PAD;
  const height = Math.max(...pts.map((p) => p.y)) + NODE.h / 2 + PAD;
  const pairs = new Set(spec.edges.map((e) => `${e.from}>${e.to}`));
  const edges: LaidOutEdge[] = spec.edges.map((e) => ({
    ...e,
    id: `${e.from}>${e.to}`,
    // Two edges between the same nodes in opposite directions: push each to its own side so they don't overlap.
    ...edgePath(pos.get(e.from)!, pos.get(e.to)!, pairs.has(`${e.to}>${e.from}`) ? 10 : 0),
  }));
  return { pos, edges, width, height };
}

/** Smallest scale the wide layout is preferred at (node labels ≈ 7.5 px); below it the transposed one is tried. */
export const MIN_FLOW_SCALE = 0.62;
/** Smallest scale any layout shrinks to before the diagram scrolls sideways. */
export const FLOOR_FLOW_SCALE = 0.5;
/** The transposed layout is only used while its drawing stays about this tall, so it fits a ~640 px pane. */
const MAX_TALL_HEIGHT = 520;

type Size = { width: number; height: number };

/**
 * Wide (horizontal) layout while the box can show it at MIN_FLOW_SCALE or more. Otherwise the transposed (vertical)
 * one, if it is narrower and its drawing isn't taller than MAX_TALL_HEIGHT at the scale it would get; a very wide
 * diagram in a desktop pane stays wide and shrinks (down to FLOOR_FLOW_SCALE) rather than turning into a tower.
 * `prev` adds a little hysteresis so a scrollbar appearing can't make it flip back and forth.
 */
export function pickOrientation(wide: Size, tall: Size, box: number, prev?: Orientation, minScale = MIN_FLOW_SCALE): Orientation {
  const need = wide.width * minScale + (prev === "vertical" ? 12 : 0);
  if (box >= need || tall.width >= wide.width) return "horizontal";
  const tallScale = Math.min(1, box / tall.width);
  return tall.height * tallScale <= MAX_TALL_HEIGHT ? "vertical" : "horizontal";
}

/** Cubic Bézier between the facing sides of two node boxes; `mid` is the curve's exact midpoint. */
export function edgePath(a: Pt, b: Pt, offset = 0) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * offset; // perpendicular shift (0 for ordinary edges)
  const ny = (dx / len) * offset;
  const f = (x: number, y: number) => `${x + nx},${y + ny}`;
  const sideways = Math.abs(dx) * NODE.h >= Math.abs(dy) * NODE.w;
  if (sideways) {
    const sx = a.x + (Math.sign(dx) * NODE.w) / 2;
    const tx = b.x - (Math.sign(dx) * NODE.w) / 2;
    const mx = (sx + tx) / 2;
    return { d: `M${f(sx, a.y)} C${f(mx, a.y)} ${f(mx, b.y)} ${f(tx, b.y)}`, mid: { x: mx + nx, y: (a.y + b.y) / 2 + ny } };
  }
  const sy = a.y + (Math.sign(dy) * NODE.h) / 2;
  const ty = b.y - (Math.sign(dy) * NODE.h) / 2;
  const my = (sy + ty) / 2;
  return { d: `M${f(a.x, sy)} C${f(a.x, my)} ${f(b.x, my)} ${f(b.x, ty)}`, mid: { x: (a.x + b.x) / 2 + nx, y: my + ny } };
}
