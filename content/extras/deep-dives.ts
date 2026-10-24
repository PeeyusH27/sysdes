import type { PageExtras } from "./types";

export const extras: Record<string, PageExtras> = {
  "caching-techniques": {
    primer: "cache",
    detail: ["the-read-path-cache-aside", "the-write-path-update-then-delete", "six-patterns-compared", "races-the-delete-does-not-fix", "two-levels-of-cache", "stampede-one-rebuild-many-waiters", "penetration-ids-that-do-not-exist", "when-the-cache-dies-or-restarts", "code"],
    doodle: "cache",
    sayIt: {
      answer:
        "I default to cache-aside: read Redis first, and on a miss read the database and fill the key with a TTL. On a write I update the database and then delete the key rather than set it, since two concurrent writers can land cache writes in the opposite order. I switch to write-through or write-behind only when I need fresh reads or fast writes.",
      numbers: [
        { value: "~1 ms", label: "cache hit, one Redis round trip" },
        { value: "0.65%", label: "Bloom filter false positives, 100K keys in 1M bits" },
        { value: "80% of TTL", label: "when refresh-ahead triggers a background refresh" },
      ],
      tradeoffs: [
        "Cache-aside vs write-through: cache-aside is simple and only slower if Redis dies; write-through keeps reads fresh but writes cost double.",
        "Write-behind vs write-through: write-behind absorbs fast writes, but unflushed writes are lost if the cache dies.",
        "L1 in-process vs Redis only: L1 answers in microseconds and absorbs hot keys, but each instance holds its own copy, needing pub/sub invalidation.",
      ],
      mention:
        "Single flight only collapses misses within one process, so 50 app instances can still send 50 rebuilds; add a Redis lock across instances.",
    },
  },

  "sharding-strategies": {
    primer: "sharding",
    detail: ["choosing-the-shard-key", "strategies-compared", "consistent-hashing-interactively", "cross-shard-queries-and-transactions", "hot-keys", "resharding-without-downtime", "ids-across-shards", "code"],
    doodle: "shard",
    sayIt: {
      answer:
        "I shard last, only when writes or data size outgrow one primary after indexes, caching and replicas. The shard key matters most: high cardinality and matching the main query, usually user_id. I'd use consistent hashing with virtual nodes, so adding a node moves about 1 over N of the keys instead of nearly all of them.",
      numbers: [
        { value: "80% vs 20%", label: "keys moved 4 to 5 nodes: modulo vs ring" },
        { value: "16,384", label: "hash slots in Redis Cluster" },
        { value: "4,096/ms", label: "Snowflake ids per worker per millisecond" },
      ],
      tradeoffs: [
        "Hash vs range sharding: hash spreads evenly but loses range scans; range keeps scans cheap but timestamps and auto-increment ids make a hot shard.",
        "Directory vs hash: a lookup table lets you move one huge tenant alone, at the cost of an extra, cached lookup.",
        "Salting vs a plain key: salting spreads a hot key over N shards, but reads cost N times more, so salt only measured hot keys.",
      ],
      mention:
        "A query without the shard key becomes scatter-gather, where the slowest shard sets the latency, so keep those off hot paths.",
    },
  },

  "choosing-a-data-store": {
    primer: "sql-nosql",
    detail: ["pick-a-store-step-by-step", "stores-for-entities-and-transactions", "stores-for-volume-time-and-links", "stores-for-finding-things-and-holding-files", "walking-the-tree-on-a-real-product", "one-shop-many-stores", "stores-compared", "what-goes-wrong", "principles", "code"],
    doodle: "database",
    sayIt: {
      answer:
        "I start from the access pattern, not the product: how data is written, how it's read, and what must never go wrong. Anything transactional goes in Postgres. I add a specialised store, like Elasticsearch for text or ClickHouse for analytics, only when Postgres is the wrong shape, and feed it from the one source of truth through CDC or an outbox.",
      numbers: [
        { value: "6 stores", label: "in a typical shop, each owning different facts" },
        { value: "1 per fact", label: "source of truth; the rest are derived" },
        { value: "100M rows", label: "a dashboard scan that starves checkout" },
      ],
      tradeoffs: [
        "Postgres vs specialised store: Postgres gives transactions and joins but scales writes poorly; a specialised store fits one shape but is another system to run.",
        "Derived stores vs dual writes: CDC or an outbox keeps search and analytics rebuildable; writing both in one request means one write eventually fails.",
        "OLTP vs OLAP on one database: one database is simpler, but big scans starve checkout, so stream changes into a columnar store.",
      ],
      mention:
        "Never write the database and the search index in one request: one write will eventually fail and the stores drift apart.",
    },
  },

  "polling-sse-websockets": {
    primer: "realtime",
    detail: ["short-and-long-polling", "server-sent-events", "websockets", "scaling-the-connection-tier", "webhooks", "what-goes-wrong", "code"],
    doodle: "websocket",
    sayIt: {
      answer:
        "I pick by direction and frequency. Polling for a dashboard that can be seconds stale, SSE for one-way live updates like scores because it's plain HTTP and resumes with Last-Event-ID, and WebSockets when the client sends often too, like chat. Connections always drop, so I reconnect with jittered backoff and design for resume.",
      numbers: [
        { value: "20,000 req/s", label: "100K clients polling every 5 s" },
        { value: "~30 s", label: "WebSocket ping interval to catch dead peers" },
        { value: "~50K sockets", label: "per node; 1M needs about 20 to 29 nodes" },
      ],
      tradeoffs: [
        "Short polling vs SSE: polling is trivial but delay averages half the interval, with many empty requests; SSE is real time on one open stream.",
        "SSE vs WebSocket: SSE is plain HTTP with built-in reconnect but one-way and text only; WebSocket is two-way but stateful, with resume yours to write.",
        "Pub/sub backplane vs sticky sessions: publishing to user:bob lets any node reach any user and reconnects land anywhere, but you run the backplane.",
      ],
      mention:
        "Reconnecting on a fixed delay with no jitter: after a deploy drain, 50K clients return in the same second and flatten the other nodes.",
    },
  },

  "connections-pooling": {
    primer: "connection-pool",
    detail: ["try-it-the-handshake-tax", "pool-sizing", "pgbouncer", "keep-alive", "timeouts-and-deadlines", "concurrency-limits", "file-descriptors-and-ulimit", "graceful-shutdown", "http2-multiplexing-and-http3", "what-goes-wrong-with-connections", "code"],
    doodle: "database",
    sayIt: {
      answer:
        "Connections are expensive to open, so I reuse them: pool database connections and keep HTTP alive. The rule is that instances times pool size must stay under max_connections minus headroom, and past about twice the cores a bigger pool only adds contention. When instances multiply I add PgBouncer, and every call gets a timeout inside a propagated deadline.",
      numbers: [
        { value: "150 ms", label: "DNS, TCP, TLS 1.3 at 50 ms round trip" },
        { value: "15 per instance", label: "pool: 200 max, 20 reserved, 12 instances" },
        { value: "~17", label: "useful concurrent connections on 8 cores" },
      ],
      tradeoffs: [
        "Bigger pool vs smaller: a bigger pool absorbs bursts, but past the core count queries get slower from context switching and lock contention.",
        "Transaction vs session pooling: transaction mode multiplexes many clients onto few connections, but SET, LISTEN and temp tables don't survive between transactions.",
        "Fail fast vs wait: a 1 to 2 s pool-acquire timeout rejects some requests early, but stops a slow dependency tying up every slot.",
      ],
      mention:
        "Not releasing a checked-out client when a query throws leaks the pool until it runs dry, so always release in a finally block.",
    },
  },

  "request-flows": {
    detail: ["latency-budgets", "read-path", "write-path", "async-path", "failure-path", "retries-and-amplification", "idempotent-retries", "partial-failure-and-lost-replies", "trace-context-propagation", "code"],
    doodle: "api-gateway",
    sayIt: {
      answer:
        "I walk five flows. Read goes CDN, then cache, then database. Write validates, then commits the order and an outbox row in one transaction and answers 201. Async answers 202 and a worker finishes. Failure uses timeouts, a breaker and a fallback. Retries carry an idempotency key. Every request gets a latency budget, enforced by timeouts and a propagated deadline.",
      numbers: [
        { value: "2%", label: "reads reaching database at 80% CDN, 90% Redis hits" },
        { value: "200 ms", label: "example p99 budget, with 40 ms headroom" },
        { value: "9.6%", label: "page loads hitting a slow call of 10 parallel" },
      ],
      tradeoffs: [
        "Outbox vs publish after commit: the outbox needs a relay and delivers at least once, but a crash between save and publish loses nothing.",
        "Sync 201 vs async 202: 202 keeps slow work off the request, but the client must poll, get a webhook or listen over SSE.",
        "Retry vs fail fast: retries rescue transient failures, but only for idempotent calls with jitter and a small budget, or they amplify an outage.",
      ],
      mention:
        "Checking then claiming an idempotency key in two steps lets two concurrent requests both charge; claim it atomically with SET NX.",
    },
  },
};
