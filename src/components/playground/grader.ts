import type { NodeKind } from "@/components/diagram/types";
import type { FlowEdgeT, HldNode } from "./types";

export type GraphQuery = ReturnType<typeof graphQuery>;

export function graphQuery(nodes: HldNode[], edges: FlowEdgeT[]) {
  const kindOf = new Map(nodes.map((n) => [n.id, n.data.kind]));
  const out = new Map<string, string[]>();
  for (const e of edges) out.set(e.source, [...(out.get(e.source) ?? []), e.target]);
  const ofKind = (k: NodeKind | NodeKind[]) => {
    const want = ([] as NodeKind[]).concat(k);
    return nodes.filter((n) => want.includes(n.data.kind)).map((n) => n.id);
  };

  /** True if some path visits the kinds in `sequence` in order (other nodes may sit in between). */
  function pathThrough(sequence: (NodeKind | NodeKind[])[]): boolean {
    let frontier = new Set(ofKind(sequence[0]));
    for (const step of sequence.slice(1)) {
      const wanted = new Set(ofKind(step));
      const reached = new Set<string>();
      const seen = new Set(frontier);
      const queue = [...frontier];
      while (queue.length) {
        const id = queue.shift()!;
        for (const t of out.get(id) ?? []) {
          if (wanted.has(t)) reached.add(t);
          if (!seen.has(t)) {
            seen.add(t);
            queue.push(t);
          }
        }
      }
      if (!reached.size) return false;
      frontier = reached;
    }
    return true;
  }

  return {
    has: (k: NodeKind, min = 1) => ofKind(k).length >= min,
    connected: (a: NodeKind, b: NodeKind) => edges.some((e) => kindOf.get(e.source) === a && kindOf.get(e.target) === b),
    pathThrough,
    maxReplicas: (k: NodeKind) => Math.max(0, ...nodes.filter((n) => n.data.kind === k).map((n) => n.data.replicas ?? 1)),
    count: (k: NodeKind) => ofKind(k).length,
    hasDlq: () => nodes.some((n) => n.data.role === "dlq"),
    hasAsyncEdge: (a: NodeKind, b: NodeKind) => edges.some((e) => kindOf.get(e.source) === a && kindOf.get(e.target) === b),
  };
}

export interface RubricItem {
  id: string;
  points: number;
  label: string;
  hint: string;
  test: (g: GraphQuery) => boolean;
}

export function grade(rubric: RubricItem[], nodes: HldNode[], edges: FlowEdgeT[]) {
  const g = graphQuery(nodes, edges);
  const items = rubric.map((r) => ({ ...r, passed: r.test(g) }));
  const score = items.filter((i) => i.passed).reduce((s, i) => s + i.points, 0);
  const max = items.reduce((s, i) => s + i.points, 0);
  return { items, score, max, percent: Math.round((score / max) * 100) };
}
