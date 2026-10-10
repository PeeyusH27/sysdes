import type { Connection } from "@xyflow/react";
import type { NodeKind } from "@/components/diagram/types";
import type { HldNode } from "./types";

const CALLEE = new Set<NodeKind>(["database", "cache", "storage", "search", "external"]);

/** Edges point from caller to callee: flip a drag that starts on a data store and ends on a caller. */
export function orient(c: Connection, kindOf: (id: string) => NodeKind | undefined): Connection {
  const s = kindOf(c.source);
  const t = kindOf(c.target);
  const flip = !!s && !!t && CALLEE.has(s) && !CALLEE.has(t);
  return flip ? { source: c.target, target: c.source, sourceHandle: c.targetHandle, targetHandle: c.sourceHandle } : c;
}

export function defaultProtocol(target: NodeKind | undefined): { protocol: string; async?: boolean } {
  if (target === "database") return { protocol: "SQL" };
  if (target === "queue" || target === "pubsub") return { protocol: "Pub/Sub", async: true };
  if (target === "cache") return { protocol: "TCP" };
  return { protocol: "HTTP" };
}

export const kindLookup = (nodes: HldNode[]) => {
  const m = new Map(nodes.map((n) => [n.id, n.data.kind]));
  return (id: string) => m.get(id);
};
