// Helpers that draw like a hand with a marker: slightly wobbly lines, corners that overshoot, shapes that do not quite
// close. Every function is deterministic for a seed, so a doodle looks the same on the server, on the client and on
// every reload (no flicker, no hydration mismatch). All return an SVG path `d` string.

/** A small deterministic random generator (mulberry32). */
export function rng(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (n: number) => Math.round(n * 10) / 10;
const jit = (r: () => number, amount: number) => (r() - 0.5) * 2 * amount;

/** A straight-ish line: one curve whose middle is pushed sideways by a little. */
export function line(x1: number, y1: number, x2: number, y2: number, seed = 1, wobble = 1.4): string {
  const r = rng(seed * 7919 + Math.round(x1 * 3 + y1 * 5 + x2 * 11 + y2 * 13));
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const nx = -(y2 - y1) / len;
  const ny = (x2 - x1) / len;
  const off = jit(r, wobble) * Math.min(1, len / 40 + 0.4);
  return `M${f(x1 + jit(r, 0.5))} ${f(y1 + jit(r, 0.5))}Q${f(mx + nx * off)} ${f(my + ny * off)} ${f(x2 + jit(r, 0.5))} ${f(y2 + jit(r, 0.5))}`;
}

/** Connected wobbly segments through the points. */
export function poly(points: [number, number][], seed = 1, wobble = 1.2, close = false): string {
  const pts = close ? [...points, points[0]] : points;
  return pts
    .slice(1)
    .map((p, i) => line(pts[i][0], pts[i][1], p[0], p[1], seed + i, wobble))
    .join("");
}

/** A rectangle drawn as four strokes that overshoot the corners a little, like a marker. */
export function rect(x: number, y: number, w: number, h: number, seed = 1, wobble = 1.3): string {
  const r = rng(seed * 31 + Math.round(x + y * 3 + w * 7 + h * 11));
  const o = () => 1.5 + r() * 2.2;
  return [
    line(x - o(), y, x + w + o(), y, seed + 1, wobble),
    line(x + w, y - o(), x + w, y + h + o(), seed + 2, wobble),
    line(x + w + o(), y + h, x - o(), y + h, seed + 3, wobble),
    line(x, y + h + o(), x, y - o(), seed + 4, wobble),
  ].join("");
}

/** A rounded box: one continuous wobbly outline with soft corners. */
export function box(x: number, y: number, w: number, h: number, radius = 6, seed = 1, wobble = 1): string {
  const r = rng(seed * 17 + Math.round(x + y + w + h));
  const j = () => jit(r, wobble);
  const k = Math.min(radius, w / 2, h / 2);
  return (
    `M${f(x + k)} ${f(y + j())}` +
    `L${f(x + w - k)} ${f(y + j())}Q${f(x + w + j())} ${f(y + j())} ${f(x + w + j())} ${f(y + k)}` +
    `L${f(x + w + j())} ${f(y + h - k)}Q${f(x + w + j())} ${f(y + h + j())} ${f(x + w - k)} ${f(y + h + j())}` +
    `L${f(x + k)} ${f(y + h + j())}Q${f(x + j())} ${f(y + h + j())} ${f(x + j())} ${f(y + h - k)}` +
    `L${f(x + j())} ${f(y + k)}Q${f(x + j())} ${f(y + j())} ${f(x + k)} ${f(y + j())}` +
    `L${f(x + k + 3)} ${f(y + j())}`
  );
}

/** An ellipse drawn in two passes that do not quite meet, so you can see where the pen came back. */
export function ellipse(cx: number, cy: number, rx: number, ry: number, seed = 1, wobble = 1.2): string {
  const r = rng(seed * 101 + Math.round(cx * 3 + cy * 5 + rx * 7 + ry * 11));
  const steps = 14;
  const start = r() * Math.PI * 2;
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps + 1; i++) {
    const a = start + (i / steps) * Math.PI * 2;
    const grow = 1 + (i / steps) * 0.05; // the second lap ends a hair outside the first
    pts.push([cx + Math.cos(a) * rx * grow + jit(r, wobble), cy + Math.sin(a) * ry * grow + jit(r, wobble)]);
  }
  // Catmull-Rom to cubic Bezier for a smooth curve through the points.
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

/** A circle (see ellipse). */
export const circle = (cx: number, cy: number, r: number, seed = 1, wobble = 1.2) => ellipse(cx, cy, r, r, seed, wobble);

/** A line with an open arrow head at the end. */
export function arrow(x1: number, y1: number, x2: number, y2: number, seed = 1, head = 8): string {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const spread = 0.5;
  return (
    line(x1, y1, x2, y2, seed, 1.6) +
    line(x2, y2, x2 - Math.cos(a - spread) * head, y2 - Math.sin(a - spread) * head, seed + 5, 0.6) +
    line(x2, y2, x2 - Math.cos(a + spread) * head, y2 - Math.sin(a + spread) * head, seed + 6, 0.6)
  );
}

/** A wavy line, for cables, springs, steam and motion. */
export function squiggle(x1: number, y1: number, x2: number, y2: number, amplitude = 4, waves = 4, seed = 1): string {
  const r = rng(seed * 53 + Math.round(x1 + y1 + x2 + y2));
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const nx = -(y2 - y1) / len;
  const ny = (x2 - x1) / len;
  let d = `M${f(x1)} ${f(y1)}`;
  const n = waves * 2;
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const side = i % 2 ? 1 : -1;
    const amp = amplitude * (0.8 + r() * 0.4) * side;
    const mx = x1 + (x2 - x1) * (t - 0.5 / n);
    const my = y1 + (y2 - y1) * (t - 0.5 / n);
    d += `Q${f(mx + nx * amp)} ${f(my + ny * amp)} ${f(x1 + (x2 - x1) * t)} ${f(y1 + (y2 - y1) * t)}`;
  }
  return d;
}

/** A few parallel strokes at an angle: shading and hatching. */
export function hatch(x: number, y: number, w: number, h: number, gap = 6, seed = 1): string {
  let d = "";
  const r = rng(seed * 13 + Math.round(x + y));
  for (let i = -h; i < w; i += gap) {
    const x1 = Math.max(x, x + i);
    const y1 = y + Math.max(0, -i);
    const x2 = Math.min(x + w, x + i + h);
    const y2 = y + Math.min(h, w - i);
    if (x2 > x1) d += line(x1, y1, x2, y2, seed + Math.round(r() * 100), 0.8);
  }
  return d;
}
