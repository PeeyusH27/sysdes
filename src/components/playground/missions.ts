// Guided missions: a challenge played as a short story. The learner starts from a working but naive design and is
// given one scenario at a time (a spike, a crashed server, a dead database). Each step runs the simulator under its
// scenario and either passes or says what broke and why. Every step carries the change that fixes it (`solve`), so
// tests prove each mission can be finished and the "Show me" button can apply it.
import { KIND_META } from "@/components/diagram/kinds";
import type { NodeKind } from "@/components/diagram/types";
import { compact } from "@/lib/format";
import { graphQuery, type GraphQuery } from "./grader";
import type { DesignDoc } from "./schema";
import { simulate, type SimResult } from "./simulate";
import type { FlowEdgeT, HldNode } from "./types";

export interface Scenario {
  /** Shown on the step: "5× traffic, and one app server crashes". */
  label: string;
  multiplier?: number;
  /** Node ids that are down entirely. */
  down?: string[];
  /** Node ids that lose one instance (a node with a single instance is down). */
  lose?: string[];
}

export interface Failure {
  message: string;
  /** Components to light up on the canvas. */
  nodes?: string[];
}

export interface StepContext {
  nodes: HldNode[];
  edges: FlowEdgeT[];
  sim: SimResult;
  g: GraphQuery;
  scenario: Scenario;
}

export interface MissionStep {
  id: string;
  title: string;
  /** What to do, in a sentence or two. */
  task: string;
  scenario: Scenario;
  /** null when the design survives the scenario, otherwise what went wrong. */
  check: (ctx: StepContext) => Failure | null;
  /** The idea to take away, shown once the step passes. */
  lesson: string;
  learn?: string;
  /** The change that fixes the step, applied to a design document. */
  solve: (doc: DesignDoc) => DesignDoc;
}

export interface Mission {
  /** The slug of the challenge this mission belongs to. */
  slug: string;
  intro: string;
  start: DesignDoc;
  steps: MissionStep[];
}

/* ------------------------------------------------------------------ design helpers (pure, for solve and start) */

type Data = DesignDoc["nodes"][number]["data"];
const at = (col: number, row: number) => ({ x: col * 230, y: row * 130 });

const node = (id: string, kind: NodeKind, label: string, col: number, row: number, data: Partial<Data> = {}): DesignDoc["nodes"][number] => ({
  id,
  position: at(col, row),
  data: { kind, label, ...data },
});
const edge = (source: string, target: string, async = false): DesignDoc["edges"][number] => ({ id: `${source}>${target}`, source, target, data: async ? { async: true } : {} });

const withReplicas = (doc: DesignDoc, id: string, replicas: number): DesignDoc => ({ ...doc, nodes: doc.nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, replicas } } : n)) });
const withNodes = (doc: DesignDoc, ...add: DesignDoc["nodes"]): DesignDoc => ({ ...doc, nodes: [...doc.nodes, ...add] });
const withEdges = (doc: DesignDoc, ...add: DesignDoc["edges"]): DesignDoc => ({ ...doc, edges: [...doc.edges, ...add] });
const withoutEdge = (doc: DesignDoc, source: string, target: string): DesignDoc => ({ ...doc, edges: doc.edges.filter((e) => !(e.source === source && e.target === target)) });

/* ------------------------------------------------------------------ check helpers */

const pct = (u: number) => `${Math.round(u * 100)}%`;
const labelOf = (nodes: HldNode[], id: string) => nodes.find((n) => n.id === id)?.data.label ?? id;

/** Components over 100% of capacity in this scenario, worst first. */
function overloaded({ nodes, sim }: StepContext) {
  return nodes
    .filter((n) => n.data.kind !== "client" && !sim.nodes[n.id]?.down && (sim.nodes[n.id]?.util ?? 0) > 1)
    .sort((a, b) => sim.nodes[b.id].util - sim.nodes[a.id].util);
}

type Advice = Partial<Record<NodeKind, string>>;

/** "Postgres is at 396% under 5× traffic. <advice for that kind of component>". */
function overloadFailure(ctx: StepContext, advice: Advice): Failure | null {
  const worst = overloaded(ctx)[0];
  if (!worst) return null;
  const per = worst.data.perInstanceQps ?? KIND_META[worst.data.kind].perInstanceQps;
  const how = advice[worst.data.kind] ?? "Add instances (replicas in the inspector) or take load off it.";
  return {
    message: `${worst.data.label} is at ${pct(ctx.sim.nodes[worst.id].util)} of capacity (${ctx.scenario.label}). One instance handles about ${compact(per)} req/s. ${how}`,
    nodes: [worst.id],
  };
}

/** Requests are failing: name the dead component and how much traffic it takes with it. */
function downFailure(ctx: StepContext, how: string): Failure | null {
  if (ctx.sim.errorsPerSec <= 0) return null;
  const dead = ctx.nodes.filter((n) => ctx.sim.nodes[n.id]?.down);
  const names = dead.map((n) => n.data.label).join(" and ") || "A component";
  return { message: `${names} ${dead.length > 1 ? "are" : "is"} down and ${compact(ctx.sim.errorsPerSec)} req/s fail (${ctx.scenario.label}). ${how}`, nodes: dead.map((n) => n.id) };
}

function backlogFailure({ sim, nodes }: StepContext, how: string): Failure | null {
  const id = Object.keys(sim.backlog).find((k) => sim.backlog[k] > 0.5);
  return id ? { message: `${labelOf(nodes, id)} backs up by ${compact(sim.backlog[id])} messages per second: its consumers cannot keep up. ${how}`, nodes: [id] } : null;
}

const first = (...fs: (Failure | null)[]) => fs.find(Boolean) ?? null;

/* ------------------------------------------------------------------ the missions */

const urlShortener: Mission = {
  slug: "url-shortener",
  intro: "A link shortener that works on a quiet day. Four scenarios are about to find out what it is missing: launch-day traffic, a crashed server, a dead database, and a boss who wants click counts.",
  start: {
    version: 1,
    title: "URL shortener (guided)",
    nodes: [
      node("client", "client", "Browser", 0, 1, { qps: 4000, readRatio: 0.99 }),
      node("svc", "service", "App server", 2, 1),
      node("db", "database", "Postgres", 3, 1),
    ],
    edges: [edge("client", "svc"), edge("svc", "db")],
  },
  steps: [
    {
      id: "steady",
      title: "Handle today's traffic",
      task: "About 4,000 redirects a second arrive. Make sure nothing is over capacity, and that traffic reaches the app through something that lets you add and lose servers.",
      scenario: { label: "normal traffic" },
      check: (ctx) =>
        first(
          overloadFailure(ctx, { service: "Add instances: redirects are stateless, so more copies is the easy fix.", database: "Add a replica so reads spread out." }),
          ctx.g.pathThrough(["client", ["lb", "gateway"], "service"])
            ? null
            : { message: "The browser talks to the app server directly. Put a load balancer in front so you can add instances and survive one failing.", nodes: ["svc"] },
        ),
      lesson: "Stateless servers behind a load balancer scale by adding copies. The balancer also hides a failed one.",
      learn: "/learn/api-load-balancing",
      solve: (d) => withReplicas(withEdges(withNodes(withoutEdge(d, "client", "svc"), node("lb", "lb", "Load balancer", 1, 1)), edge("client", "lb"), edge("lb", "svc")), "svc", 3),
    },
    {
      id: "spike",
      title: "Survive launch day",
      task: "A celebrity tweets a short link and traffic jumps to 5×. Find what gives first and fix it. Nearly all of it is reads of the same few hot links.",
      scenario: { label: "5× traffic", multiplier: 5 },
      check: (ctx) =>
        overloadFailure(ctx, {
          database: "Almost all of this traffic reads the same hot links. A cache in front of the database absorbs most reads, which is cheaper than scaling the database.",
          service: "Add instances until it has room. It is stateless, so this is safe.",
        }),
      lesson: "Put a cache in front of a read-heavy store before you scale the store: a 90% hit rate cuts database load by 10×.",
      learn: "/learn/caching",
      solve: (d) => withReplicas(withEdges(withNodes(d, node("cache", "cache", "Redis", 3, 0)), edge("svc", "cache")), "svc", 10),
    },
    {
      id: "crash",
      title: "Lose an app server",
      task: "One app server crashes in the middle of the spike. The rest must carry the load.",
      scenario: { label: "5× traffic, and one app server crashes", multiplier: 5, lose: ["svc"] },
      check: (ctx) => first(downFailure(ctx, "Run more than one instance."), overloadFailure(ctx, { service: "Capacity has to survive losing one instance. Plan for N+1: add at least one more." })),
      lesson: "Size for failure, not just for load: with N instances you need enough capacity left after losing one.",
      learn: "/learn/reliability-observability",
      solve: (d) => withReplicas(d, "svc", 12),
    },
    {
      id: "primary",
      title: "Lose the database primary",
      task: "The database server dies. Redirects should keep working, and no link should be lost.",
      scenario: { label: "5× traffic, and the database loses a server", multiplier: 5, lose: ["db"] },
      check: (ctx) =>
        first(downFailure(ctx, "With a single copy there is nothing to take over. Give it a replica (replicas in the inspector)."), overloadFailure(ctx, { database: "The survivor cannot carry the load: add replicas or a bigger cache." })),
      lesson: "A single database is a single point of failure. A replica lets reads continue and a new primary be promoted.",
      learn: "/learn/databases-scaling",
      solve: (d) => withReplicas(d, "db", 2),
    },
    {
      id: "clicks",
      title: "Count clicks without slowing redirects",
      task: "Marketing wants a click count per link. A redirect must never wait for analytics, and the counting must keep up.",
      scenario: { label: "normal traffic" },
      check: (ctx) =>
        first(
          ctx.g.pathThrough(["service", "queue", "worker"])
            ? null
            : { message: "Nothing counts clicks yet. Publish a click event to a queue and let a worker consume it, so the redirect does not wait for analytics.", nodes: ["svc"] },
          overloadFailure(ctx, { worker: "Add workers. (Real consumers batch writes and handle far more than the simulator's 200 events per second.)" }),
          backlogFailure(ctx, "Add workers, or batch the writes."),
        ),
      lesson: "Anything the user does not wait for belongs behind a queue. It absorbs spikes, and consumers catch up afterwards.",
      learn: "/learn/async-messaging",
      solve: (d) =>
        withEdges(withNodes(d, node("queue", "queue", "Click queue", 2, 3), node("worker", "worker", "Click worker", 3, 3, { replicas: 20 })), edge("svc", "queue", true), edge("queue", "worker")),
    },
  ],
};

const rateLimiter: Mission = {
  slug: "rate-limiter",
  intro: "An API behind a gateway, with no limits at all. Add a limiter that works across every gateway instance, then check that the limiter itself cannot take the API down.",
  start: {
    version: 1,
    title: "Rate limiter (guided)",
    nodes: [
      node("client", "client", "API clients", 0, 1, { qps: 6000 }),
      node("lb", "lb", "Load balancer", 1, 1),
      node("gw", "gateway", "API gateway", 2, 1),
      node("svc", "service", "API service", 3, 1, { replicas: 4 }),
      node("db", "database", "Postgres", 4, 1, { replicas: 2 }),
    ],
    edges: [edge("client", "lb"), edge("lb", "gw"), edge("gw", "svc"), edge("svc", "db")],
  },
  steps: [
    {
      id: "counters",
      title: "Share the counters",
      task: "Each client may make 100 requests a minute, however many gateway instances there are. Where should the counters live?",
      scenario: { label: "normal traffic" },
      check: (ctx) =>
        ctx.g.connected("gateway", "cache")
          ? overloadFailure(ctx, {})
          : { message: "Counters kept inside each gateway instance would let a client make 100 requests per instance. They have to live in one shared place the gateway calls: a fast in-memory store such as Redis.", nodes: ["gw"] },
      lesson: "A limit is only as global as its counters. Keep them in a shared store, and keep the check to one round trip.",
      learn: "/questions/rate-limiter",
      solve: (d) => withEdges(withNodes(d, node("redis", "cache", "Redis counters", 2, 0)), edge("gw", "redis")),
    },
    {
      id: "gateway",
      title: "Lose a gateway",
      task: "A gateway instance crashes. Clients should not notice.",
      scenario: { label: "a gateway instance crashes", lose: ["gw"] },
      check: (ctx) => downFailure(ctx, "A single gateway is a single point of failure for every request. Run several."),
      lesson: "Anything every request passes through must be redundant, because its failure is everyone's failure.",
      learn: "/learn/api-load-balancing",
      solve: (d) => withReplicas(d, "gw", 3),
    },
    {
      id: "redis",
      title: "Lose Redis",
      task: "The limiter's store dies. Every request needs a limit check, so find out what happens to them.",
      scenario: { label: "the Redis server crashes", lose: ["redis"] },
      check: (ctx) => downFailure(ctx, "The limiter must not be a single point of failure. Give Redis a replica. Then decide on a policy for when it is unreachable: fail open (let requests through) or fail closed (reject)."),
      lesson: "Decide what the limiter does when it cannot decide. Most APIs fail open, because an outage in the limiter should not become an outage of the API.",
      learn: "/questions/rate-limiter",
      solve: (d) => withReplicas(d, "redis", 2),
    },
    {
      id: "peak",
      title: "Handle the peak",
      task: "At peak the API sees about 10,000 requests a second. Everything behind the limiter has to cope.",
      scenario: { label: "1.7× traffic, about 10K req/s", multiplier: 1.7 },
      check: (ctx) => overloadFailure(ctx, { service: "Add instances. The limiter protects the service from abuse, not from honest peak load.", database: "Add a replica so reads spread out." }),
      lesson: "A limiter stops unfair use, not real demand. Peak load still needs capacity.",
      learn: "/learn/requirements-estimation",
      solve: (d) => withReplicas(d, "svc", 6),
    },
  ],
};

export const missions: Mission[] = [urlShortener, rateLimiter];
export const getMission = (slug: string) => missions.find((m) => m.slug === slug);

/* ------------------------------------------------------------------ running a step */

/** The scenario's node ids that still exist in the learner's design (they may have deleted or renamed things). */
const existing = (ids: string[] | undefined, nodes: HldNode[]) => new Set((ids ?? []).filter((id) => nodes.some((n) => n.id === id)));

export function scenarioOptions(scenario: Scenario, nodes: HldNode[]) {
  return { multiplier: scenario.multiplier ?? 1, down: existing(scenario.down, nodes), lose: existing(scenario.lose, nodes) };
}

/** Run the step's scenario on the current design and say whether it survives. */
export function evaluateStep(step: MissionStep, nodes: HldNode[], edges: FlowEdgeT[]): { sim: SimResult; failure: Failure | null } {
  const sim = simulate(nodes, edges, scenarioOptions(step.scenario, nodes));
  const failure = step.check({ nodes, edges, sim, g: graphQuery(nodes, edges), scenario: step.scenario });
  return { sim, failure };
}

