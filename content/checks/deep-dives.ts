import type { PageChecks } from "./types";

export const checks: Record<string, PageChecks> = {
  "caching-techniques": {
    "races-the-delete-does-not-fix": {
      q: "A slow reader refills the old value after your delete. Which fix is exact?",
      options: ["A longer TTL", "Delete the key twice", "Fill only if the version is newer"],
      answer: 2,
      why: "A conditional fill rejects an older version outright. A TTL or a second delete only shrinks the stale window.",
    },
    "two-levels-of-cache": {
      q: "What bounds how stale an L1 copy can be?",
      options: ["The L1 TTL", "The Redis TTL", "The pub/sub channel"],
      answer: 0,
      why: "Pub/sub can drop a message, so the short L1 TTL is the longest wrong answer an instance can serve.",
    },
    "stampede-one-rebuild-many-waiters": {
      q: "50 instances use single flight; a hot key expires. How many rebuilds can run?",
      options: ["Exactly one", "Up to 50", "One per request"],
      answer: 1,
      why: "Single flight collapses misses inside one process only. A Redis lock across instances brings it down to one.",
    },
    "penetration-ids-that-do-not-exist": {
      q: "A Bloom filter says an id is not present. What should the app do?",
      options: ["Check Redis anyway", "Check the database anyway", "Answer not found at once"],
      answer: 2,
      why: "A Bloom filter never says no wrongly, so a no is final and skips both Redis and the database.",
    },
    "when-the-cache-dies-or-restarts": {
      q: "Redis restarts empty at 90% hit ratio. Database reads grow by how much?",
      options: ["About 2 times", "About 10 times", "No change"],
      answer: 1,
      why: "The database normally sees 10% of reads. With 0% hits it sees all of them, ten times as many.",
    },
    "caching-techniques-in-the-interview": {
      q: "Which write path do you propose first for a read-heavy product page?",
      options: ["Write-behind", "Cache-aside, delete on write", "Write-through with versions"],
      answer: 1,
      why: "Cache-aside with delete on write is the default: losing the cache only costs speed, and deletes cannot land out of order.",
    },
  },
  "sharding-strategies": {
    "sharding-in-the-interview": {
      q: "Which decision comes right after proving one primary is not enough?",
      options: ["Pick the hashing library", "Choose the shard key from the main query", "Add more read replicas"],
      answer: 1,
      why: "The key decides which queries stay on one shard and whether load spreads; the strategy and growth plan follow from it.",
    },
  },
  "choosing-a-data-store": {
    "stores-for-entities-and-transactions": {
      q: "Reviews grow without limit per product. Embed them in the product document?",
      options: ["Yes, always embed", "No, reference them separately", "Only in Redis"],
      answer: 1,
      why: "Unbounded children outgrow the 16 MB document cap, so they get their own collection with an index.",
    },
    "stores-for-volume-time-and-links": {
      q: "Why does a columnar store scan fast?",
      options: ["It reads only needed columns", "It keeps all rows in RAM", "It skips compression"],
      answer: 0,
      why: "A query touching 2 of 8 columns reads about a quarter of the bytes.",
    },
    "stores-for-finding-things-and-holding-files": {
      q: "Where do uploaded photo bytes go?",
      options: ["A Postgres column", "Object storage, key in Postgres", "Elasticsearch"],
      answer: 1,
      why: "Blobs bloat the database and its backups. Store the object in S3 and only its key in a row.",
    },
    "walking-the-tree-on-a-real-product": {
      q: "200K orders a day is about 2.3 writes a second. Store?",
      options: ["Cassandra", "Postgres", "DynamoDB"],
      answer: 1,
      why: "That rate is far below one primary's limit, and orders need transactions.",
    },
    "what-goes-wrong": {
      q: "Search index call fails after the order commits. What prevents drift?",
      options: ["Retry in the request", "An outbox with a retrying relay", "Index first, then commit"],
      answer: 1,
      why: "The outbox row commits with the order, so a relay can retry until the index catches up.",
    },
    "choosing-a-data-store-in-the-interview": {
      q: "What do you say before adding a second store?",
      options: ["The number that breaks Postgres", "The store's popularity", "Its logo and version"],
      answer: 0,
      why: "A second store must earn its place with a number such as writes per second or scan size.",
    },
  },
"polling-sse-websockets": {
  "scaling-the-connection-tier": {
    q: "1M sockets, 50K per node, 70% target load: how many nodes?",
    options: ["20", "About 29", "100"],
    answer: 1,
    why: "1M divided by 35K is about 29. At 100% load, one lost node pushes 52.6K sockets onto each survivor.",
  },
  "what-goes-wrong": {
    q: "50K clients retry after exactly 1 s. What fixes the storm?",
    options: ["A shorter delay", "Full jitter over a wide window", "More sticky sessions"],
    answer: 1,
    why: "A random wait spreads arrivals. Over 30 s, 50,000 reconnects become about 1,700 per second instead of 50,000.",
  },
  "real-time-delivery-in-the-interview": {
    q: "Which technique do you default to when 30 s of delay is fine?",
    options: ["WebSocket", "Short polling", "SSE"],
    answer: 1,
    why: "Polling needs no new infrastructure. Upgrade only when users notice the delay or the request arithmetic hurts.",
  },
},
"connections-pooling": {
  "what-goes-wrong-with-connections": {
    q: "A handler calls a slow API inside BEGIN and COMMIT. What suffers?",
    options: ["Only that one request", "Pool connection and row locks stay held", "The API retries automatically"],
    answer: 1,
    why: "The session sits idle in transaction, holding its connection and locks. Call the API outside the transaction.",
  },
  "connection-pooling-in-the-interview": {
    q: "Which comes first when sizing connection pools?",
    options: ["Add PgBouncer", "Instances times pool must fit the limit", "Raise max_connections"],
    answer: 1,
    why: "Size from the top: instances times pool size under max_connections minus headroom. Add a pooler only when that stops fitting.",
  },
},
"request-flows": {
  "retries-and-amplification": {
    q: "Three layers each retry 3 times. Attempts reaching the database?",
    options: ["9", "27", "6"],
    answer: 1,
    why: "Retries multiply across layers: 3 x 3 x 3 = 27. Retry in one layer, with jitter and a budget.",
  },
  "partial-failure-and-lost-replies": {
    q: "A charge times out with no reply. What should the API do?",
    options: ["Assume it failed and charge again", "Retry with the same idempotency key", "Refund the customer at once"],
    answer: 1,
    why: "A timeout means unknown, not failed. The same key makes the provider return the original result, never a second charge.",
  },
  "request-flows-in-the-interview": {
    q: "What do you say first when walking through a request?",
    options: ["Tune the Redis eviction policy", "Draw the outbox relay internals", "Which route each request takes"],
    answer: 2,
    why: "Name which requests are reads, writes, async jobs or payments first; each route then gets its own guarantees.",
  },
},
};
