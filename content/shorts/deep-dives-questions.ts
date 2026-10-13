import type { Short } from "./types";

// Shorts for the deep dives (content/deep-dives) and interview questions (content/questions).
export const shorts: Short[] = [
  // ── Deep dive: Caching techniques ──────────────────────────────────────────
  {
    id: "cache-write-patterns",
    track: "System design",
    topic: "Caching",
    title: "Pick a caching pattern by what happens when the cache dies",
    hook: "Every caching pattern answers one question differently: who keeps the copy in sync with the database, and when?",
    points: [
      "**Cache-aside** is the default: simple, works with any store, and losing Redis only costs latency.",
      "**Write-through** writes the database and the cache together. Reads are always fresh; writes cost double.",
      "**Write-behind** writes the cache now and the database later in batches. Very fast, but a crash **loses unflushed writes**.",
      "**Write-around** writes only the database, so write-once, rarely read data never pollutes the cache.",
    ],
    more: [
      {
        title: "How to pick",
        points: [
          "Users must see their own write immediately? **Write-through**, or delete the key and read your own write from the primary.",
          "The database can't keep up with writes and losing a few seconds is fine? **Write-behind**, for view counters and analytics.",
          "Audit logs and old orders: **write-around**. A handful of very hot keys whose misses hurt: **refresh-ahead**.",
        ],
      },
      {
        title: "Watch out",
        points: [
          "Never use write-behind for **money or orders**. Flushing on shutdown shrinks the loss window, but a crash still loses the buffer.",
          "**Read-through** behaves like cache-aside. The difference is who runs the miss path: the cache's loader, not your code.",
        ],
      },
    ],
    say: "I'd start with cache-aside, delete-on-write and a TTL, because losing the cache only costs latency. Write-through if users must read their own writes; write-behind only for counters where losing seconds is fine.",
    source: "/deep-dives/caching-techniques#six-patterns-compared",
  },
  {
    id: "two-level-cache-l1-l2",
    track: "System design",
    topic: "Caching",
    title: "An in-process cache answers in microseconds, but 50 copies go stale",
    hook: "A map inside each app instance absorbs hot keys before they reach Redis. The catch: every instance holds its own copy to invalidate.",
    points: [
      "**L1** is an in-process map in front of **L2**, the shared Redis. L1 answers in microseconds; a Redis hit costs about 1 ms.",
      "Every instance holds its own L1 copy, so a write must **fan out invalidations** to all of them over pub/sub.",
      "Pub/sub is fire-and-forget: an instance that misses a message keeps its **stale copy** until the L1 TTL.",
      "So keep **L1 TTLs short**, or use L1 only for data that tolerates seconds of staleness.",
    ],
    more: [
      {
        title: "Watch out",
        points: [
          "An in-process cache with **no TTL**, trusting pub/sub alone, is a classic mistake.",
          "**Single flight** collapses concurrent misses inside one process only. With 50 instances, up to 50 rebuilds can still hit the database.",
          "Across instances, combine single flight with a Redis `SET lock NX`.",
        ],
      },
      {
        title: "Only when you've measured",
        points: [
          "**Refresh-ahead**: once 80% of a key's TTL has passed, the next read refreshes it in the background, so a hot key never expires.",
          "**Bloom filter**: a set of every real id that answers \"definitely not present\" in memory, so lookups for missing ids stop early.",
          "A Bloom filter with 100K keys in 1M bits measured about **0.65%** false positives and zero false negatives.",
        ],
      },
    ],
    code: `async function get(key, load) {
  const e = l1.get(key);
  if (e && e.exp > Date.now()) return e.value;  // L1: microseconds
  const cached = await redis.get(key);          // L2: about 1 ms
  const value = cached ? JSON.parse(cached) : await load(key);
  if (!cached) await redis.set(key, JSON.stringify(value), 'EX', 300);
  l1.set(key, { value, exp: Date.now() + 5000 }); // short L1 TTL
  return value;
}`,
    say: "I'd add an in-process L1 in front of Redis only for hot keys, publish invalidations over pub/sub, and keep the L1 TTL short, because pub/sub is fire-and-forget and a missed message leaves a stale copy.",
    source: "/deep-dives/caching-techniques#two-level-cache-l1--l2",
  },

  // ── Deep dive: Sharding strategies ─────────────────────────────────────────
  {
    id: "consistent-hashing-ring",
    track: "System design",
    topic: "Sharding",
    title: "Add a fifth node and hash % N moves 80% of your keys",
    hook: "For a cache, that's an 80% miss storm. Consistent hashing moves only the new node's share: about 20%.",
    points: [
      "With `hash % N`, a key stays put only if `hash mod N` equals `hash mod (N+1)`, so **N/(N+1)** of all keys move.",
      "**Consistent hashing** puts nodes and keys on one circle. A key belongs to the first node clockwise.",
      "Add a node and only its neighbours' keys move: about **1/(N+1)** of the total, all of them to the new node.",
      "Give each node many **virtual nodes** so the arcs, and the load, even out.",
    ],
    more: [
      {
        title: "Why virtual nodes",
        points: [
          "With one point per node the arcs differ a lot, so one node can own **twice its fair share**.",
          "When a node fails, its keys spread across **many survivors** instead of doubling one neighbour's load.",
          "In a test with 20K keys, adding a 5th node moves **19%** of them, every one to the new node.",
        ],
      },
      {
        title: "Alternatives",
        points: [
          "**Rendezvous hashing**: each key scores every node and picks the highest. No ring, fine for tens of nodes.",
          "**Fixed logical partitions**: `hash % 1024` never changes, and you move whole partitions. Redis Cluster has 16,384 slots.",
        ],
      },
    ],
    code: `function nodeFor(ring, key) {     // ring: [{ pos, node }], sorted
  const h = hash(key);
  let lo = 0, hi = ring.length;
  while (lo < hi) {                   // first point at or after h
    const mid = (lo + hi) >> 1;
    if (ring[mid].pos < h) lo = mid + 1; else hi = mid;
  }
  return ring[lo % ring.length].node; // wrap around the ring
}`,
    say: "I'd avoid hash mod N for a cluster that will grow: going from 4 to 5 nodes moves 80% of keys. Consistent hashing with virtual nodes moves about 1/N and spreads a failed node's load across many survivors.",
    source: "/deep-dives/sharding-strategies#consistent-hashing-interactively",
  },
  {
    id: "shard-key-choice",
    track: "System design",
    topic: "Sharding",
    title: "The shard key matters more than the sharding algorithm",
    hook: "It decides which queries stay on one shard and whether the load spreads evenly. Pick it from your main query.",
    points: [
      "**High cardinality**: `country` has about 200 values, so you can never have more than 200 useful shards.",
      "**Even spread**: no single value should own a large share of rows or traffic.",
      "**Match the dominant query**: if most queries are \"this user's orders\", shard by `user_id` so they hit one shard.",
      "**No hot ranges**: range-shard on a timestamp or auto-increment id and every new write lands on the newest shard.",
      "When one key can't serve two big access patterns, **store the data twice**: orders by buyer and by seller.",
    ],
    more: [
      {
        title: "Queries without the key",
        points: [
          "They must ask every shard. **Scatter-gather** is fine for admin and reporting; its latency is the slowest shard's.",
          "A **global secondary index** (`email → user_id`) points other lookups at the right shard.",
          "Keep data that changes together on **one shard**. When a workflow must span shards, use a **saga** with compensating actions.",
        ],
      },
      {
        title: "Hot keys",
        points: [
          "A good key can still have one hot value. **Salt** it: write to a random sub-key (`likes:42:0` … `likes:42:15`), sum on read.",
          "Reads get N times more expensive, so salt only the keys you've **measured** as hot.",
        ],
      },
      {
        title: "Usual answers",
        points: [
          "`user_id`, or `tenant_id` in SaaS, with a **directory** so the few huge tenants can get their own shards.",
          "Time series: **hash by sensor** and keep time as the sort key inside each shard, or use `(sensor_id, day)`.",
        ],
      },
    ],
    say: "I'd shard by user_id: the dominant query is per user, it has high cardinality, and it doesn't grow monotonically. Cross-user queries go to scatter-gather or a global secondary index, off the hot path.",
    source: "/deep-dives/sharding-strategies#choosing-the-shard-key",
  },

  // ── Deep dive: Choosing a data store ───────────────────────────────────────
  {
    id: "store-by-access-pattern",
    track: "System design",
    topic: "Storage",
    title: "Choose the database from the access pattern, not the product",
    hook: "No store is best at everything. Three questions about each kind of data pick the store, and most products end with Postgres.",
    points: [
      "**Writes**: how many per second, single-row or multi-row, and must they be atomic?",
      "**Reads**: by key, by range, by text, or aggregated over millions of rows?",
      "**Correctness**: is a lost or stale value an annoyance, like a view count, or a bug, like a balance?",
      "Ask about **transactions first**: they are the hardest property to add later. Default to Postgres for anything transactional.",
    ],
    more: [
      {
        title: "Principles",
        points: [
          "In key-value and wide-column stores **the key is the query**: a new access pattern needs a new table or index.",
          "**One source of truth per fact.** Search, analytics and caches are fed by CDC or the outbox, and can always be rebuilt.",
          "**OLTP and OLAP don't share a database**: a dashboard scanning 100M rows starves checkout on the same primary.",
          "**Boring by default**: every extra store is another thing to back up, monitor, secure and wake up for.",
        ],
      },
      {
        title: "Watch out",
        points: [
          "Never write to the database **and** the search index from the same request: one of the two writes will eventually fail.",
          "Don't choose a NoSQL store \"for scale\" before you know the **access patterns**.",
        ],
      },
    ],
    say: "I start from the access pattern: how data is written, how it's read, and what must never go wrong. Transactional data goes in Postgres; I add search, object storage or analytics only where Postgres is the wrong shape.",
    source: "/deep-dives/choosing-a-data-store#why-one-database-isnt-enough",
  },
  {
    id: "polyglot-store-map",
    track: "System design",
    topic: "Storage",
    title: "Money in Postgres, videos in S3, search in Elasticsearch",
    hook: "At scale you end up with several stores, each strong at one access pattern and weak at others. Match each kind of data to a strength.",
    points: [
      "**Relational** (Postgres): money, orders, users. Transactions, constraints, joins and ad-hoc queries.",
      "**Key-value** (Redis, DynamoDB): sessions, counters and single-key lookups at huge scale. No queries except by key.",
      "**Wide-column** (Cassandra): write-heavy, time-ordered data such as chat messages, partitioned by conversation.",
      "**Object storage** (S3): images and video. Keep only the key in your database; clients upload with **presigned URLs**.",
      "**Search** (Elasticsearch) and **columnar** (ClickHouse) stores are derived: fed from the change stream, never the source of truth.",
    ],
    more: [
      {
        title: "Why not blobs in Postgres",
        points: [
          "Large blobs bloat the database, backups and replication, and you **can't serve them from a CDN**.",
        ],
      },
      {
        title: "DynamoDB or Postgres",
        points: [
          "DynamoDB when access patterns are **few, known and key-based** and scale is large or spiky: carts, sessions, device state.",
          "Not when you need joins, ad-hoc reporting or **multi-entity invariants**.",
          "A composite key (`pk = USER#42`, `sk = ORDER#…`) turns \"latest orders for a user\" into **one range read**.",
        ],
      },
      {
        title: "Derived stores",
        points: [
          "Lose or corrupt Elasticsearch or ClickHouse and you **rebuild** it by replaying Kafka or re-snapshotting the source.",
          "Keep Elasticsearch in sync with **CDC** (Debezium) or the outbox, and an indexer that consumes changes idempotently.",
        ],
      },
    ],
    say: "Orders and payments go in Postgres for transactions, media in S3 with presigned uploads, sessions in Redis. Search and analytics are fed from the change stream, so I can rebuild them if they break.",
    source: "/deep-dives/choosing-a-data-store#stores-compared",
  },

  // ── Deep dive: Polling, SSE and WebSockets ─────────────────────────────────
  {
    id: "realtime-transport-choice",
    track: "System design",
    topic: "Real-time",
    title: "Dashboards poll, feeds use SSE, chat uses WebSockets",
    hook: "HTTP is request and response, but live updates need the server to speak first. Each workaround trades simplicity against latency and cost.",
    points: [
      "**Short polling** is a timer and a `fetch`: fine for a dashboard that can be a few seconds stale.",
      "**SSE** streams one-way events over plain HTTP. `EventSource` reconnects by itself and resumes with `Last-Event-ID`.",
      "**WebSockets** when the client talks back often: chat, games, collaboration. The price is **state** on the server.",
      "**Webhooks** for server-to-server events: the provider `POST`s to your endpoint and retries until you answer `2xx`.",
      "Whatever you pick, reconnect with **jittered backoff** and design for resume, because connections always drop.",
    ],
    more: [
      {
        title: "Numbers to know",
        points: [
          "100K clients polling every 5 s is **20,000 requests per second**, most of which return nothing.",
          "Short polling's delay averages about **half the interval**.",
          "A request with cookies often carries **500 bytes to 2 KB** of headers; a WebSocket frame header is 2 to 14 bytes.",
        ],
      },
      {
        title: "SSE gotchas",
        points: [
          "Over HTTP/1.1 browsers allow about **6 connections per origin**, so a seventh SSE tab hangs. Serve SSE over HTTP/2.",
          "Some proxies **buffer** the stream. Send `X-Accel-Buffering: no` for nginx and a `: ping` comment every 15 s.",
        ],
      },
      {
        title: "Polling done right",
        points: [
          "Schedule the next poll **after** the reply, not with `setInterval`, pause hidden tabs, and answer unchanged data with `304`.",
        ],
      },
    ],
    say: "For live scores I'd use SSE: the updates are one-way, EventSource reconnects and resumes with Last-Event-ID, and it's plain HTTP. Chat needs WebSockets because the client sends often too.",
    source: "/deep-dives/polling-sse-websockets#side-by-side",
  },
  {
    id: "scaling-websockets-pubsub",
    track: "System design",
    topic: "Real-time",
    title: "Alice is on node 1, Bob on node 2: how does her message reach him?",
    hook: "Each WebSocket lives on one server, so running more than one node means routing messages, finding dead peers and deploying without a herd.",
    points: [
      "A **pub/sub backplane** routes messages: node 1 publishes to `user:bob`, and whichever node holds Bob's socket delivers it.",
      "When every message goes through pub/sub, you need **no sticky sessions**: a reconnect can land on any node.",
      "**Heartbeats** find dead peers, which are silent: ping every ~30 s and terminate sockets that miss a pong.",
      "Every socket is a **file descriptor**, and the default soft limit is often 1,024. Raise `ulimit -n`; after that, memory is the limit.",
    ],
    more: [
      {
        title: "Deploying without a herd",
        points: [
          "Fail readiness and send close code `1001` (going away), so clients reconnect to other nodes.",
          "Clients wait a random **full-jitter** delay, or 50K of them come back in the same second and knock over the rest.",
        ],
      },
      {
        title: "Numbers to know",
        points: [
          "One Node process holds **tens of thousands** of idle sockets. At ~50K per node, 1M sockets is 20 nodes plus headroom.",
          "Stay under load balancer idle timeouts: **60 s** by default on AWS ALB.",
        ],
      },
      {
        title: "Authenticating sockets",
        points: [
          "Browsers can't set `Authorization` on a WebSocket, so authenticate the **connect**: a cookie, or a short-lived token in the first message.",
          "With a cookie, check the `Origin` header, or any website could open a socket as your user.",
        ],
      },
    ],
    code: `// Full jitter: a random wait between 0 and a growing cap
function backoffDelay(attempt, baseMs = 1000, capMs = 30000) {
  return Math.random() * Math.min(capMs, baseMs * 2 ** attempt);
}`,
    say: "Gateways only hold sockets. Messages go through Redis pub/sub to whichever node holds the recipient, so no sticky sessions. I'd heartbeat every 30 seconds and drain on deploy while clients reconnect with full jitter.",
    source: "/deep-dives/polling-sse-websockets#scaling-websockets",
  },

  // ── Deep dive: Connections and pooling ─────────────────────────────────────
  {
    id: "pool-size-total",
    track: "System design",
    topic: "Connections",
    title: "Go from 10 to 30 app instances and Postgres refuses connections",
    hook: "Every instance opens its own pool, so autoscaling multiplies connections until the total blows past `max_connections`.",
    points: [
      "Size pools from the **total**: instances × pool size ≤ `max_connections` − headroom for admin, migrations and cron.",
      "200 max, 20 reserved and 12 instances gives a pool of **15** per instance: (200 − 20) ÷ 12.",
      "**Little's law** checks it's big enough: 1,000 queries/s × 5 ms = 5 busy connections on average.",
      "A **bigger pool** isn't faster: past the database's cores, extra connections add context switching and lock contention.",
      "For connections doing useful work at once, the heuristic is `(cores × 2) + effective spindles`: about **17** on 8 cores.",
    ],
    more: [
      {
        title: "When instances multiply",
        points: [
          "Put **PgBouncer** in transaction mode in front: apps open many cheap connections, the database sees only a few dozen.",
          "Transaction mode drops **session state** between transactions: use `SET LOCAL`, not `SET`, and avoid `LISTEN` and temp tables.",
        ],
      },
      {
        title: "Three timeouts per pool",
        points: [
          "An **acquire** timeout (about 2 s, then fail fast), an **idle** timeout, and a server-side `statement_timeout` for runaway queries.",
        ],
      },
      {
        title: "Why connections cost",
        points: [
          "Every PostgreSQL connection is a **separate process** using a few MB, and `max_connections` defaults to 100.",
          "At a 50 ms round trip, DNS, TCP and TLS cost about **150 ms** before you've asked anything.",
        ],
      },
    ],
    say: "Each instance opens its own pool, so I size it top down: max_connections minus headroom, divided by instances at maximum autoscale. Little's law checks it's big enough, and PgBouncer takes over when instances multiply.",
    source: "/deep-dives/connections-pooling#pool-sizing",
  },
  {
    id: "keep-alive-handshake-tax",
    track: "System design",
    topic: "Connections",
    title: "Without keep-alive, you run out of ports at ~470 connections a second",
    hook: "Every new connection pays handshakes before the first byte, and every closed one holds a port for a minute. Reuse them.",
    points: [
      "A cold HTTPS request pays DNS, TCP, TLS 1.3 and the request: about **4 round trips**. On a kept-alive connection it's 1.",
      "Without keep-alive, every closed outgoing connection sits in `TIME_WAIT` for **60 s** on Linux.",
      "The default ephemeral range has 28,232 ports: about **470 new connections per second** to one destination, then `connect` fails.",
      "Node's `fetch` (undici) keeps connections alive by default, and since **Node 19** so does the default HTTP agent.",
      "Keep the server's keep-alive timeout **longer** than the load balancer's, or the LB reuses a closing socket and users get a 502.",
    ],
    more: [
      {
        title: "The 502 race",
        points: [
          "Node's default keep-alive timeout is **5 s**; AWS ALB's idle timeout is **60 s**. Set the server's above the LB's.",
        ],
      },
      {
        title: "HTTP/2 and HTTP/3",
        points: [
          "**HTTP/2** runs many concurrent streams over one connection, but one lost TCP packet stalls every stream.",
          "**HTTP/3** runs over QUIC: independent streams, combined handshakes, and it survives a switch from Wi-Fi to mobile data.",
          "gRPC keeps one long-lived HTTP/2 connection, so behind a **layer-4** balancer all of a client's traffic lands on one backend.",
        ],
      },
    ],
    code: `// Behind a load balancer, keep idle sockets open LONGER than it does
// (AWS ALB: 60 s), or Node closes one as the LB reuses it: a 502.
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;   // keep above keepAliveTimeout`,
    say: "I'd reuse connections everywhere: keep-alive turns four round trips into one and avoids running out of ephemeral ports. And the server's idle timeout must be longer than the load balancer's, or users see 502s.",
    source: "/deep-dives/connections-pooling#keep-alive",
  },

  // ── Deep dive: Request flows ───────────────────────────────────────────────
  {
    id: "latency-budget-tail",
    track: "System design",
    topic: "Request flows",
    title: "Ten parallel calls at 1% slow each make 10% of page loads slow",
    hook: "Tail latency compounds across hops. Split the user-facing p99 into a budget per hop, and enforce each one with a timeout.",
    points: [
      "Start from the user-facing **p99 target** and split it across the hops on the critical path, keeping headroom.",
      "A 200 ms API budget might give the database 50 ms, a downstream service 45 ms, Redis 5 ms, and keep **40 ms of headroom**.",
      "Slow calls compound: 1 − 0.99¹⁰ ≈ 9.6%, so **per-hop budgets** must be tighter than the page's.",
      "Enforce each budget with **per-call timeouts** and deadline propagation, and watch per-hop p99s on a tracing dashboard.",
    ],
    more: [
      {
        title: "Numbers to know",
        points: [
          "With an 80% CDN hit ratio and a 90% Redis hit ratio, only **2%** of reads reach the database.",
          "Headroom pays for what you can't plan: retries, **GC pauses** and noisy neighbours.",
        ],
      },
      {
        title: "Finding the slow hop",
        points: [
          "Propagate the W3C `traceparent` header everywhere, pull the slowest traces, and the **widest span** is the culprit.",
          "**Tail-based sampling** keeps the slowest traces, which are the ones you need.",
          "Put the trace id in every log line, and copy the header into queue messages so **async consumers** join the trace.",
        ],
      },
    ],
    say: "I start from the p99 target, say 200 ms, and give each hop on the critical path a budget with headroom. Timeouts and deadline propagation enforce it, and tracing shows which hop blows it.",
    source: "/deep-dives/request-flows#latency-budgets",
  },
  {
    id: "async-202-accepted",
    track: "System design",
    topic: "Request flows",
    title: "Slow work leaves the request: answer 202 and hand back a status URL",
    hook: "Reports, video encoding and bulk imports don't fit in a request. Enqueue a job, answer at once, and let the client find out later.",
    points: [
      "Anything slower than **a second or two** leaves the request: the API enqueues a job and returns straight away.",
      "The API answers `202 Accepted` with a `Location` header pointing at a **status resource**.",
      "The client **polls** that URL, ideally guided by a `Retry-After` header, or gets pushed the result.",
      "Push with a **webhook** for server-to-server APIs, or SSE or a WebSocket for a browser that's still open.",
      "Workers retry failed jobs with exponential backoff; jobs that keep failing land in a **dead letter queue**.",
    ],
    more: [
      {
        title: "Watch out",
        points: [
          "A job can run **twice**, so make it idempotent.",
          "The dead letter queue is for **a human to inspect**: failed jobs stay visible instead of retrying forever.",
        ],
      },
      {
        title: "Where it fits",
        points: [
          "Read answers 200, write answers **201** after the commit, async answers **202**: the risky part is the worker, not the request.",
        ],
      },
    ],
    code: `app.post('/reports', async (req, res) => {
  const job = await reports.add('build', req.body, {
    attempts: 3, backoff: { type: 'exponential', delay: 5000 },
  });
  res.status(202)
    .location('/reports/' + job.id)   // the status resource
    .json({ jobId: job.id });
});`,
    say: "Anything slower than a second or two becomes a job: I return 202 with a Location for its status, workers retry with backoff and park failures in a dead letter queue, and the client polls or gets pushed the result.",
    source: "/deep-dives/request-flows#async-path",
  },

  // ── Question: Parking lot ──────────────────────────────────────────────────
  {
    id: "parking-spot-allocation",
    track: "System design",
    topic: "Parking lot",
    title: "Two gates, one free spot: the real test in the parking lot question",
    hook: "One small process could run the whole lot, so scale isn't the problem. Never handing out the same spot twice is.",
    points: [
      "Each floor keeps a **free set** per spot type: a spot is free exactly when it's in its set, so allocation never scans.",
      "`FITS` lists the spot types each vehicle may use, **smallest first**, so a bike tries bike spots before large ones.",
      "In one Node process, `take()` runs to completion without interleaving, so allocation is **atomic for free**.",
      "With several gate servers, one SQL statement **picks and locks** a free row with `FOR UPDATE SKIP LOCKED`.",
      "Insert the ticket in the **same transaction**, so a crash can't leave a taken spot with no ticket.",
    ],
    more: [
      {
        title: "The classes",
        points: [
          "**ParkingLot → Floor → Spot**, plus thin `Vehicle` and `Ticket` classes. Fewer, sharper classes score better.",
          "Pricing is a **strategy** with one method, `fee(durationMs, vehicle)`. A daily cap or peak hours is a **decorator** around it.",
          "Display boards are **observers**: the lot emits `changed(floor)` after every park and exit, and doesn't know boards exist.",
        ],
      },
      {
        title: "Extending it",
        points: [
          "EV charging is a spot **feature**, a selector filter and an `EnergyFee` decorator. No existing class changes.",
          "A new vehicle type is a new enum value plus its row in `FITS`.",
        ],
      },
    ],
    code: `const { rows } = await db.query(\`
  UPDATE spots SET ticket_id = $1, taken_at = now()
  WHERE id = (SELECT id FROM spots
              WHERE lot_id = $2 AND type = ANY($3)
                AND ticket_id IS NULL
              ORDER BY array_position($3, type), floor, id
              LIMIT 1 FOR UPDATE SKIP LOCKED)
  RETURNING id, floor\`, [ticketId, lotId, fits]);`,
    say: "In one process the event loop makes take() atomic. With several gate servers, the database picks and locks a free spot in one UPDATE with SKIP LOCKED, and the ticket insert shares that transaction.",
    source: "/questions/parking-lot#step-by-step-answer",
  },

  // ── Question: Vending machine ──────────────────────────────────────────────
  {
    id: "vending-machine-state-table",
    track: "System design",
    topic: "Vending machine",
    title: "A vending machine is a state machine: one outcome per event",
    hook: "Every coin, button press and sensor signal needs exactly one outcome in each state, or the machine gives away colas or eats dollars.",
    points: [
      "Four states: **Idle**, **HasMoney**, **Dispensing**, **OutOfService**. Sold out belongs to a slot, not to the machine.",
      "Write a **transition table**: rows are states, columns are events, and every cell has one outcome.",
      "An event a state doesn't list is **rejected and changes nothing**. A refused coin drops straight to the cup.",
      "Dispensing is a real state: it waits for the drop sensor, so coins, selects and cancels are all refused.",
      "Every input goes through **one queue**, handled one event at a time.",
    ],
    more: [
      {
        title: "State objects",
        points: [
          "Each state is an object mapping event names to handlers that return the next state.",
          "Rejections happen **before** any mutation, so a rejected event can't half-apply.",
          "A test loops over all 32 (state, event) pairs: 13 are accepted, and the other 19 must leave everything unchanged.",
        ],
      },
      {
        title: "Watch out",
        points: [
          "A `SoldOutState` would stop the other 29 slots selling. SOLD OUT is a message in HasMoney; the credit stays.",
          "Nested `if/else` hides missing cases. A table shows them, and rejects them by default.",
        ],
      },
    ],
    code: `hasMoney: {
  coin: (m, { coin }) => { m.escrow.push(coin); return 'hasMoney'; },
  cancel: m => { m.refund('cancelled'); return 'idle'; },
  // select: sold out or short -> rejected; no change -> refund
},
dispensing: {                       // only the drop sensor gets in
  dropped: m => { m.commit(); return 'idle'; },
  dropFailed: m => { m.refund('nothing dropped'); return 'idle'; },
},`,
    say: "This is a state machine: Idle, HasMoney, Dispensing, OutOfService. I'd write the transition table first; any event a state doesn't list is rejected and changes neither money nor stock.",
    source: "/questions/vending-machine#state-transition-table",
  },
  {
    id: "vending-machine-change-making",
    track: "System design",
    topic: "Vending machine",
    title: "Greedy change-making fails when the coin tubes run low",
    hook: "Largest coin first is optimal with unlimited coins. A real machine has a handful per tube, and greedy never backtracks.",
    points: [
      "Owe 30¢ from one 25¢ and three 10¢: greedy takes the 25¢, then needs a 5¢ that isn't there.",
      "A **bounded DP** over the coins actually in the tubes finds 10¢ + 10¢ + 10¢, with the fewest coins.",
      "Count the escrow too: the customer's own coins can be part of their change.",
      "No change possible? **Refuse the sale** and give back the same coins. Never sell short.",
      "Keep money in **integer cents**: in floating point `0.1 + 0.2` is `0.30000000000000004`.",
    ],
    more: [
      {
        title: "Escrow, then commit",
        points: [
          "Inserted coins stay in escrow; select only reserves the change.",
          "Only the sensor's `dropped` moves the escrow into the tubes, pays the change and takes stock, exactly once.",
          "Invariant after every event: escrow + tubes + paid out = opening float + inserted + refills.",
        ],
      },
      {
        title: "Cost",
        points: ["The DP runs once per sale over a few hundred cents: microseconds, even on a microcontroller."],
      },
    ],
    code: `function fewestCoins(amount, counts, denoms = [100, 25, 10, 5]) {
  let best = [0, ...Array(amount).fill(Infinity)];
  for (const d of denoms)
    best = best.map((min, a) => {     // min starts as "no coin d"
      for (let j = 1; j <= (counts[d] ?? 0) && j * d <= a; j++)
        min = Math.min(min, best[a - j * d] + j);
      return min;
    });
  return best[amount]; // Infinity: no change, so refund
}`,
    say: "Greedy is only optimal with unlimited coins. With real tubes I'd run a bounded DP over the coins that are actually there, escrow included, and if it can't make change, refuse the sale and refund.",
    source: "/questions/vending-machine#step-by-step-answer",
  },

  // ── Question: Elevator ─────────────────────────────────────────────────────
  {
    id: "elevator-look-dispatch",
    track: "System design",
    topic: "Elevator LLD",
    title: "An elevator is two decisions: which car, and in what order",
    hook: "Split dispatch from scheduling and the elevator question gets easy: each car runs LOOK, and one controller gives every hall call one car.",
    points: [
      "Each car is a **state machine**: IDLE, MOVING_UP, MOVING_DOWN, DOORS_OPEN, OUT_OF_SERVICE. Doors open only when it's stopped at a floor.",
      "**LOOK**: keep the sweep while any stop lies ahead, turn around only when none does. No floor waits more than two sweeps.",
      "**FCFS** zig-zags past floors it will need later; nearest-stop-first can starve a far floor.",
      "**Nearest car** must be direction-aware: a car 2 floors away heading the wrong way can be the slowest to arrive.",
      "One controller loop owns every hall call, so pressing ▲ twice is still one call and one car comes.",
    ],
    more: [
      {
        title: "Watch out",
        points: [
          "Put the safety rules inside the car: `openDoors()` throws while moving, and a car never moves with its doors open.",
          "A failed car hands its hall calls to the other cars; its riders get out at the next floor.",
          "A full car (about 80% load) skips hall calls and hands them back to the dispatcher.",
        ],
      },
      {
        title: "Other strategies",
        points: [
          "**Collective**: only an idle car, or one already passing in the right direction, takes a call. Simple, but cars bunch.",
          "**Destination dispatch**: riders key in their floor in the lobby and are grouped by floor, so cars make fewer stops.",
        ],
      },
    ],
    code: `// LOOK, the whole stop policy for one car
if (ahead(dir)) return here(dir) ? { serve: dir } : { move: dir };
if (here(dir)) return { serve: dir };          // last stop this way
if (here(flip(dir))) return { serve: flip(dir) }; // turn around here
return ahead(flip(dir)) ? { move: flip(dir) } : {}; // else go idle`,
    say: "Each car is a state machine that serves its stops in LOOK order, so waits are bounded. One controller assigns every hall call to exactly one car, scored by a direction-aware cost.",
    source: "/questions/elevator#step-by-step-answer",
  },
  {
    id: "elevator-round-trip-time",
    track: "System design",
    topic: "Elevator LLD",
    title: "Lifts are slow because they stop, not because floors are far",
    hook: "In a 20-floor office at the morning rush, a car's 148 s round trip is 52 s of travel and 72 s of stopping. That sets how many cars you need.",
    points: [
      "**Round trip** = travel up and back + every stop + every person getting in and out.",
      "20 floors and 10 people a trip: about **8 stops**, and the car reaches floor **18.6** on average.",
      "At 2.5 m/s and 8 s a stop the round trip is about **148 s**, so one car moves about 20 people in 5 minutes.",
      "Four cars move about 81 in 5 minutes. 1,000 people needing 12% (120) moved want **six cars**.",
      "Halve the stops (destination dispatch) and the trip drops to about 116 s: four cars then move about 103.",
    ],
    more: [
      {
        title: "The inputs",
        points: [
          "Stops per trip: N × (1 − (1 − 1/N)^P) = 20 × (1 − 0.95^10) ≈ 8.0.",
          "A stop costs about 8 s: doors close 3 s, open 2 s, and about 3 s is lost braking and accelerating.",
          "Each person takes 1.2 s to get in and 1.2 s to get out; a floor takes 1.4 s at 2.5 m/s.",
        ],
      },
      {
        title: "What to say next",
        points: [
          "Interval = round trip ÷ cars: 37 s with four cars, 25 s with six. Offices aim for under 30 s.",
          "The controller is tiny: 120 presses in 5 minutes is 0.4 a second. The hard part is correctness.",
        ],
      },
    ],
    say: "I'd size for the morning rush: a 148 s round trip with 10 people per car means about 20 people per car per 5 minutes, so 1,000 people need six cars, and most of the trip is spent stopping.",
    source: "/questions/elevator#capacity-estimate",
  },

  // ── Question: Rate limiter ─────────────────────────────────────────────────
  {
    id: "token-bucket-vs-windows",
    track: "System design",
    topic: "Rate limiter",
    title: "A fixed window can let through twice the limit in a couple of seconds",
    hook: "The algorithm decides whether bursts are allowed, how much state each key costs, and whether the limit holds at window edges.",
    points: [
      "A **fixed window** resets on the minute, so a client can send the full limit just before the edge and again just after.",
      "A **token bucket** holds up to `capacity` tokens, refills at `rate` per second, and each request spends one.",
      "Bursts up to the capacity pass, but the **average rate** holds. Tokens plus a timestamp per key: the default for APIs.",
      "A **sliding window counter** weights the previous window by its overlap: about exact, with 2 counters per key.",
      "**Sliding log** is exact but stores every timestamp; **leaky bucket** smooths output but adds queueing latency.",
    ],
    more: [
      {
        title: "Example",
        points: [
          "A capacity-3 bucket at 2 tokens per second: 3 quick requests drain it, and the 4th must **wait 500 ms**.",
          "`Retry-After` comes from the token deficit: `(1 − tokens) / rate` seconds.",
        ],
      },
      {
        title: "Which one",
        points: [
          "Token bucket for general APIs; **sliding window counter** for strict \"100 per minute\" quotas such as billing tiers.",
        ],
      },
    ],
    code: `function take(b, now = Date.now()) { // { tokens, last, rate, cap }
  const refill = ((now - b.last) / 1000) * b.rate;
  b.tokens = Math.min(b.cap, b.tokens + refill);
  b.last = now;
  if (b.tokens < 1) return false;        // reject with 429
  b.tokens -= 1;
  return true;
}`,
    say: "I'd use a token bucket per user: it allows short bursts up to the capacity while enforcing the average rate, with two fields per key. For strict per-minute billing quotas, a sliding window counter.",
    source: "/questions/rate-limiter#choosing-an-algorithm",
  },
  {
    id: "distributed-rate-limit-lua",
    track: "System design",
    topic: "Rate limiter",
    title: "Fifty servers, one limit: run the token bucket as one Lua script",
    hook: "Separate GET and SET calls race: two servers read \"1 token left\" and both spend it. One script makes the check atomic.",
    points: [
      "Keep each bucket in a **Redis hash** (`tokens`, `ts`) that every app server shares.",
      "**One Lua script** reads, refills, takes and writes, so the read-modify-write is atomic across all servers.",
      "Take the time from `redis.call('TIME')` inside the script, so **clock skew** between app servers can't mint free tokens.",
      "Set the TTL to the **full-refill time** (`capacity / rate`), so idle buckets delete themselves.",
      "Return `429` with `Retry-After`, and send `RateLimit-*` headers on every response so good clients **slow down early**.",
    ],
    more: [
      {
        title: "When Redis fails",
        points: [
          "**Fail open** with a local in-memory bucket for normal endpoints; **fail closed** (`503`) for login, OTP and payments.",
          "Make the Redis client **fail fast**: no offline queue, no retries, a 50 ms command timeout. Otherwise the limiter becomes the outage.",
        ],
      },
      {
        title: "Numbers to know",
        points: [
          "One Redis primary does about **100K ops/s**, so 10K requests per second fits with room to spare.",
          "1M active keys is about **200 MB**: two small fields each.",
        ],
      },
      {
        title: "Who to limit",
        points: [
          "The user or API key first. Keep per-IP limits loose: a campus or carrier **NAT** can put thousands behind one address.",
        ],
      },
    ],
    say: "The bucket lives in Redis, and one Lua script does the whole read, refill, take and write using Redis's own clock. If Redis is down, normal endpoints fail open to a local bucket and login fails closed.",
    source: "/questions/rate-limiter#step-by-step-answer",
  },

  // ── Question: Movie ticket booking ─────────────────────────────────────────
  {
    id: "seat-hold-conditional-update",
    track: "System design",
    topic: "Ticket booking",
    title: "Two people click seat A5 at once. One UPDATE decides who wins.",
    hook: "A seat must be booked at most once, ever. Postgres row locks enforce that without an application lock or a separate read.",
    points: [
      "Seats move `available → held → booked`, and each hold sets `held_by` and a `held_until` time.",
      "One **conditional UPDATE** holds all the requested seats. If `rowCount` doesn't match, roll back: **all or nothing**.",
      "Bob's update **waits** on Alice's row lock, re-evaluates the `WHERE` against her committed row, and matches 0 rows.",
      "Only an **expired hold** counts as free, so correctness never depends on a cleanup timer.",
      "Row locks let thousands book **different seats** at once; a show-level lock would serialise every booking for that show.",
    ],
    more: [
      {
        title: "Watch out",
        points: [
          "Bracket the condition: `status = 'available' OR held_until < now()` also matches **booked** seats with an old `held_until`.",
          "**Dedupe** the seat list first, or `['A5', 'A5']` can never match a `rowCount` of 2.",
          "Publish the seat change only **after the commit**, so viewers never see a hold that was rolled back.",
        ],
      },
      {
        title: "Launch day",
        points: [
          "A **waiting room** admits N users per second with admission tokens; the hold endpoint rejects requests without one.",
          "Seat maps come from a 1–2 s **CDN snapshot** plus SSE pushes, not from database reads.",
        ],
      },
    ],
    code: `const { rowCount } = await c.query(
  \`UPDATE seats SET status = 'held', held_by = $1,
     held_until = now() + interval '5 minutes'
   WHERE show_id = $2 AND seat_no = ANY($3)
     AND (status = 'available'
          OR (status = 'held' AND held_until < now()))\`,
  [userId, showId, seats]);
if (rowCount !== seats.length) await c.query('ROLLBACK');`,
    say: "One conditional UPDATE holds every requested seat or none. Postgres row locks make a concurrent update wait and re-check the WHERE clause, so exactly one buyer wins each seat.",
    source: "/questions/movie-booking#step-by-step-answer",
  },
  {
    id: "late-payment-seat-confirm",
    track: "System design",
    topic: "Ticket booking",
    title: "The payment succeeds after the seat hold expired. Now what?",
    hook: "The provider's webhook can arrive late or more than once. Confirming must never double-book a seat or charge for one the buyer lost.",
    points: [
      "Create the payment with an `Idempotency-Key` equal to the **hold id**, so a double click can't charge twice.",
      "The provider's **webhook** drives confirmation, not the browser's redirect. Verify it, and expect retries.",
      "Insert the booking with `ON CONFLICT (payment_id) DO NOTHING`, so a **retried webhook** is a no-op.",
      "Confirm by updating seats only `WHERE status = 'held' AND held_by = me`. If they're **still yours**, a late payment still books.",
      "If someone else took them, roll back and **refund automatically**. The refund must be idempotent too.",
    ],
    more: [
      {
        title: "Expiry is lazy",
        points: [
          "Expired holds already count as free in the hold query, so **no timer** is needed for correctness.",
          "A **sweeper** still frees them every 30 s so seat maps look right. If it stalls, seat maps go stale; bookings stay correct.",
        ],
      },
      {
        title: "Details that matter",
        points: [
          "Confirm checks `held_by` but **not** `held_until`: a hold that expired a moment ago and wasn't reclaimed still books.",
          "A failed payment releases the seats with the same `held_by` guard, so it can't free **someone else's** hold.",
          "A visible **countdown** in the UI makes late payments rare.",
        ],
      },
    ],
    say: "The webhook confirms with a conditional update: still held by me? Then book it, even if the hold just expired. If someone else took the seats, roll back and refund. A unique payment id makes a retried webhook a no-op.",
    source: "/questions/movie-booking#failure-modes",
  },

  // ── Question: Leaderboard ──────────────────────────────────────────────────
  {
    id: "leaderboard-rank-sorted-set",
    track: "System design",
    topic: "Leaderboards",
    title: "A sorted set answers \"what's my rank?\" in O(log n)",
    hook: "A database index finds the top 100 easily, but to rank one player it must count everyone above them. A skip list keeps that count.",
    points: [
      "Each board is a Redis **sorted set**: a skip list ordered by score, plus a hash from player to score.",
      "`ZINCRBY` adds points, `ZREVRANGE 0 99` is the top 100, and `1 + ZCOUNT key (score +inf` is a rank: all O(log n).",
      "A B-tree stores no counts, so `COUNT(*) WHERE points > x` reads every entry above you: millions per query.",
      "Cache the top 100 for a second, since everyone sees the same list. Compute \"my rank\" on demand from a replica.",
      "50M players at about 100 bytes each is roughly 5 GB: one Redis primary plus a replica, no sharding yet.",
    ],
    more: [
      {
        title: "Writes and durability",
        points: [
          "Validate server-side, append to **Kafka**, then apply to the daily, weekly and all-time keys in one Lua script.",
          "Kafka delivers at least once and `ZINCRBY` isn't idempotent: store the last applied offset in the same script.",
          "Redis is a **rebuildable index**: reload the totals from the database and replay Kafka if it's lost.",
        ],
      },
      {
        title: "Time windows",
        points: [
          "One key per period, derived from when the match was **played**, so a late event lands on the right day.",
          "`EXPIRE key ttl NX` sets the TTL once. `ZUNIONSTORE` of seven dailies rebuilds a week, but it's O(N): never per request.",
        ],
      },
    ],
    code: `await redis.zincrby('lb:all', 50, 'maya');           // O(log n)
const top = await redis.zrevrange('lb:all', 0, 99, 'WITHSCORES');
const score = await redis.zscore('lb:all', 'ravi');   // O(1)
const above = await redis.zcount('lb:all', \`(\${score}\`, '+inf');
const rank = above + 1;                               // ties share it`,
    say: "Each board is a sorted set: ZINCRBY to add points, ZREVRANGE for the top 100, and 1 + ZCOUNT above my score for my rank, all O(log n). Redis is an index I can rebuild from the event log.",
    source: "/questions/leaderboard#why-a-sorted-set",
  },
  {
    id: "leaderboard-ties-and-shards",
    track: "System design",
    topic: "Leaderboards",
    title: "Leaderboard ties and shards: where the interview is won",
    hook: "Anyone can say \"use a sorted set\". The follow-ups are how ties are numbered and what you do when one node can't hold the board.",
    points: [
      "**Shared** ranks (1224) are 1 + `ZCOUNT` above you. **Dense** ranks (1223) need a second set of distinct scores.",
      "**First to reach wins**: score = `points × 2^28 + (MAX_TS − ts)`. Doubles are exact only to 2^53, so points stay under 2^25.",
      "Shard by player hash: each shard returns its own top K and you merge. Not K / N: the whole top K may sit on one shard.",
      "My global rank is 1 + the sum of `ZCOUNT` above my score on every shard. Dense ranks don't add up across shards.",
      "For the long tail, a score histogram gives \"top 37%\" from a few hundred counters instead of exact ranks.",
    ],
    more: [
      {
        title: "Shard by score range?",
        points: [
          "The top K comes from one shard, and a rank is the size of every higher shard plus your rank inside yours.",
          "But the top shard is the hottest, players move between shards, and the boundaries drift as scores inflate.",
        ],
      },
      {
        title: "Watch out",
        points: [
          "`ZREVRANK` breaks ties by member name, which is arbitrary: use `ZCOUNT` for shared ranks.",
          "Adding the time as a fraction of a point runs out of precision once totals reach about a million.",
          "`ZADD GT` keeps the earliest of two equal best scores for free: the later one encodes smaller.",
        ],
      },
    ],
    say: "I'd break ties by first to reach, with a composite score that fits in 53 bits. Past one node I'd shard by player hash: the top K is a merge of every shard's top K, and my rank is 1 plus the sum of the ZCOUNTs.",
    source: "/questions/leaderboard#step-by-step-answer",
  },

  // ── Question: Payment system ───────────────────────────────────────────────
  {
    id: "payment-timeout-means-unknown",
    track: "System design",
    topic: "Payments",
    title: "A payment timeout means unknown, not failed",
    hook: "The PSP may have charged the card before its reply got lost. Call that a failure and the customer's retry charges them twice.",
    points: [
      "Claim an **idempotency key** per checkout attempt under a unique constraint, in the same transaction that creates the payment.",
      "Same key and body: replay the **stored response**. Still running: `409`. Same key, different body: `422`.",
      "On a timeout, mark the payment `unknown` and pass **your own key** to the PSP, so any retry returns the original charge.",
      "Let the signed **webhook**, or a recovery job's status query, settle `unknown` into succeeded or failed.",
    ],
    more: [
      {
        title: "Watch out",
        points: [
          "Never hold a database transaction open across the PSP call: at 1,160 payments/s that is 1,160 open transactions.",
          "A check-then-insert in code races. Let the database's **unique key** pick the single winner.",
          "Store declines too: retrying the key replays the decline, and another card needs a new key.",
        ],
      },
      {
        title: "Retries",
        points: [
          "Retry only timeouts, resets and 5xx, with exponential backoff and **full jitter**, and always with the same key.",
          "Failing over to a second PSP after a timeout can double-charge: the first one may have succeeded.",
        ],
      },
    ],
    code: `INSERT INTO idempotency_keys (customer_id, key, request_hash)
VALUES ($1, $2, $3)
ON CONFLICT (customer_id, key) DO NOTHING;
-- 0 rows: replay if done, 409 if started, 422 if the hash differs`,
    say: "A PSP timeout is unknown, not failed. I'd claim an idempotency key in the same transaction as the payment, pass my key to the PSP, and let the webhook or a status query settle it.",
    source: "/questions/payment-system#step-by-step-answer",
  },
  {
    id: "payment-double-entry-ledger",
    track: "System design",
    topic: "Payments",
    title: "Every cent twice: the double-entry ledger",
    hook: "Payments are a bookkeeping problem. Balanced, append-only entries make double postings and missing money visible instead of silent.",
    points: [
      "Every transaction is a set of entries that **sums to zero**, in integer minor units of one currency: 5000 means $50.00.",
      "A $50 charge: debit cash at PSP $48.25 and fees $1.75; credit the merchant $45.00 and revenue $5.00.",
      "Entries are **append-only**. A refund or a correction is a new transaction in the other direction.",
      "Balances are **derived** from the entries. Cache them as a projection, never as the source of truth.",
    ],
    more: [
      {
        title: "With webhooks",
        points: [
          "Verify the signature, insert the **event id** under a unique key, then apply only forward state moves.",
          "Write the status change, the ledger entries and an **outbox** row in one transaction, so nothing half-happens.",
        ],
      },
      {
        title: "Balanced is not correct",
        points: [
          "A duplicate webhook posted twice still balances. **Reconciliation** against the PSP's daily report catches it.",
          "Compute one leg as the remainder (merchant share = amount − commission), so rounding can't create or lose a cent.",
        ],
      },
    ],
    say: "Money lives in an append-only double-entry ledger in integer cents. Every transaction sums to zero, balances are derived, and a daily reconciliation with the PSP catches what balancing can't.",
    source: "/questions/payment-system#step-by-step-answer",
  },

  // ── Question: Typeahead ────────────────────────────────────────────────────
  {
    id: "typeahead-debounce-abort",
    track: "System design",
    topic: "Typeahead",
    title: "Debounce cuts requests, but it doesn't stop stale results",
    hook: "Pause twice while typing and two requests are in flight. If the older one answers last, the list shows results for the wrong query.",
    points: [
      "**Debounce** about 250 ms after the last keystroke and skip queries under 2 characters. A fast \"react\" sends 1 request.",
      "Fix the order with one `AbortController` per request, **aborted** in the effect cleanup as soon as the query changes.",
      "Some clients and servers ignore the abort, so also **check the signal** before using a result.",
      "Cache results per query in a small **LRU with a TTL** (100 entries, 60 s), checked before the timer: backspace is instant.",
    ],
    more: [
      {
        title: "On the server",
        points: [
          "A **trie** that stores the top-K completions at every node (K = 8) answers in O(prefix length), with no subtree search.",
          "Rebuild it offline from query logs and **swap it in atomically**.",
          "Lowercase and trim the prefix so users share **CDN cache keys**. Short prefixes like \"re\" are the hottest and cache best.",
        ],
      },
      {
        title: "Accessibility",
        points: [
          "Use the WAI-ARIA **combobox** pattern: focus stays in the input and `aria-activedescendant` names the active option.",
          "Highlight matches with `<mark>` elements and React text nodes, **never** `innerHTML`.",
        ],
      },
    ],
    code: `useEffect(() => {
  const ctrl = new AbortController();
  const timer = setTimeout(async () => {
    const items = await load(query, ctrl.signal);
    if (ctrl.signal.aborted) return;   // a newer query took over
    setItems(items);
  }, 250);
  return () => { clearTimeout(timer); ctrl.abort(); };
}, [query]);`,
    say: "Debounce reduces how many requests I send, but not their order. So each query gets an AbortController that the next keystroke aborts, and I ignore any result whose signal was aborted.",
    source: "/questions/typeahead#step-by-step-answer",
  },

  // ── Question: Infinite scroll feed ─────────────────────────────────────────
  {
    id: "feed-cursor-pagination",
    track: "System design",
    topic: "Infinite scroll",
    title: "Page numbers repeat posts the moment new ones arrive",
    hook: "Offset pagination shows duplicates and gaps as soon as the feed changes. A cursor stays correct, and deep pages stay fast.",
    points: [
      "5 new posts at the top push every item down 5 places, so the next offset page **repeats 5 posts** you've seen.",
      "With offsets, deleted posts make you **skip** items instead, and deep offsets are slow: the database walks every skipped row.",
      "A **cursor** asks for posts older than the last one you have, such as `?cursor=p_160`. Nothing shifts.",
      "On the server, `WHERE id < $1 ORDER BY id DESC` is an **index range scan**, as fast on page 500 as on page 1.",
      "Fetch `LIMIT 21` for a page of 20: the **extra row** says whether another page exists.",
    ],
    more: [
      {
        title: "The trigger",
        points: [
          "Observe a sentinel near the end with an **IntersectionObserver**, not a scroll listener. A 600 px `rootMargin` prefetches.",
          "The observer reports only **changes**: if a short page leaves the sentinel on screen, re-observe after each page.",
          "Keep **one request** in flight and reset the busy flag in `finally`, or one failed request freezes the feed.",
        ],
      },
      {
        title: "Keep the DOM small",
        points: [
          "**Virtualise** rows and measure their real heights: with 10,000 posts loaded, the DOM holds about 20 rows.",
          "Don't virtualise a 50-item list: it **breaks Ctrl+F** and buys nothing.",
        ],
      },
    ],
    say: "I'd paginate by cursor, not page number: the client sends the last post id and the server returns older posts with an index range scan. New or deleted posts can't cause duplicates or gaps.",
    source: "/questions/infinite-feed#step-by-step-answer",
  },

  // ── Question: Real-time chat ───────────────────────────────────────────────
  {
    id: "chat-store-then-ack",
    track: "System design",
    topic: "Chat",
    title: "Store, then ack, then fan out: the sentence chat interviews want",
    hook: "It answers durability, duplicates and delivery in one breath, and it's what interviewers listen for.",
    points: [
      "Storing before acking means that once the sender sees the tick, the message is **durable**: an acked message is never lost.",
      "Each send carries a **client-generated id**. A unique `(from, clientId)` index turns a retry into a re-ack, not a copy.",
      "After the ack, publish to each member's `user:ID` channel on **Redis pub/sub**; any gateway holding their sockets delivers it.",
      "Gateways keep a **set** of sockets per user, because one user has several devices.",
      "The client shows the bubble at once as **sending**, keyed by its `clientId`, and merges the ack into the same entry.",
    ],
    more: [
      {
        title: "The send path",
        points: [
          "Check membership, dedupe by `(from, clientId)`, `INCR` the conversation's seq, store, **ack**, then publish.",
          "Two retries arriving at once can both pass the lookup; the **duplicate-key error** (`11000`) becomes a re-ack.",
        ],
      },
      {
        title: "Watch out",
        points: [
          "**Acking before storing** is the classic mistake: crash in between and an acked message is gone.",
          "Unsubscribe from `user:ID` when the user's **last socket** closes, or Redis keeps sending that gateway traffic.",
        ],
      },
      {
        title: "Numbers to know",
        points: [
          "10M concurrent sockets at ~50K per gateway is about **200 gateway nodes**. Connections, not writes, shape the design.",
        ],
      },
    ],
    code: `const dup = await db.messages.findOne({ from: userId, clientId });
if (dup) {
  ack(dup.seq);                            // a retry: just ack again
} else {
  const seq = await pub.incr('seq:' + conversationId);
  await db.messages.insertOne({ conversationId, seq, from: userId,
    clientId, text, ts: Date.now() });
  ack(seq);                                // durable first, then ack
  await broadcast(conversationId, { type: 'message', seq, text });
}`,
    say: "Store, then ack, then fan out, and make the send idempotent with a client id. An acked message is never lost, and a retry after a lost ack gets the stored seq back instead of a duplicate.",
    source: "/questions/chat#step-by-step-answer",
  },
  {
    id: "chat-seq-and-sync",
    track: "System design",
    topic: "Chat",
    title: "Order chat messages per conversation, never globally",
    hook: "Users never compare the order of two different chats, so a global sequence number is a bottleneck nobody needs.",
    points: [
      "`INCR seq:CONVERSATION_ID` gives each message a **per-conversation seq**, and clients sort by it.",
      "**Gaps are fine**: an insert that fails after `INCR` burns a number, which is harmless.",
      "On every reconnect the client sends `sync` with the **last seq it has**, and the server replays everything after it.",
      "Pub/sub is fire-and-forget, so **sync also repairs** any live message it dropped. The database is the source of truth.",
      "**Receipts are watermarks**: one `lastReadSeq` per member, not a row per message. Reading 1042 implies all before it.",
    ],
    more: [
      {
        title: "Receipts and presence",
        points: [
          "Watermark updates are conditional, so they **only move forward**, and a receipt is broadcast only when something changed.",
          "**Presence** is a Redis key with a 70 s TTL, refreshed by a heartbeat every 30 s: a crashed client simply expires.",
          "**Typing** is throttled to one event per 3 s, never stored, and sent only to people with that conversation open.",
        ],
      },
      {
        title: "Storage and offline users",
        points: [
          "At very large scale, **Cassandra** fits exactly: one partition per conversation, rows clustered by seq.",
          "Members with no presence key get a **push notification**, and sync when the app opens.",
        ],
      },
      {
        title: "Huge channels",
        points: [
          "For thousands of members, **fan out on read**: members pull recent messages when they open the channel, with no per-member receipts.",
        ],
      },
    ],
    say: "Order is per conversation from an INCR counter, and clients sort by seq and tolerate gaps. On reconnect they sync from their last seq, which also repairs anything pub/sub dropped.",
    source: "/questions/chat#step-by-step-answer",
  },

  // ── Question: News feed ────────────────────────────────────────────────────
  {
    id: "hybrid-fan-out-feed",
    track: "System design",
    topic: "News feed",
    title: "Fan-out on write breaks for an account with 30M followers",
    hook: "Feeds are read about 60 times per post, so you pay at write time to make reads cheap, until a celebrity posts.",
    points: [
      "**Push** (fan-out on write) adds the post id to every follower's cached feed, so a feed read is **one lookup**.",
      "At 100K fan-out writes per second, a post by someone with 30M followers takes **5 minutes** to reach everyone.",
      "**Pull** (fan-out on read) writes once, but every feed open merges **hundreds of timelines**: too slow for a 200 ms p99.",
      "**Hybrid**: push for normal authors, skip fan-out for celebrities (over ~100K followers) and merge their posts in at read time.",
      "A user follows only a handful of celebrities, so the read-time **merge stays small**.",
    ],
    more: [
      {
        title: "Feed storage",
        points: [
          "Each feed is a Redis **sorted set** of post ids scored by time, capped at 800. Store ids, never whole posts.",
          "Skip followers inactive for 30 days, and **rebuild their feed** with a fan-out on read when they log in.",
          "Page with a **score cursor** (older than T), not offsets, so new posts at the top can't shift the page.",
        ],
      },
      {
        title: "Numbers to know",
        points: [
          "300M users opening the feed 10 times a day is about **35K reads/s**; fan-out turns 580 posts/s into **116K writes/s**.",
          "Caching 800 ids for every user is about **9.6 TB** of RAM, so cache feeds only for recently active users.",
        ],
      },
      {
        title: "Crossing the threshold",
        points: [
          "An author going from 90K to 110K followers stops being pushed. The merge **dedupes by post id**, which handles the crossover.",
        ],
      },
    ],
    code: `async function publishPost(post) {
  await db.posts.insert(post);
  await redis.zadd('posts:' + post.authorId, post.createdAt, post.id);
  if ((await followerCount(post.authorId)) > 100000) return; // pull
  for await (const to of followerBatches(post.authorId, 1000)) {
    await queue.publish('fanout', { postId: post.id, to });
  }
}`,
    say: "I'd present push first, then say it breaks for a 30M-follower account. The hybrid pushes for normal authors and merges celebrity posts at read time, with a threshold around 100K followers that we tune.",
    source: "/questions/news-feed#push-pull-or-hybrid",
  },
  // ── Question: Uber ride matching ───────────────────────────────────────────
  {
    id: "ride-matching-geo-index",
    track: "System design",
    topic: "Geospatial index",
    title: "Find nearby drivers by cell, and always read the 8 neighbours",
    hook: "5M drivers report every 4 s. Only the latest fix matters for matching, so it lives in memory, indexed by cell, never as a database row.",
    points: [
      "1.25M updates/s: **overwrite** each driver's position in Redis GEO (one key per city) with a TTL, and batch history to Kafka.",
      "A **geohash** interleaves longitude and latitude bits, so a shared prefix means a shared cell. Precision 6 is about 1.2 × 0.6 km.",
      "Cells have edges: a driver 10 m away can sit in the next cell, under another prefix. Always read the **8 neighbours** too.",
      "Widen ring by ring. After ring k, anything unscanned is at least k cells away, so stop once the best are closer than that.",
      "Rank the shortlist by **ETA** from the routing service: the nearest car may be across a river.",
    ],
    more: [
      {
        title: "Alternatives",
        points: [
          "**Quadtrees** split cells where drivers are dense, at the cost of a tree to rebalance as they move.",
          "**H3** hexagons put every neighbour at the same distance, so rings are natural.",
          "`GEOADD` overwrites a member's geohash score, so a moving driver leaves its old cell automatically.",
        ],
      },
      {
        title: "Watch out",
        points: [
          "GEO members never expire: keep a `loc:` key with a 15 s TTL and skip drivers without one.",
          "Two points 31 m apart can hash to `s00000` and `7zzzzz`: prefixes alone can't find neighbours.",
        ],
      },
    ],
    code: `for (; k <= maxRings; k++) {
  for (const cell of ringCells(center, k))
    for (const d of index.inCell(cell)) found.push(near(d));
  found.sort((a, b) => a.dist - b.dist);
  // anything not scanned yet is at least k cells away
  if (found.length >= want && found[want - 1].dist <= k * cell) break;
}`,
    say: "Only the latest fix matters, so it overwrites an in-memory geo index per city with a TTL. To match, I read the rider's cell and its 8 neighbours, widen ring by ring, and rank the shortlist by ETA.",
    source: "/questions/ride-sharing#step-by-step-answer",
  },
  {
    id: "ride-matching-compare-and-set",
    track: "System design",
    topic: "Matching",
    title: "One ride, one driver: reserve with a compare-and-set, then offer",
    hook: "Many matchers race for the same nearby cars. Check-then-write lets two of them offer one driver two rides in the same millisecond.",
    points: [
      "Driver state goes `AVAILABLE → OFFERED → ON_TRIP`, and every step is a **compare-and-set**, never a read followed by a write.",
      "Reserve first: `AVAILABLE → OFFERED` succeeds for one matcher. The loser gets 0 and moves to its next candidate.",
      "Offer **one driver at a time** with a 10–15 s countdown. A decline or silence sets the driver back to `AVAILABLE`.",
      "The reservation has a **TTL**, so a matcher that crashes mid-offer can't strand a driver.",
      "The ride side too: `UPDATE rides … WHERE state = 'REQUESTED'`, so a ride never gets two drivers.",
    ],
    more: [
      {
        title: "How to build it",
        points: [
          "Redis: a Lua script that checks `state` and writes it in one atomic step.",
          "SQL: `UPDATE drivers SET state = 'OFFERED' WHERE id = $1 AND state = 'AVAILABLE'`, then check the row count.",
          "Backstop: a partial unique index that allows one active ride per driver.",
        ],
      },
      {
        title: "Watch out",
        points: [
          "An accept that arrives after the reservation expired must fail its compare-and-set: show **offer expired**.",
          "Offering one ride to several drivers at once creates races you then have to break.",
        ],
      },
    ],
    code: `const ok = await store.cas(id, { state: 'AVAILABLE' },
  { state: 'OFFERED', rideId: ride.id, ttlMs: 15_000 });
if (!ok) continue;            // another matcher won: next candidate
const answer = await answerWithin(offer(id, ride), 12_000);`,
    say: "Every driver state change is a compare-and-set with a TTL. The matcher reserves AVAILABLE to OFFERED before it sends the offer, so two matchers can't both win and a crash can't strand a driver.",
    source: "/questions/ride-sharing#step-by-step-answer",
  },
];
