import type { NodeKind } from "@/components/diagram/types";
import { syncCycles } from "./graph";
import type { FlowEdgeT, HldNode } from "./types";

export type Finding = {
  id: string;
  level: "error" | "warn" | "info";
  message: string;
  nodes?: string[];
  edges?: string[];
  learn?: string;
};

type Ctx = {
  nodes: HldNode[];
  edges: FlowEdgeT[];
  kind: (id: string) => NodeKind;
  out: (id: string) => FlowEdgeT[];
  inc: (id: string) => FlowEdgeT[];
};

const DATA = new Set<NodeKind>(["database", "cache", "storage", "search"]);
// Browsers may upload straight to object storage with presigned URLs, so storage is not flagged here.
const NO_DIRECT_CLIENT = new Set<NodeKind>(["database", "cache", "search"]);

export const RULES: ((c: Ctx) => Finding[])[] = [
  ({ edges, kind }) =>
    edges
      .filter((e) => kind(e.source) === "client" && NO_DIRECT_CLIENT.has(kind(e.target)))
      .map((e) => ({
        id: `client-to-data:${e.id}`,
        level: "error" as const,
        edges: [e.id],
        nodes: [e.source, e.target],
        learn: "/learn/api-load-balancing",
        message: "A client talks to a data store directly. Put a service in between for auth, validation and caching.",
      })),
  ({ nodes, inc, kind }) => {
    const exposed = nodes.filter((n) => n.data.kind === "service" && inc(n.id).some((e) => kind(e.source) === "client"));
    return exposed.length
      ? [{ id: "no-entry", level: "warn" as const, nodes: exposed.map((n) => n.id), learn: "/learn/api-load-balancing", message: "Clients reach a service without a load balancer or gateway, so you can't add instances or survive one failing." }]
      : [];
  },
  ({ nodes }) =>
    nodes
      .filter((n) => n.data.kind === "database" && (n.data.replicas ?? 1) < 2)
      .map((n) => ({ id: `db-spof:${n.id}`, level: "warn" as const, nodes: [n.id], learn: "/learn/databases-scaling", message: `${n.data.label} has no replica: a single point of failure, and every read hits the primary.` })),
  ({ nodes, out }) =>
    nodes
      .filter((n) => n.data.kind === "queue" && n.data.role !== "dlq" && out(n.id).length === 0)
      .map((n) => ({ id: `queue-no-consumer:${n.id}`, level: "error" as const, nodes: [n.id], learn: "/learn/async-messaging", message: `${n.data.label} has no consumer, so messages pile up forever.` })),
  ({ nodes }) =>
    nodes.some((n) => n.data.kind === "queue") && !nodes.some((n) => n.data.role === "dlq")
      ? [{ id: "no-dlq", level: "info" as const, learn: "/learn/async-messaging", message: "No dead letter queue. Where do poison messages go after the last retry? (Set a queue's role to DLQ in the inspector.)" }]
      : [],
  ({ nodes, out, kind }) =>
    nodes
      .filter(
        (n) =>
          n.data.kind === "cache" &&
          !out(n.id).some((e) => DATA.has(kind(e.target)) && kind(e.target) !== "cache") &&
          !nodes.some((p) => out(p.id).some((e) => e.target === n.id) && out(p.id).some((e) => kind(e.target) === "database" || kind(e.target) === "search")),
      )
      .map((n) => ({ id: `cache-no-source:${n.id}`, level: "warn" as const, nodes: [n.id], learn: "/learn/caching", message: `${n.data.label} has no source of truth behind it. What fills it on a miss?` })),
  ({ nodes, edges }) =>
    nodes
      .filter((n) => !edges.some((e) => e.source === n.id || e.target === n.id))
      .map((n) => ({ id: `orphan:${n.id}`, level: "info" as const, nodes: [n.id], message: `${n.data.label} isn't connected to anything.` })),
  (ctx) =>
    syncCycles(ctx).map((cycle, i) => ({ id: `sync-cycle:${i}`, level: "error" as const, nodes: cycle, learn: "/learn/reliability-observability", message: "A cycle of synchronous calls: one slow hop stalls every service in the loop." })),
  ({ nodes }) =>
    nodes
      .filter((n) => n.data.kind === "service" && (n.data.replicas ?? 1) === 1)
      .map((n) => ({ id: `single-instance:${n.id}`, level: "info" as const, nodes: [n.id], message: `${n.data.label} runs a single instance. Set replicas ≥ 2 for redundancy.` })),
  ({ nodes }) =>
    nodes
      .filter((n) => (n.data.sim?.util ?? 0) > 1)
      .map((n) => ({ id: `overloaded:${n.id}`, level: "warn" as const, nodes: [n.id], message: `${n.data.label} is at ${Math.round(n.data.sim!.util * 100)}% of capacity: add replicas, a cache, or a queue in front.` })),
];

export function lint(nodes: HldNode[], edges: FlowEdgeT[]): Finding[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const valid = edges.filter((e) => byId.has(e.source) && byId.has(e.target));
  const ctx: Ctx = {
    nodes,
    edges: valid,
    kind: (id) => byId.get(id)!.data.kind,
    out: (id) => valid.filter((e) => e.source === id),
    inc: (id) => valid.filter((e) => e.target === id),
  };
  const order = { error: 0, warn: 1, info: 2 };
  return RULES.flatMap((rule) => rule(ctx)).sort((a, b) => order[a.level] - order[b.level]);
}
