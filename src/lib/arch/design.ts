// The architecture lab's data: one reference infrastructure, the nine stages it grows through, and the requests you can
// follow across it. Everything is plain data so tests can check each stage against the simulator.
import type { NodeKind } from "@/components/diagram/types";
import type { DesignDoc } from "@/components/playground/schema";
import { simulate, type SimResult } from "@/components/playground/simulate";
import type { FlowEdgeT, HldData, HldNode } from "@/components/playground/types";

/** Ids of every component in the full design. The concept cards (concepts.ts) are keyed by these. */
export const NODE_IDS = ["users", "dns", "cdn", "storage", "lb", "gw", "api", "cache", "db", "db2", "db3", "db4", "search", "queue", "worker", "email", "obs", "region2"] as const;
export type ArchNodeId = (typeof NODE_IDS)[number];

interface ArchNode {
  id: ArchNodeId;
  kind: NodeKind;
  label: string;
  col: number;
  row: number;
  /** The stage that introduces it. */
  since: number;
  /** Replicas from a stage on: `{ 0: 1, 3: 12 }` is one instance, then twelve from stage 3. */
  replicas?: Record<number, number>;
  /** A different label from a stage on (the database becomes "Database shard A"). */
  labels?: Record<number, string>;
  data?: Partial<HldData>;
}

interface ArchEdge {
  from: ArchNodeId;
  to: ArchNodeId;
  since: number;
  /** The stage that replaces it with something better (a direct link that gets a load balancer in the middle). */
  until?: number;
  async?: boolean;
  /** The fraction of the caller's traffic that takes this edge. */
  share?: number;
  label?: string;
}

export const NODES: ArchNode[] = [
  { id: "users", kind: "client", label: "Users", col: 0, row: 2, since: 0 },
  { id: "dns", kind: "dns", label: "DNS", col: 1, row: 0, since: 4 },
  { id: "cdn", kind: "cdn", label: "CDN", col: 1, row: 4, since: 4 },
  { id: "storage", kind: "storage", label: "Object storage", col: 2, row: 4, since: 4 },
  { id: "lb", kind: "lb", label: "Load balancer", col: 2, row: 2, since: 1, replicas: { 1: 1, 9: 3 } },
  { id: "gw", kind: "gateway", label: "API gateway", col: 3, row: 2, since: 7, replicas: { 7: 3, 9: 6 } },
  { id: "api", kind: "service", label: "App servers", col: 4, row: 2, since: 0, replicas: { 0: 1, 1: 2, 2: 5, 3: 12, 9: 24 }, data: { perInstanceQps: 5000 } },
  { id: "cache", kind: "cache", label: "Redis cache", col: 5, row: 1, since: 2, replicas: { 2: 2 }, data: { hitRatio: 0.85 } },
  { id: "db", kind: "database", label: "Database", col: 5, row: 2, since: 0, replicas: { 0: 1, 3: 3 }, labels: { 9: "Shard A" } },
  { id: "db2", kind: "database", label: "Shard B", col: 6, row: 1, since: 9, replicas: { 9: 3 } },
  { id: "db3", kind: "database", label: "Shard C", col: 6, row: 2, since: 9, replicas: { 9: 3 } },
  { id: "db4", kind: "database", label: "Shard D", col: 6, row: 3, since: 9, replicas: { 9: 3 } },
  { id: "search", kind: "search", label: "Search index", col: 5, row: 3, since: 6, replicas: { 6: 3 }, data: { perInstanceQps: 5000 } },
  { id: "queue", kind: "queue", label: "Message queue", col: 4, row: 4, since: 5 },
  { id: "worker", kind: "worker", label: "Workers", col: 5, row: 4, since: 5, replicas: { 5: 8 }, data: { perInstanceQps: 5000 } },
  { id: "email", kind: "external", label: "Email provider", col: 6, row: 4, since: 5, data: { perInstanceQps: 20000 } },
  { id: "obs", kind: "service", label: "Monitoring", col: 4, row: 0, since: 8, data: { perInstanceQps: 10_000_000 } },
  { id: "region2", kind: "service", label: "Region B (a second copy)", col: 0, row: 4, since: 10, data: { perInstanceQps: 10_000_000 } },
];

export const EDGES: ArchEdge[] = [
  { from: "users", to: "api", since: 0, until: 1 },
  { from: "users", to: "lb", since: 1, until: 4 },
  { from: "lb", to: "api", since: 1, until: 7 },
  { from: "api", to: "db", since: 0, until: 9 },
  { from: "api", to: "db", since: 9, share: 0.25 },
  { from: "api", to: "db2", since: 9, share: 0.25 },
  { from: "api", to: "db3", since: 9, share: 0.25 },
  { from: "api", to: "db4", since: 9, share: 0.25 },
  { from: "api", to: "cache", since: 2 },
  { from: "users", to: "dns", since: 4, share: 0.02, label: "lookup" },
  { from: "users", to: "cdn", since: 4, until: 10 },
  { from: "users", to: "cdn", since: 10, share: 0.75 },
  { from: "users", to: "region2", since: 10, share: 0.25, label: "nearest region" },
  { from: "cdn", to: "lb", since: 4 },
  { from: "cdn", to: "storage", since: 4, share: 0.05, label: "files" },
  { from: "api", to: "queue", since: 5, async: true, share: 0.3, label: "slow work" },
  { from: "queue", to: "worker", since: 5 },
  { from: "worker", to: "email", since: 5, share: 0.2 },
  { from: "api", to: "search", since: 6, share: 0.1, label: "queries" },
  { from: "lb", to: "gw", since: 7 },
  { from: "gw", to: "api", since: 7 },
  { from: "api", to: "obs", since: 8, share: 0.01, label: "metrics", async: true },
];

export interface Stage {
  title: string;
  /** "1,000 users": who is using it now. */
  audience: string;
  qps: number;
  readRatio: number;
  /** What pushes the old design over: measured by the simulator ("load") or a reason of another kind ("story"). */
  trigger: { kind: "load" | "story"; text: string };
  /** What you add, and why that fixes it. */
  fix: string;
  /** The sentence to say in an interview. */
  say: string;
  /** Components first drawn at this stage. */
  adds: ArchNodeId[];
}

export const STAGES: Stage[] = [
  {
    title: "Day one: one server, one database",
    audience: "100 users",
    qps: 1_000,
    readRatio: 0.92,
    trigger: { kind: "story", text: "You are starting out. Everything fits on one machine, and that is the right call." },
    fix: "One app server and one database. Simple to build, simple to debug.",
    say: "I'd start with a single app server and a database, because the cheapest design that works is the right first design.",
    adds: ["users", "api", "db"],
  },
  {
    title: "Traffic grows: a load balancer and more servers",
    audience: "5,000 users",
    qps: 5_200,
    readRatio: 0.92,
    trigger: { kind: "load", text: "One app server tops out, and when it fails the whole site is down." },
    fix: "Put a load balancer in front and run several identical, stateless servers. Add capacity by adding servers; lose one and the rest carry on.",
    say: "I'd make the app tier stateless, put a load balancer in front, and scale it horizontally.",
    adds: ["lb"],
  },
  {
    title: "Reads dominate: add a cache",
    audience: "20,000 users",
    qps: 20_000,
    readRatio: 0.92,
    trigger: { kind: "load", text: "Nine in ten requests are reads, and every one hits the database for answers it gave a second ago." },
    fix: "A cache in front of the database serves repeat reads from memory. With about 85% of reads answered there, the database sees a fraction of the traffic.",
    say: "Reads dominate, so I'd add a cache-aside layer in front of the database and size it for the hit ratio.",
    adds: ["cache"],
  },
  {
    title: "The database is the bottleneck: read replicas",
    audience: "50,000 users",
    qps: 50_000,
    readRatio: 0.92,
    trigger: { kind: "load", text: "Even behind a cache, the misses add up to more reads than one database can serve." },
    fix: "Add read replicas: copies that take read traffic while the primary keeps the writes. This scales reads, not writes.",
    say: "I'd add read replicas to spread reads, accept a little replication lag, and keep writes on the primary.",
    adds: [],
  },
  {
    title: "Go global: a CDN and object storage",
    audience: "100,000 users",
    qps: 100_000,
    readRatio: 0.97,
    trigger: { kind: "load", text: "Users are far away, and most of the bytes are images and pages that never change." },
    fix: "A CDN serves cacheable content from a server near the user, DNS sends each user to the nearest one, and files live in object storage instead of on the app servers.",
    say: "I'd put a CDN in front for static and cacheable content, and keep files in object storage rather than on the app servers.",
    adds: ["dns", "cdn", "storage"],
  },
  {
    title: "Slow work leaves the request: a queue and workers",
    audience: "100,000 users",
    qps: 100_000,
    readRatio: 0.97,
    trigger: { kind: "story", text: "Sending an email or resizing an image inside the request makes users wait, and a slow provider slows everyone." },
    fix: "The request drops a message on a queue and returns. Workers pick it up and do the slow part, retrying if it fails.",
    say: "Anything the user does not wait for goes on a queue, so spikes are absorbed and a slow provider cannot slow the request.",
    adds: ["queue", "worker", "email"],
  },
  {
    title: "Find things: a search index",
    audience: "100,000 users",
    qps: 100_000,
    readRatio: 0.97,
    trigger: { kind: "story", text: "Searching with LIKE queries on the database is slow, and it competes with real traffic." },
    fix: "A search index built for text and ranking, kept in sync from the database, answers queries without touching it.",
    say: "I'd keep a search index beside the primary store, fed from it, and never run text search on the database.",
    adds: ["search"],
  },
  {
    title: "Safe at the door: an API gateway",
    audience: "100,000 users",
    qps: 100_000,
    readRatio: 0.97,
    trigger: { kind: "story", text: "Every service would have to check logins, limit abuse and log requests on its own." },
    fix: "A gateway in front of the app servers handles authentication, rate limits and routing in one place.",
    say: "I'd put an API gateway at the edge for auth, rate limiting and routing, so the services stay simple.",
    adds: ["gw"],
  },
  {
    title: "See it all: monitoring",
    audience: "100,000 users",
    qps: 100_000,
    readRatio: 0.97,
    trigger: { kind: "story", text: "Something is slow, and nobody knows where. You cannot fix what you cannot see." },
    fix: "Metrics, logs and traces from every component, with alerts on what users feel: errors, latency and saturation.",
    say: "I'd instrument everything with metrics, logs and traces, and alert on user-facing symptoms, not just machine health.",
    adds: ["obs"],
  },
  {
    title: "One database is not enough: shard it",
    audience: "250,000 users",
    qps: 250_000,
    readRatio: 0.97,
    trigger: { kind: "load", text: "Servers and caches scale by adding copies, but every write still lands on one primary. Replicas do not help with writes." },
    fix: "Split the data across several databases by a shard key (the user id, say), so each takes a share of the writes. The stateless tiers grow by adding copies.",
    say: "Replicas scale reads, not writes, so past one primary's write limit I'd shard by a key that spreads load evenly and keeps a request on one shard.",
    adds: ["db2", "db3", "db4"],
  },
  {
    title: "Survive a region: run a second copy",
    audience: "400,000 users",
    qps: 480_000,
    readRatio: 0.97,
    trigger: { kind: "story", text: "Everything lives in one data centre. If it loses power or its network, you are down, and users on the other side of the world wait for every request." },
    fix: "Run a second copy of the stack in another region and route each user to the nearest one. Each region serves its share, and either can carry on if the other fails.",
    say: "I'd go multi-region for latency and for disaster recovery, route users to the nearest region, and decide up front how the data is replicated and what happens when two regions disagree.",
    adds: ["region2"],
  },
];

/** The last stage: the whole infrastructure. */
export const FULL = STAGES.length - 1;

const at = (col: number, row: number) => ({ x: col * 182, y: row * 104 });
function latest<T>(m: Record<number, T> | undefined, stage: number): T | undefined {
  if (!m) return undefined;
  const keys = Object.keys(m).map(Number).filter((k) => k <= stage);
  return keys.length ? m[Math.max(...keys)] : undefined;
}

/** The design as it stands at a stage. `qps` and `readRatio` default to the stage's own. */
export function docAt(stage: number, opts: { qps?: number; readRatio?: number; hitRatio?: number } = {}): DesignDoc {
  const s = STAGES[stage];
  return {
    version: 1,
    title: s.title,
    nodes: NODES.filter((n) => n.since <= stage).map((n) => ({
      id: n.id,
      position: at(n.col, n.row),
      data: {
        kind: n.kind,
        label: latest(n.labels, stage) ?? n.label,
        ...n.data,
        ...(latest(n.replicas, stage) ? { replicas: latest(n.replicas, stage) } : {}),
        ...(n.id === "users" ? { qps: opts.qps ?? s.qps, readRatio: opts.readRatio ?? s.readRatio } : {}),
        ...(n.id === "cache" && opts.hitRatio !== undefined ? { hitRatio: opts.hitRatio } : {}),
      } as DesignDoc["nodes"][number]["data"],
    })),
    edges: EDGES.filter((e) => e.since <= stage && (e.until === undefined || stage < e.until)).map((e) => ({
      id: `${e.from}>${e.to}`,
      source: e.from,
      target: e.to,
      data: { ...(e.async ? { async: true } : {}), ...(e.share !== undefined ? { share: e.share } : {}), ...(e.label ? { label: e.label } : {}) },
    })),
  };
}

/** A design document as the simulator and the canvas want it. */
export function graphOf(doc: DesignDoc): { nodes: HldNode[]; edges: FlowEdgeT[] } {
  return {
    nodes: doc.nodes.map((n) => ({ ...n, type: "hld" as const, data: { ...n.data } })) as HldNode[],
    edges: doc.edges.map((e) => ({ ...e, type: "flow" as const, data: { ...(e.data ?? {}) } })) as FlowEdgeT[],
  };
}

export interface StageCheck {
  /** The previous design under this stage's load: what breaks, and how badly. */
  before: { sim: SimResult; worst?: { id: string; util: number }; overloaded: string[] } | null;
  after: { sim: SimResult; worst?: { id: string; util: number }; overloaded: string[] };
}

const worstOf = (sim: SimResult, nodes: HldNode[]) => {
  const ranked = nodes.filter((n) => n.data.kind !== "client").map((n) => ({ id: n.id, util: sim.nodes[n.id]?.util ?? 0 })).sort((a, b) => b.util - a.util);
  return { worst: ranked[0], overloaded: ranked.filter((r) => r.util > 1).map((r) => r.id) };
};

/** Run a stage's design, and the previous stage's design under the same load, so the trigger is something you can see. */
export function checkStage(stage: number): StageCheck {
  const s = STAGES[stage];
  const run = (idx: number) => {
    const { nodes, edges } = graphOf(docAt(idx, { qps: s.qps, readRatio: s.readRatio }));
    const sim = simulate(nodes, edges);
    return { sim, ...worstOf(sim, nodes) };
  };
  return { before: stage > 0 ? run(stage - 1) : null, after: run(stage) };
}

/* ------------------------------------------------------------------ following a request */

export interface Hop {
  node: ArchNodeId;
  /** Illustrative time spent here, in milliseconds. */
  ms: number;
  caption: string;
  /** A side trip from the previous main hop (a DNS lookup): the request carries on from where it was. */
  side?: boolean;
}

export interface Scenario {
  id: string;
  title: string;
  summary: string;
  hops: Hop[];
  /** The latency target to compare against, in milliseconds. */
  budgetMs: number;
}

export const SCENARIOS: Scenario[] = [
  {
    id: "read-hit",
    title: "Open a product page (cache hit)",
    summary: "The common case: everything the page needs is already in memory.",
    budgetMs: 200,
    hops: [
      { node: "users", ms: 0, caption: "The browser asks for /products/42." },
      { node: "dns", ms: 20, side: true, caption: "DNS turns the name into the address of the nearest edge. Usually cached, so almost free." },
      { node: "cdn", ms: 20, caption: "The CDN does not have this page (it is personalised), so it forwards the request." },
      { node: "lb", ms: 1, caption: "The load balancer picks a healthy server." },
      { node: "gw", ms: 3, caption: "The gateway checks the login and the rate limit." },
      { node: "api", ms: 20, caption: "An app server runs the request." },
      { node: "cache", ms: 1, caption: "Redis has the answer. About 85% of reads end here." },
    ],
  },
  {
    id: "read-miss",
    title: "Open a product page (cache miss)",
    summary: "The slow path: the answer is not cached, so the database is asked and the cache is filled.",
    budgetMs: 200,
    hops: [
      { node: "users", ms: 0, caption: "A request for a product nobody has looked at today." },
      { node: "cdn", ms: 20, caption: "Not at the edge." },
      { node: "lb", ms: 1, caption: "Balanced to a server." },
      { node: "gw", ms: 3, caption: "Checked at the gateway." },
      { node: "api", ms: 20, caption: "The app server looks in the cache first." },
      { node: "cache", ms: 1, side: true, caption: "Miss. Redis does not have it." },
      { node: "db", ms: 10, caption: "The database does have it. The server returns it and stores a copy in Redis for the next reader." },
    ],
  },
  {
    id: "write",
    title: "Place an order (a write)",
    summary: "Writes cannot be cached: they go to the primary, and the slow follow-up work is queued.",
    budgetMs: 300,
    hops: [
      { node: "users", ms: 0, caption: "The user presses Buy." },
      { node: "cdn", ms: 20, caption: "Writes pass straight through the CDN." },
      { node: "lb", ms: 1, caption: "Balanced." },
      { node: "gw", ms: 3, caption: "Authenticated and rate limited." },
      { node: "api", ms: 20, caption: "The app server validates the order." },
      { node: "db", ms: 15, side: true, caption: "The order is committed to the primary database. The user gets their answer now." },
      { node: "queue", ms: 5, caption: "An order.created message is queued, off the request path." },
      { node: "worker", ms: 100, caption: "Later, a worker picks it up." },
      { node: "email", ms: 200, caption: "And sends the confirmation email. If the provider is slow, nobody is waiting." },
    ],
  },
  {
    id: "image",
    title: "Load a product image",
    summary: "Files never touch the app servers: the CDN serves them, and object storage is the source.",
    budgetMs: 100,
    hops: [
      { node: "users", ms: 0, caption: "The page asks for /images/42.jpg." },
      { node: "dns", ms: 20, side: true, caption: "DNS points the user at the nearest CDN server." },
      { node: "cdn", ms: 20, caption: "The CDN has it cached: done in about 20 ms." },
      { node: "storage", ms: 50, caption: "On a miss the CDN fetches it once from object storage, and the next thousand users get the copy." },
    ],
  },
  {
    id: "search",
    title: "Search for a product",
    summary: "Text search goes to a purpose-built index, not the database.",
    budgetMs: 200,
    hops: [
      { node: "users", ms: 0, caption: "The user types \"blue sneakers\"." },
      { node: "cdn", ms: 20, caption: "Passed through the edge." },
      { node: "lb", ms: 1, caption: "Balanced." },
      { node: "gw", ms: 3, caption: "Authenticated and rate limited, which matters most for search." },
      { node: "api", ms: 20, caption: "The app server builds the query." },
      { node: "search", ms: 30, caption: "The search index ranks the matches. The database is never asked." },
    ],
  },
];

/**
 * The edge each hop arrives by: a hop follows the previous main hop (side trips such as DNS hang off it and do not
 * move the request along). The first hop has no edge.
 */
export function hopEdges(sc: Scenario): (string | null)[] {
  let from: ArchNodeId | null = null;
  return sc.hops.map((h) => {
    const edge = from ? `${from}>${h.node}` : null;
    if (!h.side) from = h.node;
    return edge;
  });
}
