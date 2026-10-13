// Single source of truth for navigation, search, filters and the sitemap.
// Page bodies live next to this file: content/<section>/<dir>/page.mdx
// The DSA track has its own registry in content/dsa/registry.ts.
import { jsTopics, patterns } from "./dsa/registry";

export type Level = "Easy" | "Medium" | "Hard";
export type Category = "Frontend" | "Backend" | "Full-stack";

export interface LearnStep {
  slug: string;
  dir: string;
  order: number;
  title: string;
  short: string;
  summary: string;
  minutes: number;
  tags: string[];
  outcomes: string[];
  next: string;
}

export interface DeepDive {
  slug: string;
  dir: string;
  order: number;
  title: string;
  short: string;
  summary: string;
  minutes: number;
  tags: string[];
  next: string;
}

export interface Question {
  slug: string;
  order: number;
  title: string;
  category: Category;
  level: Level;
  summary: string;
  minutes: number;
  tags: string[];
  related: string[];
  challenge?: string;
}

export const learnSteps: LearnStep[] = [
  {
    slug: "requirements-estimation", dir: "01-requirements-estimation", order: 1,
    title: "Requirements and Estimation", short: "Requirements",
    summary: "Every design starts with what to build and how big it is. Numbers decide whether you need one server or fifty, a cache or a shard.",
    minutes: 25, tags: ["estimation", "requirements", "qps", "storage"],
    outcomes: ["Turn a vague prompt into functional and non-functional requirements", "Estimate QPS, storage, bandwidth, memory and servers in under 5 minutes"],
    next: "Once you know the load, you spread it across servers with a load balancer.",
  },
  {
    slug: "api-load-balancing", dir: "02-api-load-balancing", order: 2,
    title: "Client, API and Load Balancing", short: "API & load balancing",
    summary: "One server is a limit and a single point of failure. Stateless servers plus a balancer let you add capacity by adding machines.",
    minutes: 30, tags: ["load balancer", "rest", "api gateway", "idempotency", "pagination"],
    outcomes: ["Explain the request path from DNS to the database", "Choose an LB algorithm and a health-check strategy", "Design REST endpoints with correct status codes, cursor pagination and idempotency"],
    next: "All those servers share one data layer, which becomes the next bottleneck.",
  },
  {
    slug: "databases-scaling", dir: "03-databases-scaling", order: 3,
    title: "Databases and Scaling", short: "Databases",
    summary: "Data outlives servers and is the hardest part to scale. Choose storage by access pattern, then scale reads with replicas and writes with shards.",
    minutes: 35, tags: ["sql", "nosql", "indexes", "replication", "sharding", "isolation"],
    outcomes: ["Pick a store by access pattern and design indexes", "Explain isolation levels", "Scale reads with replicas, handle lag, and know when to shard"],
    next: "Even good databases are slow compared with memory, so we add a cache.",
  },
  {
    slug: "caching", dir: "04-caching", order: 4,
    title: "Caching", short: "Caching",
    summary: "Memory is about 50x faster than a database round trip. A cache with a high hit ratio cuts latency and protects the database.",
    minutes: 30, tags: ["cache", "redis", "ttl", "lru", "cdn", "http caching"],
    outcomes: ["Place caches at the right layer", "Pick a caching pattern and TTL", "Prevent stampede, penetration and avalanche", "Use HTTP caching headers"],
    next: "Not every task should block the request, so we move slow work to queues.",
  },
  {
    slug: "async-messaging", dir: "05-async-messaging", order: 5,
    title: "Async Processing and Messaging", short: "Queues & messaging",
    summary: "Slow or unreliable work (email, video, payments) should not hold the user's request. Queues absorb spikes and let work retry safely.",
    minutes: 35, tags: ["queues", "kafka", "idempotency", "dlq", "outbox", "backpressure"],
    outcomes: ["Decide what to make async", "Pick between a queue, pub/sub and a log", "Build idempotent consumers with retries and a DLQ", "Use the outbox to avoid dual writes"],
    next: "With many nodes and copies of data, you must decide how consistent they need to be.",
  },
  {
    slug: "consistency-cap", dir: "06-consistency-cap", order: 6,
    title: "Consistency and CAP", short: "Consistency & CAP",
    summary: "Copies of data on many machines can disagree, especially during network failures. You choose which guarantees to keep.",
    minutes: 35, tags: ["cap", "quorum", "consensus", "raft", "crdt", "locks"],
    outcomes: ["State CAP correctly and apply PACELC", "Choose a consistency level per feature", "Reason about quorums, conflicts, consensus and distributed locks"],
    next: "Failures will happen anyway, so design how the system behaves when they do.",
  },
  {
    slug: "reliability-observability", dir: "07-reliability-observability", order: 7,
    title: "Reliability and Observability", short: "Reliability",
    summary: "At scale something is always broken. Reliable systems contain failures, degrade gracefully, and make problems visible.",
    minutes: 35, tags: ["slo", "retries", "circuit breaker", "bulkhead", "observability", "tracing"],
    outcomes: ["Set SLOs and error budgets", "Apply timeouts, retries with jitter, circuit breakers and bulkheads", "Design for zone failure and instrument with logs, metrics and traces"],
    next: "Put it all together on a real problem, the URL shortener.",
  },
  {
    slug: "case-url-shortener", dir: "08-case-url-shortener", order: 8,
    title: "Case Study: URL Shortener", short: "URL shortener",
    summary: "A classic that exercises every earlier idea: estimation, ID generation, read-heavy caching, and storage.",
    minutes: 40, tags: ["case study", "base62", "id generation", "caching", "analytics"],
    outcomes: ["Run the full interview loop on a read-heavy system", "Choose an ID scheme, 301 vs 302, and an analytics pipeline"],
    next: "A second case study that is write-heavy and asynchronous.",
  },
  {
    slug: "case-notification-system", dir: "09-case-notification-system", order: 9,
    title: "Case Study: Notification System", short: "Notifications",
    summary: "Shows queues, fan-out, user preferences, deduplication, and external providers that fail.",
    minutes: 40, tags: ["case study", "fan-out", "queues", "dedupe", "providers"],
    outcomes: ["Design a multi-channel, prioritised, deduplicated pipeline", "Handle provider failover, user preferences and quiet hours"],
    next: "Last stop: how to present all of this under interview pressure.",
  },
  {
    slug: "interview-playbook", dir: "10-interview-playbook", order: 10,
    title: "Interview Playbook", short: "Playbook",
    summary: "Knowing the pieces is half the job. A repeatable structure shows seniority.",
    minutes: 20, tags: ["interview", "framework", "trade-offs", "practice"],
    outcomes: ["Run a 45-minute design interview with a repeatable structure", "Talk about trade-offs clearly", "Practise with a timer and a rubric"],
    next: "",
  },
];

export const deepDives: DeepDive[] = [
  {
    slug: "caching-techniques", dir: "01-caching-techniques", order: 1, title: "Caching Techniques", short: "Caching",
    summary: "A cache trades freshness and memory for speed. The technique you choose decides what happens when the cache is stale, cold, or down.",
    minutes: 20, tags: ["cache-aside", "write-through", "write-behind", "invalidation", "stampede"],
    next: "When one database can no longer hold or serve all the data, you shard it.",
  },
  {
    slug: "sharding-strategies", dir: "02-sharding-strategies", order: 2, title: "Sharding Strategies", short: "Sharding",
    summary: "Sharding splits data across machines so no single database limits storage or write throughput. The shard key you pick is the most important decision.",
    minutes: 20, tags: ["sharding", "consistent hashing", "rendezvous", "snowflake", "resharding"],
    next: "Next: choosing the right store for each kind of data.",
  },
  {
    slug: "choosing-a-data-store", dir: "03-choosing-a-data-store", order: 3, title: "Storing Data: Choosing the Right Store", short: "Storage",
    summary: "No single database is best at everything. Match each kind of data to the store whose strengths fit its access pattern, and keep one source of truth per fact.",
    minutes: 20, tags: ["postgres", "mongodb", "dynamodb", "cassandra", "s3", "elasticsearch"],
    next: "Next: how data reaches the client in real time.",
  },
  {
    slug: "polling-sse-websockets", dir: "04-polling-sse-websockets", order: 4, title: "Polling, SSE and WebSockets", short: "Real-time",
    summary: "HTTP is request and response, but users expect live updates. Each technique trades simplicity against latency and server cost.",
    minutes: 20, tags: ["polling", "long polling", "sse", "websockets", "webhooks"],
    next: "Rule of thumb: dashboards poll, notifications use SSE, chat uses WebSockets, provider events use webhooks.",
  },
  {
    slug: "connections-pooling", dir: "05-connections-pooling", order: 5, title: "Connections: Pooling, Keep-Alive and Limits", short: "Connections",
    summary: "Connections are expensive and limited. Most production outages from load come from exhausted pools, missing timeouts, or unbounded concurrency.",
    minutes: 20, tags: ["connection pool", "pgbouncer", "keep-alive", "timeouts", "graceful shutdown"],
    next: "Finally, see how reads, writes, async work, and failures flow end to end.",
  },
  {
    slug: "request-flows", dir: "06-request-flows", order: 6, title: "Request Flows End to End", short: "Request flows",
    summary: "Interviewers want to hear the path a request takes. Know the read, write, async, and failure flows and what each layer contributes.",
    minutes: 20, tags: ["read path", "write path", "outbox", "idempotency", "latency budget"],
    next: "",
  },
];

export const questions: Question[] = [
  {
    slug: "parking-lot", order: 1, title: "Design a Parking Lot (LLD)", category: "Backend", level: "Medium", minutes: 35,
    summary: "Model entities, relationships, and pricing so new vehicle types or rules never force a rewrite.",
    tags: ["lld", "oop", "strategy pattern", "concurrency"], related: ["/learn/databases-scaling"],
  },
  {
    slug: "elevator", order: 2, title: "Design an Elevator System (LLD)", category: "Backend", level: "Medium", minutes: 35,
    summary: "Model cars, floors and requests as a state machine, then pick a dispatch strategy that keeps waits short and never starves a floor.",
    tags: ["lld", "state machine", "scheduling", "strategy pattern", "concurrency"], related: ["/questions/parking-lot", "/questions/vending-machine"],
  },
  {
    slug: "vending-machine", order: 3, title: "Design a Vending Machine (LLD)", category: "Backend", level: "Easy", minutes: 25,
    summary: "A state machine in disguise: every coin, button press and refund has exactly one valid outcome in each state.",
    tags: ["lld", "state pattern", "oop", "inventory", "change making"], related: ["/questions/parking-lot", "/questions/elevator"],
  },
  {
    slug: "rate-limiter", order: 4, title: "Design a Rate Limiter", category: "Backend", level: "Medium", minutes: 35,
    summary: "Asked both as an algorithm question and as a distributed system question; be ready for either.",
    tags: ["redis", "lua", "token bucket", "gateway"], related: ["/learn/api-load-balancing", "/deep-dives/request-flows"], challenge: "rate-limiter",
  },
  {
    slug: "movie-booking", order: 5, title: "Design Movie Ticket Booking", category: "Backend", level: "Medium", minutes: 40,
    summary: "The core test is concurrency: two people must never buy the same seat.",
    tags: ["concurrency", "sql", "payments", "waiting room", "sse"], related: ["/learn/databases-scaling", "/learn/consistency-cap"], challenge: "ticket-booking",
  },
  {
    slug: "leaderboard", order: 6, title: "Design a Real-Time Leaderboard", category: "Backend", level: "Medium", minutes: 35,
    summary: "A sorted set makes rank queries O(log n). The interesting parts are ties, time windows, and boards too big for one node.",
    tags: ["redis", "sorted set", "ranking", "sharding", "caching"], related: ["/learn/caching", "/deep-dives/sharding-strategies"],
  },
  {
    slug: "payment-system", order: 7, title: "Design a Payment System", category: "Backend", level: "Hard", minutes: 45,
    summary: "Money must move exactly once. Idempotency keys, a double-entry ledger, provider webhooks and reconciliation keep every cent accounted for.",
    tags: ["idempotency", "ledger", "webhooks", "reconciliation", "sagas"], related: ["/learn/async-messaging", "/deep-dives/request-flows"],
  },
  {
    slug: "typeahead", order: 8, title: "Build an Autocomplete (Typeahead)", category: "Frontend", level: "Medium", minutes: 30,
    summary: "A frontend classic that tests debouncing, race conditions, caching, and accessibility.",
    tags: ["react", "debounce", "abortcontroller", "accessibility", "trie"], related: ["/learn/caching"],
  },
  {
    slug: "infinite-feed", order: 9, title: "Build an Infinite Scroll Feed", category: "Frontend", level: "Medium", minutes: 30,
    summary: "Tests performance thinking: pagination, virtualization, and state for very long lists.",
    tags: ["react", "virtualization", "pagination", "intersectionobserver"], related: ["/learn/api-load-balancing"],
  },
  {
    slug: "chat", order: 10, title: "Design a Real-Time Chat App", category: "Full-stack", level: "Hard", minutes: 45,
    summary: "A full-stack favorite: WebSockets and optimistic UI on the client, fan-out and storage on the server.",
    tags: ["websockets", "redis pub/sub", "ordering", "receipts", "react"], related: ["/deep-dives/polling-sse-websockets", "/learn/async-messaging"], challenge: "chat",
  },
  {
    slug: "news-feed", order: 11, title: "Design a News Feed (Twitter or Instagram)", category: "Full-stack", level: "Hard", minutes: 45,
    summary: "The key decision is fan-out on write versus fan-out on read, and how a React UI consumes the result.",
    tags: ["fan-out", "redis", "ranking", "caching", "react"], related: ["/learn/caching", "/learn/async-messaging"], challenge: "news-feed",
  },
  {
    slug: "ride-sharing", order: 12, title: "Design Uber (Ride Matching)", category: "Full-stack", level: "Hard", minutes: 45,
    summary: "Drivers report their location every few seconds. A geospatial index finds the nearest ones, and the matcher gives each ride to exactly one driver.",
    tags: ["geohash", "geospatial", "location updates", "matching", "websockets"], related: ["/deep-dives/polling-sse-websockets", "/deep-dives/sharding-strategies"],
  },
];

export const getLearnStep = (slug: string) => learnSteps.find((s) => s.slug === slug);
export const getDeepDive = (slug: string) => deepDives.find((d) => d.slug === slug);
export const getQuestion = (slug: string) => questions.find((q) => q.slug === slug);

export interface PageRef {
  href: string;
  title: string;
  section: "Learn" | "Deep dives" | "Questions" | "Reference" | "Patterns" | "JavaScript" | "Problems";
  summary: string;
  tags: string[];
  /** MDX file relative to content/ */
  file?: string;
}

export function allPages(): PageRef[] {
  return [
    ...learnSteps.map((s) => ({ href: `/learn/${s.slug}`, title: s.title, section: "Learn" as const, summary: s.summary, tags: s.tags, file: `learn/${s.dir}/page.mdx` })),
    ...deepDives.map((d) => ({ href: `/deep-dives/${d.slug}`, title: d.title, section: "Deep dives" as const, summary: d.summary, tags: d.tags, file: `deep-dives/${d.dir}/page.mdx` })),
    ...questions.map((q) => ({ href: `/questions/${q.slug}`, title: q.title, section: "Questions" as const, summary: q.summary, tags: q.tags, file: `questions/${q.slug}/page.mdx` })),
    { href: "/cheatsheet", title: "Cheatsheet", section: "Reference", summary: "Numbers to know, formulas and decision tables.", tags: ["numbers", "latency"], file: "cheatsheet.mdx" },
    { href: "/glossary", title: "Glossary", section: "Reference", summary: "System design terms in one line each.", tags: ["terms"] },
    { href: "/playground", title: "Playground", section: "Reference", summary: "Drag and drop an HLD diagram, lint it, simulate traffic and get graded.", tags: ["playground", "builder"] },
    ...patterns.map((p) => ({ href: `/dsa/patterns/${p.slug}`, title: p.title, section: "Patterns" as const, summary: p.summary, tags: [...p.signals, "dsa", "pattern"], file: `dsa/patterns/${p.dir}/page.mdx` })),
    ...jsTopics.map((t) => ({ href: `/dsa/js#${t.id}`, title: t.title, section: "JavaScript" as const, summary: t.summary, tags: ["javascript", "cheat sheet", t.group.toLowerCase()], file: `dsa/js/${t.file}.mdx` })),
  ];
}
