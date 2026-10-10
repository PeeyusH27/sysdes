import type { FlowSpec } from "@/components/diagram/types";
import type { RubricItem } from "./grader";
import type { DesignDoc } from "./schema";
import { specToDesign } from "./share";
import type { HldData } from "./types";

export interface Challenge {
  slug: string;
  title: string;
  brief: string;
  requirements: string[];
  numbers: [string, string][];
  learn: string;
  rubric: RubricItem[];
  reference: FlowSpec;
  overrides?: Record<string, Partial<HldData>>;
}

export function referenceDesign(c: Challenge): DesignDoc {
  const doc = specToDesign(c.reference);
  return {
    ...doc,
    title: `${c.title} (reference)`,
    nodes: doc.nodes.map((n) => ({ ...n, data: { ...n.data, ...(c.overrides?.[n.id] ?? {}) } as DesignDoc["nodes"][number]["data"] })),
  };
}

export const challenges: Challenge[] = [
  {
    slug: "url-shortener",
    title: "URL shortener",
    brief: "Design a service that turns long URLs into 7-character codes and redirects fast.",
    requirements: ["Create short links and redirect", "Reads outnumber writes 100:1", "Count clicks without slowing redirects", "Survive one server or database failing"],
    numbers: [["Writes", "~40/s"], ["Redirects", "~4,000/s (12K peak)"], ["Storage", "~3 TB over 5 years"]],
    learn: "/learn/case-url-shortener",
    rubric: [
      { id: "entry", points: 10, label: "Traffic enters through a load balancer or gateway", hint: "Clients should never hit one app server directly.", test: (g) => g.pathThrough(["client", ["lb", "gateway"], "service"]) },
      { id: "cdn", points: 10, label: "Redirects can be served from the edge", hint: "301 responses are cacheable by a CDN.", test: (g) => g.pathThrough(["client", "cdn", "service"]) },
      { id: "cache", points: 20, label: "Hot codes are read from a cache before the database", hint: "Reads outnumber writes 100:1.", test: (g) => g.connected("service", "cache") && g.pathThrough(["service", "database"]) },
      { id: "ids", points: 20, label: "Codes come from an ID generator", hint: "Counter + base62 with range allocation avoids collisions.", test: (g) => g.connected("service", "idgen") },
      { id: "replica", points: 15, label: "The database has a replica", hint: "Losing the only copy loses every link. Set replicas ≥ 2 in the inspector.", test: (g) => g.maxReplicas("database") >= 2 },
      { id: "analytics", points: 15, label: "Click analytics are asynchronous", hint: "Publish click events to a queue consumed by a worker.", test: (g) => g.pathThrough(["service", "queue", "worker"]) },
      { id: "scale", points: 10, label: "More than one app server", hint: "Set replicas ≥ 2 on the service.", test: (g) => g.maxReplicas("service") >= 2 },
    ],
    reference: {
      id: "ref-url", title: "URL shortener", description: "",
      nodes: [
        { id: "client", label: "Browser", kind: "client", col: 0, row: 1 },
        { id: "cdn", label: "CDN", kind: "cdn", col: 1, row: 1 },
        { id: "lb", label: "Load balancer", kind: "lb", col: 2, row: 1 },
        { id: "app", label: "App", kind: "service", col: 3, row: 1, sub: "×3" },
        { id: "redis", label: "Redis", kind: "cache", col: 4, row: 0, sub: "×2" },
        { id: "pg", label: "Postgres", kind: "database", col: 4, row: 1, sub: "×2" },
        { id: "ids", label: "ID generator", kind: "idgen", col: 4, row: 2 },
        { id: "q", label: "Click queue", kind: "queue", col: 3, row: 3 },
        { id: "w", label: "Analytics worker", kind: "worker", col: 4, row: 3, sub: "×6" },
        { id: "ch", label: "ClickHouse", kind: "database", col: 5, row: 3, sub: "×2" },
        { id: "dlq", label: "Click DLQ", kind: "queue", col: 2, row: 3 },
      ],
      edges: [
        { from: "client", to: "cdn" }, { from: "cdn", to: "lb" }, { from: "lb", to: "app" },
        { from: "app", to: "redis" }, { from: "app", to: "pg" }, { from: "app", to: "ids" },
        { from: "app", to: "q", style: "async" }, { from: "q", to: "w" }, { from: "w", to: "ch" }, { from: "q", to: "dlq", style: "async" },
      ],
    },
    overrides: { client: { qps: 4_000, readRatio: 0.99 }, dlq: { role: "dlq" } },
  },
  {
    slug: "rate-limiter",
    title: "Rate limiter",
    brief: "Add a distributed rate limiter in front of an API so every client gets a fair share.",
    requirements: ["Limit each API key, e.g. 100 requests/minute", "Consistent across many gateway instances", "Under 5 ms added latency", "The limiter must not be a single point of failure"],
    numbers: [["Peak traffic", "~10K req/s"], ["Active keys", "~1M"]],
    learn: "/questions/rate-limiter",
    rubric: [
      { id: "lb", points: 10, label: "A load balancer spreads traffic over gateways", hint: "Put an LB in front of the gateway tier.", test: (g) => g.pathThrough(["client", "lb", "gateway"]) },
      { id: "gateway", points: 20, label: "Limits are enforced in a gateway before the service", hint: "Client → (LB) → gateway → service.", test: (g) => g.pathThrough(["client", "gateway", "service"]) },
      { id: "shared", points: 25, label: "Counters live in a shared Redis", hint: "Local counters per instance can't enforce a global limit.", test: (g) => g.connected("gateway", "cache") },
      { id: "gw-ha", points: 15, label: "More than one gateway instance", hint: "Set replicas ≥ 2 on the gateway.", test: (g) => g.maxReplicas("gateway") >= 2 || g.count("gateway") >= 2 },
      { id: "redis-ha", points: 15, label: "Redis has a replica", hint: "Otherwise the limiter is a single point of failure.", test: (g) => g.maxReplicas("cache") >= 2 },
      { id: "svc", points: 15, label: "The protected service scales out", hint: "Set replicas ≥ 2 on the service.", test: (g) => g.maxReplicas("service") >= 2 },
    ],
    reference: {
      id: "ref-rl", title: "Rate limiter", description: "",
      nodes: [
        { id: "client", label: "API clients", kind: "client", col: 0, row: 1 },
        { id: "lb", label: "Load balancer", kind: "lb", col: 1, row: 1 },
        { id: "gw", label: "API gateway", kind: "gateway", col: 2, row: 1, sub: "×3" },
        { id: "redis", label: "Redis", kind: "cache", col: 3, row: 0, sub: "×2" },
        { id: "svc", label: "Service", kind: "service", col: 3, row: 1, sub: "×4" },
        { id: "pg", label: "Postgres", kind: "database", col: 4, row: 1, sub: "×2" },
      ],
      edges: [{ from: "client", to: "lb" }, { from: "lb", to: "gw" }, { from: "gw", to: "redis" }, { from: "gw", to: "svc" }, { from: "svc", to: "pg" }],
    },
    overrides: { client: { qps: 6_000 }, redis: { hitRatio: 0 } },
  },
  {
    slug: "notification-system",
    title: "Notification system",
    brief: "Send push, email and SMS notifications reliably, without duplicates, honouring user preferences.",
    requirements: ["Multiple channels with per-user preferences", "No duplicates; retries are safe", "A slow SMS provider must not block push", "Failed messages are never silently lost"],
    numbers: [["Average", "~5.8K notifications/s"], ["Campaign bursts", "50K+/s"]],
    learn: "/learn/case-notification-system",
    rubric: [
      { id: "entry", points: 10, label: "Requests enter through a load balancer or gateway", hint: "Event/API → LB/gateway → notification service.", test: (g) => g.pathThrough(["client", ["lb", "gateway"], "service"]) },
      { id: "prefs", points: 10, label: "The service reads user preferences from a database", hint: "Connect the notification service to a database.", test: (g) => g.connected("service", "database") },
      { id: "queue", points: 15, label: "Sends are queued, not done inline", hint: "Service → queue.", test: (g) => g.connected("service", "queue") },
      { id: "channels", points: 15, label: "Separate queues per channel", hint: "At least three queues (e.g. push, email, SMS) plus a DLQ.", test: (g) => g.count("queue") >= 4 },
      { id: "workers", points: 15, label: "Workers consume the queues and call providers", hint: "Queue → worker → external provider.", test: (g) => g.pathThrough(["queue", "worker", "external"]) },
      { id: "dlq", points: 15, label: "A dead letter queue exists", hint: "Add a queue and set its role to DLQ in the inspector.", test: (g) => g.hasDlq() },
      { id: "dedupe", points: 20, label: "Workers dedupe with a fast store", hint: "Connect workers to Redis to record sent ids.", test: (g) => g.connected("worker", "cache") },
    ],
    reference: {
      id: "ref-notif", title: "Notification system", description: "",
      nodes: [
        { id: "client", label: "Event / API", kind: "client", col: 0, row: 1 },
        { id: "gw", label: "API gateway", kind: "gateway", col: 1, row: 1 },
        { id: "svc", label: "Notif service", kind: "service", col: 2, row: 1, sub: "×3" },
        { id: "prefs", label: "Preferences DB", kind: "database", col: 2, row: 3, sub: "×2" },
        { id: "qp", label: "Push queue", kind: "queue", col: 3, row: 0 },
        { id: "qe", label: "Email queue", kind: "queue", col: 3, row: 1 },
        { id: "qs", label: "SMS queue", kind: "queue", col: 3, row: 2 },
        { id: "wp", label: "Push worker", kind: "worker", col: 4, row: 0, sub: "×4" },
        { id: "we", label: "Email worker", kind: "worker", col: 4, row: 1, sub: "×4" },
        { id: "ws", label: "SMS worker", kind: "worker", col: 4, row: 2, sub: "×4" },
        { id: "redis", label: "Redis (dedupe)", kind: "cache", col: 5, row: 3 },
        { id: "prov", label: "FCM / SES / SMS", kind: "external", col: 5, row: 1 },
        { id: "dlq", label: "DLQ", kind: "queue", col: 4, row: 3 },
      ],
      edges: [
        { from: "client", to: "gw" }, { from: "gw", to: "svc" }, { from: "svc", to: "prefs" },
        { from: "svc", to: "qp", style: "async" }, { from: "svc", to: "qe", style: "async" }, { from: "svc", to: "qs", style: "async" },
        { from: "qp", to: "wp" }, { from: "qe", to: "we" }, { from: "qs", to: "ws" },
        { from: "wp", to: "prov" }, { from: "we", to: "prov" }, { from: "ws", to: "prov" },
        { from: "wp", to: "redis" }, { from: "we", to: "redis" }, { from: "ws", to: "redis" },
        { from: "ws", to: "dlq", style: "async" },
      ],
    },
    overrides: { dlq: { role: "dlq" }, client: { qps: 600, readRatio: 0.2 }, redis: { hitRatio: 0 }, prov: { perInstanceQps: 5_000 } },
  },
  {
    slug: "chat",
    title: "Real-time chat",
    brief: "Design 1:1 and group chat with delivery receipts, offline delivery and history.",
    requirements: ["Messages delivered in real time to online users", "Offline users get a push and catch up later", "Message history is durable", "Media attachments"],
    numbers: [["Messages", "~23K/s"], ["Concurrent sockets", "~10M"]],
    learn: "/questions/chat",
    rubric: [
      { id: "entry", points: 10, label: "Clients connect through a load balancer to WebSocket gateways", hint: "Use the API gateway kind for WS gateways.", test: (g) => g.pathThrough(["client", "lb", "gateway"]) },
      { id: "gw-ha", points: 15, label: "Several gateway instances", hint: "Replicas ≥ 2.", test: (g) => g.maxReplicas("gateway") >= 2 || g.count("gateway") >= 2 },
      { id: "pubsub", points: 20, label: "Gateways route messages through pub/sub", hint: "Users on different gateways must reach each other.", test: (g) => g.connected("gateway", "pubsub") },
      { id: "store", points: 15, label: "Messages are stored durably", hint: "Gateway → chat service → database.", test: (g) => g.pathThrough(["gateway", "database"]) },
      { id: "replica", points: 10, label: "The message store is replicated", hint: "Replicas ≥ 2.", test: (g) => g.maxReplicas("database") >= 2 },
      { id: "push", points: 20, label: "Offline users get push notifications", hint: "Something must call APNs/FCM (an external node).", test: (g) => g.pathThrough([["service", "worker"], "external"]) },
      { id: "media", points: 10, label: "Media goes to object storage", hint: "Add object storage (clients can upload with presigned URLs).", test: (g) => g.has("storage") },
    ],
    reference: {
      id: "ref-chat", title: "Chat", description: "",
      nodes: [
        { id: "client", label: "Apps", kind: "client", col: 0, row: 1 },
        { id: "lb", label: "Load balancer", kind: "lb", col: 1, row: 1 },
        { id: "gw", label: "WS gateway", kind: "gateway", col: 2, row: 1, sub: "×4" },
        { id: "ps", label: "Redis pub/sub", kind: "pubsub", col: 3, row: 0 },
        { id: "svc", label: "Chat service", kind: "service", col: 3, row: 1, sub: "×3" },
        { id: "db", label: "MongoDB", kind: "database", col: 4, row: 1, sub: "×3" },
        { id: "q", label: "Push queue", kind: "queue", col: 3, row: 2 },
        { id: "pw", label: "Push worker", kind: "worker", col: 4, row: 2, sub: "×2" },
        { id: "apns", label: "APNs / FCM", kind: "external", col: 5, row: 2 },
        { id: "s3", label: "Media storage", kind: "storage", col: 1, row: 3 },
        { id: "dlq", label: "Push DLQ", kind: "queue", col: 2, row: 3 },
      ],
      edges: [
        { from: "client", to: "lb" }, { from: "lb", to: "gw" }, { from: "gw", to: "ps", style: "async" }, { from: "gw", to: "svc" },
        { from: "svc", to: "db" }, { from: "svc", to: "q", style: "async" }, { from: "q", to: "pw" }, { from: "pw", to: "apns" },
        { from: "client", to: "s3" }, { from: "q", to: "dlq", style: "async" },
      ],
    },
    overrides: { client: { qps: 20_000, readRatio: 0.5 }, dlq: { role: "dlq" }, apns: { perInstanceQps: 10_000 } },
  },
  {
    slug: "news-feed",
    title: "News feed",
    brief: "Design a home feed for 300M daily users, including celebrities with millions of followers.",
    requirements: ["Feed loads in under 200 ms", "New posts reach followers within seconds", "Celebrity posts don't explode write cost", "Media served fast worldwide"],
    numbers: [["Feed reads", "~35K/s"], ["Posts", "~580/s"], ["Fan-out writes", "~116K/s"]],
    learn: "/questions/news-feed",
    rubric: [
      { id: "entry", points: 10, label: "Requests enter through a load balancer or gateway", hint: "Client → LB → service.", test: (g) => g.pathThrough(["client", ["lb", "gateway"], "service"]) },
      { id: "fanout", points: 20, label: "Fan-out happens asynchronously", hint: "Post service → queue → fan-out workers.", test: (g) => g.pathThrough(["service", "queue", "worker"]) },
      { id: "feedcache", points: 20, label: "Workers write precomputed feeds to a cache", hint: "Worker → Redis.", test: (g) => g.connected("worker", "cache") },
      { id: "read", points: 15, label: "The feed API reads the cache", hint: "Service → Redis.", test: (g) => g.connected("service", "cache") },
      { id: "replica", points: 10, label: "Posts are stored in a replicated database", hint: "Replicas ≥ 2.", test: (g) => g.maxReplicas("database") >= 2 },
      { id: "media", points: 15, label: "Media goes through a CDN backed by object storage", hint: "CDN → object storage.", test: (g) => g.connected("cdn", "storage") },
      { id: "scale", points: 10, label: "Services scale out", hint: "Replicas ≥ 2.", test: (g) => g.maxReplicas("service") >= 2 },
    ],
    reference: {
      id: "ref-feed", title: "News feed", description: "",
      nodes: [
        { id: "client", label: "Apps", kind: "client", col: 0, row: 1 },
        { id: "lb", label: "Load balancer", kind: "lb", col: 1, row: 1 },
        { id: "svc", label: "Feed / post API", kind: "service", col: 2, row: 1, sub: "×6" },
        { id: "pg", label: "Posts DB", kind: "database", col: 3, row: 2, sub: "×3" },
        { id: "q", label: "Fan-out queue", kind: "queue", col: 3, row: 0 },
        { id: "w", label: "Fan-out workers", kind: "worker", col: 4, row: 0, sub: "×20" },
        { id: "redis", label: "Feed cache", kind: "cache", col: 4, row: 1, sub: "×6" },
        { id: "cdn", label: "CDN", kind: "cdn", col: 1, row: 3 },
        { id: "s3", label: "Media storage", kind: "storage", col: 2, row: 3 },
        { id: "dlq", label: "Fan-out DLQ", kind: "queue", col: 5, row: 0 },
      ],
      edges: [
        { from: "client", to: "lb" }, { from: "lb", to: "svc" }, { from: "svc", to: "redis" }, { from: "svc", to: "pg" },
        { from: "svc", to: "q", style: "async" }, { from: "q", to: "w" }, { from: "w", to: "redis" }, { from: "w", to: "dlq", style: "async" },
        { from: "client", to: "cdn" }, { from: "cdn", to: "s3" },
      ],
    },
    overrides: { client: { qps: 35_000, readRatio: 0.98 }, dlq: { role: "dlq" }, redis: { hitRatio: 0.95 } },
  },
  {
    slug: "ticket-booking",
    title: "Ticket booking",
    brief: "Sell seats for a blockbuster launch without ever double-booking a seat.",
    requirements: ["Hold seats for 5 minutes while paying", "Never double-book", "Live seat maps", "Survive a launch-day spike"],
    numbers: [["Normal", "~4 bookings/s"], ["Launch", "500K users in minutes"]],
    learn: "/questions/movie-booking",
    rubric: [
      { id: "entry", points: 10, label: "Traffic enters through a load balancer or gateway", hint: "Client → LB → gateway → service.", test: (g) => g.pathThrough(["client", ["lb", "gateway"], "service"]) },
      { id: "admission", points: 20, label: "A waiting room admits users before booking", hint: "Gateway → Redis (admission tokens).", test: (g) => g.connected("gateway", "cache") },
      { id: "db", points: 15, label: "Seat holds happen in a relational database", hint: "Booking service → database (conditional UPDATE).", test: (g) => g.connected("service", "database") },
      { id: "replica", points: 10, label: "The database is replicated", hint: "Replicas ≥ 2.", test: (g) => g.maxReplicas("database") >= 2 },
      { id: "live", points: 15, label: "Seat changes are pushed live", hint: "Service → pub/sub.", test: (g) => g.connected("service", "pubsub") },
      { id: "pay", points: 15, label: "Payments go to an external provider", hint: "Service → external (mark the webhook back as async).", test: (g) => g.connected("service", "external") },
      { id: "cdn", points: 15, label: "Seat-map snapshots come from a CDN", hint: "Client → CDN.", test: (g) => g.pathThrough(["client", "cdn"]) },
    ],
    reference: {
      id: "ref-book", title: "Ticket booking", description: "",
      nodes: [
        { id: "client", label: "Fans", kind: "client", col: 0, row: 1 },
        { id: "cdn", label: "CDN", kind: "cdn", col: 1, row: 0 },
        { id: "lb", label: "Load balancer", kind: "lb", col: 1, row: 1 },
        { id: "gw", label: "Gateway", kind: "gateway", col: 2, row: 1, sub: "×3" },
        { id: "wr", label: "Waiting room", kind: "cache", col: 2, row: 2 },
        { id: "svc", label: "Booking service", kind: "service", col: 3, row: 1, sub: "×4" },
        { id: "pg", label: "Postgres", kind: "database", col: 4, row: 1, sub: "×2" },
        { id: "ps", label: "Seat updates", kind: "pubsub", col: 4, row: 0 },
        { id: "pay", label: "Payment provider", kind: "external", col: 4, row: 2 },
      ],
      edges: [
        { from: "client", to: "cdn" }, { from: "cdn", to: "lb" }, { from: "client", to: "lb" }, { from: "lb", to: "gw" },
        { from: "gw", to: "wr" }, { from: "gw", to: "svc" }, { from: "svc", to: "pg" }, { from: "svc", to: "ps", style: "async" },
        { from: "svc", to: "pay" }, { from: "pay", to: "svc", label: "webhook", style: "async" },
      ],
    },
    overrides: { client: { qps: 3_000, readRatio: 0.9 }, wr: { hitRatio: 0 } },
  },
];

export const getChallenge = (slug: string) => challenges.find((c) => c.slug === slug);
