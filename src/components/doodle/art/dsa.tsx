import { arrow, circle as circleRaw, line, poly, rect, box } from "../hand";
import type { DoodleSet } from "../types";

/** Doodles for the coding patterns. Same recipe as the cache doodle: wash, pen outline, one hot spot, thin details. */

type Pt = [number, number];

/** A circle whose wobble shrinks with its size, so small nodes stay round. */
const circle = (cx: number, cy: number, r: number, seed = 1) => circleRaw(cx, cy, r, seed, Math.min(1.2, r * 0.06));

/** A rectangle strip around a segment, for colouring in a corridor. */
function band(a: Pt, b: Pt, hw: number): string {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const nx = (-(b[1] - a[1]) / len) * hw;
  const ny = ((b[0] - a[0]) / len) * hw;
  const f = (n: number) => Math.round(n * 10) / 10;
  return `M${f(a[0] + nx)} ${f(a[1] + ny)}L${f(b[0] + nx)} ${f(b[1] + ny)}L${f(b[0] - nx)} ${f(b[1] - ny)}L${f(a[0] - nx)} ${f(a[1] - ny)}z`;
}

/** Points along a quadratic curve. */
function bez(x1: number, y1: number, cx: number, cy: number, x2: number, y2: number, n = 8): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    pts.push([u * u * x1 + 2 * u * t * cx + t * t * x2, u * u * y1 + 2 * u * t * cy + t * t * y2]);
  }
  return pts;
}

/** A curved stroke with an arrow head at the end. */
function curveArrow(x1: number, y1: number, cx: number, cy: number, x2: number, y2: number, seed: number, head = 8): string {
  const pts = bez(x1, y1, cx, cy, x2, y2, 8);
  const p = pts[pts.length - 2];
  return poly(pts.slice(0, -1), seed, 0.5) + arrow(p[0], p[1], x2, y2, seed + 20, head);
}

/** A dashed straight stroke. */
function dashed(x1: number, y1: number, x2: number, y2: number, seed = 1, dash = 6, gap = 4): string {
  const len = Math.hypot(x2 - x1, y2 - y1);
  let d = "";
  let s = 0;
  let i = 0;
  while (s < len) {
    const e = Math.min(len, s + dash);
    const a = s / len;
    const b = e / len;
    d += line(x1 + (x2 - x1) * a, y1 + (y2 - y1) * a, x1 + (x2 - x1) * b, y1 + (y2 - y1) * b, seed + i, 0.5);
    s += dash + gap;
    i++;
  }
  return d;
}

/** A dashed path through points. */
function dashedPoly(points: Pt[], seed = 1, dash = 6, gap = 4): string {
  return points
    .slice(1)
    .map((p, i) => dashed(points[i][0], points[i][1], p[0], p[1], seed + i * 17, dash, gap))
    .join("");
}

/** A dashed ring. */
function dashedRing(cx: number, cy: number, r: number, seed = 1, n = 16): string {
  let d = "";
  for (let i = 0; i < n; i += 2) {
    const a0 = (i / n) * Math.PI * 2;
    const a1 = ((i + 1.2) / n) * Math.PI * 2;
    const am = (a0 + a1) / 2;
    d += poly(
      [
        [cx + Math.cos(a0) * r, cy + Math.sin(a0) * r],
        [cx + Math.cos(am) * r, cy + Math.sin(am) * r],
        [cx + Math.cos(a1) * r, cy + Math.sin(a1) * r],
      ],
      seed + i,
      0.4,
    );
  }
  return d;
}

/** A five-pointed star. */
function star(cx: number, cy: number, big: number, small: number, seed = 1): string {
  const pts: Pt[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? small : big;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return poly(pts, seed, 0.6, true);
}

/** A line between two circles' edges. */
function edge(a: Pt, b: Pt, ra: number, rb: number, seed: number): string {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ux = (b[0] - a[0]) / len;
  const uy = (b[1] - a[1]) / len;
  return line(a[0] + ux * ra, a[1] + uy * ra, b[0] - ux * rb, b[1] - uy * rb, seed, 1);
}

/** Vertical dividers inside a row of cells. */
function dividers(x: number, y: number, w: number, h: number, count: number, seed: number): string {
  let d = "";
  for (let i = 1; i < count; i++) d += line(x + (w / count) * i, y, x + (w / count) * i, y + h, seed + i, 0.8);
  return d;
}

export const dsaArts: DoodleSet = {
  "two-pointers": {
    title: "Two pointers are two big arrows at either end of a row, stepping inwards until they meet.",
    draw: () => (
      <>
        {/* the row */}
        <path className="d-fill" d="M32 52h140v28h-140z" />
        <path className="d-line" d={rect(30, 50, 140, 28, 1)} />
        <path className="d-thin" d={dividers(30, 50, 140, 28, 7, 2)} />
        {/* the cells the pointers stand on */}
        <path className="d-warm" d="M32 52h20v28h-20z" />
        <path className="d-warm" d="M152 52h20v28h-20z" />
        {/* the two pointers, big and from below */}
        <path className="d-warm" d="M42 88l-10 13h6v20h8v-20h6z" />
        <path className="d-hot" d={poly([[40, 85], [29, 99], [36, 99], [36, 119], [44, 119], [44, 99], [51, 99]], 3, 0.8, true)} />
        <path className="d-warm" d="M162 88l-10 13h6v20h8v-20h6z" />
        <path className="d-hot" d={poly([[160, 85], [149, 99], [156, 99], [156, 119], [164, 119], [164, 99], [171, 99]], 4, 0.8, true)} />
        {/* both step inwards */}
        <path className="d-accent" d={curveArrow(42, 42, 62, 14, 84, 40, 5)} />
        <path className="d-accent" d={curveArrow(158, 42, 138, 14, 116, 40, 6)} />
      </>
    ),
  },

  "sliding-window": {
    title: "A sliding window is a frame around a few cells that shifts one step along the row.",
    draw: () => (
      <>
        <path className="d-fill" d="M22 66h160v28h-160z" />
        <path className="d-line" d={rect(20, 64, 160, 28, 8)} />
        <path className="d-thin" d={dividers(20, 64, 160, 28, 8, 9)} />
        {/* the frame and what is inside it */}
        <path className="d-warm" d="M62 66h60v28h-60z" />
        <path className="d-hot" d={rect(58, 57, 66, 44, 10)} />
        <path className="d-thin" d={circle(70, 78, 3.5, 11)} />
        <path className="d-thin" d={circle(90, 78, 3.5, 12)} />
        <path className="d-thin" d={circle(110, 78, 3.5, 13)} />
        {/* the ghost one step on */}
        <path
          className="d-thin"
          d={
            dashed(78, 52, 146, 52, 14) +
            dashed(78, 106, 146, 106, 15) +
            dashed(78, 52, 78, 106, 16) +
            dashed(146, 52, 146, 106, 17)
          }
        />
        <path className="d-accent" d={curveArrow(92, 46, 112, 22, 140, 44, 18)} />
      </>
    ),
  },

  "binary-search": {
    title: "Binary search peeks at the middle bar of a sorted row, then throws half the row away.",
    draw: () => (
      <>
        {/* sorted bars, rising */}
        <path
          className="d-fill"
          d="M30 108h16v14h-16z M52 99h16v23h-16z M74 90h16v32h-16z M118 72h16v50h-16z M140 63h16v59h-16z M162 54h16v68h-16z"
        />
        <path
          className="d-line"
          d={
            rect(28, 106, 16, 14, 1) +
            rect(50, 97, 16, 23, 2) +
            rect(72, 88, 16, 32, 3) +
            rect(116, 70, 16, 50, 5) +
            rect(138, 61, 16, 59, 6) +
            rect(160, 52, 16, 68, 7)
          }
        />
        <path className="d-line" d={line(18, 121, 186, 121, 8)} />
        {/* the middle bar and its flag */}
        <path className="d-warm" d="M96 81h16v40h-16z" />
        <path className="d-hot" d={rect(94, 79, 16, 41, 9)} />
        <path className="d-hot" d={poly([[102, 79], [102, 54]], 10, 0.6)} />
        <path className="d-warm" d="M103 56l-17 6l17 7z" />
        <path className="d-hot" d={poly([[102, 55], [86, 62], [102, 69]], 11, 0.6, true)} />
        {/* the whole row, then the half that is left */}
        <path className="d-line" d={poly([[28, 36], [28, 28], [178, 28], [178, 36]], 12, 0.8)} />
        <path className="d-accent" d={poly([[116, 46], [116, 40], [178, 40], [178, 46]], 13, 0.8)} />
        <path className="d-thin" d={dashed(102, 30, 102, 51, 14, 4, 3)} />
      </>
    ),
  },

  "hash-map": {
    title: "A hash map is a wall of buckets: each key tag points straight to its bucket, even if two share one.",
    draw: () => {
      const ys = [14, 42, 70, 98];
      const tags = [16, 54, 92];
      return (
        <>
          {/* the buckets */}
          <path className="d-fill" d={ys.map((y) => `M120 ${y + 2}h52v24h-52z`).join("")} />
          <path className="d-line" d={ys.map((y, i) => box(118, y, 52, 24, 5, i + 1)).join("")} />
          {/* what is inside: one bucket holds two */}
          <path className="d-line" d={circle(130, 26, 5, 5) + circle(130, 54, 5, 8) + circle(146, 54, 5, 9) + circle(130, 110, 5, 7)} />
          <path className="d-warm" d={circle(131, 83, 5, 6)} />
          <path className="d-hot" d={circle(130, 82, 5, 10)} />
          {/* key tags */}
          <path className="d-warm" d="M20 94h34v18h-34z" />
          {tags.map((y, i) => (
            <g key={y}>
              <path className={i === 2 ? "d-hot" : "d-line"} d={poly([[16, y], [50, y], [60, y + 9], [50, y + 18], [16, y + 18]], 20 + i, 0.8, true)} />
              <path className="d-thin" d={circle(51, y + 9, 2, 25 + i)} />
              <path className="d-thin" d={line(22, y + 9, 40, y + 9, 30 + i)} />
            </g>
          ))}
          {/* strings from tags into buckets; the lookup is the hot one */}
          <path className="d-thin" d={arrow(63, 25, 114, 26, 40, 6)} />
          <path className="d-thin" d={arrow(63, 63, 114, 54, 41, 6)} />
          <path className="d-hot" d={arrow(63, 101, 114, 84, 42, 9)} />
          <text className="d-text" x="64" y="130" fontSize="15">
            O(1)
          </text>
        </>
      );
    },
  },

  stack: {
    title: "A stack is a pile of books: you can only put one on top, or take the top one off.",
    draw: () => (
      <>
        {/* books, bottom to top */}
        <path className="d-fill" d="M60 106h80v18h-80z M64 88h70v18h-70z M62 70h76v18h-76z" />
        <path className="d-line" d={box(58, 104, 84, 18, 3, 1, 0.8) + box(64, 86, 72, 18, 3, 2, 0.8) + box(62, 68, 78, 18, 3, 3, 0.8)} />
        <path className="d-thin" d={line(68, 107, 68, 119, 4) + line(73, 107, 73, 119, 5) + line(72, 89, 72, 101, 6) + line(77, 89, 77, 101, 7) + line(70, 71, 70, 83, 8) + line(75, 71, 75, 83, 9)} />
        {/* the top book */}
        <path className="d-warm" d="M69 52h64v18h-64z" />
        <path className="d-hot" d={box(67, 50, 66, 18, 3, 10, 0.8)} />
        <path className="d-thin" d={line(76, 53, 76, 65, 11) + line(81, 53, 81, 65, 12)} />
        {/* push in, pop out */}
        <path className="d-accent" d={arrow(46, 28, 84, 44, 13, 9)} />
        <path className="d-accent" d={arrow(122, 44, 160, 26, 14, 9)} />
        <text className="d-text" x="12" y="26" fontSize="15">
          push
        </text>
        <text className="d-text" x="150" y="46" fontSize="15">
          pop
        </text>
      </>
    ),
  },

  tree: {
    title: "A tree is a root with branches: depth-first search dives all the way down one branch before the next.",
    draw: () => {
      const root: Pt = [100, 26];
      const l: Pt = [62, 66];
      const r: Pt = [140, 66];
      const g1: Pt = [40, 112];
      const g2: Pt = [84, 112];
      const g3: Pt = [140, 112];
      const R = 10;
      return (
        <>
          {/* the nodes on the dived path are coloured in */}
          <path className="d-warm" d={circle(root[0] + 1, root[1] + 1, R - 1, 1) + circle(l[0] + 1, l[1] + 1, R - 1, 2) + circle(g1[0] + 1, g1[1] + 1, R - 1, 3)} />
          <path className="d-fill" d={circle(r[0] + 1, r[1] + 1, R - 1, 4) + circle(g2[0] + 1, g2[1] + 1, R - 1, 5) + circle(g3[0] + 1, g3[1] + 1, R - 1, 6)} />
          <path className="d-line" d={edge(root, l, R, R, 7) + edge(l, g1, R, R, 9)} />
          <path className="d-thin" d={edge(root, r, R, R, 8) + edge(l, g2, R, R, 10) + edge(r, g3, R, R, 11)} />
          <path className="d-line" d={circle(root[0], root[1], R, 12) + circle(l[0], l[1], R, 13) + circle(g1[0], g1[1], R, 15)} />
          <path className="d-line" d={circle(r[0], r[1], R, 14) + circle(g2[0], g2[1], R, 16) + circle(g3[0], g3[1], R, 17)} />
          {/* the dive: down the left side, all the way */}
          <path className="d-hot" d={dashedPoly([[92, 20], [58, 50], [48, 76], [34, 96]], 18, 6, 4)} />
          <path className="d-hot" d={arrow(36, 94, 30, 101, 19, 7)} />
        </>
      );
    },
  },

  graph: {
    title: "A graph is dots joined by lines, and a search spreads out from one dot in rings, like ripples in a pond.",
    draw: () => {
      const c: Pt = [100, 72];
      const n1: Pt = [48, 34];
      const n2: Pt = [154, 34];
      const n3: Pt = [160, 106];
      const n4: Pt = [44, 112];
      const R = 8;
      return (
        <>
          <path className="d-fill" d={circle(n1[0] + 1, n1[1] + 1, R - 1, 1) + circle(n2[0] + 1, n2[1] + 1, R - 1, 2) + circle(n3[0] + 1, n3[1] + 1, R - 1, 3) + circle(n4[0] + 1, n4[1] + 1, R - 1, 4)} />
          <path className="d-warm" d={circle(c[0] + 1, c[1] + 1, 9, 5)} />
          <path className="d-line" d={edge(c, n1, 15, R, 6) + edge(c, n2, 15, R, 7) + edge(c, n3, 15, R, 8) + edge(n1, n4, R, R, 9) + edge(n2, n3, R, R, 10) + edge(c, n4, 15, R, 11)} />
          <path className="d-line" d={circle(n1[0], n1[1], R, 12) + circle(n2[0], n2[1], R, 13) + circle(n3[0], n3[1], R, 14) + circle(n4[0], n4[1], R, 15)} />
          {/* the start node, ringed */}
          <path className="d-line" d={circle(c[0], c[1], 9, 16)} />
          <path className="d-line" d={circle(c[0], c[1], 15, 17)} />
          {/* the frontier spreading */}
          <path className="d-hot" d={dashedRing(c[0], c[1], 27, 18, 16)} />
          <path className="d-thin" d={dashedRing(c[0], c[1], 42, 40, 22)} />
        </>
      );
    },
  },

  "dp-table": {
    title: "A DP table fills in cell by cell: each new cell is worked out from its neighbours, up to the corner prize.",
    draw: () => (
      <>
        {/* cells already filled in */}
        <path className="d-fill" d="M52 28h92v22h-92z M52 52h68v22h-68z M52 76h44v22h-44z" />
        <path className="d-line" d={rect(50, 26, 96, 96, 1)} />
        <path className="d-thin" d={line(74, 26, 74, 122, 2) + line(98, 26, 98, 122, 3) + line(122, 26, 122, 122, 4) + line(50, 50, 146, 50, 5) + line(50, 74, 146, 74, 6) + line(50, 98, 146, 98, 7)} />
        {/* the cell being worked out, and the two neighbours feeding it */}
        <path className="d-warm" d="M100 76h22v22h-22z" />
        <path className="d-hot" d={rect(98, 74, 24, 24, 8)} />
        <path className="d-hot" d={arrow(110, 56, 110, 82, 9, 9)} />
        <path className="d-hot" d={arrow(80, 86, 105, 86, 10, 9)} />
        {/* the prize in the corner */}
        <path className="d-fill" d="M124 100h22v22h-22z" />
        <path className="d-accent" d={star(134, 111, 9, 4, 11)} />
      </>
    ),
  },

  heap: {
    title: "A heap is a pyramid where the winner always sits at the top, kept in a plain row underneath.",
    draw: () => {
      const root: Pt = [100, 24];
      const l2: Pt[] = [[62, 52], [138, 52]];
      const l3: Pt[] = [[44, 80], [80, 80], [120, 80], [156, 80]];
      const R = 8;
      const all = [...l2, ...l3];
      return (
        <>
          <path className="d-fill" d={all.map((p, i) => circle(p[0] + 1, p[1] + 1, R - 1, i + 1)).join("")} />
          <path className="d-warm" d={circle(root[0] + 1, root[1] + 1, 10, 9)} />
          <path
            className="d-line"
            d={
              edge(root, l2[0], 11, R, 10) +
              edge(root, l2[1], 11, R, 11) +
              edge(l2[0], l3[0], R, R, 12) +
              edge(l2[0], l3[1], R, R, 13) +
              edge(l2[1], l3[2], R, R, 14) +
              edge(l2[1], l3[3], R, R, 15)
            }
          />
          <path className="d-line" d={all.map((p, i) => circle(p[0], p[1], R, 20 + i)).join("")} />
          {/* the root, the one that matters */}
          <path className="d-hot" d={circle(root[0], root[1], 11, 30)} />
          <path className="d-hot" d={arrow(130, 30, 130, 12, 31, 7)} />
          {/* the array underneath */}
          <path className="d-fill" d="M32 108h140v20h-140z" />
          <path className="d-warm" d="M32 108h20v20h-20z" />
          <path className="d-line" d={rect(30, 106, 140, 20, 32)} />
          <path className="d-thin" d={dividers(30, 106, 140, 20, 7, 33)} />
          <text className="d-text" x="46" y="30" fontSize="14">
            min
          </text>
        </>
      );
    },
  },

  "linked-list": {
    title: "A linked list is a chain of boxes that each point to the next; reversing it means flipping the arrows.",
    draw: () => {
      const xs = [15, 61, 107, 153];
      const y = 66;
      return (
        <>
          {/* four nodes: value half, pointer half */}
          <path className="d-fill" d={xs.map((x) => `M${x + 2} ${y + 2}h16v28h-16z`).join("")} />
          <path className="d-line" d={xs.map((x, i) => rect(x, y, 32, 28, i + 1)).join("")} />
          <path className="d-line" d={xs.map((x, i) => line(x + 16, y, x + 16, y + 28, 10 + i, 0.6)).join("")} />
          <path className="d-line" d={xs.map((x, i) => circle(x + 24, y + 14, 1.8, 20 + i)).join("")} />
          {/* next pointers */}
          <path className="d-line" d={arrow(xs[0] + 24, y + 14, xs[1] - 2, y + 14, 30, 7) + arrow(xs[1] + 24, y + 14, xs[2] - 2, y + 14, 31, 7) + arrow(xs[2] + 24, y + 14, xs[3] - 2, y + 14, 32, 7)} />
          {/* the end of the chain */}
          <path className="d-line" d={line(xs[3] + 29, y + 4, xs[3] + 19, y + 24, 33, 0.6)} />
          {/* head */}
          <path className="d-accent" d={arrow(xs[0] + 8, 44, xs[0] + 8, 62, 34, 7)} />
          <text className="d-text" x="12" y="38" fontSize="15">
            head
          </text>
          {/* the pointer being rewired: backwards, dashed */}
          <path className="d-hot" d={dashedPoly(bez(xs[2] + 24, y + 30, 102, 142, xs[1] + 24, y + 34, 10), 40, 6, 4)} />
          <path className="d-hot" d={arrow(xs[1] + 25, y + 38, xs[1] + 24, y + 31, 41, 8)} />
        </>
      );
    },
  },

  trie: {
    title: "A trie is a tree of letters: walking down one path from the root spells a word, and shared starts share branches.",
    draw: () => {
      const root: Pt = [100, 22];
      const n1: Pt = [62, 56];
      const n2: Pt = [142, 56];
      const n3: Pt = [40, 92];
      const n4: Pt = [86, 92];
      const n5: Pt = [142, 92];
      const n6: Pt = [40, 126];
      const n7: Pt = [86, 126];
      const n8: Pt = [142, 126];
      const R = 8;
      return (
        <>
          <path className="d-warm" d={circle(root[0] + 1, root[1] + 1, R - 1, 1) + circle(n1[0] + 1, n1[1] + 1, R - 1, 2) + circle(n3[0] + 1, n3[1] + 1, R - 1, 3) + circle(n6[0] + 1, n6[1] + 1, R, 4)} />
          <path className="d-fill" d={circle(n7[0] + 1, n7[1] + 1, R - 1, 22) + circle(n8[0] + 1, n8[1] + 1, R - 1, 23) + circle(n2[0] + 1, n2[1] + 1, R - 1, 5) + circle(n4[0] + 1, n4[1] + 1, R - 1, 6) + circle(n5[0] + 1, n5[1] + 1, R - 1, 7)} />
          <path className="d-line" d={edge(root, n2, R, R, 8) + edge(n1, n4, R, R, 9) + edge(n2, n5, R, R, 10) + edge(n4, n7, R, R, 24) + edge(n5, n8, R, R, 25)} />
          <path className="d-line" d={circle(root[0], root[1], R, 11) + circle(n1[0], n1[1], R, 12) + circle(n3[0], n3[1], R, 14) + circle(n6[0], n6[1], R, 17)} />
          <path className="d-line" d={circle(n2[0], n2[1], R, 13) + circle(n4[0], n4[1], R, 15) + circle(n5[0], n5[1], R, 16) + circle(n7[0], n7[1], R, 26) + circle(n8[0], n8[1], R, 27)} />
          {/* the word's path: c, a, t */}
          <path className="d-hot" d={edge(root, n1, R, R, 18)} />
          <path className="d-hot" d={edge(n1, n3, R, R, 19)} />
          <path className="d-hot" d={edge(n3, n6, R, R, 20)} />
          <text className="d-text" x="68" y="38" fontSize="15">
            c
          </text>
          <text className="d-text" x="30" y="72" fontSize="15">
            a
          </text>
          <text className="d-text" x="48" y="114" fontSize="15">
            t
          </text>
        </>
      );
    },
  },

  backtracking: {
    title: "Backtracking is exploring a maze: hit a dead end, rewind to the last junction, and try the other way to the prize.",
    draw: () => {
      const start: Pt = [20, 78];
      const j: Pt = [62, 78];
      const up: Pt[] = [j, [94, 42], [140, 42]];
      const down: Pt[] = [j, [94, 114], [154, 114]];
      return (
        <>
          {/* the corridors */}
          <path className="d-fill" d={band(start, j, 7) + band(up[0], up[1], 7) + band(up[1], up[2], 7) + band(down[0], down[1], 7) + band(down[1], down[2], 7)} />
          <path className="d-line" d={poly([start, j], 1, 0.8) + poly(up, 2, 0.8) + poly(down, 3, 0.8)} />
          <path className="d-line" d={circle(start[0] - 4, start[1], 4, 4)} />
          {/* the dead end */}
          <path className="d-line" d={line(145, 35, 159, 49, 5, 0.6) + line(159, 35, 145, 49, 6, 0.6)} />
          {/* the junction */}
          <path className="d-fill" d={circle(j[0] + 1, j[1] + 1, 5, 7)} />
          <path className="d-line" d={circle(j[0], j[1], 5, 8)} />
          {/* rewind: back to the junction */}
          <path className="d-hot" d={curveArrow(138, 56, 118, 92, 72, 80, 9, 10)} />
          {/* the prize down the other branch */}
          <path className="d-fill" d={star(177, 115, 11, 5, 10)} />
          <path className="d-accent" d={star(176, 114, 11, 5, 11)} />
        </>
      );
    },
  },
};
