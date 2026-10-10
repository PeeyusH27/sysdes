import type { FlowEdgeT, HldNode } from "./types";

/** Kahn's algorithm. Nodes inside cycles are appended last, so load reaching them is not propagated twice. */
export function topoOrder(nodes: HldNode[], edges: FlowEdgeT[]): string[] {
  const indeg = new Map(nodes.map((n) => [n.id, 0]));
  const out = new Map<string, string[]>();
  for (const e of edges) {
    if (!indeg.has(e.source) || !indeg.has(e.target)) continue;
    indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1);
    out.set(e.source, [...(out.get(e.source) ?? []), e.target]);
  }
  const queue = nodes.filter((n) => indeg.get(n.id) === 0).map((n) => n.id);
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
  return [...order, ...nodes.map((n) => n.id).filter((id) => !seen.has(id))];
}

/** Cycles made only of synchronous calls (DFS back edges). */
export function syncCycles({ nodes, edges }: { nodes: HldNode[]; edges: FlowEdgeT[] }): string[][] {
  const out = new Map<string, string[]>();
  for (const e of edges) if (!e.data?.async) out.set(e.source, [...(out.get(e.source) ?? []), e.target]);
  const state = new Map<string, "open" | "done">();
  const stack: string[] = [];
  const cycles: string[][] = [];
  const visit = (id: string) => {
    state.set(id, "open");
    stack.push(id);
    for (const t of out.get(id) ?? []) {
      if (state.get(t) === "open") cycles.push(stack.slice(stack.indexOf(t)));
      else if (!state.has(t)) visit(t);
    }
    stack.pop();
    state.set(id, "done");
  };
  for (const n of nodes) if (!state.has(n.id)) visit(n.id);
  return cycles;
}

/** Pick facing handles (right→left, bottom→top…) for edges that don't have them yet (templates, imports, tidy). */
export function assignHandles(nodes: HldNode[], edges: FlowEdgeT[], force = false): FlowEdgeT[] {
  const pos = new Map(nodes.map((n) => [n.id, n.position]));
  return edges.map((e) => {
    if (!force && e.sourceHandle && e.targetHandle) return e;
    const a = pos.get(e.source);
    const b = pos.get(e.target);
    if (!a || !b) return e;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const horizontal = Math.abs(dx) * 0.45 >= Math.abs(dy);
    const [sh, th] = horizontal ? (dx >= 0 ? ["right", "left"] : ["left", "right"]) : dy >= 0 ? ["bottom", "top"] : ["top", "bottom"];
    return { ...e, sourceHandle: sh, targetHandle: th };
  });
}
