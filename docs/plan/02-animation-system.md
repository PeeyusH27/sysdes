# 02: Animation system (SVG flows, connections, graphs)

The source animates one thing: dashed edges. The rebuild makes diagrams **explain**. Packets travel along connections in order, nodes change state (hit, miss, down), captions narrate each step, and the reader can play, pause and step through. All of it is plain SVG that we own: no Mermaid and no canvas library.

## 1. Principles

1. **Meaning first, motion second.** Every animation answers "what moves, where, in what order". Decorative motion is limited to the home hero.
2. **A complete first frame without JS.** Diagrams and charts are server-rendered in their final state. Animation only adds to it (traces, packets, highlights) and never hides content until hydration.
3. **On demand.** Scenarios play when the reader presses Play. Only the dash flow and the home hero loop by themselves, and both pause when off-screen.
4. **Reduced motion is a first-class mode** (§8), not an afterthought.
5. **Specs are data.** A diagram is a typed object in `content/**/diagrams.ts`. The same spec drives the lesson diagram, its text description, tests and the playground templates (03 §8).

| Component | Replaces | Used for |
|---|---|---|
| `FlowDiagram` + `useScenario` + `Packet` | `dg()` and Mermaid `flowchart` | Architectures, request paths, pipelines |
| `SequenceDiagram` | Mermaid `sequenceDiagram` | Cache-aside, booking, chat, polling, request flows |
| `ClassDiagram` | Mermaid `classDiagram` | Parking lot (LLD) |
| `DecisionTree` | Mermaid decision flowchart | "Choose the right store" and other choosers |
| `Timeline` | (new) | 45-minute interview plan, handshake timelines, polling race, trace waterfall |
| `BarChart`, `LineChart`, `StatTiles` | `ch()` | Every graph (§6) |
| Widgets | (new) | Interactive simulators (§7) |

## 2. Diagram spec format

```ts
// src/components/diagram/types.ts
export type NodeKind =
  | 'client' | 'dns' | 'cdn' | 'lb' | 'gateway' | 'service' | 'worker' | 'idgen'
  | 'cache' | 'database' | 'storage' | 'search' | 'queue' | 'pubsub' | 'external';

export interface FlowNode {
  id: string; label: string; kind: NodeKind;
  col: number; row: number;             // grid position, same idea as the source's dg() arrays
  sub?: string;                         // second line, e.g. "×3" or "primary"
  note?: string;                        // shown on hover/focus and in the text description
}
export interface FlowEdge { from: string; to: string; label?: string; style?: 'sync' | 'async' | 'replication' }
export type NodeState = 'ok' | 'hit' | 'miss' | 'busy' | 'down';

export interface ScenarioStep {
  edge: `${string}>${string}`;          // "app>cache"; a reply travels the same edge with reverse: true
  reverse?: boolean;
  caption: string;                      // narrated in an aria-live region
  tone?: 'ok' | 'miss' | 'error';       // packet colour: accent / amber / red (paired with the caption text)
  ms?: number;                          // dwell before the next step, default 1100
  with?: Omit<ScenarioStep, 'with'>[];  // extra packets at the same time (fan-out)
  mark?: { node: string; state: NodeState }[];   // node badges from this step on
}
export interface Scenario { id: string; name: string; steps: ScenarioStep[] }
export interface FlowSpec {
  id: string; title: string; description: string;
  nodes: FlowNode[]; edges: FlowEdge[]; scenarios?: Scenario[];
}
```

**Example: cache-aside with two scenarios**

```ts
// content/learn/04-caching/diagrams.ts
export const cacheAside: FlowSpec = {
  id: 'cache-aside', title: 'Cache-aside flow',
  description: 'The app checks Redis first, reads Postgres only on a miss, then fills the cache with a TTL.',
  nodes: [
    { id: 'client', label: 'Client', kind: 'client', col: 0, row: 1 },
    { id: 'app', label: 'App', kind: 'service', col: 1, row: 1 },
    { id: 'cache', label: 'Redis', kind: 'cache', col: 2, row: 0, sub: '~1 ms' },
    { id: 'db', label: 'Postgres', kind: 'database', col: 2, row: 2, sub: '~50 ms' },
  ],
  edges: [
    { from: 'client', to: 'app' },
    { from: 'app', to: 'cache', label: '1 check' },
    { from: 'app', to: 'db', label: '2 on miss' },
  ],
  scenarios: [
    { id: 'hit', name: 'Cache hit', steps: [
      { edge: 'client>app', caption: 'GET /products/42 reaches the app.' },
      { edge: 'app>cache', caption: 'The app asks Redis for product:42.' },
      { edge: 'app>cache', reverse: true, tone: 'ok', caption: 'Hit. The value comes back in about 1 ms.', mark: [{ node: 'cache', state: 'hit' }] },
      { edge: 'client>app', reverse: true, caption: 'Response sent. The database was never touched.' },
    ] },
    { id: 'miss', name: 'Cache miss', steps: [
      { edge: 'client>app', caption: 'GET /products/42 reaches the app.' },
      { edge: 'app>cache', caption: 'The app asks Redis for product:42.' },
      { edge: 'app>cache', reverse: true, tone: 'miss', caption: 'Miss: Redis returns nil.', mark: [{ node: 'cache', state: 'miss' }] },
      { edge: 'app>db', caption: 'The app reads the row from Postgres (about 50 ms).' },
      { edge: 'app>db', reverse: true, caption: 'Row returned.' },
      { edge: 'app>cache', caption: 'SET product:42 with a jittered TTL, so the next read is a hit.' },
      { edge: 'client>app', reverse: true, caption: 'Response sent.' },
    ] },
  ],
};
```

**Migration (Phase 1).** The source's `dg` objects are ported unchanged, and scenarios are added in Phase 2:

```ts
// src/components/diagram/fromLegacy.ts
const KIND = { c: 'client', l: 'gateway', s: 'service', d: 'database', k: 'cache', q: 'queue', x: 'external' } as const;
type LegacyDg = { t: string; n: [string, string, number, number, keyof typeof KIND][]; e: ([string, string] | [string, string, string])[] };

export function fromLegacy(id: string, dg: LegacyDg, description = ''): FlowSpec {
  return {
    id, title: dg.t, description,
    nodes: dg.n.map(([nid, label, col, row, k]) => ({ id: nid, label, col, row, kind: KIND[k] })),
    edges: dg.e.map(([from, to, label]) => ({ from, to, label })),
  };
}
```

The 13 Mermaid diagrams (6 deep dives and 7 questions) are converted to `FlowSpec`, `SequenceSpec`, `ClassSpec` or `DecisionSpec` **by hand**. That's about 15 minutes each, which is quicker than writing a parser.

## 3. FlowDiagram

### 3.1 Layout and edge routing

```ts
// src/components/diagram/layout.ts
export const NODE = { w: 132, h: 44 };
const GAP = { horizontal: { x: 172, y: 84 }, vertical: { x: 156, y: 96 } } as const;
const PAD = 28;
export type Orientation = keyof typeof GAP;
export type Pt = { x: number; y: number };

export function layoutFlow(spec: FlowSpec, orientation: Orientation) {
  const g = GAP[orientation];
  const pos = new Map<string, Pt>();
  for (const n of spec.nodes) {
    const [a, b] = orientation === 'horizontal' ? [n.col, n.row] : [n.row, n.col];   // transpose on phones
    pos.set(n.id, { x: PAD + a * g.x + NODE.w / 2, y: PAD + b * g.y + NODE.h / 2 });
  }
  const pts = [...pos.values()];
  const width = Math.max(...pts.map(p => p.x)) + NODE.w / 2 + PAD;
  const height = Math.max(...pts.map(p => p.y)) + NODE.h / 2 + PAD;
  const edges = spec.edges.map(e => ({ ...e, id: `${e.from}>${e.to}`, ...edgePath(pos.get(e.from)!, pos.get(e.to)!) }));
  return { pos, edges, width, height };
}

/** Cubic Bézier between the facing sides of two node boxes; `mid` is the curve's exact midpoint (label spot). */
export function edgePath(a: Pt, b: Pt) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const sideways = Math.abs(dx) * NODE.h >= Math.abs(dy) * NODE.w;      // leave through the left/right side?
  if (sideways) {
    const sx = a.x + Math.sign(dx) * NODE.w / 2, tx = b.x - Math.sign(dx) * NODE.w / 2, mx = (sx + tx) / 2;
    return { d: `M${sx},${a.y} C${mx},${a.y} ${mx},${b.y} ${tx},${b.y}`, mid: { x: mx, y: (a.y + b.y) / 2 } };
  }
  const sy = a.y + Math.sign(dy) * NODE.h / 2, ty = b.y - Math.sign(dy) * NODE.h / 2, my = (sy + ty) / 2;
  return { d: `M${a.x},${sy} C${a.x},${my} ${b.x},${my} ${b.x},${ty}`, mid: { x: (a.x + b.x) / 2, y: my } };
}
```

- **Phones** use the transposed (top-to-bottom) layout. The server renders the horizontal layout inside a horizontally scrollable box, which is what the source did. After hydration, narrow screens switch to vertical. Most diagrams are below the fold at that moment, so the switch doesn't count toward CLS.
- **Labels** are limited to 16 characters, which the content test checks. A longer label uses `sub` for a second line.

### 3.2 Edges: three layers

| Layer | Element | Behaviour |
|---|---|---|
| Base | plain `<path>` with an arrow marker | Always visible: the no-JS frame |
| Flow | `<path class="edge-flow">` | CSS dash animation. Sync is `6 6`; async is `2 6` and slower; replication is `10 4 2 4`. It pauses off-screen. |
| Trace | `<m.path>` (Motion) | Plays once when the diagram scrolls into view: an accent stroke draws along each edge in order (`pathLength` 0→1, staggered 120 ms), then fades. Skipped with reduced motion. |

Don't animate `pathLength` on the dashed path. Motion implements `pathLength` with `stroke-dasharray`, which would overwrite the dash pattern. That's why the trace is a separate path.

```css
.flow svg text { font: 12px var(--font-sans); fill: var(--fg); }
.flow .edge-base  { fill: none; stroke: var(--border); stroke-width: 1.5; }
.flow .edge-flow  { fill: none; stroke: var(--muted); stroke-width: 1.6; stroke-dasharray: 6 6; animation: dash-12 1s linear infinite; }
.flow .edge-flow[data-style=async]       { stroke-dasharray: 2 6; animation: dash-8 1.6s linear infinite; }
.flow .edge-flow[data-style=replication] { stroke-dasharray: 10 4 2 4; animation: dash-20 1.4s linear infinite; }
.flow .edge-trace { fill: none; stroke: var(--accent); stroke-width: 2.5; }
.flow .edge[data-active] .edge-flow { stroke: var(--accent); stroke-width: 2.4; }
.flow .edge-label { font-size: 10.5px; fill: var(--muted); paint-order: stroke; stroke: var(--card); stroke-width: 4px; }
.flow [data-dim] { opacity: .22; transition: opacity .2s; }
.flow.is-paused .edge-flow { animation-play-state: paused; }
/* each keyframe moves exactly one dash period, so the loop is seamless */
@keyframes dash-12 { to { stroke-dashoffset: -12; } }
@keyframes dash-8  { to { stroke-dashoffset: -8; } }
@keyframes dash-20 { to { stroke-dashoffset: -20; } }
@media (prefers-reduced-motion: reduce) { .flow .edge-flow { animation: none; } }
```

```tsx
// src/components/diagram/FlowEdge.tsx
'use client';
import { m } from 'motion/react';

export function FlowEdgeView({ ref, d, mid, label, style = 'sync', active, dimmed, trace, traceDelay }: {
  ref?: React.Ref<SVGPathElement>; d: string; mid: Pt; label?: string; style?: FlowEdge['style'];
  active: boolean; dimmed: boolean; trace: boolean; traceDelay: number;
}) {
  return (
    <g className="edge" data-active={active || undefined} data-dim={dimmed || undefined}>
      <path ref={ref} d={d} className="edge-base" markerEnd="url(#arrow)" />
      <path d={d} className="edge-flow" data-style={style} />
      {trace && (
        <m.path d={d} className="edge-trace"
          initial={{ pathLength: 0, opacity: 1 }} animate={{ pathLength: 1, opacity: 0 }}
          transition={{ pathLength: { duration: 0.7, delay: traceDelay }, opacity: { duration: 0.4, delay: traceDelay + 0.7 } }} />
      )}
      {label && <text x={mid.x} y={mid.y - 6} textAnchor="middle" className="edge-label">{label}</text>}
    </g>
  );
}
```

### 3.3 Packets

A packet is a circle whose position is a **Motion value** derived from `path.getPointAtLength()`. Because it's a motion value, the circle moves every frame without re-rendering React.

```tsx
// src/components/diagram/Packet.tsx
'use client';
import { useEffect } from 'react';
import { animate, m, useMotionValue, useTransform } from 'motion/react';

export function Packet({ path, reverse = false, tone = 'ok', ms = 800 }: {
  path?: SVGPathElement; reverse?: boolean; tone?: 'ok' | 'miss' | 'error'; ms?: number;
}) {
  const t = useMotionValue(0);
  const len = path?.getTotalLength() ?? 0;
  const at = (p: number) => path!.getPointAtLength((reverse ? 1 - p : p) * len);
  const cx = useTransform(t, p => (path ? at(p).x : 0));
  const cy = useTransform(t, p => (path ? at(p).y : 0));

  useEffect(() => {
    if (!path) return;
    const run = animate(t, 1, { duration: ms / 1000, ease: [0.4, 0, 0.2, 1] });
    return () => run.stop();
  }, [path, ms, t]);

  if (!path) return null;
  return <m.circle r={6} cx={cx} cy={cy} className={`packet packet--${tone}`} />;
}
```

```css
.packet { stroke: var(--card); stroke-width: 2; }        /* 2px surface ring keeps it legible over edges */
.packet--ok { fill: var(--accent); }  .packet--miss { fill: var(--accent-2); }  .packet--error { fill: var(--critical); }
```

### 3.4 Nodes

- A rounded rect stroked with the kind color, a lucide icon (a nested `<svg>`), the label and an optional `sub` line.
- `tabIndex=0` and an `aria-label` such as "Redis (cache), hit".
- Hover or focus dims everything except the node's neighbours.
- State badges (`hit`, `miss`, `busy`, `down`) always show an icon and a short word. `busy` has a pulsing ring. `down` greys the node and shows a ✕ badge.

### 3.5 The component

```tsx
// src/components/diagram/FlowDiagram.tsx
'use client';
import { useId, useMemo, useRef, useState } from 'react';
import { useInView, useReducedMotion } from 'motion/react';

const NO_STEPS: ScenarioStep[] = [];

export function FlowDiagram({ spec, scenario: initial }: { spec: FlowSpec; scenario?: string }) {
  const uid = useId();
  const narrow = useMediaQuery('(max-width: 640px)');
  const { pos, edges, width, height } = useMemo(() => layoutFlow(spec, narrow ? 'vertical' : 'horizontal'), [spec, narrow]);

  const [scenarioId, setScenarioId] = useState(initial ?? spec.scenarios?.[0]?.id);
  const scenario = spec.scenarios?.find(s => s.id === scenarioId);
  const player = useScenario(scenario?.steps ?? NO_STEPS);

  const box = useRef<HTMLElement>(null);
  const inView = useInView(box, { margin: '-15% 0px' });             // pause dashes + packets off-screen
  const seen = useInView(box, { once: true, amount: 0.5 });          // trigger the one-off trace
  const reduce = useReducedMotion();

  const paths = useRef(new Map<string, SVGPathElement>());           // read only after mount (packets need a click)
  const [hover, setHover] = useState<string | null>(null);
  const near = useMemo(() => hover
    ? new Set(edges.filter(e => e.from === hover || e.to === hover).flatMap(e => [e.id, e.from, e.to]))
    : null, [hover, edges]);

  const live = player.step ? [player.step, ...(player.step.with ?? [])] : [];
  const active = new Set(live.map(s => s.edge));

  return (
    <figure ref={box} className={cn('flow', !inView && 'is-paused')}>
      <div className="flow-scroll" tabIndex={0} aria-keyshortcuts="Space ArrowLeft ArrowRight Home"
           onKeyDown={e => player.handleKey(e)}>
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={`${uid}t ${uid}d`} style={{ width: '100%', maxWidth: width }}>
          <title id={`${uid}t`}>{spec.title}</title>
          <desc id={`${uid}d`}>{spec.description}</desc>
          <defs><ArrowMarker id="arrow" /></defs>
          {edges.map((e, i) => (
            <FlowEdgeView key={e.id} {...e}
              ref={el => { if (el) paths.current.set(e.id, el); }}
              active={active.has(e.id)} dimmed={!!near && !near.has(e.id)}
              trace={seen && !reduce} traceDelay={i * 0.12} />
          ))}
          {spec.nodes.map(n => (
            <FlowNodeView key={n.id} node={n} at={pos.get(n.id)!} state={player.marks[n.id]}
              dimmed={!!near && !near.has(n.id)} onHover={setHover} />
          ))}
          {!reduce && inView && live.map((s, i) => (
            <Packet key={`${player.index}-${i}`} path={paths.current.get(s.edge)} reverse={s.reverse}
              tone={s.tone} ms={((s.ms ?? 1100) * 0.75) / player.speed} />
          ))}
        </svg>
      </div>
      {scenario && (
        <ScenarioControls scenarios={spec.scenarios!} value={scenarioId!} player={player}
          onChange={id => { setScenarioId(id); player.reset(); }} />
      )}
      <figcaption>
        <p className="flow-caption" aria-live="polite">{player.step?.caption ?? spec.description}</p>
        <Legend kinds={[...new Set(spec.nodes.map(n => n.kind))]} />
        {scenario && (
          <details>
            <summary>Text description</summary>
            <ol>{scenario.steps.map((s, i) => <li key={i}>{s.caption}</li>)}</ol>
          </details>
        )}
      </figcaption>
    </figure>
  );
}
```

## 4. Scenario player

```ts
// src/components/diagram/useScenario.ts
'use client';
import { useEffect, useMemo, useState } from 'react';

export function useScenario(steps: ScenarioStep[]) {
  const [index, setIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const last = steps.length - 1;

  useEffect(() => {
    if (!playing) return;
    if (index >= last) { setPlaying(false); return; }
    const t = setTimeout(() => setIndex(i => i + 1), index < 0 ? 150 : (steps[index].ms ?? 1100) / speed);
    return () => clearTimeout(t);
  }, [playing, index, last, steps, speed]);

  // Node badges accumulate: the state after step k is the fold of every mark up to k.
  const marks = useMemo(() => {
    const m: Record<string, NodeState> = {};
    for (const s of steps.slice(0, index + 1)) for (const x of s.mark ?? []) m[x.node] = x.state;
    return m;
  }, [steps, index]);

  const api = {
    index, step: steps[index] as ScenarioStep | undefined, total: steps.length, playing, speed, marks, setSpeed,
    play: () => { if (index >= last) setIndex(-1); setPlaying(true); },
    pause: () => setPlaying(false),
    next: () => { setPlaying(false); setIndex(i => Math.min(i + 1, last)); },
    prev: () => { setPlaying(false); setIndex(i => Math.max(i - 1, 0)); },
    reset: () => { setPlaying(false); setIndex(-1); },
    handleKey: (e: React.KeyboardEvent) => {
      const keys: Record<string, () => void> = {
        ' ': () => (playing ? api.pause() : api.play()), ArrowRight: api.next, ArrowLeft: api.prev, Home: api.reset,
      };
      if (keys[e.key]) { e.preventDefault(); keys[e.key](); }
    },
  };
  return api;
}
```

**Controls UI** (`ScenarioControls`): a scenario radio group (for example "Cache hit | Cache miss | Stampede"), then Prev, Play/Pause/Replay, Next, a "3 / 7" step counter, and a speed select (0.5×, 1×, 2×). These are ordinary buttons reached with Tab. The keyboard shortcuts live on the focusable diagram area, so they don't clash with toolbar arrow-key navigation.

**Reusable scenario patterns** used across pages:

| Pattern | How it's expressed |
|---|---|
| Request/response | step on `a>b`, then the same edge with `reverse: true` |
| Fan-out (LB to 3 services, notification to 3 channels) | one step with `with: [...]` |
| Failure | `mark: [{ node, state: 'down' }]`, then traffic reroutes |
| Retry with backoff | the same edge three times with growing `ms` and captions "retry in 1 s / 2 s / 4 s" |
| Burst or stampede | `with` holding many packets on the same edge, then a `busy` mark |

## 5. Other diagram types

### 5.1 SequenceDiagram

```ts
export interface SeqActor { id: string; label: string; kind: NodeKind }
export type SeqMessage = { from: string; to: string; label: string; type?: 'call' | 'reply' | 'async' };
export type SeqNote = { note: string; over: string[] };
export type SeqAlt = { alt: { when: string; items: SeqItem[] }[] };
export type SeqItem = SeqMessage | SeqNote | SeqAlt;
export interface SequenceSpec { id: string; title: string; description: string; actors: SeqActor[]; items: SeqItem[] }

type Row =
  | { kind: 'msg'; msg: SeqMessage }
  | { kind: 'note'; note: SeqNote }
  | { kind: 'frame'; label: string; depth: number; span: number };

/** Flatten using the branch the reader picked for each alt block (key = path like "r.3"). */
export function flatten(items: SeqItem[], choice: Record<string, number>, path = 'r', depth = 0): Row[] {
  return items.flatMap((it, i): Row[] => {
    if ('alt' in it) {
      const key = `${path}.${i}`;
      const branch = it.alt[choice[key] ?? 0];
      const inner = flatten(branch.items, choice, key, depth + 1);
      return [{ kind: 'frame', label: `[${branch.when}]`, depth, span: inner.length }, ...inner];
    }
    return 'note' in it ? [{ kind: 'note', note: it }] : [{ kind: 'msg', msg: it }];
  });
}
```

- **Layout:** actor columns 150px apart with lifelines. Each row is 40px tall. `alt` frames are drawn as labelled rectangles around their rows. Calls are solid with filled arrows, replies are dashed, async uses open arrowheads, and a self-call draws a loop.
- **Branch selector:** each `alt` block becomes a segmented control above the diagram, for example **Cache hit | Cache miss** or **Seat free | Seat taken**. Switching branches re-flattens the rows and resets playback.
- **Playback:** the server renders every row at full opacity. Once the reader presses Play, rows after the current one dim to 15%, the current arrow draws (`pathLength`) with a packet riding it, and its label fades in. Same controls and keyboard as §4.
- **Actors** reuse the node-kind icons and colors, so a "Redis" actor looks the same in every diagram.

### 5.2 ClassDiagram (UML, used by the parking lot question)

```ts
export interface ClassSpec {
  id: string; title: string; description: string;
  classes: { id: string; name: string; col: number; row: number; stereotype?: 'interface' | 'abstract'; fields?: string[]; methods?: string[] }[];
  relations: {
    from: string; to: string;
    type: 'composition' | 'aggregation' | 'inheritance' | 'implements' | 'association' | 'dependency';
    fromMult?: string; toMult?: string; label?: string;
  }[];
}
```

- **Markers:** filled diamond = composition, hollow diamond = aggregation, hollow triangle = inheritance (dashed for implements), open arrow = association (dashed for dependency).
- **Animation:** classes appear row by row, then relations draw in. Hovering a class highlights its relations. Clicking a class scrolls to that class in the page's code tabs (`#code-Spot`).

### 5.3 DecisionTree (interactive)

```ts
export interface DecisionSpec {
  id: string; title: string; start: string;
  nodes: Record<string, { q: string; yes: string; no: string } | { result: string; why: string; href?: string }>;
}
```

- Without JS, the whole tree renders statically, top-down.
- With JS, the reader answers **Yes/No** (keys **Y** and **N** also work). The chosen edge animates and unchosen branches fade. The result card explains *why* and links to the relevant lesson.
- **Start over** resets. The breadcrumb of answers is kept, so the reader can jump back to any question.

### 5.4 Timeline

```ts
export interface TimelineSpec {
  id: string; title: string; unit: 'min' | 'ms' | 's';
  lanes: { id: string; label: string }[];
  spans: { lane: string; start: number; end: number; label: string; tone?: 1 | 2 | 3 }[];   // tone = series slot
  markers?: { at: number; label: string }[];
}
```

A playhead sweeps from left to right, spans fill as it passes, and markers pop. The reader can scrub by dragging, or use the arrow keys. It's used for the 45-minute interview plan, cold vs keep-alive handshakes, the polling race and the request trace waterfall.

## 6. Charts

### 6.1 Rules (from the data-viz method, applied to this site)

- **Pick the form before color.** A single headline number becomes a stat tile, not a chart. Trends use lines. Magnitudes use bars.
- **One y-axis, always.** Two measures with different units become two charts.
- **Marks:** bars are at most 24px thick with a 4px rounded data end and a square baseline. Lines are 2px. Markers have r ≥ 4 with a 2px ring in the surface color. Area fills are a 10% wash.
- **Chrome:** gridlines and axes are solid 1px hairlines one step off the surface. They are never dashed.
- **Labels:** value at the bar tip, value at the line end, and only the extreme or endpoint, never every point. Compact ticks (0, 10K, 20K). **Text uses text tokens (`--fg`, `--muted`), never the series color.**
- **Legend:** shown when there are 2 or more series (plus direct labels when there are 4 or fewer). A single series has no legend; the title names it.
- **Interaction is the default:** line charts get a crosshair that snaps to the nearest x and lists every series in the tooltip, value first. Bars use the whole band as the hit target. Focus shows the same tooltip as hover.
- **Every chart has a table view** (`<details>Show data</details>`), so a tooltip is never the only way to read a value.
- **Series colors are assigned by identity in a fixed order** and never repainted when a filter changes.

### 6.2 Validated series palette

The source's accent colors fail the palette checks as chart series. Light-mode teal `#0b7a63` is below the chroma floor, and the dark-mode accents are too light for the dark band. The following steps pass **every check, all pairs (≤ 3 series), on the card surfaces**. They were verified with the validator script:

| Slot | Light (`#ffffff` surface) | Dark (`#141d1b` surface) |
|---|---|---|
| `--series-1` teal | `#0b8a70` | `#19a07f` |
| `--series-2` amber | `#b36b00` | `#c98500` |
| `--series-3` blue | `#1d6fd1` | `#3987e5` |

Worst pair: CVD ΔE 10.1 light / 10.4 dark (target ≥ 8), normal-vision ΔE 19.0 / 19.1 (floor 15), and all three are ≥ 3:1 against the surface. **No chart on this site needs more than 3 series.** If one ever does, fold the extra series into "Other" or use small multiples. Re-run the validator whenever a token changes:

```bash
node validate_palette.js "#0b8a70,#b36b00,#1d6fd1" --mode light --surface "#ffffff" --pairs all
node validate_palette.js "#19a07f,#c98500,#3987e5" --mode dark  --surface "#141d1b" --pairs all
```

### 6.3 BarChart

The SSR frame shows bars at full height. Growth from the baseline plays once when the chart enters view (`useAnimate` + `useInView`), and is skipped with reduced motion.

```tsx
// src/components/charts/BarChart.tsx
'use client';
import { useEffect, useId, useState } from 'react';
import { stagger, useAnimate, useInView, useReducedMotion } from 'motion/react';

type Datum = { label: string; value: number; display?: string };

export function BarChart({ title, data, unit, scale = 'linear', height = 240 }: {
  title: string; data: Datum[]; unit: string; scale?: 'linear' | 'log'; height?: number;
}) {
  const uid = useId();
  const [scope, animate] = useAnimate();
  const inView = useInView(scope, { once: true, amount: 0.4 });
  const reduce = useReducedMotion();
  const [hot, setHot] = useState<number | null>(null);

  useEffect(() => {
    if (inView && !reduce) animate('.bar', { scaleY: [0, 1] }, { duration: 0.6, delay: stagger(0.08), ease: 'easeOut' });
  }, [inView, reduce, animate]);

  const W = 560, M = { t: 28, r: 12, b: 36, l: 52 };
  const plotH = height - M.t - M.b, band = (W - M.l - M.r) / data.length, barW = Math.min(24, band * 0.5);
  const ticks = scale === 'log' ? logTicks(data.map(d => d.value)) : niceTicks(Math.max(...data.map(d => d.value)));
  const top = ticks.at(-1)!, base = M.t + plotH;
  const y = (v: number) => M.t + plotH * (1 - (scale === 'log' ? Math.log10(v) / Math.log10(top) : v / top));

  return (
    <figure className="chart">
      <figcaption id={`${uid}t`}>{title}{scale === 'log' && <span className="chart-note"> (log scale)</span>}</figcaption>
      <div className="chart-frame" ref={scope}>
        <svg viewBox={`0 0 ${W} ${height}`} role="img" aria-labelledby={`${uid}t`}>
          {ticks.map(t => (
            <g key={t}>
              <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} className="grid" />
              <text x={M.l - 8} y={y(t) + 4} textAnchor="end" className="tick">{compact(t)}</text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = M.l + band * (i + 0.5);
            return (
              <g key={d.label} tabIndex={0} aria-label={`${d.label}: ${d.display ?? `${d.value.toLocaleString()} ${unit}`}`}
                 onPointerEnter={() => setHot(i)} onPointerLeave={() => setHot(null)} onFocus={() => setHot(i)} onBlur={() => setHot(null)}>
                <rect x={cx - band / 2} y={M.t} width={band} height={plotH} fill="transparent" />   {/* hit area = the band */}
                <path className="bar" data-hot={hot === i || undefined} d={barPath(cx - barW / 2, base, barW, base - y(d.value))}
                      style={{ transformBox: 'fill-box', transformOrigin: 'bottom' }} />
                <text x={cx} y={y(d.value) - 8} textAnchor="middle" className="value">{d.display ?? compact(d.value)}</text>
                <text x={cx} y={base + 20} textAnchor="middle" className="tick">{d.label}</text>
              </g>
            );
          })}
          <line x1={M.l} x2={W - M.r} y1={base} y2={base} className="axis" />
        </svg>
        {hot !== null && <ChartTooltip at={(M.l + band * (hot + 0.5)) / W} value={data[hot].display ?? `${data[hot].value.toLocaleString()} ${unit}`} label={data[hot].label} />}
      </div>
      <ChartTable caption={title} head={['', unit]} rows={data.map(d => [d.label, d.display ?? d.value.toLocaleString()])} />
    </figure>
  );
}

/** 4px rounded data end, square at the baseline. */
const barPath = (x: number, base: number, w: number, h: number) => {
  const r = Math.min(4, h, w / 2);
  return `M${x},${base} V${base - h + r} Q${x},${base - h} ${x + r},${base - h} H${x + w - r} Q${x + w},${base - h} ${x + w},${base - h + r} V${base} Z`;
};
```

```ts
// src/components/charts/scales.ts
/** 0-based ticks on a 1 / 2 / 2.5 / 5 step: niceTicks(35_000) → [0, 10K, 20K, 30K, 40K] */
export function niceTicks(max: number, count = 4) {
  const raw = max / count, mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw)!;
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => i * step);
}
/** Powers of ten for a log axis (values must be ≥ 1): logTicks([5256, 526, 53, 5]) → [1, 10, 100, 1000, 10000] */
export const logTicks = (values: number[]) =>
  Array.from({ length: Math.ceil(Math.log10(Math.max(...values))) + 1 }, (_, i) => 10 ** i);
/** 35000 → "35K", 1250000 → "1.3M" */
export const compact = (v: number) => new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(v);
```

### 6.4 LineChart

- Inputs: `x: number[]`, `series: { id, name, values }[]` (≤ 3), `marker?: number`. The marker draws a vertical hairline at the value a slider has selected.
- The **crosshair** maps the pointer to SVG coordinates with `new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM()!.inverse())` and snaps to the nearest index. With focus, ←/→ move it.
- **Draw-in** uses WAAPI on the line paths. It runs once in view and is skipped with reduced motion:
  `path.animate([{ strokeDasharray: len, strokeDashoffset: len }, { strokeDasharray: len, strokeDashoffset: 0 }], { duration: 900, easing: 'ease-out' })`.
- Chart inputs passed through `useDeferredValue` keep slider-driven recomputation smooth.

### 6.5 Every chart on the site

| Page | Chart | Form and decision |
|---|---|---|
| Learn 1 | Peak QPS for 1M, 10M and 100M DAU | **Three stat tiles** linked to the capacity calculator. The source's linear bar chart made the first bar about 1% tall. |
| Learn 4 | Average latency vs cache hit ratio | Line with 1 series. x runs 0–100% continuously (not 6 points), y = `h·c + (1−h)·(c+d)` ms. Sliders for `c` and `d`, and a marker at the current hit ratio. Only the 0% and 99% endpoints are labelled. |
| Learn 5 | Queue depth over time | Line with a 10% area wash, 1 series, fed live by QueueSim |
| Learn 7 | Downtime per year by availability | Bars on a **log scale**, labelled "3.65 days / 8.77 h / 52.6 min / 5.26 min". The source used a linear scale. |
| Learn 7 | Load on a recovering server: no jitter vs full jitter | Line, 2 series, legend plus end labels (RetryStorm) |
| Deep dive 2 | % of keys moved when going from N to N+1 nodes | Line, 2 series: modulo `N/(N+1)` vs consistent hashing `1/(N+1)`, for N = 2…20 |
| Deep dive 2 | Keys per node on the ring | Bars, 1 series, plus a hairline at the ideal `keys/N` (driven by the vnodes slider) |
| Deep dive 5 | Wait time vs pool size | Line, 1 series (PoolSim) |
| Learn 7 / Q2 | Composite availability, rate-limit headroom | Stat tiles with the formula underneath |

## 7. Widget catalog

Each widget is a client component in `src/components/widgets/`. The simulation logic is a **pure, seedable function** in `src/lib/sim/` with unit tests, and the component only renders state.

```ts
// src/lib/sim/loop.ts: fixed-timestep loop shared by every simulator
export function useFixedStep<S>(initial: S, step: (s: S, dtMs: number) => S, running: boolean, dt = 50) {
  const [state, setState] = useState(initial);
  const ref = useRef(state);
  useEffect(() => {
    if (!running) return;
    let raf = 0, last = performance.now(), acc = 0;
    const loop = (now: number) => {
      acc += Math.min(now - last, 250);                     // clamp after tab switches
      last = now;
      if (acc >= dt) {
        let s = ref.current;
        while (acc >= dt) { s = step(s, dt); acc -= dt; }
        ref.current = s;
        setState(s);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, step, dt]);
  const reset = (s: S) => { ref.current = s; setState(s); };
  return [state, reset] as const;                           // `step` must be stable (module-level or useCallback)
}

// src/lib/rng.ts: deterministic randomness, so the same seed always replays the same story
export function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

**Widget rules.** A widget auto-runs only while in view and not in reduced-motion mode; otherwise it shows a **Step** button. Its controls sit in one row above the visual. Every number it shows is also available as text.

| # | Widget | Page(s) | What the reader learns | Controls | P |
|---|---|---|---|---|---|
| 1 | **CapacityCalculator** | Learn 1, Learn 8, Q2, Q6, Q7 | QPS, peak, read/write split, storage with replicas, bandwidth, servers, cache size | DAU, actions/user, read:write, bytes/write, years, replicas, peak factor; presets per case study | P1 |
| 2 | **LatencyHitRatio** | Learn 4 | Why the jump from 90% to 99% hit ratio matters more than 0% to 50% | hit ratio, cache ms, DB ms | P1 |
| 3 | **LoadBalancerSim** | Learn 2 | Round robin vs least-connections vs power-of-two-choices vs IP hash, with slow and dead servers | algorithm, request rate, "make server C slow", kill/revive | P1 |
| 4 | **HashRing** | Deep dive 2, Learn 3 | Keys move only to and from neighbours; virtual nodes even out load | add/remove node, vnodes 1–200, key count | P1 |
| 5 | **TokenBucketViz** | Q2 | Refill rate vs burst capacity; when a 429 appears | rate, capacity, "burst 20 requests" | P1 |
| 6 | **QuorumPlayground** | Learn 6 | R + W > N means read and write sets overlap; what fails when they don't | N, W, R, "write v2", "read" | P1 |
| 7 | **PollingRace** | Deep dive 4 | Delay and request count for short polling, long polling, SSE and WebSocket | event rate, poll interval, seed | P1 |
| 8 | **QueueSim** | Learn 5 | Backlog grows when produce > consume; Little's law | producer rate, workers, ms per job, "spike ×5" | P1 |
| 9 | **SeatRace** | Q3 | The conditional UPDATE picks exactly one winner | "Alice and Bob click A5 together", network delay | P1 |
| 10 | **DebounceViz** | Q4 | Keystrokes vs fired requests; aborted stale responses | delay ms; type in a real input | P1 |
| 11 | **DecisionTree: store chooser** | Deep dive 3 | Picking a store by access pattern | yes/no answers | P1 |
| 12 | **LRUViz** | Learn 4, Deep dive 1 | Recency order and eviction | capacity, access sequence, `get`/`set` buttons | P2 |
| 13 | **CircuitBreakerSim** | Learn 7 | Closed → open → half-open; fast failure and fallback | dependency error %, threshold, cooldown | P2 |
| 14 | **AvailabilityCalc** | Learn 7 | Serial dependencies multiply; redundancy adds nines | add serial/parallel blocks with their availability | P2 |
| 15 | **RetryStorm** | Learn 7 | How synchronized retries hammer a recovering server | clients, retry policy (none / fixed / exponential / full jitter) | P2 |
| 16 | **KafkaPartitions** | Learn 5 | Consumers beyond the partition count sit idle; key → partition → ordering | partitions, consumers, keyed vs round-robin | P2 |
| 17 | **ReplicationLag** | Learn 3 | Stale reads from replicas, and the read-your-writes fix | lag ms, read-your-writes on/off | P2 |
| 18 | **VirtualListViz** | Q5 | Mounted DOM nodes vs total items | virtualization on/off, item count | P2 |
| 19 | **ChatSim** | Q6 | Message states sending → sent → delivered → read, retries and dedupe | latency, drop %, take Bob offline | P2 |
| 20 | **PoolSim** | Deep dive 5 | Queueing for connections; why a bigger pool isn't always faster | pool size, request rate, query ms, DB cores | P2 |
| 21 | **HandshakeTimeline** | Deep dive 5 | Cold HTTPS (DNS + TCP + TLS + request) vs a keep-alive request | RTT, TLS 1.2 / 1.3, HTTP/3 | P2 |
| 22 | **FanoutCalc** | Q7 | Write amplification and delivery time for push vs pull | followers, posts/day, fan-out throughput | P2 |
| 23 | **TraceWaterfall** | Deep dive 6 | Where the latency budget goes on read, write, async and failure paths | flow, CDN hit, cache hit, DB slow | P2 |
| 24 | **Base62Playground** + **RangeAllocator** | Learn 8 | Encoding, scrambling, block allocation per server | id input, servers, block size | P3 |
| 25 | **RaftElection** | Learn 6 | Terms, randomized timeouts, majority votes, leader failover | kill leader, partition a node | P3 |
| 26 | **InterviewTimer** + rubric | Learn 10 | Pacing a 45-minute answer | start/pause, question picker | P3 |
| 27 | **DiagramQuiz** (drag the missing component into place) | Learn 2, 3, 4, 5 | Where the cache, queue or LB belongs | drag (dnd-kit), keyboard, tap | P3 |

## 8. Reduced motion and accessibility

Two sources are combined: the OS `prefers-reduced-motion` setting, and a site-level **Reduce motion** switch in settings, stored in the progress store. The switch sets `<html data-motion="reduce">` and wraps the app in `<MotionConfig reducedMotion="always">`. Otherwise the app uses `reducedMotion="user"`.

| Element | Normal | Reduced motion |
|---|---|---|
| Edge dash flow | Animated | Static dashes |
| Edge trace on enter | Plays once | Skipped |
| Packets | Travel along edges | Not rendered; the active edge is highlighted and the caption still updates |
| Bars and lines | Grow or draw in | Rendered in final state |
| Widgets | Auto-run in view | Paused, with a **Step** button |
| Home hero loop | Loops | Static frame |
| Playground traffic | Packet density shows QPS | Edge labels show QPS |

Text alternatives: every diagram has `<title>`, `<desc>`, a caption live region and a "Text description" ordered list. Every chart has a table. Every widget states its result in text, for example "Backlog: 1,240 jobs (growing by 60/s)".

## 9. Performance

- Per-frame movement uses **Motion values or WAAPI, never React state**. Simulators batch their state to at most 20 updates/s (`dt = 50`).
- Everything pauses off-screen (`useInView`) and when the tab is hidden (`document.visibilitychange`).
- Diagrams stay under ~300 SVG elements. HashRing draws keys as one `<path>` of small arcs, and switches to `<canvas>` above 500 keys.
- No SVG filters (blur, drop-shadow) on animated elements. `will-change: transform` goes only on moving packets.
- Widgets mount lazily with `next/dynamic` plus an in-view gate. Content pages use `LazyMotion` + `domAnimation`.

## 10. Testing animations

- **Pure logic:** `layoutFlow`/`edgePath` (midpoint math, transposition), `flatten`, `useScenario` (fake timers: Play → steps advance with the right `ms`; marks accumulate), and every `src/lib/sim/*` step function with a fixed seed.
- **Components:** set `MotionGlobalConfig.skipAnimations = true` in the test setup. Assert captions and the live region update on Next/Prev, and that keyboard shortcuts work on the focused diagram.
- **E2E:** with `page.emulateMedia({ reducedMotion: 'reduce' })`, no `.packet` elements exist and captions still change. Visual snapshots of each diagram's first frame cover both themes.
