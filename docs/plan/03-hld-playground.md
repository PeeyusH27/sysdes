# 03: Drag-and-drop HLD playground

## 1. Can we drag and drop HLD connections?

**Yes.** It's a well-trodden pattern, and React Flow covers about 80% of the mechanics. The plan builds it in layers, so each milestone ships on its own:

| Level | What the learner does | Milestone |
|---|---|---|
| **Builder** | Drags components (Client, CDN, LB, Service, Redis, Postgres, Kafka…) onto a canvas, connects them by dragging between handles, labels connections (HTTP, gRPC, WS, async), sets replicas, uses undo/redo, auto-layout, save and share | P4.1–P4.2 |
| **Lint** | Gets live feedback: "Client talks to the database directly", "Single database, no replica", "Queue has no consumer"… | P4.2 |
| **Templates** | Opens any lesson diagram ("Open in playground") and modifies it | P4.3 |
| **Challenges** | Builds a design for a brief ("URL shortener, 100:1 reads"), gets an automatic score against a rubric, hints, and a reference solution | P4.4 |
| **Simulation** | Sets client QPS, presses Run, and watches packets flow. Nodes turn amber/red with utilization, a bottleneck callout appears, and an estimated latency is shown. Can kill a node or spike traffic ×10. | P4.5 |
| **In-lesson quizzes** | Drags the missing component (cache? queue? LB?) into a gap in a lesson diagram | §17 (dnd-kit) |

The playground lives at `/playground` (free-form) and `/playground/[challenge]` (guided). Every lesson diagram gets an **Open in playground** button.

## 2. Library choice

| Option | Verdict |
|---|---|
| **React Flow (`@xyflow/react` v12)** ✅ | Built for node graphs: custom nodes and edges, handles, connection validation, minimap, controls, touch support, `screenToFlowPosition` for drop handling, dark mode (`colorMode`), MIT license. Its docs include DnD, auto-layout (elkjs) and image-export examples. |
| tldraw | A whiteboard: great free-form drawing, but no graph semantics to lint or grade, and production use needs a license |
| Excalidraw | Hand-drawn whiteboard; same problem, nothing to validate |
| JointJS / GoJS | Capable, but the good parts are commercial and the API isn't React-first |
| Custom SVG + dnd-kit | Pan/zoom, edge routing, selection and handles would take weeks to rebuild |

Supporting packages: **zustand** (state), **zundo** (undo/redo), **elkjs** (auto-layout, lazy-loaded), **zod** (validating imports and share links), **lz-string** (share URLs), **html-to-image** (PNG export).

## 3. UX specification

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Playground · "URL shortener" ▾   [Templates] [Challenge] [Run ▶] [Share] [⋯] │
├────────────┬─────────────────────────────────────────────────┬───────────────┤
│ PALETTE    │                                                 │ INSPECTOR     │
│ Edge       │      ┌────────┐     ┌────┐     ┌──────────┐     │ Service       │
│  Client    │      │ Client │────▶│ LB │────▶│ App ×3   │     │ Label [App  ] │
│  DNS  CDN  │      └────────┘     └────┘     └────┬─────┘     │ Replicas [3]  │
│ Compute    │                                    │ ╲         │ QPS/inst 2000 │
│  LB  API GW│                               ┌────▼──┐ ┌▼────┐ │ Latency 20 ms │
│  Service   │                               │ Redis │ │ PG  │ │               │
│  Worker    │                               └───────┘ └─────┘ │ Connection    │
│ Data …     │                                       [minimap] │ HTTP ▾ sync ▾ │
├────────────┴─────────────────────────────────────────────────┴───────────────┤
│ Lint (3)  ·  Simulation  ·  Grade           ⚠ Postgres has no replica  [fix] │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Add:** drag a palette item onto the canvas. Clicking, tapping or pressing Enter on an item adds it at the viewport centre, which is the path for touch and keyboard users.
- **Connect:** drag from any of a node's 4 handles to another node (loose connection mode). The connection line previews dashed. Edges point from caller to callee, and a drag that starts on a data store is flipped automatically (§9).
- **Edit:** the inspector edits the label, replicas, per-instance capacity, latency and hit ratio (caches/CDN) for a node; protocol, sync/async and weight for an edge.
- **Canvas:** 16px snap grid, minimap, zoom controls, fit view, multi-select (Shift-drag), copy/paste, duplicate, delete, undo/redo, auto-layout.
- **Bottom panel tabs:** **Lint** (findings, each with a "highlight" button and a "learn why" link), **Simulation** (QPS slider, spike, kill node, per-node table), **Grade** (challenge rubric).
- **Empty state:** "Start from a template", "Take a challenge", or "Drag a Client here".

| Shortcut | Action |
|---|---|
| ⌘/Ctrl K | Command palette: add a component, connect A → B, auto-layout, export, run |
| Delete / Backspace | Delete selection |
| ⌘/Ctrl Z, ⇧⌘/Ctrl Z | Undo, redo |
| ⌘/Ctrl C, V, D | Copy, paste, duplicate |
| L | Auto-layout |
| F | Fit view |
| R | Run or stop the simulation |
| Space (hold) | Pan |
| Arrow keys | Nudge selected nodes (React Flow built-in) |

## 4. Component palette

The defaults are **order-of-magnitude teaching values** and can be edited per node in the inspector. The UI says so ("assumed, measure yours").

| Kind | Group | Default per-instance capacity | Default latency | Extra config |
|---|---|---|---|---|
| Client | Edge | (emits traffic) | — | `qps` (1,000), `readRatio` (0.9) |
| DNS | Edge | ∞ | 0 ms | — |
| CDN | Edge | ∞ | 20 ms | `hitRatio` (0.8) |
| Load balancer | Compute | 50,000 req/s | 1 ms | algorithm (label only) |
| API gateway | Compute | 20,000 req/s | 3 ms | auth / rate limit flags |
| Service | Compute | 2,000 req/s | 20 ms | `replicas` |
| Worker | Compute | 200 jobs/s | 100 ms | `replicas` |
| ID generator | Compute | 50,000 ids/s | 1 ms | — |
| Cache (Redis) | Data | 100,000 ops/s | 1 ms | `hitRatio` (0.9), `replicas` |
| SQL database | Data | 5,000 q/s | 10 ms | `replicas` (1 primary + read replicas) |
| NoSQL / KV | Data | 20,000 q/s | 5 ms | `replicas` |
| Object storage | Data | ∞ | 50 ms | — |
| Search index | Data | 2,000 q/s | 30 ms | `replicas` |
| Queue / Kafka | Messaging | 50,000 msg/s | 5 ms | `role: 'dlq'` option |
| Pub/Sub | Messaging | 100,000 msg/s | 2 ms | — |
| External API | External | 500 req/s | 200 ms | — |

## 5. Data model

```ts
// src/components/playground/schema.ts
import { z } from 'zod';
import { NODE_KINDS } from './kinds';

export const NodeData = z.object({
  kind: z.enum(NODE_KINDS),
  label: z.string().min(1).max(40),
  replicas: z.number().int().min(1).max(100).optional(),
  perInstanceQps: z.number().positive().max(10_000_000).optional(),
  latencyMs: z.number().min(0).max(60_000).optional(),
  hitRatio: z.number().min(0).max(1).optional(),
  qps: z.number().min(0).max(10_000_000).optional(),        // clients only
  readRatio: z.number().min(0).max(1).optional(),
  role: z.enum(['dlq']).optional(),
});

export const DesignDoc = z.object({
  version: z.literal(1),
  title: z.string().max(120),
  nodes: z.array(z.object({
    id: z.string().max(64),
    position: z.object({ x: z.number(), y: z.number() }),
    data: NodeData,
  })).max(200),
  edges: z.array(z.object({
    id: z.string().max(140), source: z.string(), target: z.string(),
    data: z.object({
      protocol: z.enum(['HTTP', 'gRPC', 'WS', 'SQL', 'TCP', 'Pub/Sub']).optional(),
      async: z.boolean().optional(),
      weight: z.number().min(0).max(1).optional(),
      label: z.string().max(40).optional(),
    }).optional(),
  })).max(400),
});
export type DesignDoc = z.infer<typeof DesignDoc>;

/** Future schema versions migrate here; imports and share links always pass through parse + migrate. */
export const migrate = (doc: DesignDoc): DesignDoc => doc;
```

## 6. State: zustand + undo + autosave

```ts
// src/components/playground/store.ts
'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { temporal } from 'zundo';
import { addEdge, applyEdgeChanges, applyNodeChanges, type Connection, type EdgeChange, type NodeChange } from '@xyflow/react';

type DesignState = {
  title: string; nodes: HldNode[]; edges: FlowEdgeT[];
  onNodesChange: (c: NodeChange<HldNode>[]) => void;
  onEdgesChange: (c: EdgeChange<FlowEdgeT>[]) => void;
  onConnect: (c: Connection) => void;
  addNode: (kind: NodeKind, position: { x: number; y: number }) => void;
  updateNode: (id: string, data: Partial<HldNode['data']>) => void;
  updateEdge: (id: string, data: Partial<NonNullable<FlowEdgeT['data']>>) => void;
  load: (doc: DesignDoc) => void;
};

// What undo history and autosave care about: no selection, dragging or measured sizes
const persisted = (s: DesignState) => ({
  title: s.title,
  nodes: s.nodes.map(({ id, type, position, data }) => ({ id, type, position, data })),
  edges: s.edges.map(({ id, source, target, sourceHandle, targetHandle, type, data }) => ({ id, source, target, sourceHandle, targetHandle, type, data })),
});

export const useDesign = create<DesignState>()(
  persist(
    temporal(
      (set, get) => ({
        title: 'Untitled design', nodes: [], edges: [],
        onNodesChange: changes => set({ nodes: applyNodeChanges(changes, get().nodes) }),
        onEdgesChange: changes => set({ edges: applyEdgeChanges(changes, get().edges) }),
        onConnect: c => {
          const conn = orient(c, id => get().nodes.find(n => n.id === id)!.data.kind);
          if (get().edges.some(e => e.source === conn.source && e.target === conn.target)) return;   // no duplicates
          set({ edges: addEdge({ ...conn, type: 'flow', data: { protocol: defaultProtocol(conn, get().nodes) } }, get().edges) });
        },
        addNode: (kind, position) => set({
          nodes: [...get().nodes, { id: crypto.randomUUID(), type: 'hld', position, data: { kind, label: KIND_META[kind].label } }],
        }),
        updateNode: (id, data) => set({ nodes: get().nodes.map(n => (n.id === id ? { ...n, data: { ...n.data, ...data } } : n)) }),
        updateEdge: (id, data) => set({ edges: get().edges.map(e => (e.id === id ? { ...e, data: { ...e.data, ...data } } : e)) }),
        load: doc => set({ title: doc.title, nodes: doc.nodes.map(n => ({ ...n, type: 'hld' })), edges: doc.edges.map(e => ({ ...e, type: 'flow' })) }),
      }),
      {
        limit: 100,
        partialize: persisted,
        equality: (a, b) => JSON.stringify(a) === JSON.stringify(b),          // selection-only changes don't create history
        handleSet: handleSet => debounceLeading(handleSet, 400),              // one undo entry per drag, not per frame
      },
    ),
    { name: 'sds-playground', version: 1, partialize: persisted },
  ),
);
// Undo/redo: useDesign.temporal.getState().undo() / .redo()
```

## 7. Canvas, palette, node and edge

```tsx
// src/components/playground/Palette.tsx
'use client';
import { useReactFlow } from '@xyflow/react';

export function Palette({ allowed }: { allowed?: NodeKind[] }) {
  const { screenToFlowPosition } = useReactFlow();
  const addNode = useDesign(s => s.addNode);
  const addAtCenter = (kind: NodeKind) => {
    const r = document.querySelector('.react-flow')!.getBoundingClientRect();
    addNode(kind, screenToFlowPosition({ x: r.left + r.width / 2, y: r.top + r.height / 2 }));
  };
  return (
    <aside aria-label="Components" className="palette">
      {PALETTE_GROUPS.map(g => (
        <section key={g.name} aria-label={g.name}>
          <h3>{g.name}</h3>
          {g.kinds.filter(k => !allowed || allowed.includes(k)).map(kind => {
            const { label, icon: Icon } = KIND_META[kind];
            return (
              <button key={kind} draggable className="palette-item" data-kind={kind}
                onDragStart={e => { e.dataTransfer.setData('application/x-hld-kind', kind); e.dataTransfer.effectAllowed = 'move'; }}
                onClick={() => addAtCenter(kind)}>                  {/* tap / Enter: touch + keyboard path */}
                <Icon aria-hidden size={16} /> {label}
              </button>
            );
          })}
        </section>
      ))}
    </aside>
  );
}
```

```tsx
// src/components/playground/Canvas.tsx
'use client';
import { Background, ConnectionMode, Controls, MiniMap, ReactFlow, useReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useTheme } from 'next-themes';
import { useShallow } from 'zustand/react/shallow';

export function Canvas() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode } = useDesign(useShallow(s => ({
    nodes: s.nodes, edges: s.edges, onNodesChange: s.onNodesChange, onEdgesChange: s.onEdgesChange, onConnect: s.onConnect, addNode: s.addNode,
  })));
  const { screenToFlowPosition } = useReactFlow();
  const { resolvedTheme } = useTheme();

  return (
    <div className="h-[calc(100dvh-7rem)]">           {/* React Flow needs a sized parent */}
      <ReactFlow
        nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect}
        connectionMode={ConnectionMode.Loose}             // any handle can start or end a connection
        isValidConnection={c => c.source !== c.target}
        defaultEdgeOptions={{ type: 'flow' }}
        onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
        onDrop={e => {
          e.preventDefault();
          const kind = e.dataTransfer.getData('application/x-hld-kind') as NodeKind;
          if (kind) addNode(kind, screenToFlowPosition({ x: e.clientX, y: e.clientY }));
        }}
        snapToGrid snapGrid={[16, 16]} fitView deleteKeyCode={['Backspace', 'Delete']}
        colorMode={resolvedTheme === 'dark' ? 'dark' : 'light'}>
        <Background gap={16} />
        <Controls />
        <MiniMap pannable zoomable />
      </ReactFlow>
    </div>
  );
}
```

A drag fires a position change every frame. The leading-edge debounced `handleSet` from §6 records the state from *before* the burst once, so a single undo reverts the whole drag. Avoid `temporal.pause()` on drag start: once paused, the drag itself is never recorded. Unit-test "undo after drag".

```ts
// Leading-edge debounce: the first call in a burst goes through, the rest are dropped until `ms` of quiet.
function debounceLeading<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return ((...args: Parameters<T>) => {
    if (!timer) fn(...args);
    clearTimeout(timer);
    timer = setTimeout(() => { timer = undefined; }, ms);
  }) as T;
}
```

```tsx
// src/components/playground/nodes/ComponentNode.tsx
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { memo } from 'react';

export type HldNode = Node<{
  kind: NodeKind; label: string; replicas?: number; hitRatio?: number; qps?: number; readRatio?: number;
  perInstanceQps?: number; latencyMs?: number; role?: 'dlq';
  sim?: { qps: number; util: number; latencyMs: number };          // written by the simulator, never persisted
}, 'hld'>;

const SIDES = [['top', Position.Top], ['right', Position.Right], ['bottom', Position.Bottom], ['left', Position.Left]] as const;

export const ComponentNode = memo(function ComponentNode({ data, selected }: NodeProps<HldNode>) {
  const { icon: Icon, label: kindLabel } = KIND_META[data.kind];
  const util = data.sim?.util;
  const load = util == null ? undefined : util < 0.7 ? 'ok' : util < 1 ? 'hot' : 'over';
  return (
    <div className="hld-node" data-kind={data.kind} data-selected={selected || undefined} data-load={load}
         aria-label={`${data.label}, ${kindLabel}${data.replicas ? `, ${data.replicas} replicas` : ''}`}>
      {SIDES.map(([id, pos]) => <Handle key={id} id={id} type="source" position={pos} />)}
      <Icon aria-hidden size={16} />
      <span className="label">{data.label}</span>
      {(data.replicas ?? 1) > 1 && <span className="badge">×{data.replicas}</span>}
      {data.sim && (
        <span className="load">
          <LoadIcon level={load!} /> {Math.round(data.sim.qps).toLocaleString()}/s · {Math.round(util! * 100)}%
        </span>
      )}
    </div>
  );
});
export const nodeTypes = { hld: ComponentNode };          // defined at module level so React Flow doesn't re-mount nodes
```

```tsx
// src/components/playground/edges/FlowEdge.tsx
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type Edge, type EdgeProps } from '@xyflow/react';
import { useReducedMotion } from 'motion/react';

export type FlowEdgeT = Edge<{ protocol?: string; async?: boolean; weight?: number; label?: string; qps?: number }, 'flow'>;

export function FlowEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, markerEnd, selected }: EdgeProps<FlowEdgeT>) {
  const reduce = useReducedMotion();
  const [path, lx, ly] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, borderRadius: 12 });
  const qps = data?.qps ?? 0;
  const dots = reduce || qps <= 0 ? 0 : Math.min(4, 1 + Math.floor(Math.log10(qps)));   // more traffic, more packets
  const dur = Math.max(0.6, 2.4 - Math.log10(Math.max(qps, 1)) * 0.4);                   // and faster ones

  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} className={data?.async ? 'edge-async' : 'edge-sync'} />
      {Array.from({ length: dots }, (_, i) => (
        <circle key={i} r={3.5} className="edge-packet">
          <animateMotion dur={`${dur}s`} begin={`${(i * dur) / dots}s`} repeatCount="indefinite" path={path} />
        </circle>
      ))}
      {(data?.protocol || data?.label || qps > 0 || selected) && (
        <EdgeLabelRenderer>
          <div className="edge-label nodrag nopan" style={{ transform: `translate(-50%, -50%) translate(${lx}px, ${ly}px)` }}>
            {data?.label ?? data?.protocol ?? 'HTTP'}{qps > 0 && ` · ${Math.round(qps).toLocaleString()}/s`}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
export const edgeTypes = { flow: FlowEdge };
```

On coarse pointers, enlarge the handles so touch connecting works: `@media (pointer: coarse) { .react-flow__handle { width: 16px; height: 16px; } }`.

## 8. Templates: one spec for lessons and the playground

Every lesson `FlowSpec` (02 §2) converts to React Flow, so **Open in playground** works on every diagram, and challenges can start from a partial diagram.

```ts
// src/components/playground/fromSpec.ts
export function toDesign(spec: FlowSpec): DesignDoc {
  return {
    version: 1, title: spec.title,
    nodes: spec.nodes.map(n => ({ id: n.id, position: { x: n.col * 220, y: n.row * 120 }, data: { kind: n.kind, label: n.label } })),
    edges: spec.edges.map(e => ({
      id: `${e.from}>${e.to}`, source: e.from, target: e.to,
      data: { label: e.label, async: e.style === 'async' },
    })),
  };
}
// <Link href={`/playground#d=${encodeDesign(toDesign(spec))}`}>Open in playground</Link>
```

**Template gallery:** the request path, cache-aside, primary–replica, queue with DLQ, circuit breaker, URL shortener, notification pipeline, chat, news feed (hybrid fan-out) and rate limiter.

## 9. Connection rules

Learners should be able to make mistakes and get feedback for them, so **almost nothing is blocked**:

- **Blocked:** self-loops and duplicate edges.
- **Auto-oriented:** edges point from caller to callee. If the drag starts on a data store or external API and ends on a caller, the edge is flipped.
- **Everything else is allowed** and judged by lint (§10), which explains *why* something is a smell.

```ts
// src/components/playground/rules.ts
const CALLEE = new Set<NodeKind>(['database', 'cache', 'storage', 'search', 'external']);

export function orient(c: Connection, kindOf: (id: string) => NodeKind): Connection {
  const flip = CALLEE.has(kindOf(c.source)) && !CALLEE.has(kindOf(c.target));
  return flip ? { source: c.target, target: c.source, sourceHandle: c.targetHandle, targetHandle: c.sourceHandle } : c;
}

export function defaultProtocol(c: Connection, nodes: HldNode[]) {
  const k = (id: string) => nodes.find(n => n.id === id)?.data.kind;
  const t = k(c.target);
  if (t === 'database') return 'SQL';
  if (t === 'queue' || t === 'pubsub') return 'Pub/Sub';
  if (t === 'cache') return 'TCP';
  return 'HTTP';
}
```

## 10. Lint rules

```ts
// src/components/playground/lint.ts
export type Finding = {
  id: string; level: 'error' | 'warn' | 'info'; message: string;
  nodes?: string[]; edges?: string[]; learn?: string;          // highlight targets + "learn why" link
};
type Ctx = {
  nodes: HldNode[]; edges: FlowEdgeT[];
  kind: (id: string) => NodeKind; out: (id: string) => FlowEdgeT[]; inc: (id: string) => FlowEdgeT[];
};
const DATA = new Set<NodeKind>(['database', 'cache', 'storage', 'search']);

export const RULES: ((c: Ctx) => Finding[])[] = [
  ({ edges, kind }) => edges.filter(e => kind(e.source) === 'client' && DATA.has(kind(e.target))).map(e => ({
    id: 'client-to-data', level: 'error', edges: [e.id], learn: '/learn/api-load-balancing',
    message: 'A client talks to a data store directly. Put a service in between for auth, validation and caching.',
  })),
  ({ nodes, inc, kind }) => {
    const exposed = nodes.filter(n => n.data.kind === 'service' && inc(n.id).some(e => kind(e.source) === 'client'));
    return exposed.length ? [{
      id: 'no-entry', level: 'warn', nodes: exposed.map(n => n.id), learn: '/learn/api-load-balancing',
      message: 'Clients reach a service without a load balancer or gateway, so you cannot add instances or survive one failing.',
    }] : [];
  },
  ({ nodes }) => nodes.filter(n => n.data.kind === 'database' && (n.data.replicas ?? 1) < 2).map(n => ({
    id: 'db-spof', level: 'warn', nodes: [n.id], learn: '/learn/databases-scaling',
    message: `${n.data.label} has no replica: a single point of failure, and every read hits the primary.`,
  })),
  ({ nodes, out }) => nodes.filter(n => n.data.kind === 'queue' && n.data.role !== 'dlq' && out(n.id).length === 0).map(n => ({
    id: 'queue-no-consumer', level: 'error', nodes: [n.id], learn: '/learn/async-messaging',
    message: `${n.data.label} has no consumer, so messages pile up forever.`,
  })),
  ({ nodes }) => nodes.some(n => n.data.kind === 'queue') && !nodes.some(n => n.data.role === 'dlq') ? [{
    id: 'no-dlq', level: 'info', learn: '/learn/async-messaging',
    message: 'No dead letter queue. Where do poison messages go after the last retry?',
  }] : [],
  ({ nodes, out, kind }) => nodes.filter(n => n.data.kind === 'cache' && !out(n.id).some(e => DATA.has(kind(e.target)))
      && !nodes.some(p => out(p.id).some(e => e.target === n.id) && out(p.id).some(e => kind(e.target) === 'database'))).map(n => ({
    id: 'cache-no-source', level: 'warn', nodes: [n.id], learn: '/learn/caching',
    message: `${n.data.label} has no source of truth behind it. What fills it on a miss?`,
  })),
  ({ nodes, edges }) => nodes.filter(n => !edges.some(e => e.source === n.id || e.target === n.id)).map(n => ({
    id: 'orphan', level: 'info', nodes: [n.id], message: `${n.data.label} isn't connected to anything.`,
  })),
  ctx => syncCycles(ctx).map(cycle => ({
    id: 'sync-cycle', level: 'error', nodes: cycle, learn: '/learn/reliability-observability',
    message: 'A cycle of synchronous calls: one slow hop stalls every service in the loop.',
  })),
  ({ nodes }) => nodes.filter(n => n.data.kind === 'service' && (n.data.replicas ?? 1) === 1).map(n => ({
    id: 'single-instance', level: 'info', nodes: [n.id], message: `${n.data.label} runs a single instance. Set replicas ≥ 2 for redundancy.`,
  })),
  ({ nodes }) => nodes.filter(n => (n.data.sim?.util ?? 0) > 1).map(n => ({
    id: 'overloaded', level: 'warn', nodes: [n.id],
    message: `${n.data.label} is at ${Math.round(n.data.sim!.util * 100)}% of capacity: add replicas, a cache, or a queue in front.`,
  })),
];

export function lint(nodes: HldNode[], edges: FlowEdgeT[]): Finding[] {
  const byId = new Map(nodes.map(n => [n.id, n]));
  const ctx: Ctx = {
    nodes, edges, kind: id => byId.get(id)!.data.kind,
    out: id => edges.filter(e => e.source === id), inc: id => edges.filter(e => e.target === id),
  };
  return RULES.flatMap(rule => rule(ctx));
}
```

Lint runs on every change, debounced by 200 ms, and the findings list updates in place. Clicking a finding selects and zooms to the offending nodes and edges.

**Graph helpers** shared by lint, grading and simulation:

```ts
// src/components/playground/graph.ts
/** Kahn's algorithm. Nodes inside cycles are appended last, so load reaching them is not propagated twice. */
export function topoOrder(nodes: HldNode[], edges: FlowEdgeT[]): string[] {
  const indeg = new Map(nodes.map(n => [n.id, 0]));
  const out = new Map<string, string[]>();
  for (const e of edges) {
    indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1);
    out.set(e.source, [...(out.get(e.source) ?? []), e.target]);
  }
  const queue = nodes.filter(n => indeg.get(n.id) === 0).map(n => n.id);
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const t of out.get(id) ?? []) {
      indeg.set(t, indeg.get(t)! - 1);
      if (indeg.get(t) === 0) queue.push(t);
    }
  }
  const seen = new Set(order);
  return [...order, ...nodes.map(n => n.id).filter(id => !seen.has(id))];
}

/** Cycles made only of synchronous calls (DFS back edges). */
export function syncCycles({ nodes, edges }: { nodes: HldNode[]; edges: FlowEdgeT[] }): string[][] {
  const out = new Map<string, string[]>();
  for (const e of edges) if (!e.data?.async) out.set(e.source, [...(out.get(e.source) ?? []), e.target]);
  const state = new Map<string, 'open' | 'done'>(), stack: string[] = [], cycles: string[][] = [];
  const visit = (id: string) => {
    state.set(id, 'open'); stack.push(id);
    for (const t of out.get(id) ?? []) {
      if (state.get(t) === 'open') cycles.push(stack.slice(stack.indexOf(t)));
      else if (!state.has(t)) visit(t);
    }
    stack.pop(); state.set(id, 'done');
  };
  for (const n of nodes) if (!state.has(n.id)) visit(n.id);
  return cycles;
}
```

## 11. Challenges and grading

```ts
// content/questions/<slug>/challenge.ts
export interface Challenge {
  slug: string; title: string; brief: string;
  requirements: string[]; numbers: Record<string, string>;     // e.g. { 'Writes': '40/s', 'Reads': '4,000/s' }
  start?: FlowSpec;                                            // optional partial diagram
  palette?: NodeKind[];                                        // narrow the palette to keep focus
  rubric: RubricItem[];
  reference: FlowSpec;                                         // revealed after the first submit
}
export interface RubricItem { id: string; points: number; label: string; hint: string; test: (g: GraphQuery) => boolean }
```

```ts
// src/components/playground/grader.ts
export type GraphQuery = ReturnType<typeof graphQuery>;

export function graphQuery(nodes: HldNode[], edges: FlowEdgeT[]) {
  const kindOf = new Map(nodes.map(n => [n.id, n.data.kind]));
  const out = new Map<string, string[]>();
  for (const e of edges) out.set(e.source, [...(out.get(e.source) ?? []), e.target]);
  const ofKind = (k: NodeKind | NodeKind[]) => {
    const want = ([] as NodeKind[]).concat(k);
    return nodes.filter(n => want.includes(n.data.kind)).map(n => n.id);
  };

  /** True if some path visits the kinds in `sequence` in order (other nodes may sit in between). */
  function pathThrough(sequence: (NodeKind | NodeKind[])[]): boolean {
    let frontier = new Set(ofKind(sequence[0]));
    for (const step of sequence.slice(1)) {
      const wanted = new Set(ofKind(step)), reached = new Set<string>(), seen = new Set(frontier);
      const queue = [...frontier];
      while (queue.length) {
        const id = queue.shift()!;
        for (const t of out.get(id) ?? []) {
          if (wanted.has(t)) reached.add(t);
          if (!seen.has(t)) { seen.add(t); queue.push(t); }
        }
      }
      if (!reached.size) return false;
      frontier = reached;
    }
    return true;
  }

  return {
    has: (k: NodeKind, min = 1) => ofKind(k).length >= min,
    connected: (a: NodeKind, b: NodeKind) => edges.some(e => kindOf.get(e.source) === a && kindOf.get(e.target) === b),
    pathThrough,
    maxReplicas: (k: NodeKind) => Math.max(0, ...nodes.filter(n => n.data.kind === k).map(n => n.data.replicas ?? 1)),
    hasDlq: () => nodes.some(n => n.data.role === 'dlq'),
  };
}

export function grade(ch: Challenge, nodes: HldNode[], edges: FlowEdgeT[]) {
  const g = graphQuery(nodes, edges);
  const items = ch.rubric.map(r => ({ ...r, passed: r.test(g) }));
  const score = items.filter(i => i.passed).reduce((s, i) => s + i.points, 0);
  const max = items.reduce((s, i) => s + i.points, 0);
  return { items, score, max, percent: Math.round((score / max) * 100) };
}
```

**Example rubric: URL shortener**

```ts
rubric: [
  { id: 'entry', points: 10, label: 'Traffic enters through a load balancer or gateway',
    hint: 'Clients should never hit one app server directly.', test: g => g.pathThrough(['client', ['lb', 'gateway'], 'service']) },
  { id: 'cdn', points: 10, label: 'Redirects can be served from the edge',
    hint: '301 responses are cacheable by a CDN.', test: g => g.pathThrough(['client', 'cdn', 'service']) },
  { id: 'cache', points: 20, label: 'Hot codes are read from a cache before the database',
    hint: 'Reads outnumber writes 100:1.', test: g => g.connected('service', 'cache') && g.pathThrough(['service', 'database']) },
  { id: 'ids', points: 20, label: 'Codes come from an ID generator',
    hint: 'Counter + base62 with range allocation avoids collisions.', test: g => g.connected('service', 'idgen') },
  { id: 'replica', points: 15, label: 'The database has a replica',
    hint: 'Losing the only copy loses every link.', test: g => g.maxReplicas('database') >= 2 },
  { id: 'analytics', points: 15, label: 'Click analytics are asynchronous',
    hint: "Don't slow down the redirect to count a click.", test: g => g.pathThrough(['service', 'queue', 'worker']) },
  { id: 'scale', points: 10, label: 'More than one app server',
    hint: 'Set replicas ≥ 2 on the service.', test: g => g.maxReplicas('service') >= 2 },
],
```

**Grade panel UX:** a checklist with points. Failed items show their **hint** on demand, which costs nothing and nudges the learner instead of giving the answer. **Compare with reference** overlays the reference solution as ghost nodes. The best score is saved to progress.

**Initial challenges:** URL shortener, rate limiter, notification system, chat, news feed (hybrid fan-out), and ticket booking with a waiting room. Each gets 6–8 rubric items like the ones above.

## 12. Traffic simulation

This is a **steady-state flow model**, deliberately simple and explainable. It isn't a queueing-theory simulator, and the panel lists its assumptions.

- Clients emit `qps` split into reads and writes (`readRatio`).
- A load balancer, gateway or DNS node splits evenly across its targets. Edge `weight` overrides the split.
- CDNs and inline caches (cache → database) pass on only read misses. Writes pass through.
- **Cache-aside:** if a service calls both a cache and a database, the database receives `reads × (1 − hitRatio) + writes`.
- A queue is an async boundary. Downstream sees `min(incoming, consumer capacity)`, and the difference is reported as backlog growth per second.
- Database utilization is `max(reads / (replicas × cap), writes / cap)`, because reads spread across replicas and writes go to the primary.
- Latency is `own latency / (1 − utilization)` (capped at 95%), plus downstream latency on synchronous edges. Async edges and queues stop the latency sum.

```ts
// src/components/playground/simulate.ts
type Load = { r: number; w: number };
const zero = (): Load => ({ r: 0, w: 0 });
const scale = (l: Load, fr: number, fw = fr): Load => ({ r: l.r * fr, w: l.w * fw });
const total = (l: Load) => l.r + l.w;

export function simulate(nodes: HldNode[], edges: FlowEdgeT[]) {
  const byId = new Map(nodes.map(n => [n.id, n]));
  const out = new Map<string, FlowEdgeT[]>();
  for (const e of edges) out.set(e.source, [...(out.get(e.source) ?? []), e]);
  const cfg = (n: HldNode) => ({ ...KIND_META[n.data.kind], ...n.data });          // per-node overrides win
  const cap = (n: HldNode) => cfg(n).perInstanceQps * (n.data.replicas ?? 1);
  const hit = (n: HldNode) => cfg(n).hitRatio ?? 0;

  const load = new Map(nodes.map(n => [n.id, zero()]));
  for (const n of nodes) if (n.data.kind === 'client') {
    const q = n.data.qps ?? 1_000, rr = n.data.readRatio ?? 0.9;
    load.set(n.id, { r: q * rr, w: q * (1 - rr) });
  }
  const edgeQps: Record<string, number> = {}, backlog: Record<string, number> = {};

  for (const id of topoOrder(nodes, edges)) {                      // back edges of cycles are skipped (lint flags them)
    const n = byId.get(id)!, kind = n.data.kind, targets = out.get(id) ?? [];
    if (!targets.length) continue;
    let fwd = load.get(id)!;
    if (kind === 'cdn' || kind === 'cache') fwd = scale(fwd, 1 - hit(n), 1);       // only read misses continue
    if (kind === 'queue') {
      const drain = Math.min(total(fwd), targets.reduce((s, e) => s + cap(byId.get(e.target)!), 0));
      backlog[id] = total(fwd) - drain;
      fwd = scale(fwd, total(fwd) ? drain / total(fwd) : 0);
    }
    const splits = kind === 'lb' || kind === 'gateway' || kind === 'dns';
    const sideCache = targets.map(e => byId.get(e.target)!).find(t => t.data.kind === 'cache');
    for (const e of targets) {
      const t = byId.get(e.target)!;
      let l = splits ? scale(fwd, e.data?.weight ?? 1 / targets.length) : fwd;
      if (sideCache && t.data.kind === 'database') l = scale(l, 1 - hit(sideCache), 1);   // cache-aside
      edgeQps[e.id] = total(l);
      const acc = load.get(t.id)!; acc.r += l.r; acc.w += l.w;
    }
  }

  const util = (n: HldNode) => {
    const l = load.get(n.id)!;
    return n.data.kind === 'database'
      ? Math.max(l.r / cap(n), l.w / cfg(n).perInstanceQps)          // reads spread over replicas, writes hit the primary
      : total(l) / cap(n);
  };

  const memo = new Map<string, number>();
  const latency = (id: string): number => {
    if (memo.has(id)) return memo.get(id)!;
    memo.set(id, 0);                                                 // cycle guard
    const n = byId.get(id)!, kind = n.data.kind;
    let ms = cfg(n).latencyMs / (1 - Math.min(util(n), 0.95));       // queueing delay climbs near saturation
    const sync = kind === 'queue' ? [] : (out.get(id) ?? []).filter(e => !e.data?.async);
    const sideCache = sync.map(e => byId.get(e.target)!).find(t => t.data.kind === 'cache');
    const parts = sync.map(e => {
      const t = byId.get(e.target)!;
      return latency(t.id) * (t.data.kind === 'database' && sideCache ? 1 - hit(sideCache) : 1);
    });
    const sum = parts.reduce((a, b) => a + b, 0);
    if (kind === 'lb' || kind === 'gateway' || kind === 'dns') ms += parts.length ? sum / parts.length : 0;
    else if (kind === 'cdn' || kind === 'cache') ms += (1 - hit(n)) * sum;
    else ms += sum;                                                  // a service calls each dependency in turn
    memo.set(id, ms);
    return ms;
  };

  return {
    nodes: Object.fromEntries(nodes.map(n => [n.id, { qps: total(load.get(n.id)!), util: util(n), latencyMs: latency(n.id) }])),
    edges: edgeQps,
    backlog,
    bottleneck: nodes.filter(n => n.data.kind !== 'client').sort((a, b) => util(b) - util(a))[0]?.id,
  };
}
```

**Visualization.** Edge packet density and speed scale with `edges[id]` (§7). Nodes show QPS and utilization, with an ok/hot/over state that has its own icon and label. The bottleneck gets a callout ("Postgres at 140%: add a read replica or raise the cache hit ratio"). The client's latency estimate shows as a stat tile.

**Interactive controls:** client QPS (log slider from 100 to 1M), **Spike ×10**, **Kill node** (an LB re-splits across the survivors; a dead database turns the request path into errors), and hit ratio and replicas sliders from the inspector. Results recompute on every change. The model is O(V + E), so it's instant.

## 13. Persistence, sharing and export

```ts
// src/components/playground/share.ts
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';

export const encodeDesign = (doc: DesignDoc) => compressToEncodedURIComponent(JSON.stringify(doc));

export function decodeDesign(hash: string): DesignDoc | null {
  // lz-string's URI alphabet contains '+', which URLSearchParams would turn into a space, so slice manually
  if (!hash.startsWith('#d=')) return null;
  try {
    const json = decompressFromEncodedURIComponent(hash.slice(3));
    const parsed = DesignDoc.safeParse(JSON.parse(json ?? 'null'));
    return parsed.success ? migrate(parsed.data) : null;
  } catch {
    return null;
  }
}
// Share button: navigator.clipboard.writeText(`${location.origin}/playground#d=${encodeDesign(doc)}`)
```

- **Autosave:** the zustand `persist` middleware writes to localStorage (§6).
- **Import/export JSON:** file input, `DesignDoc.safeParse`, and a clear error message on failure. Treat every imported file and share link as untrusted. Labels render as React text, which escapes them, and never through `innerHTML`.
- **PNG export:** follow React Flow's documented approach.

```ts
import { toPng } from 'html-to-image';
import { getNodesBounds, getViewportForBounds } from '@xyflow/react';

export async function exportPng(nodes: HldNode[], width = 1600, height = 1000) {
  const { x, y, zoom } = getViewportForBounds(getNodesBounds(nodes), width, height, 0.5, 2, 0.1);
  const url = await toPng(document.querySelector('.react-flow__viewport') as HTMLElement, {
    backgroundColor: getComputedStyle(document.body).backgroundColor, width, height,
    style: { width: `${width}px`, height: `${height}px`, transform: `translate(${x}px, ${y}px) scale(${zoom})` },
  });
  Object.assign(document.createElement('a'), { href: url, download: 'design.png' }).click();
}
```

- **Auto-layout** with elkjs, imported lazily:

```ts
export async function autoLayout(nodes: HldNode[], edges: FlowEdgeT[]) {
  const ELK = (await import('elkjs/lib/elk.bundled.js')).default;
  const res = await new ELK().layout({
    id: 'root',
    layoutOptions: { 'elk.algorithm': 'layered', 'elk.direction': 'RIGHT', 'elk.spacing.nodeNode': '40', 'elk.layered.spacing.nodeNodeBetweenLayers': '90' },
    children: nodes.map(n => ({ id: n.id, width: n.measured?.width ?? 160, height: n.measured?.height ?? 56 })),
    edges: edges.map(e => ({ id: e.id, sources: [e.source], targets: [e.target] })),
  });
  const at = new Map(res.children!.map(c => [c.id, { x: c.x!, y: c.y! }]));
  return nodes.map(n => ({ ...n, position: at.get(n.id) ?? n.position }));
}
```

## 14. Accessibility and mobile

- **Keyboard:** palette items are buttons (Enter adds a component). React Flow nodes are focusable and arrow keys move them. Connecting by keyboard isn't built into React Flow, so the ⌘K palette provides **Connect…**, which opens two comboboxes ("from", "to") and a protocol picker.
- **Outline view:** a toggle shows the design as an editable **table** of components and connections, with add/remove through forms. It's a complete screen-reader path, and also handy on phones.
- **Live summary** (`aria-live="polite"`): "Added Redis. 6 components, 7 connections. 2 warnings."
- **Mobile:** tap-to-add, pinch zoom, larger handles on coarse pointers, the inspector as a bottom sheet, and lint/sim/grade as tabs in a sheet. Recommend landscape for challenges.
- **Reduced motion:** no packets. Edge labels carry the QPS instead.

## 15. Milestones

| Milestone | Scope | Acceptance |
|---|---|---|
| **P4.1 Builder MVP** | Palette (drag + tap), canvas, custom node/edge, loose connections, orientation, inspector, delete, undo/redo, autosave | A learner can build the URL shortener diagram on desktop and on a phone. Undo restores a drag in one step. |
| **P4.2 Lint + export** | Lint panel with highlight and "learn why", JSON import/export, PNG export, share links, auto-layout | A share link round-trips exactly. An invalid link shows an error and never crashes. |
| **P4.3 Templates** | `toDesign(spec)`, gallery, "Open in playground" on every lesson diagram | Every lesson diagram opens and lints without errors |
| **P4.4 Challenges** | Challenge pages, rubric grading, hints, reference overlay, scores in progress | 6 challenges; each reference solution scores 100% (tested) |
| **P4.5 Simulation** | `simulate()`, packet density, utilization states, bottleneck callout, spike and kill-node controls | Unit tests cover LB split, cache-aside, queue backlog and DB replica math |

## 16. Testing

- **Unit:** `orient`, `lint` (one fixture graph per rule), `graphQuery.pathThrough` (direct path, a path with intermediate nodes, no path, cycles), `grade` (every reference solution scores 100%), `simulate` (hand-computed fixtures, for example 1,000 QPS through an LB to 2 services each with cache-aside at a 0.9 hit ratio, so Postgres sees 100 reads + 100 writes), and `decodeDesign` (valid input, tampered input, '+' characters).
- **E2E (Playwright):**

```ts
test('drag a load balancer onto the canvas, connect it, and share', async ({ page }) => {
  await page.goto('/playground');
  const pane = page.locator('.react-flow__pane');
  await page.getByRole('button', { name: 'Client' }).dragTo(pane, { targetPosition: { x: 200, y: 200 } });
  await page.getByRole('button', { name: 'Load balancer' }).dragTo(pane, { targetPosition: { x: 450, y: 200 } });
  await expect(page.locator('.react-flow__node')).toHaveCount(2);
  await page.locator('.react-flow__node').first().locator('.react-flow__handle-right')
    .dragTo(page.locator('.react-flow__node').nth(1).locator('.react-flow__handle-left'));
  await expect(page.locator('.react-flow__edge')).toHaveCount(1);
});
```

## 17. Drag-to-slot quizzes inside lessons (dnd-kit)

These are small exercises inside lesson pages: one component is missing from a lesson diagram, and the learner drags the right one into the gap.

```tsx
'use client';
import { DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';

export function DiagramQuiz({ spec, slot, options, answer, explain }: {
  spec: FlowSpec; slot: string; options: NodeKind[]; answer: NodeKind; explain: string;
}) {
  const [placed, setPlaced] = useState<NodeKind | null>(null);
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));   // keyboard: Space to lift, arrows, Space to drop
  const onDragEnd = ({ active, over }: DragEndEvent) => { if (over?.id === slot) setPlaced(active.id as NodeKind); };
  const shown: FlowSpec = {
    ...spec,
    nodes: spec.nodes.map(n => (n.id === slot ? { ...n, kind: placed ?? n.kind, label: placed ? KIND_META[placed].label : '?' } : n)),
  };
  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="relative">
        <FlowDiagram spec={shown} />
        {/* HTML drop zone positioned over the slot node from layoutFlow() coordinates (as % of the viewBox) */}
        <DropSlot id={slot} spec={spec} />
      </div>
      <div role="group" aria-label="Components: drag one into the empty box, or press its Place button">
        {options.map(k => <DraggableChip key={k} kind={k} onPlace={() => setPlaced(k)} />)}
      </div>
      {placed && <p role="status">{placed === answer ? `Correct. ${explain}` : 'Not quite. What would protect the database from repeated reads?'}</p>}
    </DndContext>
  );
}
```

Planned quizzes:

- Request path: where does the load balancer go?
- Cache-aside: place the cache.
- Email sending: place the queue.
- Replication: place the read replica.
- Circuit breaker: what goes between the caller and the dependency?

## 18. Later (after launch)

- Cloud saves and public design links (needs the optional backend, 01 §13).
- Real-time collaboration (Yjs).
- Version history per design.
- An LLM-based design review that reads the design JSON and the lint output and returns written feedback. Run it server-side, with rate limits.
- Exporting a design to Markdown (component list and assumptions) to paste into notes.
