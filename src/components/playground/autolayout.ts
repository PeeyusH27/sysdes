import type { FlowEdgeT, HldNode } from "./types";

export async function autoLayout(nodes: HldNode[], edges: FlowEdgeT[]) {
  const ELK = (await import("elkjs/lib/elk.bundled.js")).default;
  const res = await new ELK().layout({
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.spacing.nodeNode": "48",
      "elk.layered.spacing.nodeNodeBetweenLayers": "90",
    },
    children: nodes.map((n) => ({ id: n.id, width: n.measured?.width ?? 170, height: n.measured?.height ?? 44 })),
    edges: edges.map((e) => ({ id: e.id, sources: [e.source], targets: [e.target] })),
  });
  const at = new Map((res.children ?? []).map((c) => [c.id, { x: c.x ?? 0, y: c.y ?? 0 }]));
  return nodes.map((n) => ({ ...n, position: at.get(n.id) ?? n.position }));
}
