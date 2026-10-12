import type { Short } from "./types";

// Shorts for the HLD path (content/learn/*). Order follows the path.
export const shorts: Short[] = [
  // 1. Requirements and Estimation
  {
    id: "requirements-with-numbers",
    track: "System design",
    topic: "Requirements",
    title: "Cut the scope, then put a number on every requirement",
    hook: "A design without requirements solves the wrong problem, and a design without numbers can't justify anything.",
    points: [
      "Name the **3 core actions** as verbs. For Twitter: post, follow, read the timeline. Everything else hangs off these.",
      "Cut features out loud: \"I'll leave out DMs, search and ads.\" Cutting is a sign of **seniority**, not laziness.",
      "Give every **non-functional requirement** a number: latency, availability, consistency, durability and scale.",
      "No number from the interviewer? **Propose one**: \"I'll assume 100M daily users; tell me if that's off.\"",
      "Talk about **p99**, not averages: the slowest 1% of requests are the ones users complain about.",
    ],
    more: [
      {
        title: "What each target forces",
        points: [
          "**Latency** (p99 under 200 ms): caches, a CDN, precomputation.",
          "**Availability** (99.99%): redundancy across zones, no single points of failure, graceful degradation.",
          "**Durability** (never lose an order): replication, a write-ahead log, backups.",
          "**Scale** (100M DAU): sharding, queues, horizontal scale.",
          "**Consistency** (strong for payments, eventual for likes): different stores per feature.",
        ],
      },
      {
        title: "Numbers to know",
        points: [
          "**99.9%** allows about 8.8 hours of downtime a year; **99.99%** about 53 minutes.",
        ],
      },
      {
        title: "Why it protects you",
        points: [
          "Once scope is written down, \"and it should support video\" at minute 30 becomes \"that changes the **storage estimate**\".",
        ],
      },
    ],
    say: "Before I draw anything, let me pin down the core features and the scale. I'll write my assumptions here so we can come back to them.",
    source: "/learn/requirements-estimation#functional-requirements",
  },
  {
    id: "qps-back-of-envelope",
    track: "System design",
    topic: "Estimation",
    title: "10M daily users is about 3,500 requests a second at peak",
    hook: "You need the right order of magnitude in under five minutes, because every number you say should justify a design choice later.",
    points: [
      "**Average QPS** = `DAU × actions ÷ 86,400`. Round 86,400 to 100,000 and say \"about\".",
      "**Peak** is 2–5× the average for normal daily traffic, and 10× or more for sports, sales and launches.",
      "**Storage** = `writes/day × size × retention × replicas`. Forgetting replicas is the most common mistake.",
      "**Servers** = `peak ÷ (per-server QPS × 0.6)`, so each instance runs about 60% busy at peak.",
      "Split **reads and writes**: reads scale with caches and replicas, writes with sharding and queues.",
    ],
    more: [
      {
        title: "Worked example",
        points: [
          "10M DAU × 10 actions at 10:1 reads is **~1,160/s** on average: about 1,050 reads and 105 writes.",
          "At a 3× peak that's **~3,500/s**: 6 servers at 1,000 req/s each, 60% busy.",
          "Storage is **~50 TB** over 5 years at 1 KB per write with 3 replicas. Ignore replicas and you'd say 17 TB.",
          "Caching 20% of a day's reads at 1 KB each takes **~18 GB**: it fits on one Redis node.",
        ],
      },
      {
        title: "Watch out",
        points: [
          "Mixing **bits and bytes**: Gbps vs GB/s is a factor of 8.",
          "Spending 10 minutes on arithmetic. Round, state the result, move on.",
          "Never using the numbers afterwards. Every estimate should end in \"so we need…\".",
        ],
      },
    ],
    code: `const qps = (dau, actions) => (dau * actions) / 86_400;
const servers = (peak, perServer = 1_000, busy = 0.6) =>
  Math.ceil(peak / (perServer * busy));

const avg = qps(10e6, 10); // ~1,157/s
const peak = avg * 3;      // ~3,472/s
servers(peak);             // 6`,
    say: "10M daily users at 10 actions each is about 1,160 requests a second, roughly 3,500 at peak. At 1,000 per server and 60% busy that's 6 servers, and I'd load-test that per-server number.",
    source: "/learn/requirements-estimation#back-of-envelope-math",
  },
  {
    id: "latency-numbers-to-know",
    track: "System design",
    topic: "Estimation",
    title: "One cross-continent round trip costs 10 to 100 database reads",
    hook: "You don't need exact values, just the orders of magnitude. The latencies matter most, because they shape the design.",
    points: [
      "A **main memory** reference takes ~100 ns. An **SSD** random read takes ~100 µs, about 1,000× slower.",
      "A round trip inside a **data centre** is ~0.5 ms; a Redis GET over the network is ~0.5–1 ms.",
      "An **indexed database read** takes ~1–10 ms; an HDD seek ~10 ms.",
      "A **cross-continent** round trip is ~100–150 ms.",
    ],
    more: [
      {
        title: "Throughput to assume",
        points: [
          "A typical **web API instance**: hundreds to a few thousand req/s. Say \"I'd measure\".",
          "One **Redis** instance: ~100K simple ops/s.",
          "One **Postgres primary**: thousands to tens of thousands of simple queries/s, depending heavily on the query.",
        ],
      },
      {
        title: "Shortcuts",
        points: [
          "A day is 86,400 s ≈ 10⁵, so **1M requests a day ≈ 12/s**.",
          "A month is ≈ 2.6M s, so **100M a month ≈ 40/s**.",
          "2¹⁰, 2²⁰, 2³⁰, 2⁴⁰ ≈ a thousand, million, billion, trillion: KB, MB, GB, TB.",
        ],
      },
    ],
    say: "I'll use round numbers: 1M requests a day is about 12 a second, one Redis node does about 100K simple ops a second, and an indexed database read costs 1 to 10 ms.",
    source: "/learn/requirements-estimation#numbers-to-remember",
  },

  // 2. Client, API and Load Balancing
  {
    id: "power-of-two-choices",
    track: "System design",
    topic: "Load balancing",
    title: "Round robin keeps feeding a slow server. Check two instead",
    hook: "The algorithm decides which healthy instance gets the next request, and there's no single best one: it depends on your servers and requests.",
    points: [
      "**Round robin** ignores load: with four servers, a slow one still gets one request in four, so its queue keeps growing.",
      "**Least connections** picks the instance with the fewest in-flight requests: good for uploads and streaming.",
      "**Power of two choices** (P2C) samples 2 servers at random and takes the less loaded one.",
      "P2C gets almost the balance of least connections with no **global scan** and no shared state between balancers.",
      "**Consistent hashing** gives affinity for per-key caches and shards, but a hot key overloads one server.",
    ],
    more: [
      {
        title: "Other picks",
        points: [
          "**Weighted round robin** suits mixed instance sizes or a 5% canary, but static weights don't react to slowness.",
          "Smooth weighted round robin (nginx) turns weights 5, 1, 1 into `a a b a c a a`, not five `a`s in a row.",
          "Envoy's least-request policy and NGINX's `random two least_conn` both work like **P2C**.",
        ],
      },
      {
        title: "L4 or L7",
        points: [
          "**L4** forwards TCP by IP and port: very cheap, any protocol.",
          "**L7** reads HTTP, so it can route by path, terminate TLS, retry and run canaries.",
          "Most web stacks use both: an L4 balancer in front of a fleet of L7 proxies.",
        ],
      },
      {
        title: "Before any algorithm",
        points: [
          "Balancing only works if **no instance owns state**: sessions in Redis, files in object storage, data in the database.",
          "**Sticky sessions** can help warm caches or WebSockets, but never as the only place state lives.",
        ],
      },
    ],
    code: `function pickP2C(servers) {
  const healthy = servers.filter((s) => s.healthy);
  if (healthy.length < 2) return healthy[0];
  const i = Math.floor(Math.random() * healthy.length);
  let j = Math.floor(Math.random() * (healthy.length - 1));
  if (j === i) j = healthy.length - 1; // j !== i, uniformly
  const a = healthy[i], b = healthy[j];
  return a.active <= b.active ? a : b;
}`,
    say: "Requests vary in cost, so I'd use least connections or power of two choices rather than round robin. P2C checks two random servers and gets nearly the same balance without a global scan.",
    source: "/learn/api-load-balancing#balancing-algorithms",
  },
  {
    id: "liveness-vs-readiness",
    track: "System design",
    topic: "Load balancing",
    title: "One wrong health check can take your whole fleet out at once",
    hook: "The balancer can only route around failures it can see, so liveness and readiness must ask different questions.",
    points: [
      "**Liveness** asks \"is the process alive?\" A failure means restart it.",
      "**Readiness** asks \"should it get traffic right now?\" A failure means stop routing here.",
      "Failing liveness because the database is down causes **restart loops**.",
      "Failing readiness on an optional dependency, like recommendations, takes **the whole fleet** out at once.",
    ],
    more: [
      {
        title: "Active and passive checks",
        points: [
          "**Active checks** call `/readyz` every few seconds, for example every 5 s with a 2 s timeout.",
          "Use thresholds so one blip doesn't flap an instance: **3 failures** to mark it down, 2 successes to mark it up.",
          "**Passive checks** watch real traffic and eject an instance after, say, 5 consecutive 5xx responses, for 30 s. They react faster.",
        ],
      },
      {
        title: "Deploys",
        points: [
          "**Connection draining**: on `SIGTERM`, readiness fails, the balancer stops sending new requests, in-flight ones finish, then the process exits.",
          "Without draining, **every deploy** drops requests.",
        ],
      },
    ],
    code: `let shuttingDown = false;
app.get("/readyz", async (_req, res) => { // send traffic here?
  if (shuttingDown) return res.sendStatus(503);
  try { await pool.query("SELECT 1"); res.sendStatus(200); }
  catch { res.sendStatus(503); }
});
process.on("SIGTERM", () => {
  shuttingDown = true; // readiness fails, the LB stops routing
  setTimeout(() => server.close(() => process.exit(0)), 10_000);
});`,
    say: "Liveness only checks the process, so a restart can fix it. Readiness checks what the instance needs to serve, never optional dependencies, and on SIGTERM it fails first so connections drain.",
    source: "/learn/api-load-balancing#health-checks",
  },
  {
    id: "idempotency-keys",
    track: "System design",
    topic: "API design",
    title: "A retried POST must not charge the card twice",
    hook: "Networks fail after the server has done the work, so clients retry. Without an idempotency key, the retry is a second payment.",
    points: [
      "The client generates **one UUID** per logical operation and sends it as `Idempotency-Key` on every retry.",
      "The server **claims the key** atomically with `SET NX`, stores the response, and replays it for repeats.",
      "A duplicate that arrives while the first is still running gets **409**.",
      "A **5xx releases the key**, so the client can try again.",
      "Never retry a **POST** automatically unless it carries an idempotency key.",
    ],
    more: [
      {
        title: "Which methods are safe",
        points: [
          "**GET, PUT and DELETE** are idempotent by definition, so balancers and clients may retry them.",
          "**PATCH** is not necessarily idempotent.",
          "A **POST** that creates returns 201 with a `Location` header, and needs a key to be retried safely.",
        ],
      },
      {
        title: "Watch out",
        points: [
          "If a handler crashes without responding, the key stays **pending** until its TTL expires, so keep TTLs modest.",
        ],
      },
    ],
    code: `async function claim(req, res) { // true: go ahead and do the work
  const key = \`idem:\${req.user.id}:\${req.get("Idempotency-Key")}\`;
  if (await redis.set(key, "pending", "EX", 86400, "NX")) return true;
  const saved = await redis.get(key);
  if (saved === "pending") { res.sendStatus(409); return false; }
  const { status, body } = JSON.parse(saved);
  res.status(status).json(body); // replay the first response
  return false;
}
// Then store { status, body } under the key, or DEL it on a 5xx.`,
    say: "The client sends one Idempotency-Key per operation. The server claims it with SET NX, stores the response and replays it on retries. A duplicate in flight gets 409, and a 5xx releases the key.",
    source: "/learn/api-load-balancing#pagination-and-safe-retries",
  },

  // 3. Databases and Scaling
  {
    id: "write-skew",
    track: "System design",
    topic: "Databases",
    title: "Two doctors check the rota and both go off call: write skew",
    hook: "The default isolation levels in Postgres and MySQL both let two valid transactions commit and break a rule together.",
    points: [
      "**Isolation** decides what concurrent transactions can see of each other. Weaker levels allow more anomalies.",
      "**Write skew**: two transactions read the same rows, each writes a different row, both commit, and a rule breaks.",
      "**Read committed** (Postgres default) and **repeatable read** (MySQL InnoDB default) both allow it.",
      "For invariants across rows, use **SERIALIZABLE** or `SELECT … FOR UPDATE`, and retry the aborted transactions.",
      "Often a **constraint** is simpler: `UNIQUE (room_id, slot)` makes a double booking impossible at any level.",
    ],
    more: [
      {
        title: "The other anomalies",
        points: [
          "**Dirty read**: you see another transaction's uncommitted change, which might still roll back.",
          "**Non-repeatable read**: you read the same row twice and get different values.",
          "**Phantom**: you re-run a range query and new rows appear that another transaction inserted.",
        ],
      },
      {
        title: "Example: booking a slot",
        points: [
          "A check-then-insert at READ COMMITTED **races**: both transactions see the slot free, and both insert.",
          "Fix it with a unique constraint, or a conditional `UPDATE … WHERE status = 'available'` that checks the row count.",
          "**SERIALIZABLE** with a retry also works: rerun the whole transaction when Postgres aborts it.",
        ],
      },
    ],
    say: "For double booking I'd add a unique constraint on room and slot. For an invariant a constraint can't express, like one doctor always on call, I'd use SERIALIZABLE and retry aborted transactions.",
    source: "/learn/databases-scaling#transactions-and-isolation-levels",
  },
  {
    id: "composite-index-leftmost-prefix",
    track: "System design",
    topic: "Databases",
    title: "An index on (user_id, created_at) can't serve created_at alone",
    hook: "Indexes make reads fast but tax every write. Index for the queries you actually run, not for the columns you have.",
    points: [
      "A composite index is sorted by its first column, then by the next within each value: the **leftmost-prefix** rule.",
      "`(user_id, created_at)` serves `WHERE user_id = ?`, with or without `ORDER BY created_at`.",
      "Put **equality columns first**, then the range or sort column.",
      "Every `INSERT` updates **every index** on the table, and each index competes for memory.",
    ],
    more: [
      {
        title: "Smaller, faster indexes",
        points: [
          "**Covering**: `INCLUDE (total)` stores extra columns, so the query can run as an index-only scan.",
          "**Partial**: `WHERE status = 'pending'` indexes only the rows you query: smaller and cheaper to maintain.",
          "Drop the indexes `pg_stat_user_indexes` says are **never used**.",
        ],
      },
      {
        title: "Reading the plan",
        points: [
          "Run `EXPLAIN ANALYZE` and look for a `Seq Scan` on a big table.",
          "A large gap between estimated and actual rows means **stale statistics**: run `ANALYZE`.",
          "Watch for sorts **spilling to disk**.",
        ],
      },
      {
        title: "In production",
        points: [
          "A plain `CREATE INDEX` **blocks writes** for the whole build. On a large table use `CREATE INDEX CONCURRENTLY`.",
          "A failed concurrent build leaves an **invalid index** to drop and retry. Watch replication lag while it builds.",
        ],
      },
    ],
    say: "The hot query filters by user and sorts by time, so I'd index (user_id, created_at DESC): equality column first, then the sort column. I'd confirm it with EXPLAIN ANALYZE.",
    source: "/learn/databases-scaling#indexes",
  },
  {
    id: "replicas-then-shards",
    track: "System design",
    topic: "Databases",
    title: "Replicas scale reads, shards scale writes, and you shard last",
    hook: "Data is the hardest part to scale, so take the cheapest moves first. Interviewers listen for whether you take them in order.",
    points: [
      "The order: **indexes → a bigger machine → a cache → read replicas → sharding**. Each step adds operational cost.",
      "**Read replicas** add read capacity and failover, but async replicas lag behind the primary.",
      "Shard when one primary can't keep up with **writes or data size**: typically several TB or tens of thousands of writes/s.",
      "Sharding is a **one-way door**: every query now has to know its shard.",
      "Pick a **high-cardinality** shard key that matches the main query: `user_id`, not `country`.",
    ],
    more: [
      {
        title: "Replica lag",
        points: [
          "**Read-your-writes**: send a user's reads to the primary for a few seconds after they write.",
          "Read at a **log position**: the client keeps its write's LSN, and the replica waits until it has replayed that far.",
          "**Monotonic reads**: pin each user to one replica, so data never goes back in time.",
        ],
      },
      {
        title: "Shard keys",
        points: [
          "`hash(key) % N` spreads evenly, but going from 4 to 5 shards moves **about 80%** of users.",
          "**Consistent hashing**, or many virtual shards on fewer machines, moves only a small slice.",
          "Never range-shard on a **monotonically increasing** key: every new write lands on the last shard.",
          "Cross-shard queries become **scatter-gather**. Avoid cross-shard transactions, or use sagas.",
        ],
      },
    ],
    code: `const STICKY_MS = 5_000; // longer than typical replica lag
async function query(sql, params, { userId, write = false }) {
  if (write) {
    const result = await primary.query(sql, params);
    await redis.set(\`rw:\${userId}\`, Date.now(), "PX", STICKY_MS);
    return result;
  }
  const recent = await redis.exists(\`rw:\${userId}\`);
  return (recent ? primary : pickReplica()).query(sql, params);
}`,
    say: "I'd try indexes, a cache and read replicas first, sending a user's reads to the primary right after they write. I'd shard only when writes or data size outgrow one primary, by hashed user_id.",
    source: "/learn/databases-scaling#sharding",
  },

  // 4. Caching
  {
    id: "cache-aside-default",
    track: "System design",
    topic: "Caching",
    title: "Default to cache-aside: if the cache dies, you only get slower",
    hook: "A cache with a high hit ratio cuts latency and protects the database, which is usually the hardest part of the system to scale.",
    points: [
      "The app checks the cache first. On a **miss**, it reads the database and fills the cache with a TTL.",
      "Cache data that is **read often**, changes rarely, and is expensive to compute.",
      "Pick the **TTL** by the cost of a stale read: seconds for prices, minutes for product pages, hours for config.",
      "**Measure the hit ratio**: going from 90% to 99% cuts database load by 10×.",
    ],
    more: [
      {
        title: "Other patterns",
        points: [
          "**Write-through**: write the database and the cache together. Always fresh, but writes cost double.",
          "**Write-behind**: write the cache now, flush to the database in batches. Fast, but a crash loses unflushed data.",
          "**Write-around**: writes skip the cache. Good for data that is written once and rarely read.",
          "**Read-through**: like cache-aside, but the cache library or CDN loads from the origin itself.",
        ],
      },
      {
        title: "Keys and sizing",
        points: [
          "Put everything the value depends on in the key: `product:42:v3:en-IN`.",
          "Keep values small: a **2 MB value** turns a 1 ms cache hit into a 20 ms one.",
          "Size for the **working set**: often the hottest 20% of keys serve 80% of reads.",
          "A falling hit ratio with **rising evictions** means the cache is too small.",
        ],
      },
    ],
    code: `async function getProduct(id) {
  const hit = await redis.get(\`p:\${id}\`);
  if (hit) return JSON.parse(hit);
  const row = await db.product(id); // miss: load the truth
  const ttl = 300 + Math.floor(Math.random() * 60); // jitter
  await redis.set(\`p:\${id}\`, JSON.stringify(row), "EX", ttl);
  return row;
}`,
    say: "I'd put cache-aside with a jittered TTL in front of the database. If Redis dies we only get slower, and at a 99% hit ratio the database sees a tenth of the misses it would at 90%.",
    source: "/learn/caching#caching-patterns",
  },
  {
    id: "delete-cache-on-write",
    track: "System design",
    topic: "Caching",
    title: "Delete the cache key on write, don't update it",
    hook: "Every cached value is a copy, and copies go stale. How you invalidate decides how stale, and for how long.",
    points: [
      "Order matters: write the **database first**, then `DEL` the key, and let the next read load the truth.",
      "**Updating** the cache instead can leave the older value last when two writers race.",
      "Delete-on-write still has **one race**: a slow reader loads the old row, the writer deletes, then the reader writes the old value back.",
      "Keep a **short TTL** as a safety net, so any staleness is bounded.",
    ],
    more: [
      {
        title: "Closing the race",
        points: [
          "Do a **delayed second delete**, about 1 s after the write.",
          "Use **versioned keys** like `user:42:v7`, so old entries are simply never read.",
          "Drive invalidation from the database's **change stream** (CDC) instead of application code.",
        ],
      },
      {
        title: "Watch out",
        points: [
          "Caching without a **TTL**.",
          "Caching per-user responses at the CDN. Mark them `Cache-Control: private`.",
          "Treating the cache as the **source of truth**.",
        ],
      },
    ],
    code: `async function updatePrice(id, price) {
  await db.query("UPDATE products SET price = $1 WHERE id = $2",
    [price, id]);
  await redis.del(\`p:\${id}\`); // the next read loads the truth
  setTimeout(() => redis.del(\`p:\${id}\`), 1_000); // second delete
}`,
    say: "On write I update the database and delete the key rather than updating it, so racing writers can't leave an old value behind. A short TTL bounds whatever stale value slips through.",
    source: "/learn/caching#invalidation-and-the-classic-race",
  },
  {
    id: "cache-stampede",
    track: "System design",
    topic: "Caching",
    title: "One hot key expires and 10,000 requests hit the database",
    hook: "A cache stampede can flatten a healthy database in seconds, and it only ever happens to your most popular data.",
    points: [
      "A **stampede** happens when a hot key expires and every request misses at the same moment.",
      "All of those requests rebuild the same value from the database at once.",
      "Fix it with a **per-key lock** (single flight): one request rebuilds, the rest wait briefly and retry.",
      "Add **jitter** to TTLs so keys written together don't expire together.",
    ],
    more: [
      {
        title: "Its cousins",
        points: [
          "**Penetration**: ids that don't exist always miss. Cache \"not found\" briefly, or put a Bloom filter in front.",
          "**Avalanche**: many keys expire together, or the cache restarts. Use jittered TTLs and a staggered warm-up.",
          "**Hot key**: one key gets 100K+ reads/s. Add an in-process L1 cache, or replicate it as `key#1…#N`.",
        ],
      },
      {
        title: "Never miss at all",
        points: ["**Refresh-ahead** reloads a few very hot, predictable keys shortly before they expire, so readers never see a miss."],
      },
    ],
    code: `const inflight = new Map();
function singleFlight(key, load) {
  if (!inflight.has(key)) {
    const p = load().finally(() => inflight.delete(key));
    inflight.set(key, p);
  }
  return inflight.get(key); // every caller shares one promise
}`,
    say: "I'd guard hot keys with a per-key lock so only one request rebuilds the value, and add jitter to TTLs so keys written together don't expire together.",
    source: "/learn/caching#failure-modes",
  },

  // 5. Async Processing and Messaging
  {
    id: "queue-pubsub-log",
    track: "System design",
    topic: "Messaging",
    title: "Queue, pub/sub or log: who gets each message, and for how long",
    hook: "\"Queue\" covers three different tools, and they differ in who receives each message and whether you can replay it.",
    points: [
      "**Work queue** (SQS, RabbitMQ): each message goes to one consumer and stays until acked. For jobs and emails.",
      "**Pub/sub** (SNS, Redis Pub/Sub): every subscriber gets it right now, with no retention. Fire-and-forget fan-out.",
      "**Log** (Kafka): every consumer group reads it, it's kept for days, and it's **replayable**. For event streams and CDC.",
      "A common pairing: **SNS fanning out** to one SQS queue per subscriber, so each gets a durable copy with retries.",
    ],
    more: [
      {
        title: "Kafka in brief",
        points: [
          "A topic splits into **partitions**. The message key picks the partition, so one key always lands in the same one.",
          "Order is guaranteed **only within a partition**, so key by the entity whose events must stay in order.",
          "A group can't use more consumers than partitions: with 6 partitions and 8 consumers, **2 sit idle**.",
          "An offset is just a number, so a group can **rewind** and reprocess after a bug fix.",
        ],
      },
      {
        title: "When to go async",
        points: [
          "Go async when work is slow, unreliable, spiky or fans out. Keep it sync when the user needs the answer **right now**.",
          "For long jobs, answer `202 Accepted` with a job id. The client polls, or gets a push or webhook when it's done.",
        ],
      },
    ],
    say: "For jobs like emails I'd use a work queue such as SQS. For an event stream that several services read and may replay, I'd use Kafka, keyed by user so each user's events stay in order.",
    source: "/learn/async-messaging#why-queues",
  },
  {
    id: "idempotent-consumers",
    track: "System design",
    topic: "Messaging",
    title: "Your message will arrive twice. Make the consumer not care",
    hook: "At-least-once is the practical default, so \"exactly once\" in practice means at-least-once plus deduplication.",
    points: [
      "Ack **after** processing. A crash after the work but before the ack delivers the message again.",
      "Record a **processed message id** under a unique constraint, in the same transaction as the business change.",
      "Prefer **idempotent writes**: `SET status = 'shipped'` can run twice safely, `balance = balance + 10` can't.",
      "Pass the message id to external APIs as an **idempotency key**. Most payment and email providers accept one.",
      "Mark a message **done only after** the work succeeds, or a failed send is skipped as a duplicate on every retry.",
    ],
    more: [
      {
        title: "Retries and the DLQ",
        points: [
          "Retry **transient** errors (timeouts, 503s, deadlocks) with exponential backoff and jitter: 1 s, 2 s, 4 s, 8 s.",
          "Send **permanent** errors (validation, malformed payloads) straight to the dead letter queue: retrying can't fix them.",
          "Without a DLQ, a **poison message** is redelivered forever. In Kafka it blocks the whole partition.",
          "Alert on DLQ depth above zero and on the **age of the oldest message**, which catches a stuck consumer.",
        ],
      },
      {
        title: "Watch out",
        points: [
          "Kafka transactions give exactly-once only for **Kafka-to-Kafka** pipelines. An email or a card charge needs its own idempotency.",
          "A consumer group **rebalance** redelivers messages that were processed but not yet committed.",
        ],
      },
    ],
    code: `async function handle(msg) {
  const done = \`done:\${msg.id}\`, lock = \`processing:\${msg.id}\`;
  if (await redis.exists(done)) return; // already delivered
  if (!(await redis.set(lock, 1, "EX", 60, "NX"))) return; // taken
  try {
    await sendEmail(msg); // pass msg.id to the provider too
    await redis.set(done, 1, "EX", 7 * 86_400); // only now: done
  } finally { await redis.del(lock); } // a failed send can retry
}`,
    say: "Delivery is at-least-once, so consumers must be idempotent. I'd record the message id in the same transaction as the effect, mark it done only after success, and park poison messages in a DLQ with an alert.",
    source: "/learn/async-messaging#delivery-semantics",
  },
  {
    id: "transactional-outbox",
    track: "System design",
    topic: "Messaging",
    title: "Never write the database and then publish. Use an outbox",
    hook: "The database and the broker can't share a transaction, so \"save, then publish\" either loses events or announces orders that never existed.",
    points: [
      "**Crash between the two**: the order exists, the event is lost, and nobody ships the parcel.",
      "**Publish first**: if the transaction then rolls back, consumers act on an order that doesn't exist.",
      "The **outbox**: insert the order and an `outbox` row in the same local transaction.",
      "A separate **relay** reads unpublished rows, publishes them, and marks them published.",
      "A relay crash after publishing sends the row twice, so consumers **dedupe by event id**.",
    ],
    more: [
      {
        title: "Running the relay",
        points: [
          "Select pending rows with `FOR UPDATE SKIP LOCKED`, so several relays can run side by side without publishing the same row.",
          "A partial index on `outbox (id) WHERE published_at IS NULL` keeps finding pending rows cheap.",
        ],
      },
      {
        title: "The alternative: CDC",
        points: [
          "**CDC** (Debezium) tails the write-ahead log and publishes every committed change, with no polling.",
          "CDC is more infrastructure, and raw row changes leak your **table schema** to consumers.",
          "Many teams point CDC at the **outbox table** itself, so consumers never see raw rows.",
        ],
      },
    ],
    code: `await c.query("BEGIN");
const { rows } = await c.query(\`SELECT id, topic, payload FROM outbox
  WHERE published_at IS NULL ORDER BY id LIMIT 100
  FOR UPDATE SKIP LOCKED\`); // several relays can run side by side
for (const r of rows) await publish(r.topic, r.payload, { id: r.id });
const ids = rows.map((r) => r.id);
await c.query(
  "UPDATE outbox SET published_at = now() WHERE id = ANY($1)", [ids]);
await c.query("COMMIT");`,
    say: "I'd write the order and an outbox row in one transaction, and a relay publishes the outbox at least once. Consumers dedupe by event id, so a crash can't lose an event or publish one for a rolled-back write.",
    source: "/learn/async-messaging#the-dual-write-problem-and-the-transactional-outbox",
  },

  // 6. Consistency and CAP
  {
    id: "cap-during-a-partition",
    track: "System design",
    topic: "Consistency",
    title: "CAP isn't pick 2 of 3. It's C or A while the network is split",
    hook: "Partitions aren't optional, so the real question is what users see when the network breaks, and what you pay when it doesn't.",
    points: [
      "During a **partition**, a replicated system either refuses some requests or answers with data that may be stale.",
      "**Consistency**: the side that can't reach a majority refuses or blocks, so every read sees the latest write.",
      "**Availability**: every live node answers, possibly with stale data, and writes on both sides may conflict.",
      "A **bank ledger** leans CP; a **social feed** leans AP. A stale like count harms nobody, an error page does.",
      "CAP's C means **linearizability**, which has nothing to do with the C in ACID.",
    ],
    more: [
      {
        title: "PACELC",
        points: [
          "**Else**, with no partition, you trade latency for consistency on every request.",
          "A write that waits for a replica across the Atlantic adds about **70–100 ms** to every request.",
          "Cassandra and Dynamo-style stores are **PA/EL**; Spanner, etcd and CockroachDB are **PC/EC**.",
          "Many stores tune it per request: Cassandra `QUORUM` reads and writes, DynamoDB's strongly consistent reads.",
        ],
      },
      {
        title: "Choose per feature",
        points: [
          "**Strong**: account balances, payments, inventory at checkout.",
          "**Read-your-writes**: a user's own profile edit.",
          "**Per-conversation order** (causal): chat messages.",
          "**Eventual**: likes, view counts, follower counts.",
        ],
      },
    ],
    say: "CAP only bites during a partition. For ticketing I'd pick CP: the minority side refuses writes, so no seat sells twice. For likes I'd pick AP, because a stale count harms nobody.",
    source: "/learn/consistency-cap#cap-stated-precisely",
  },
  {
    id: "quorum-r-plus-w",
    track: "System design",
    topic: "Consistency",
    title: "R + W > N: why a quorum read sees the latest write",
    hook: "Leaderless stores let you tune every read and write. One inequality tells you whether a read can be stale.",
    points: [
      "With N replicas, a write waits for **W acks**, and a read asks **R replicas** and keeps the newest version.",
      "If **R + W > N**, every read set overlaps the latest write set.",
      "`N=3, W=2, R=2` is the **balanced default**: reads and writes each survive 1 node down.",
      "`3, 3, 1` favours reads but no write survives a dead node. `3, 1, 1` is fast, but reads can be **stale**.",
      "`5, 3, 2` is a **trap**: 3 + 2 is not greater than 5.",
    ],
    more: [
      {
        title: "Sloppy quorums",
        points: [
          "If a key's home replicas are unreachable, **other nodes** accept the write and keep a hint to hand back later.",
          "Writes stay available, but R + W > N **no longer guarantees** overlap: the acks may come from stand-ins.",
          "Read repair and anti-entropy (comparing **Merkle trees**) clean up the divergence.",
        ],
      },
      {
        title: "Watch out",
        points: [
          "Even a strict quorum isn't fully **linearizable**: concurrent writes and clock-based conflict resolution leak. Use consensus.",
        ],
      },
    ],
    code: `const quorum = (N, W, R) => ({
  strong: R + W > N,     // every read set overlaps the write set
  writeTolerates: N - W, // replicas down while writes succeed
  readTolerates: N - R,
});
quorum(3, 2, 2); // strong, each side survives 1 down
quorum(5, 3, 2); // not strong: 3 + 2 is not greater than 5`,
    say: "With three replicas I'd write to two and read from two. R plus W is greater than N, so every read overlaps the latest write, and both reads and writes survive one node down.",
    source: "/learn/consistency-cap#quorums",
  },
  {
    id: "fencing-tokens",
    track: "System design",
    topic: "Consistency",
    title: "A lock with a lease isn't enough: the holder can pause past it",
    hook: "A garbage-collection pause can outlast a lock's lease, and the paused client wakes up still believing it holds the lock.",
    points: [
      "Client 1 takes a lock with a **10 s lease**, then hits a 15 s GC pause. The lease expires.",
      "Client 2 takes the lock and writes. Client 1 wakes up and **overwrites** Client 2's work.",
      "Client 1 can't detect its own pause, so the fix lives in the **storage**.",
      "Every grant carries a strictly increasing **fencing token**, and storage rejects writes with an older one.",
    ],
    more: [
      {
        title: "In practice",
        points: [
          "**etcd revisions** and ZooKeeper's zxid work as tokens.",
          "A **Redis lock** is fine to avoid doing work twice. When two writers would corrupt data, fence the storage.",
          "Storage check: `UPDATE … WHERE id = $3 AND fence <= $2`. Zero rows updated means a newer holder already wrote.",
        ],
      },
      {
        title: "Consensus underneath",
        points: [
          "Raft and Paxos elect one leader by **majority** and agree on an ordered log. etcd provides this for locks and config.",
          "Run **odd-sized** clusters: 4 nodes tolerate 1 failure, the same as 3. It takes 5 to tolerate 2.",
        ],
      },
    ],
    code: `async function acquire(redis, resource, ttlMs) {
  const token = await redis.incr(\`fence:\${resource}\`); // never reused
  const ok = await redis.set(\`lock:\${resource}\`, token,
    "PX", ttlMs, "NX");
  return ok ? token : null;
}
// Storage enforces it on every write:
//   UPDATE files SET body = $1, fence = $2
//   WHERE id = $3 AND fence <= $2`,
    say: "A lease alone isn't safe, because a paused client can't tell its lease expired. I'd hand out an increasing fencing token with each lock and have storage reject writes that carry an older token.",
    source: "/learn/consistency-cap#distributed-locks-need-fencing-tokens",
  },

  // 7. Reliability and Observability
  {
    id: "slo-error-budget",
    track: "System design",
    topic: "Reliability",
    title: "At 99.9%, 10,000 of 10M requests may fail. That's your budget",
    hook: "An error budget turns reliability into a number you spend: on risky changes while it lasts, on fixes once it's gone.",
    points: [
      "An **SLI** is a measured ratio, like the share of requests that succeed in under 300 ms.",
      "An **SLO** is the internal target for it over a window, like 99.9% over 30 days.",
      "An **SLA** is the contract with penalties. Keep it looser than the SLO, as a safety margin.",
      "The **error budget** is 100% − SLO. Budget left: ship faster. Budget spent: freeze risky changes, fix reliability.",
    ],
    more: [
      {
        title: "Numbers to know",
        points: [
          "**99.9%**: 8.77 h of downtime a year, 43.2 min per 30 days.",
          "**99.99%**: 52.6 min a year, 4.32 min per 30 days. Less than it takes a human to get paged and log in.",
          "Each extra nine cuts allowed downtime by **10×** and costs far more than the last.",
          "A request through 10 services, each 99.9% available, succeeds only about **99%** of the time.",
        ],
      },
      {
        title: "Alert on burn rate",
        points: [
          "A **burn rate** of 14.4 on a 99.9% SLO (1.44% errors) spends 2% of the month's budget in an hour: page.",
          "Burn rate 6 for six hours spends 5%: page. Burn rate 1 for three days spends 10%: open a ticket.",
          "Alert on **symptoms** users feel, errors and latency against the SLO, not on CPU.",
        ],
      },
    ],
    code: `const errorBudget = (slo, requests) =>
  Math.round((1 - slo) * requests);
const burnRate = (errorRate, slo) => errorRate / (1 - slo);
const budgetSpent = (rate, hours, days = 30) =>
  (rate * hours) / (days * 24);

errorBudget(0.999, 10e6); // 10,000 requests may fail
burnRate(0.0144, 0.999);  // 14.4
budgetSpent(14.4, 1);     // 0.02: 2% in one hour, page`,
    say: "I'd set an SLO like 99.9% of requests under 300 ms over 30 days, keep the SLA looser, and page on burn rate rather than CPU. The error budget decides how fast we can ship.",
    source: "/learn/reliability-observability#slis-slos-slas-and-error-budgets",
  },
  {
    id: "retries-with-jitter",
    track: "System design",
    topic: "Reliability",
    title: "Three layers retrying three times is 27 calls to a sick service",
    hook: "Retries rescue a single request, but done carelessly they hit a struggling service hardest, exactly when it can least take it.",
    points: [
      "Put a **timeout** on every call, set from the dependency's p99: a p99 of 80 ms suggests about 250 ms.",
      "Back off with **full jitter**: wait a random time between 0 and `base × 2^attempt`.",
      "Without jitter, clients that failed together **retry together**, in synchronised waves.",
      "Retry only **idempotent** calls, and never a 400 or a validation error: it will fail the same way.",
      "Retry at **one layer**, and cap retries at about 10% of requests with a **retry budget**.",
    ],
    more: [
      {
        title: "The maths",
        points: [
          "3 layers × 3 attempts each = **27 calls** to the bottom service, exactly when it's already struggling.",
          "With a retry budget, load grows by **about 10%** when everything fails, instead of tripling.",
        ],
      },
      {
        title: "Deadlines",
        points: [
          "A call with no timeout can hang forever, holding a **thread, a connection and memory**.",
          "Pass a **deadline** downstream so inner calls give up when the caller already has: gRPC deadlines, `AbortSignal.timeout(ms)`.",
        ],
      },
    ],
    code: `async function retry(fn, { tries = 4, baseMs = 100 } = {}) {
  for (let i = 0; ; i++) {
    try { return await fn(); } catch (e) {
      if (i >= tries - 1 || e.retryable === false) throw e;
      const wait = Math.random() * baseMs * 2 ** i; // full jitter
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}`,
    say: "Every call gets a timeout. I'd retry only idempotent calls, with exponential backoff and full jitter, at a single layer and within a retry budget of about 10%, so retries can't become a storm.",
    source: "/learn/reliability-observability#timeouts-retries-and-jitter",
  },
  {
    id: "circuit-breaker-bulkhead",
    track: "System design",
    topic: "Reliability",
    title: "Stop calling a dependency that's down, and fence off slow ones",
    hook: "Without breakers and bulkheads, one slow dependency eats every worker and connection, and the whole service times out.",
    points: [
      "**Closed**: calls pass through and failures are counted. After 5 failures, the breaker opens.",
      "**Open**: every call fails at once for a cooldown, say 10 s. The caller uses a fallback; the dependency gets room to recover.",
      "**Half-open**: exactly one trial request goes through. Success closes the breaker; failure opens it for another cooldown.",
      "A **bulkhead** caps concurrent calls per dependency: 20 for payments, 10 for recommendations.",
      "When recommendations hangs, only its 10 slots fill up. Checkout **still has its 20**.",
    ],
    more: [
      {
        title: "Fallbacks",
        points: [
          "Recommendations down: show **bestsellers** from a cached list.",
          "Reviews down: hide the section. The product page **still sells**.",
          "Database writes down: **read-only mode** with a banner.",
          "Test fallbacks regularly: a fallback that never runs **quietly breaks**.",
        ],
      },
      {
        title: "Shedding load",
        points: [
          "**Shed early**: reject at the balancer with `503` and `Retry-After`, before parsing, auth or database calls.",
          "Shed from the bottom up: prefetch and analytics first, **critical** paths like checkout and login last.",
        ],
      },
    ],
    say: "I'd wrap the recommendations call in a circuit breaker with a cached bestseller list as the fallback, and give each dependency its own bulkhead, so a slow one can't take checkout down with it.",
    source: "/learn/reliability-observability#circuit-breakers-and-bulkheads",
  },

  // 8. Case Study: URL Shortener
  {
    id: "short-codes-range-allocation",
    track: "System design",
    topic: "URL shortener",
    title: "7 base62 characters give 3.5 trillion codes. Hand them out in ranges",
    hook: "Short codes must be unique, short and cheap to produce, and one shared counter is a hot spot and a single point of failure.",
    points: [
      "**Base62** uses `0-9`, `a-z` and `A-Z`: every character is URL-safe, unlike base64's `+` and `/`.",
      "Each app server reserves **1,000 ids** with one atomic `INCRBY` and hands them out from memory.",
      "At 40 writes/s, the whole cluster calls the counter about **once every 25 s**.",
      "A crashed server wastes the rest of its block. That's fine: ids must be **unique, not contiguous**.",
      "Hashing the URL needs no coordination, but truncating to 7 characters means **collisions**, and the same URL always gets the same code.",
    ],
    more: [
      {
        title: "Make codes unguessable",
        points: [
          "Base62 of a counter is sequential: ids 1000, 1001, 1002 become `g8`, `g9`, `ga`.",
          "**Scramble** first: multiply by a constant coprime with 62⁷, modulo 62⁷. Codes stay unique and 7 characters long.",
          "It's **obfuscation, not security**: two consecutive codes reveal the step. For private links, use random codes.",
        ],
      },
      {
        title: "Other options",
        points: [
          "**Random + check**: retry on a rare collision, about 0.17% once 6B of the 3.5T codes are used.",
          "**Snowflake-style** 64-bit ids are unique, but 11 base62 characters long and partly guessable.",
        ],
      },
    ],
    code: `const BLOCK = 1_000; let next = 0, end = 0, refill = null;
async function nextId(redis) {
  while (next >= end) {
    refill ??= redis.incrby("url:id", BLOCK) // the block's top
      .then((top) => { end = top; next = top - BLOCK; })
      .finally(() => { refill = null; });
    await refill; // concurrent callers share one refill
  }
  return next++;
}`,
    say: "Each server reserves a block of 1,000 ids with one INCRBY, scrambles each id and encodes it as 7 base62 characters. At 40 writes a second, the counter is hit about once every 25 seconds.",
    source: "/learn/case-url-shortener#generating-short-codes",
  },
  {
    id: "redirect-301-vs-302",
    track: "System design",
    topic: "URL shortener",
    title: "301 or 302 decides whether you ever see a click again",
    hook: "Both send the browser to the long URL. The difference is who remembers the answer.",
    points: [
      "A **301** is cached by browsers and CDNs, often for a very long time, so only the first click per browser reaches you.",
      "A **302** comes back to you on every click: you can count it, expire the link, or disable it for abuse.",
      "Default to **302**. Pick 301 only when analytics don't matter.",
      "A 301 mistake is cached in **browsers you can't reach**, so changing the destination later is hard.",
    ],
    more: [
      {
        title: "Middle ground",
        points: [
          "For very hot links, a 302 with `Cache-Control: max-age=60` lets the **CDN** absorb the load.",
          "You still see roughly **one request per edge** per minute.",
        ],
      },
      {
        title: "Watch out",
        points: [
          "Returning 301 and then promising **click analytics**.",
          "Caching a link **longer than it lives**: cap the cache TTL at the link's expiry.",
        ],
      },
    ],
    say: "I'll return a 302 because we promised click analytics. The cost is that every click reaches our servers. If analytics stop mattering, I'd switch to a 301 and let the CDN serve it.",
    source: "/learn/case-url-shortener#301-vs-302",
  },
  {
    id: "shortener-read-path",
    track: "System design",
    topic: "URL shortener",
    title: "40 writes/s and 4,000 redirects/s: all the work is on the read path",
    hook: "If creating links is down, people retry. If redirects are down, every link ever shared is broken at once.",
    points: [
      "The write path is tiny: one **Postgres primary** handles 40 inserts/s while barely noticing.",
      "The **CDN** caches 301s and short-max-age 302s at the edge, close to the user.",
      "**Redis** cache-aside with a one-day TTL: at a 95% hit ratio, Postgres sees only 200 reads/s.",
      "A viral link (50K redirects/s on one key) gets an **in-process L1** with a few seconds of TTL on every server.",
      "Click events go onto a **queue** and are never awaited, so analytics can't slow a redirect down.",
    ],
    more: [
      {
        title: "The numbers",
        points: [
          "100M new URLs a month ≈ **40 writes/s**. At 100 reads per write, ≈ 4,000 redirects/s, and about 12K/s at a 3× peak.",
          "Storage: 6B URLs over 5 years × ~500 B ≈ **3 TB**, about 9 TB with 3 replicas.",
          "Hot set: 10M codes × ~600 B ≈ **6 GB**, one Redis node.",
        ],
      },
      {
        title: "Click analytics",
        points: [
          "A worker consumes click events in batches and bulk-inserts them into a **columnar store** such as ClickHouse.",
          "The stats API reads **pre-aggregated rollups**, not raw events.",
          "Never put a click counter in `urls`: 4,000 updates/s would make a read-only table **write-hot**.",
          "Filter out bots and **link-preview fetchers**, and store a country instead of the raw IP address.",
        ],
      },
    ],
    say: "Writes are 40 a second, so one Postgres primary is plenty. Redirects are 4,000 a second, so I'd serve them from the CDN and Redis, add an L1 for viral links, and publish clicks to a queue without awaiting.",
    source: "/learn/case-url-shortener#scaling-the-reads",
  },

  // 9. Case Study: Notification System
  {
    id: "otp-priority-lanes",
    track: "System design",
    topic: "Notifications",
    title: "An OTP must never wait behind a marketing blast",
    hook: "In one shared queue, a 1M-message campaign drained at 2,000/s takes about 8 minutes, and the login code expires before it arrives.",
    points: [
      "Split queues by **channel and priority**: `notif.sms.critical`, `notif.push.high`, `notif.push.low`.",
      "Give each queue its own **consumer group**, so a backlog in one never steals workers from another.",
      "Critical lanes get **dedicated workers** with spare capacity. Marketing is throttled and paused first under load.",
      "Reserve **provider capacity** for critical traffic too: a campaign can exhaust the provider's rate limit.",
      "The send API answers `202 Accepted`: the request only means **queued**.",
    ],
    more: [
      {
        title: "Quiet hours",
        points: [
          "Store an **IANA time zone** per user: `Asia/Kolkata`, not `+05:30`, which breaks when daylight saving changes.",
          "Evaluate quiet hours **at send time**, in the user's zone. Critical messages ignore them.",
          "Low-priority messages get a `notBefore` and wait in a **delayed queue**, such as a Redis sorted set.",
        ],
      },
      {
        title: "Large campaigns",
        points: [
          "A 10M-user campaign is a **batch job**: resolve the segment in pages and enqueue in batches of about 1,000.",
          "At 5,000 sends/s, 10M messages take about **33 minutes**, so plan for it.",
          "Support **pause and cancel**, so a typo can be stopped mid-send.",
        ],
      },
    ],
    say: "I'd split queues by channel and priority, with dedicated workers and reserved provider capacity for critical traffic, so a campaign can only fill the low-priority lane and an OTP goes out in seconds.",
    source: "/learn/case-notification-system#priorities-the-otp-never-waits",
  },
  {
    id: "notification-dedupe",
    track: "System design",
    topic: "Notifications",
    title: "Exactly-once to a phone is impossible. Aim for effectively once",
    hook: "Duplicates come from client retries, re-emitted events and queue redelivery, so you defend against them in layers.",
    points: [
      "**API idempotency key**: the first request stores key → notificationId with `SET NX`. A retry gets the same id.",
      "**Deterministic ids**: every message is `eventId:channel`, however many times the event is processed.",
      "**Check before sending**: skip any id with a `sent:<id>` key, and set that key only after the provider accepts.",
      "A crash after the provider accepts but before `sent:<id>` is written still **sends again**.",
      "Narrow that window by passing the id as the provider's **idempotency key**, where it supports one.",
    ],
    more: [
      {
        title: "Providers fail",
        points: [
          "Put each provider behind a **circuit breaker**, with a failover order per channel.",
          "**Transient** errors (timeout, 429, 5xx): try the next provider; the queue retries with backoff and jitter.",
          "**Permanent** errors (invalid number, hard bounce): don't retry. Mark it failed, delete the token or suppress the address.",
          "Track **delivery rate per provider**: one that accepts but silently doesn't deliver is worse than one that errors.",
        ],
      },
      {
        title: "Delivery webhooks",
        points: [
          "Verify the signature over the **raw body**, before parsing it.",
          "Callbacks arrive out of order: rank the statuses and **never move one backwards**.",
        ],
      },
    ],
    code: `async function deliver(msg, provider) {
  if (await redis.exists(\`sent:\${msg.id}\`)) return "duplicate";
  const id = await provider.send(msg, { idempotencyKey: msg.id });
  // Mark it only after the provider accepts, so a failed send retries
  await redis.set(\`sent:\${msg.id}\`, id, "EX", 7 * 86_400);
  return "sent";
}`,
    say: "Each message gets a deterministic id, eventId:channel. Workers skip ids already marked sent, mark them only after the provider accepts, and pass the id to the provider as its idempotency key.",
    source: "/learn/case-notification-system#dedupe-and-idempotency",
  },

  // 10. Interview Playbook
  {
    id: "45-minute-plan",
    track: "System design",
    topic: "Interview",
    title: "5, 5, 15, 15, 5: the shape of a 45-minute design interview",
    hook: "A fixed structure hits every row of the rubric even when you're nervous, and frees your working memory for the actual problem.",
    points: [
      "**Minutes 0–5**: functional requirements, non-functional ones with numbers, and an out-of-scope list.",
      "**5–10**: average and peak QPS, storage, the read:write ratio, and the 3–5 endpoints that matter.",
      "**10–25**: components, labelled arrows, a numbered request flow and the data model. Breadth first.",
      "**25–40**: two deep dives on the riskiest areas, each with its failure modes.",
      "**40–45**: trade-offs, the next bottleneck, what you'd do with more time, and a 30-second summary.",
    ],
    more: [
      {
        title: "Managing the clock",
        points: [
          "Behind at a checkpoint? Say so and move on: \"I'll keep the data model brief so we have time for the deep dives.\"",
          "Managing the clock **out loud** is itself a senior signal.",
        ],
      },
      {
        title: "When it goes wrong",
        points: [
          "**Stuck**: go back to the requirements and numbers, simplify to one region and one server, then scale step by step.",
          "**Pushback**: treat it as a hint. Restate the concern, then defend with numbers or adapt explicitly.",
          "**A gap**: \"I don't know X in detail, but here's how I'd reason about it.\" Reasoning beats bluffing.",
        ],
      },
      {
        title: "Common mistakes",
        points: [
          "Jumping to **tools** (Kafka, Cassandra, Kubernetes) before the requirements.",
          "**Over-engineering**: sharding and multi-region for 40 writes/s.",
          "Ignoring **failure modes**: every box can die, and every network call can time out.",
        ],
      },
    ],
    say: "I'll spend about five minutes on requirements, five on numbers and the API, fifteen on the high-level design, fifteen on two deep dives, and keep the last five for trade-offs.",
    source: "/learn/interview-playbook#the-45-minute-plan",
  },
  {
    id: "trade-off-template",
    track: "System design",
    topic: "Interview",
    title: "State every choice as X because Y, at the cost of Z",
    hook: "Interviewers score reasoning, not a perfect answer, and a choice stated as a fact scores lowest on the rubric.",
    points: [
      "Say what you chose, what you **gave up**, and when you'd **choose differently**.",
      "Template: \"I'll use X because Y. The cost is Z. If W changes, I'd switch to V.\"",
      "Template: \"We could do A or B. A is simpler, B scales further. Given our 4K QPS, A is enough for now.\"",
      "Tie each choice to a **number** from your estimate. Without numbers, no choice can be justified.",
    ],
    more: [
      {
        title: "Filled in",
        points: [
          "\"I'll return a **302** because we promised click analytics. The cost is that every click reaches our servers.\"",
          "\"I'll put SMS on **separate priority queues** because an OTP can't wait behind a campaign. The cost is more queues and workers to run.\"",
        ],
      },
      {
        title: "What the bar looks like",
        points: [
          "**Mid**: names some trade-offs.",
          "**Senior**: justifies each choice, and says when to switch.",
          "**Staff**: adds cost, complexity and team impact.",
        ],
      },
    ],
    say: "We could use one counter or range allocation. One counter is simpler; ranges remove the hot spot. At 40 writes a second either works, so I'd start with ranges only because it's a few lines more.",
    source: "/learn/interview-playbook#talking-through-trade-offs",
  },
];
