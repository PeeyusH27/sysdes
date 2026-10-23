// Every doodle on the site. A name here needs art in src/components/doodle/art/*.tsx (tests/doodle.test.ts checks it).
// The groups say which file draws them.

export const SYSTEM_DOODLES = [
  "cache", "load-balancer", "queue", "circuit-breaker", "cdn", "database", "replica", "shard", "rate-limiter", "websocket",
  "pubsub", "idempotency", "consistent-hash", "bloom-filter", "index", "backoff", "monitoring", "api-gateway", "cap", "microservices",
  "connection-pool", "sql-nosql",
] as const;

export const LLD_DOODLES = ["state-machine", "strategy", "observer", "decorator", "undo", "factory", "solid", "singleton"] as const;

export const DSA_DOODLES = ["two-pointers", "sliding-window", "binary-search", "hash-map", "stack", "tree", "graph", "dp-table", "heap", "linked-list", "trie", "backtracking"] as const;

export const DOODLE_NAMES = [...SYSTEM_DOODLES, ...LLD_DOODLES, ...DSA_DOODLES] as const;
export type DoodleName = (typeof DOODLE_NAMES)[number];
