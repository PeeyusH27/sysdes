# 04: Home, the HLD path, and the 10 lessons

Each lesson keeps the source's content (why, the 4 sub-topic cards, code, Q&A, "next") and adds new depth, marked **NEW**. All code is plain JavaScript (ESM, Node 20+ or the browser) and lives in the lesson's `snippets/` folder, where tests run it (01 §4.3). Snippets that need Redis or Postgres assume ready clients named `redis` (ioredis), `pool` (pg) and `queue`, and are marked display-only.

## 0. Lesson page template

| # | Section | Component | Notes |
|---|---|---|---|
| 1 | Header: step N of 10, title, minutes, outcomes, progress ring | `LessonLayout` | Outcomes come from the registry |
| 2 | TL;DR | `TLDR` | 2–3 sentences to say out loud in an interview |
| 3 | Why it matters | MDX prose | From the source's `why` |
| 4 | Main animated diagram | `FlowDiagram` / `SequenceDiagram` | At least 2 scenarios |
| 5 | Concept sections | MDX `##` sections | The source's 4 cards become 6–10 full sections |
| 6 | Interactive widget(s) | Widgets (02 §7) | |
| 7 | Code | `CodeTabs` | Source snippets (fixed) plus new ones |
| 8 | Numbers to remember | `NumbersTable` | Where relevant; also collected on `/cheatsheet` |
| 9 | Common mistakes | `Callout kind="warning"` list | |
| 10 | Interview questions | `FollowUps` (question + answer) | 4–5 per lesson |
| 11 | Quiz | `Quiz` | 3 multiple-choice questions; a score ≥ 2/3 marks the lesson complete |
| 12 | Next step | `PrevNext` | From the source's `nx` |

---

## 1. Home `/`

- **Hero:** "Learn system design, then practice it." Behind the headline, a looping **request-journey animation** (Client → CDN → LB → Service → Redis/Postgres, with packets and a cache hit/miss alternating every few seconds). It's the only diagram that auto-plays, and it shows a static frame with reduced motion.
- **Four entry cards:** Learn (10 steps), Deep dives (6), Practice questions (N), Playground (build and get graded). Each card has a small animated thumbnail that plays on hover or focus.
- **Continue where you left off:** the next incomplete lesson and recently viewed questions, read from the progress store after hydration.
- **Choose your track:**
  - Frontend: Learn 1, 2, 4 → Q4, Q5 → Deep dive 4.
  - Backend: Learn 1–7 → Q1–Q3.
  - Full-stack: Learn 1–5 → Q6, Q7 → Playground.
- **Teaser widget:** a cut-down CapacityCalculator ("How many servers does 10M DAU need?").
- **Footer:** cheatsheet, glossary, GitHub, theme and motion settings.

## 2. Learn index `/learn`

- An animated SVG **metro map**: 10 stations on one line, with case studies as a branch. Completed stations are filled, the next one pulses, and hovering a station shows its outcomes.
- Below the map, a list of steps (title, minutes, outcomes, completion state).
- **Resume** button and an overall progress bar.

---

## Step 1: Requirements and Estimation (`/learn/requirements-estimation`, 25 min)

**Outcomes:** turn a vague prompt into functional and non-functional requirements; estimate QPS, storage, bandwidth, memory and servers in under 5 minutes.

**Sections**

1. Why it matters (source).
2. **NEW** The interview flow: a `Timeline` of the 45-minute plan, plus the source's flow diagram with a "walkthrough" scenario that lights each stage and says what to produce in it.
3. Functional requirements. **NEW:** how to draw them out (who are the users, what are the 3 core actions, what can be cut); a must/should/won't list; a worked example for "Twitter-lite".
4. Non-functional requirements. **NEW:** a table mapping each requirement to its design consequence:

   | Requirement | Example target | What it forces |
   |---|---|---|
   | Latency | p99 < 200 ms for reads | Caches, CDN, precomputation |
   | Availability | 99.99% | Redundancy across zones, no single points of failure, graceful degradation |
   | Consistency | Strong for payments, eventual for likes | Different stores per feature |
   | Durability | Never lose an order | Replication, write-ahead log, backups |
   | Scale | 100M DAU | Sharding, queues, horizontal scale |

5. Back-of-envelope math (source formulas). **NEW:** the five quantities to estimate (QPS, peak, storage, bandwidth, cache memory) and server count.
6. Read vs write ratio (source), with the consequence for each ratio.
7. **NEW** Worked example "Instagram-lite", done step by step on screen:
   - 100M DAU, 10% upload 2 photos/day → 20M uploads/day ≈ **230/s** (peak ~700/s).
   - 500 KB per photo → **10 TB/day** of media, ~3.65 PB/year, so object storage plus a CDN.
   - Feed: 10 views/user/day → 1B/day ≈ **11.6K/s** (peak ~35K/s).
   - Each view loads 10 thumbnails × 50 KB → about 5.8 GB/s, or **~46 Gbps** egress, which is why a CDN is non-negotiable.
8. **NEW** Numbers to remember (table below).
9. **NEW** CapacityCalculator widget, with presets: Twitter-lite, Instagram-lite, URL shortener, chat.

**Diagrams:** `interviewFlow` (FlowSpec from the source, scenario "walkthrough") and `interviewTimeline` (TimelineSpec: 5/5/15/15/5 minutes).

**Charts:** the source's "Peak QPS by DAU" bar chart becomes **three stat tiles** (1M → ~350, 10M → ~3,500, 100M → ~35,000 peak QPS) linked to the calculator (02 §6.5).

**Code: `snippets/estimate.js`** (replaces the source's version and adds replicas, bandwidth, servers and cache size)

```js
const SECONDS_PER_DAY = 86_400;

// Rough numbers, rounded for saying aloud. Inputs are per day unless noted.
export function estimate({ dau, actionsPerUser, readWriteRatio = 10, bytesPerWrite = 1_000, years = 5, replicas = 3, peakFactor = 3 }) {
  const qps = (dau * actionsPerUser) / SECONDS_PER_DAY;
  const writeQps = qps / (readWriteRatio + 1);
  const readQps = qps - writeQps;
  const storageBytes = writeQps * SECONDS_PER_DAY * 365 * years * bytesPerWrite * replicas;
  return {
    avgQps: Math.round(qps),
    peakQps: Math.round(qps * peakFactor),
    readQps: Math.round(readQps),
    writeQps: Math.round(writeQps),
    storageTB: +(storageBytes / 1e12).toFixed(1),
    ingressMBps: +((writeQps * bytesPerWrite) / 1e6).toFixed(2),
  };
}

// Servers at a target utilization (headroom), given what one instance can handle
export const serversNeeded = (peakQps, perServerQps = 1_000, headroom = 0.6) =>
  Math.ceil(peakQps / (perServerQps * headroom));

// Upper bound for caching the hottest 20% of a day's reads (80/20 rule)
export const cacheGB = (readQps, bytesPerItem, hotFraction = 0.2) =>
  (readQps * SECONDS_PER_DAY * hotFraction * bytesPerItem) / 1e9;

// estimate({ dau: 10e6, actionsPerUser: 10 })
// → { avgQps: 1157, peakQps: 3472, readQps: 1052, writeQps: 105, storageTB: 49.8, ingressMBps: 0.11 }
// serversNeeded(3472) → 6 · cacheGB(1052, 1_000) → ~18.2
```

The source computed about 17 TB because it ignored replication. With 3 replicas it's about 49.8 TB, and the lesson calls out that difference.

```js
// snippets/estimate.test.js
import { test, expect } from 'vitest';
import { estimate, serversNeeded } from './estimate.js';

test('10M DAU × 10 actions/day', () => {
  const e = estimate({ dau: 10e6, actionsPerUser: 10 });
  expect(e).toMatchObject({ avgQps: 1157, peakQps: 3472, writeQps: 105, storageTB: 49.8 });
  expect(serversNeeded(e.peakQps)).toBe(6);
});
```

**Numbers to remember** (approximate; the cheatsheet repeats them)

| Quantity | Value | Shortcut |
|---|---|---|
| Seconds per day | 86,400 ≈ 10⁵ | 1M requests/day ≈ 12/s |
| Seconds per month | ≈ 2.6M | 100M/month ≈ 40/s |
| Seconds per year | ≈ 31.5M | |
| 2¹⁰ / 2²⁰ / 2³⁰ / 2⁴⁰ | ≈ thousand / million / billion / trillion | KB → MB → GB → TB |
| Main memory reference | ~100 ns | |
| SSD random read | ~100 µs | |
| Round trip inside a datacenter | ~0.5 ms | |
| Redis GET over the network | ~0.5–1 ms | |
| Indexed database read | ~1–10 ms | |
| HDD seek | ~10 ms | |
| Cross-continent round trip | ~100–150 ms | |
| Typical web API instance | hundreds to a few thousand req/s | An assumption; say "I'd measure" |
| One Redis instance | ~100K simple ops/s | |
| One Postgres primary | thousands to tens of thousands of simple queries/s | Depends heavily on the query |

**Common mistakes:** spending 10 minutes on arithmetic; forgetting replication and indexes in storage; mixing bits and bytes (Gbps vs GB/s); estimating without stating assumptions; never using the numbers afterwards ("so we need a cache because…").

**Interview Q&A**

- **How do you estimate QPS?** (source) State your assumptions, then average = DAU × actions / 86,400, and multiply by 2–5 for peak. Split reads and writes because they scale differently, and name the dominant bottleneck.
- **Estimate storage for 5 years of tweets.** 200M DAU × 2 tweets = 400M/day. At ~1 KB with metadata that's 400 GB/day, 146 TB/year, 730 TB over 5 years, and ×3 replicas ≈ 2.2 PB. Media goes to object storage behind a CDN and is estimated separately.
- **Why split read and write QPS?** Reads scale with caches, replicas and CDNs. Writes scale with sharding, queues and write-optimised stores. A 100:1 system and a 1:1 system end up with different architectures.
- **What peak factor do you use?** 2–5× average for normal daily traffic, and 10× or more for event-driven products (sports, sales, launches). Size for peak at about 60–70% utilization and autoscale the rest.

**Quiz**

1. 50M DAU × 20 actions/day is roughly what average QPS?
   - 1.2K
   - **11.6K** ✓
   - 116K
2. Which non-functional requirement most directly decides between a strongly consistent SQL primary and an AP store?
   - Latency
   - **Consistency** ✓
   - Cost
3. 1M writes/day × 2 KB × 3 replicas for 1 year is roughly:
   - 730 GB
   - **2.2 TB** ✓
   - 22 TB

---

## Step 2: Client, API and Load Balancing (`/learn/api-load-balancing`, 30 min)

**Outcomes:** explain the request path from DNS to the database; choose an LB algorithm and health-check strategy; design REST endpoints with correct status codes, cursor pagination and idempotency.

**Sections**

1. Why it matters (source).
2. **NEW** The request path: DNS (GeoDNS/Anycast) → CDN → load balancer → API gateway → services → data. One sentence on what each hop adds.
3. Stateless services (source). **NEW:** where state goes instead (sessions in Redis, files in S3, everything else in the database), and the sticky-session pitfall shown as a scenario.
4. L4 vs L7 (source). **NEW** comparison table:

   | | L4 (TCP/UDP) | L7 (HTTP) |
   |---|---|---|
   | Sees | IP and port | URL, headers, cookies |
   | Can do | Fast forwarding, any protocol | Path routing, TLS termination, retries, header rewrites, canaries |
   | Cost | Very low | More CPU per request |

5. **NEW** Balancing algorithms: round robin, weighted (smooth WRR), least connections, power of two choices (P2C), IP or consistent hash (when you need affinity). When each one wins.
6. **NEW** Health checks: active vs passive; liveness vs readiness; connection draining on deploy; thresholds (for example 3 failures to mark down, 2 successes to mark up).
7. REST API design (source). **NEW:** resources and verbs table; status-code table (200, 201, 202, 204, 301/302, 304, 400, 401, 403, 404, 409, 422, 429, 500, 503); offset vs cursor pagination; idempotency keys; versioning (`/v1` vs a header); errors as RFC 9457 problem details:

   ```json
   { "type": "https://example.com/problems/out-of-stock", "title": "Out of stock",
     "status": 409, "detail": "SKU a1 has 0 units left", "instance": "/orders/123" }
   ```

8. **NEW** API styles compared: REST, GraphQL, gRPC, WebSocket and SSE (best fit, strengths, costs).
9. API gateway (source). **NEW:** the BFF (backend-for-frontend) pattern for web vs mobile clients.

**Diagram: `requestPath`**, scenarios:

- **Happy path:** packets fan out from the LB to A, B and C in turn.
- **Instance failure:** C is marked `down` after failed health checks, and traffic reroutes to A and B.
- **Sticky-session pitfall:** the session lives in B's memory, the next request lands on A, and the user is logged out. The fix appears in a second scenario with a Redis session store.

**Widgets:**

- **LoadBalancerSim** (P1): toggle "make server C slow". Round robin keeps piling requests onto C, while least-connections and P2C adapt.
- **DiagramQuiz** (P3): place the load balancer.

**Code**

The source's `round-robin.js` with health skipping is kept as is. New files:

```js
// snippets/least-connections.js: send each request to the server with the fewest in-flight requests
export class LeastConnections {
  constructor(urls) { this.servers = urls.map(url => ({ url, active: 0, healthy: true })); }
  async handle(request, send) {
    const candidates = this.servers.filter(s => s.healthy);
    if (!candidates.length) throw new Error('no healthy servers');
    const s = candidates.reduce((a, b) => (b.active < a.active ? b : a));
    s.active++;
    try { return await send(s.url, request); }
    finally { s.active--; }
  }
}
```

```js
// snippets/smooth-weighted-rr.js: nginx's smooth weighted round robin
// weights { a: 5, b: 1, c: 1 } → a a b a c a a (spread out, not a burst of five a's)
export function createWeightedPicker(servers) {            // [{ url, weight }]
  const state = servers.map(s => ({ ...s, current: 0 }));
  const total = state.reduce((n, s) => n + s.weight, 0);
  return function pick() {
    let best = null;
    for (const s of state) {
      s.current += s.weight;
      if (!best || s.current > best.current) best = s;
    }
    best.current -= total;
    return best.url;
  };
}
```

```js
// snippets/p2c.js: power of two choices. Sample two servers, use the less loaded one.
// Nearly as good as least-connections, with no global scan or shared state.
export function pickP2C(servers, rand = Math.random) {
  const healthy = servers.filter(s => s.healthy);
  if (healthy.length < 2) return healthy[0];
  const a = healthy[Math.floor(rand() * healthy.length)];
  let b = healthy[Math.floor(rand() * (healthy.length - 1))];
  if (b === a) b = healthy[healthy.length - 1];             // guarantees b !== a, uniformly
  return a.active <= b.active ? a : b;
}
```

```js
// snippets/idempotency.js: Express middleware. Repeats of a POST with the same Idempotency-Key replay the stored response.
export function idempotency(redis, ttlSec = 86_400) {
  return async (req, res, next) => {
    const key = req.get('Idempotency-Key');
    if (!key) return next();
    const redisKey = `idem:${req.user?.id ?? 'anon'}:${key}`;
    const claimed = await redis.set(redisKey, JSON.stringify({ state: 'pending' }), 'EX', ttlSec, 'NX');
    if (!claimed) {
      const saved = JSON.parse((await redis.get(redisKey)) ?? '{}');
      if (saved.state === 'done') return res.status(saved.status).json(saved.body);
      return res.status(409).json({ error: 'A request with this key is still in progress' });
    }
    const json = res.json.bind(res);
    res.json = body => {
      const write = res.statusCode < 500
        ? redis.set(redisKey, JSON.stringify({ state: 'done', status: res.statusCode, body }), 'EX', ttlSec)
        : redis.del(redisKey);                               // let the client retry server errors
      write.catch(() => {});
      return json(body);
    };
    next();
  };
}
// If a handler crashes without responding, the key stays "pending" until the TTL expires: keep TTLs modest.
```

```js
// snippets/cursor-pagination.js: stable pages even while new rows arrive
const encode = v => Buffer.from(JSON.stringify(v)).toString('base64url');
const decode = s => JSON.parse(Buffer.from(s, 'base64url').toString());

app.get('/api/posts', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const cursor = req.query.cursor ? decode(req.query.cursor) : null;      // { id } of the last item seen
  const { rows } = await pool.query(
    `SELECT id, title, created_at FROM posts
     WHERE ($1::bigint IS NULL OR id < $1)
     ORDER BY id DESC LIMIT $2`,                                         // ids are time-ordered (bigserial / Snowflake)
    [cursor?.id ?? null, limit + 1]);                                    // one extra row tells us if there's a next page
  const page = rows.slice(0, limit);
  res.json({ data: page, nextCursor: rows.length > limit ? encode({ id: page.at(-1).id }) : null });
});
```

> Cursor on `(created_at, id)` instead? Postgres stores microseconds but a JS `Date` keeps milliseconds, so serialize the timestamp as text (`created_at::text`) or rows will be skipped.

```js
// snippets/health.js: liveness vs readiness, plus draining on deploy
let shuttingDown = false;
app.get('/livez', (_req, res) => res.sendStatus(200));                   // the process is alive
app.get('/readyz', async (_req, res) => {                                // should the LB send traffic here?
  if (shuttingDown) return res.sendStatus(503);
  try { await pool.query('SELECT 1'); res.sendStatus(200); }
  catch { res.sendStatus(503); }
});
process.on('SIGTERM', () => {
  shuttingDown = true;                                                   // readiness fails, so the LB stops routing here
  setTimeout(() => server.close(() => process.exit(0)), 10_000);         // finish in-flight requests, then exit
});
```

**Common mistakes:** keeping sessions in memory; retrying non-idempotent POSTs; using offset pagination for feeds; letting the readiness check fail on optional dependencies (which takes the whole fleet out); returning 200 with an error body.

**Interview Q&A**

- **Why must services be stateless to scale horizontally?** (source)
- **L4 or L7?** L4 when you only need fast TCP forwarding (databases, custom protocols). L7 when you need routing by path or header, TLS termination, retries or canaries. Most web stacks use both: an L4 network LB in front of an L7 proxy.
- **How does the LB know an instance is unhealthy?** Active checks hit `/readyz` every few seconds with up/down thresholds. Passive checks eject instances whose error rate spikes. On deploy, readiness fails first so connections drain before the process exits.
- **REST, GraphQL or gRPC?** REST for public, cacheable resource APIs. GraphQL when many clients need different shapes of the same data (watch for N+1 and caching). gRPC for internal service-to-service calls (typed, fast, streaming).
- **How do you make POST retries safe?** The client sends an `Idempotency-Key`. The server claims it atomically (`SET NX`), stores the response, and replays it for repeats. Concurrent duplicates get 409.

**Quiz**

1. Which algorithm adapts when one server becomes slow?
   - Round robin
   - **Least connections or P2C** ✓
   - IP hash
2. "Accepted, processing asynchronously" returns which status?
   - 200
   - **202** ✓
   - 204
3. Why use cursor pagination for feeds?
   - Smaller payloads
   - **Stable pages while new items arrive, and fast deep pages** ✓
   - Better caching

---

## Step 3: Databases and Scaling (`/learn/databases-scaling`, 35 min)

**Outcomes:** pick a store by access pattern; design indexes; explain isolation levels; scale reads with replicas and handle lag; know when and how to shard.

**Sections**

1. Why it matters (source).
2. **NEW** How storage engines work: B-tree (read-optimised, in-place updates; Postgres, MySQL) vs LSM tree (write-optimised, append and compact; Cassandra, RocksDB). Comparison table.
3. **NEW** Transactions and isolation levels:

   | Level | Dirty read | Non-repeatable read | Phantom | Write skew |
   |---|---|---|---|---|
   | Read committed (Postgres default) | ✗ | possible | possible | possible |
   | Repeatable read (MySQL InnoDB default) | ✗ | ✗ | possible by the SQL standard; Postgres's snapshot prevents it | possible |
   | Serializable | ✗ | ✗ | ✗ | ✗ |

   Use SERIALIZABLE, or explicit locks, for invariants that span rows (on-call scheduling, double booking), and retry on serialization failures.
4. Indexes (source). **NEW:** composite indexes and the leftmost-prefix rule; covering indexes (`INCLUDE`); partial indexes; the write cost of each index; reading `EXPLAIN ANALYZE`; `CREATE INDEX CONCURRENTLY` on large tables.
5. **NEW** Modeling: normalize first, then denormalize for hot reads; the N+1 query problem and DataLoader.
6. SQL vs NoSQL (source), with a link to Deep dive 3.
7. Replication (source). **NEW:**
   - Sync, async and semi-sync replication.
   - Leader–follower, multi-leader and leaderless setups.
   - Problems caused by lag: read-your-writes and monotonic reads, and how to fix each.
8. **NEW** Failover: detecting the failure, promoting a replica, split-brain and fencing, and how much data async replication can lose (RPO).
9. Sharding (source), with a checklist for choosing a shard key (high cardinality, even spread, matches the main query, avoids hot ranges) and a link to Deep dive 2.
10. **NEW** Backups and point-in-time recovery: base backups plus WAL archiving; restore drills.

**Diagram: `primaryReplica`**, scenarios:

- **Write:** goes to the primary, which replicates to both replicas (`replication` edge style).
- **Read from a replica.**
- **Stale read:** the replica lags 2 s, so a user doesn't see their own update. The fix scenario reads from the primary for 5 s after a write.
- **Failover:** the primary is marked `down`, replica 1 is promoted, and the app's connection string moves.

**Widgets:**

- **ReplicationLag** (P2).
- **DiagramQuiz** (P3): place the read replica.

**Code**

The source's `shardFor` (md5 % N) is kept. New files:

```js
// snippets/read-your-writes.js: after a user writes, their reads go to the primary for a short window
const STICKY_MS = 5_000;                                  // longer than typical replica lag

export async function query(sql, params, { userId, write = false } = {}) {
  if (write) {
    const result = await primary.query(sql, params);
    if (userId) await redis.set(`rw:${userId}`, Date.now(), 'PX', STICKY_MS);
    return result;
  }
  const recentlyWrote = userId && (await redis.exists(`rw:${userId}`));
  return (recentlyWrote ? primary : pickReplica()).query(sql, params);
}
```

```js
// snippets/serializable-retry.js: Postgres aborts conflicting transactions (40001) and deadlocks (40P01);
// the fix is to retry the whole transaction
export async function withSerializable(pool, work, attempts = 5) {
  for (let i = 1; ; i++) {
    const c = await pool.connect();
    try {
      await c.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
      const result = await work(c);
      await c.query('COMMIT');
      return result;
    } catch (e) {
      await c.query('ROLLBACK').catch(() => {});
      if (!['40001', '40P01'].includes(e.code) || i === attempts) throw e;
      await new Promise(r => setTimeout(r, Math.random() * 20 * 2 ** i));     // jittered backoff
    } finally {
      c.release();
    }
  }
}
```

```sql
-- snippets/indexes.sql: a composite index follows the leftmost-prefix rule
CREATE INDEX CONCURRENTLY orders_user_created ON orders (user_id, created_at DESC);
-- uses it fully:          WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20
-- uses the prefix:        WHERE user_id = $1 AND status = 'paid'
-- generally can't use it: WHERE created_at > now() - interval '1 day'   (no user_id)
EXPLAIN ANALYZE SELECT id, total FROM orders WHERE user_id = 42 ORDER BY created_at DESC LIMIT 20;
```

```js
// snippets/dataloader.js: fixes N+1 by batching lookups made in the same tick
import DataLoader from 'dataloader';

const authors = new DataLoader(async ids => {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = ANY($1)', [ids]);
  const byId = new Map(rows.map(r => [r.id, r]));
  return ids.map(id => byId.get(id) ?? null);           // results must match the order of ids
});
// 1 query for 20 posts' authors instead of 20:
const postAuthors = await Promise.all(posts.map(p => authors.load(p.author_id)));
```

**Common mistakes:** indexing every column; sharding before trying indexes, caching and replicas; reading from replicas right after a write; choosing a monotonically increasing shard key; never testing a restore.

**Interview Q&A**

- **How would you shard a users table, and what can go wrong?** (source)
- **How do you handle replication lag?** Route a user's reads to the primary for a few seconds after they write (read-your-writes). Or pin a session to one replica (monotonic reads). Or read at a log position: the client sends the LSN of its write, and the replica waits until it has caught up to that LSN.
- **SQL or NoSQL for orders vs an activity feed?** Orders need transactions, constraints and ad-hoc queries, so SQL. An activity feed is huge, append-heavy and read by key and time, so a wide-column or key-value store, or Redis for the hot part.
- **How do you stop two people booking the same slot?** A unique constraint, a conditional `UPDATE … WHERE status = 'available'`, or SERIALIZABLE with retry. Explain why a check-then-insert at READ COMMITTED races.
- **How do you add an index to a 500M-row table without downtime?** `CREATE INDEX CONCURRENTLY`, watch replication lag, and verify with `EXPLAIN`. Then remove now-redundant indexes.

**Quiz**

1. Does an index on `(user_id, created_at)` help `WHERE created_at > …` alone?
   - **Not efficiently** ✓
   - Yes, fully
2. The main risk of async replication during failover is:
   - Slower writes
   - **Losing the last few committed writes** ✓
   - Deadlocks
3. Postgres's default isolation level is:
   - **Read committed** ✓
   - Repeatable read
   - Serializable

---

## Step 4: Caching (`/learn/caching`, 30 min)

**Outcomes:** place caches at the right layer; pick a caching pattern and TTL; prevent stampede, penetration and avalanche; use HTTP caching headers.

**Sections**

1. Why it matters (source).
2. **NEW** Where caches live: a FlowDiagram `cacheLayers` (browser → CDN → reverse proxy → in-process memory → Redis → DB buffer pool), with the typical latency and hit ratio of each.
3. **NEW** What to cache and key design (`product:42:v3`, including locale or segment in the key, never caching per-user data in a shared CDN).
4. Cache-aside, write-through and write-behind (source). **NEW:** read-through, write-around and refresh-ahead, plus a comparison table that links to Deep dive 1.
5. Eviction and TTL (source). **NEW:** Redis `maxmemory-policy` (`allkeys-lru`, `allkeys-lfu`, `volatile-*`), and choosing a TTL by how costly staleness is.
6. **NEW** Invalidation and the classic race. A slow reader misses, loads the old row, the writer updates the DB and deletes the key, then the slow reader writes the old value back, which stays stale until the TTL. Fixes: a short TTL as a safety net, a delayed second delete, versioned keys, or CDC-driven invalidation.
7. Failure modes (source), expanded:
   - **Stampede:** lock plus single-flight.
   - **Penetration:** negative caching or a Bloom filter.
   - **Avalanche:** jittered TTLs and staggered warm-up.
   - **Hot keys:** an L1 in-process cache, or a key replicated as `key#1…#N`.
8. **NEW** HTTP caching for frontend developers:
   - `Cache-Control` directives.
   - `ETag` and `304 Not Modified`.
   - Hashed, immutable static assets.
   - `stale-while-revalidate`.
   - `Vary`, and how CDN cache keys work.
9. **NEW** Sizing and monitoring: working-set size, hit ratio, evictions, memory, p99 latency.

**Diagram: `cacheAside`** (02 §2), scenarios:

- **Hit.**
- **Miss.**
- **Stampede:** 10 packets miss together, one acquires the lock and rebuilds, and the rest wait and then hit.
- **Write race:** the stale-value sequence above, with captions.

**Widgets:**

- **LatencyHitRatio** (P1): the line chart with sliders, using the corrected formula `h·c + (1−h)·(c+d)`.
- **LRUViz** (P2).
- **DiagramQuiz** (P3): place the cache.

**Code: `snippets/get-product.js`** (fixes source bug #3)

```js
const NOT_FOUND = '__nf__';
const RELEASE = "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end";
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function getProduct(id, attempt = 0) {
  const key = `p:${id}`;
  const hit = await redis.get(key);
  if (hit === NOT_FOUND) return null;                       // negative cache stops "penetration"
  if (hit) return JSON.parse(hit);

  const lockKey = `lock:${key}`, token = crypto.randomUUID();
  if (!(await redis.set(lockKey, token, 'PX', 5_000, 'NX'))) {
    if (attempt >= 20) return db.product(id);               // waited ~1 s: stop waiting, protect latency
    await sleep(50);
    return getProduct(id, attempt + 1);                     // someone else is rebuilding
  }
  try {
    const row = await db.product(id);
    const ttl = 300 + Math.floor(Math.random() * 60);       // jitter avoids synchronized expiry (avalanche)
    await redis.set(key, row ? JSON.stringify(row) : NOT_FOUND, 'EX', row ? ttl : 30);
    return row;
  } finally {
    await redis.eval(RELEASE, 1, lockKey, token);           // only delete the lock if it's still ours
  }
}
```

```js
// snippets/lru.js: O(1) LRU on top of Map's insertion order
export class LRU {
  constructor(capacity) { this.capacity = capacity; this.map = new Map(); }
  get(key) {
    if (!this.map.has(key)) return undefined;
    const value = this.map.get(key);
    this.map.delete(key); this.map.set(key, value);          // move to "most recently used"
    return value;
  }
  set(key, value) {
    this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.capacity) this.map.delete(this.map.keys().next().value);   // evict the oldest
  }
  delete(key) { this.map.delete(key); }
}
```

```js
// snippets/etag.js: conditional requests. Express adds weak ETags automatically; this shows the mechanism.
import { createHash } from 'node:crypto';

app.get('/api/products/:id', async (req, res) => {
  const product = await getProduct(req.params.id);
  if (!product) return res.sendStatus(404);
  const body = JSON.stringify(product);
  const etag = `"${createHash('sha1').update(body).digest('base64url')}"`;
  res.set({ ETag: etag, 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' });
  if (req.get('If-None-Match') === etag) return res.sendStatus(304);   // the client's copy is still valid
  res.type('json').send(body);
});
```

```js
// snippets/swr.js: in-process stale-while-revalidate. Serve stale data instantly and refresh in the background.
export function swr(fn, { ttlMs = 30_000, staleMs = 300_000 } = {}) {
  const cache = new Map();                                   // key -> { value, at, refreshing }
  return async key => {
    const e = cache.get(key), age = e ? Date.now() - e.at : Infinity;
    if (e && age < ttlMs) return e.value;                    // fresh
    if (e && age < staleMs) {                                // stale but usable
      if (!e.refreshing) {
        e.refreshing = true;
        fn(key).then(value => cache.set(key, { value, at: Date.now() }), () => { e.refreshing = false; });
      }
      return e.value;
    }
    const value = await fn(key);                             // missing or too old: wait for it
    cache.set(key, { value, at: Date.now() });
    return value;
  };
}
```

**Common mistakes:** caching without a TTL; updating the cache on write instead of deleting it; caching per-user responses at the CDN; ignoring the hit ratio; treating the cache as the source of truth.

**Interview Q&A**

- **How do you prevent a cache stampede?** (source) Plus single-flight and refresh-ahead for the hottest keys.
- **Delete or update the cache on write?** Delete. Concurrent writers that update can leave the older value last. Deleting forces the next read to load the truth. Keep a TTL as a safety net.
- **How do you choose a TTL?** By how costly staleness is: seconds for prices and inventory, minutes for product pages, hours for static configuration. Add jitter.
- **Would you cache a write-heavy key?** Rarely. The hit ratio collapses and invalidation dominates. Prefer batching (write-behind counters), or cache the read-heavy aggregate instead.
- **A single key gets 200K reads/s. What do you do?** Add an in-process L1 with a short TTL, replicate the key into N copies and read a random one, and put the response behind the CDN if it's public.

**Quiz**

1. With a 90% hit ratio, a 1 ms cache and a 50 ms DB, the average latency is about:
   - 1 ms
   - **6 ms** ✓
   - 25 ms
2. Which fix targets cache penetration?
   - TTL jitter
   - **Negative caching or a Bloom filter** ✓
   - A bigger cache
3. Why add jitter to TTLs?
   - Saves memory
   - **Avoids many keys expiring at the same moment** ✓
   - Better hit ratio

---

## Step 5: Async Processing and Messaging (`/learn/async-messaging`, 35 min)

**Outcomes:** decide what to make async; pick between a queue, pub/sub and a log; build idempotent consumers with retries and a DLQ; use the outbox to avoid dual writes.

**Sections**

1. Why it matters (source).
2. **NEW** Sync vs async: go async when work is slow, unreliable, spiky or fans out. Keep it sync when the user needs the answer right now.
3. Why queues (source). **NEW** comparison table:

   | | Work queue (SQS, RabbitMQ, BullMQ) | Pub/Sub (SNS, Redis Pub/Sub) | Log (Kafka, Redis Streams) |
   |---|---|---|---|
   | Each message goes to | One consumer | Every subscriber, right now | Every consumer group, replayable |
   | Retention | Until acked | None | Days, configurable |
   | Ordering | Best effort or FIFO queues | None | Per partition |
   | Best for | Jobs, emails, image processing | Fire-and-forget fan-out | Event streams, analytics, CDC |

4. Kafka basics (source). **NEW:** offsets and replay; retention; how consumer-group rebalancing works.
5. Delivery semantics (source). **NEW:** "effectively once" = at-least-once delivery + idempotent processing (a dedupe table with a unique constraint, or idempotent writes).
6. **NEW** Ordering: per key (partition), sequence numbers, and why global order is rarely needed.
7. Retries and DLQ (source). **NEW:** poison messages, redriving a DLQ after a fix, alerting on DLQ depth and on the age of the oldest message.
8. **NEW** Backpressure and Little's law (L = λ·W). If 1,000 msg/s arrive and 800/s are processed, the backlog grows by 200/s, which is 720K per hour. Autoscale workers on queue depth or age.
9. **NEW** The dual-write problem and the **transactional outbox** (or CDC as the alternative), with an animated SequenceDiagram.
10. **NEW** Sagas: choreography vs orchestration, and compensating actions (refund, release stock).
11. **NEW** Delayed and scheduled jobs.

**Diagram: `queueWithDlq`** (source), scenarios:

- **Normal consumption.**
- **Failure → retry with backoff:** the packet loops back with captions "retry in 1 s → 2 s → 4 s".
- **Poison message → DLQ.**
- **Burst absorbed:** the queue node shows a growing, then draining, depth badge.

**Second diagram:** `outboxSequence` (SequenceDiagram): API → DB (order + outbox row in one transaction) → relay → Kafka → consumers.

**Widgets:**

- **QueueSim** (P1): queue-depth line chart.
- **KafkaPartitions** (P2).
- **DiagramQuiz** (P3): place the queue in the email flow.

**Code: `snippets/idempotent-consumer.js`** (fixes source bug #1)

```js
// At-least-once delivery means duplicates. Claim → do the work → mark done.
// On failure, release the claim so the retry actually runs (the source marked "done" first).
export async function handle(msg) {
  const doneKey = `done:${msg.id}`, lockKey = `processing:${msg.id}`;
  if (await redis.exists(doneKey)) return;                               // already delivered
  if (!(await redis.set(lockKey, 1, 'EX', 60, 'NX'))) return;            // another worker is on it
  try {
    await sendEmail(msg);                                                // pass msg.id to the provider as an idempotency key too
    await redis.set(doneKey, 1, 'EX', 7 * 86_400);
  } catch (err) {
    const attempts = msg.attempts ?? 0;
    if (attempts >= 4) await queue.publish('email.dlq', { ...msg, error: String(err) });
    else await queue.publish('email.retry', { ...msg, attempts: attempts + 1 }, { delayMs: 2 ** attempts * 1_000 });
  } finally {
    await redis.del(lockKey);
  }
}
```

```js
// snippets/bullmq.js: a Redis-backed job queue with retries, backoff and dedupe at enqueue
import { Queue, Worker } from 'bullmq';
const connection = { host: 'localhost', port: 6379 };

export const emails = new Queue('emails', { connection });

await emails.add('welcome', { userId: 42 }, {
  jobId: 'welcome:42',                               // adding the same jobId again is a no-op
  attempts: 5,
  backoff: { type: 'exponential', delay: 1_000 },    // 1 s, 2 s, 4 s, 8 s
  removeOnComplete: 1_000,
});

new Worker('emails', async job => {
  await sendWelcomeEmail(job.data.userId);           // throwing marks the attempt failed; after 5 it lands in "failed"
}, { connection, concurrency: 10 });
```

```js
// snippets/kafka-ordering.js: same key → same partition → ordered per user
// (KafkaJS API shown; Confluent's @confluentinc/kafka-javascript offers a KafkaJS-compatible API)
import { Kafka } from 'kafkajs';
const kafka = new Kafka({ clientId: 'orders', brokers: ['localhost:9092'] });

const producer = kafka.producer({ idempotent: true });
await producer.connect();
await producer.send({ topic: 'order-events', messages: [{ key: String(order.userId), value: JSON.stringify(event) }] });

const consumer = kafka.consumer({ groupId: 'billing' });     // every group gets every event
await consumer.connect();
await consumer.subscribe({ topic: 'order-events' });
await consumer.run({
  eachMessage: async ({ message }) => {
    await applyIdempotently(JSON.parse(message.value.toString()));   // the offset is committed after this resolves
  },
});
```

```js
// snippets/outbox-relay.js: the event row commits atomically with the business row; a relay publishes it later
export async function relayOnce(pool, publish, batch = 100) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const { rows } = await c.query(
      `SELECT id, topic, payload FROM outbox WHERE published_at IS NULL
       ORDER BY id LIMIT $1 FOR UPDATE SKIP LOCKED`, [batch]);         // several relays can run side by side
    for (const r of rows) await publish(r.topic, r.payload, { id: r.id });   // consumers dedupe by id
    if (rows.length) await c.query('UPDATE outbox SET published_at = now() WHERE id = ANY($1)', [rows.map(r => r.id)]);
    await c.query('COMMIT');
    return rows.length;
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }
}
```

**Common mistakes:** marking a message done before the work succeeds; non-idempotent consumers; one queue for everything (a slow job type blocks the fast ones); no DLQ alerting; writing to the DB and then publishing (dual write) with no outbox.

**Interview Q&A**

- **How do you avoid processing a message twice?** (source)
- **How do you keep events for one user in order?** Use the userId as the partition key. One partition is consumed by one consumer in a group, in order. Add a sequence number so consumers can detect gaps.
- **Kafka or RabbitMQ/SQS?** Kafka for high-throughput streams, replay and many independent consumers. RabbitMQ or SQS for task queues with per-message acks, delays and simple routing.
- **What is backpressure?** Slowing producers, or buffering safely, when consumers can't keep up: bounded queues, 429/503 to callers, autoscaling consumers, dropping or sampling low-value work.
- **Why an outbox instead of "write the DB, then publish"?** A crash between the two loses the event, and publishing first can emit an event for a rolled-back write. The outbox makes the event part of the same transaction.

**Quiz**

1. A topic has 6 partitions and a group has 8 consumers. How many are idle?
   - 0
   - **2** ✓
   - 6
2. Kafka guarantees order:
   - Across the topic
   - **Within a partition** ✓
   - Never
3. "Exactly once" in practice means:
   - Magic broker setting
   - **At-least-once + idempotent processing** ✓
   - At-most-once

---

## Step 6: Consistency and CAP (`/learn/consistency-cap`, 35 min)

**Outcomes:** state CAP correctly and apply PACELC; choose a consistency level per feature; reason about quorums, conflicts, consensus and distributed locks.

**Sections**

1. Why it matters (source).
2. CAP (source), stated precisely: *during a network partition*, a replicated system chooses between consistency (reject or block some requests) and availability (answer, possibly stale). Example: a bank ledger (CP) vs a social feed (AP).
3. **NEW** PACELC: even with no partition, you trade latency against consistency (synchronous cross-region writes are slow).
4. Consistency models (source), drawn as a **NEW** ladder: linearizable → sequential → causal → read-your-writes / monotonic reads → eventual, with an example of each.
5. Quorums (source). **NEW:** what N, W and R each tolerate; sloppy quorums and hinted handoff in leaderless stores.
6. **NEW** Conflict resolution: last-writer-wins (and the data it loses), vector clocks (detecting concurrent writes), CRDTs (merge without coordination), and app-level merges.
7. Consensus (source). **NEW:** Raft in 5 bullets (terms, randomized election timeouts, majority votes, log replication, commit index); why clusters have an odd size (3 tolerates 1 failure, 5 tolerates 2); where it runs (etcd/Kubernetes, ZooKeeper, Kafka KRaft).
8. **NEW** Distributed transactions: 2PC (blocking when the coordinator fails) vs sagas (compensations).
9. **NEW** Distributed locks need fencing tokens: a paused process can wake up after its lease expired.
10. **NEW** What each feature needs:

    | Feature | Consistency |
    |---|---|
    | Account balance, payments | Strong (linearizable) |
    | Inventory at checkout | Strong (conditional update) |
    | A user's own profile edit | Read-your-writes |
    | Chat messages within a conversation | Per-conversation order (causal) |
    | Likes, view counts, follower counts | Eventual |

**Diagram: `leaderReplication`** (source), scenarios:

- **Normal replication.**
- **Partition, CP choice:** the minority side rejects writes.
- **Partition, AP choice:** both sides accept writes, which conflict, then merge via LWW or a CRDT on heal.

**Widgets:**

- **QuorumPlayground** (P1).
- **RaftElection** (P3).

**Code**

```js
// snippets/quorum.js
export const quorum = (N, W, R) => ({
  strong: R + W > N,               // every read set overlaps the latest write set
  writeTolerates: N - W,           // replicas that can be down while writes still succeed
  readTolerates: N - R,
});
// quorum(3, 2, 2) → { strong: true, writeTolerates: 1, readTolerates: 1 }
// quorum(3, 1, 1) → strong: false (fast, but a read can be stale)
```

```js
// snippets/crdt.js
// Last-writer-wins register: simple, but one of two concurrent writes silently disappears
export const mergeLWW = (a, b) => (b.ts > a.ts || (b.ts === a.ts && b.node > a.node) ? b : a);

// Grow-only counter (G-Counter): each node increments its own slot; merge takes the max per slot
export const increment = (c, node, by = 1) => ({ ...c, [node]: (c[node] ?? 0) + by });
export const merge = (a, b) =>
  Object.fromEntries([...new Set([...Object.keys(a), ...Object.keys(b)])].map(k => [k, Math.max(a[k] ?? 0, b[k] ?? 0)]));
export const value = c => Object.values(c).reduce((s, n) => s + n, 0);
// merge(increment({}, 'a'), increment(increment({}, 'b'), 'b')) → { a: 1, b: 2 }; value → 3
```

```js
// snippets/fenced-lock.js: a lease alone isn't safe (GC pauses, network delays).
// Every grant carries an increasing token, and storage rejects writes with an older token.
export async function acquire(redis, resource, ttlMs) {
  const token = await redis.incr(`fence:${resource}`);
  const ok = await redis.set(`lock:${resource}`, token, 'PX', ttlMs, 'NX');
  return ok ? token : null;
}
// The storage side enforces it:
//   UPDATE files SET body = $1, fence = $2 WHERE id = $3 AND fence <= $2
```

**Common mistakes:** "pick 2 of 3" (P isn't optional); using eventual consistency for money; trusting a lock without fencing; even-sized consensus clusters; LWW wherever "the last value" matters.

**Interview Q&A**

- **When would you choose eventual consistency?** (source)
- **Explain CAP with an example.** Two replicas lose their link. If both keep accepting writes to a seat map (AP), the same seat can be sold twice. A ticketing system therefore picks CP: the minority side refuses writes.
- **How do you get read-your-writes on an eventually consistent store?** Read from the leader or a quorum after writing, attach a version or token and read from a replica that has caught up to it, or keep the user's recent writes in a client or session cache.
- **Why do distributed locks need fencing tokens?** A client can pause after acquiring a lease, the lease expires, a second client takes the lock, and then the first wakes up and writes. Increasing tokens let storage reject the stale writer.
- **2PC or a saga?** 2PC gives atomicity across resources but blocks if the coordinator dies, and it's rarely available across services. Sagas chain local transactions with compensations, so they're eventually consistent but available.

**Quiz**

1. Is N = 5, W = 3, R = 2 strongly consistent?
   - Yes
   - **No: 3 + 2 is not greater than 5** ✓
2. A 5-node Raft cluster tolerates how many failed nodes?
   - 1
   - **2** ✓
   - 3
3. The main drawback of last-writer-wins:
   - Slow
   - **Silently drops one of two concurrent writes** ✓
   - Needs consensus

---

## Step 7: Reliability and Observability (`/learn/reliability-observability`, 35 min)

**Outcomes:** set SLOs and error budgets; apply timeouts, retries with jitter, circuit breakers and bulkheads; design for zone failure; instrument with logs, metrics and traces.

**Sections**

1. Why it matters (source).
2. **NEW** SLIs, SLOs, SLAs and error budgets. 99.9% per month allows about 43 minutes of downtime. "Nines" table per year and per month.
3. Timeouts, retries and jitter (source). **NEW:**
   - Retry budgets (cap retries at about 10% extra load).
   - Retry amplification: 3 layers × 3 attempts = 27 calls at the bottom.
   - Retry only idempotent calls.
4. Circuit breaker and bulkhead (source). **NEW:** the state machine (closed → open → half-open) with thresholds.
5. **NEW** Load shedding and prioritisation: reject cheap work before expensive work; protect critical paths.
6. **NEW** Graceful degradation: fallbacks, cached or default responses, turning off features.
7. Redundancy and failover (source). **NEW:** N+1 and N+2 capacity, multi-zone vs multi-region, active-passive vs active-active, RPO/RTO with examples.
8. **NEW** Safe deploys: canary, blue/green, feature flags, automatic rollback on SLO burn.
9. Observability (source). **NEW:**
   - RED (rate, errors, duration) for services and USE (utilization, saturation, errors) for resources.
   - OpenTelemetry tracing with context propagation.
   - Alerting on symptoms and SLO burn rate, not on CPU.
10. **NEW** Incident basics: runbooks, on-call, blameless postmortems.

**Diagrams:**

- `circuitBreaker` (source), scenarios:
  - **Healthy.**
  - **Failure spike:** the breaker trips and the fallback cache serves.
  - **Recovery:** a half-open probe succeeds and the breaker closes.
- **NEW** `breakerStates`: a small FlowSpec with three state nodes and edges labelled "5 failures", "cooldown elapsed", "probe ok" and "probe failed", animated in sync with the first diagram.

**Widgets:**

- **AvailabilityCalc** (P2) with the downtime chart (log scale, 02 §6.5).
- **RetryStorm** (P2).
- **CircuitBreakerSim** (P2).

**Code**

```js
// snippets/retry.js: the source's full-jitter retry, plus a "retryable" predicate
export async function retry(fn, { tries = 4, baseMs = 100, retryable = e => e.retryable ?? true } = {}) {
  for (let i = 0; ; i++) {
    try { return await fn(); }
    catch (e) {
      if (i >= tries - 1 || !retryable(e)) throw e;              // never retry validation errors or non-idempotent calls
      await new Promise(r => setTimeout(r, Math.random() * baseMs * 2 ** i));   // full jitter
    }
  }
}
```

```js
// snippets/circuit-breaker.js
export class CircuitOpenError extends Error {}

export class CircuitBreaker {
  constructor(fn, { failureThreshold = 5, cooldownMs = 10_000 } = {}) {
    Object.assign(this, { fn, failureThreshold, cooldownMs, state: 'closed', failures: 0, openedAt: 0, probing: false });
  }
  async call(...args) {
    if (this.state === 'open') {
      if (Date.now() - this.openedAt < this.cooldownMs) throw new CircuitOpenError('circuit open');   // fail fast
      this.state = 'half-open';
    }
    if (this.state === 'half-open') {
      if (this.probing) throw new CircuitOpenError('probe in flight');   // only one trial request at a time
      this.probing = true;
    }
    try {
      const result = await this.fn(...args);
      this.state = 'closed'; this.failures = 0;
      return result;
    } catch (err) {
      if (this.state === 'half-open' || ++this.failures >= this.failureThreshold) {
        this.state = 'open'; this.openedAt = Date.now();
      }
      throw err;
    } finally {
      this.probing = false;
    }
  }
}
// const recs = new CircuitBreaker(fetchRecommendations);
// try { return await recs.call(userId); } catch { return popularItems(); }   // graceful fallback
```

```js
// snippets/bulkhead.js: cap concurrent calls per dependency; when a call finishes, hand its slot to the next waiter
export function bulkhead(limit, maxQueue = 100) {
  let active = 0;
  const waiting = [];
  return async fn => {
    if (active < limit) active++;
    else if (waiting.length < maxQueue) await new Promise(resolve => waiting.push(resolve));
    else throw new Error('bulkhead full');                  // shed load instead of queueing forever
    try { return await fn(); }
    finally {
      const next = waiting.shift();
      if (next) next(); else active--;                      // hand over the slot directly, so the limit is never exceeded
    }
  };
}
// const payments = bulkhead(20); await payments(() => paymentsApi.charge(order));
```

```js
// snippets/availability.js
export const serial = (...a) => a.reduce((x, y) => x * y, 1);            // every dependency must be up
export const parallel = (...a) => 1 - a.reduce((x, y) => x * (1 - y), 1); // up if any copy is up
export const downtimeMinutesPerYear = a => (1 - a) * 365 * 24 * 60;
// serial(0.999, 0.999, 0.9995) → 0.9975 (~22 h down per year) · parallel(0.99, 0.99) → 0.9999
```

```js
// snippets/request-logging.js: structured logs with a request id that follows the request everywhere
import pino from 'pino';
import { randomUUID } from 'node:crypto';
const log = pino();

app.use((req, res, next) => {
  req.id = req.get('x-request-id') ?? randomUUID();
  req.log = log.child({ reqId: req.id, route: req.path });
  const start = performance.now();
  res.set('x-request-id', req.id);
  res.on('finish', () => req.log.info({ status: res.statusCode, ms: Math.round(performance.now() - start) }, 'request'));
  next();
});
```

```js
// snippets/tracing.js: OpenTelemetry auto-instrumentation (HTTP, Express, pg, ioredis…)
// Load before the app starts. ESM apps also need OTel's ESM loader hook (see the OTel Node docs).
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

new NodeSDK({
  serviceName: 'orders-api',
  traceExporter: new OTLPTraceExporter(),          // endpoint from OTEL_EXPORTER_OTLP_ENDPOINT
  instrumentations: [getNodeAutoInstrumentations()],
}).start();
```

**Common mistakes:** no timeouts; retrying at every layer; alerting on CPU instead of user pain; a "redundant" setup that shares one database; never rehearsing failover.

**Interview Q&A**

- **Why add jitter to retries?** (source)
- **SLO vs SLA?** The SLO is the internal target (99.9% of requests under 300 ms). The SLA is the contract with penalties, usually looser than the SLO. The gap between them is your safety margin, and the error budget (100% − SLO) decides how fast you can ship.
- **How do you survive a zone failure?** Spread instances across 3 zones with N+1 capacity, use synchronous or semi-synchronous DB replication to another zone with automatic failover, keep no zone-local state, and test it by draining a zone.
- **What do you alert on?** User-visible symptoms: error rate, latency against the SLO, and burn rate over short and long windows. Causes like CPU or disk belong on dashboards unless they predict imminent failure (a disk 95% full).
- **How can retries make an outage worse?** Synchronized retries multiply load on a struggling service (retry storm), and retries at each layer amplify it. Use backoff, jitter, retry budgets, breakers and retrying at a single layer.

**Quiz**

1. 99.9% monthly availability allows about:
   - 4 minutes
   - **43 minutes** ✓
   - 7 hours
2. Two serial 99.9% dependencies give:
   - 99.9%
   - **≈ 99.8%** ✓
   - 99.99%
3. A half-open breaker:
   - Blocks everything
   - **Lets a trial request through** ✓
   - Retries forever

---

## Step 8: Case Study: URL Shortener (`/learn/case-url-shortener`, 40 min)

**Outcomes:** run the full interview loop on a read-heavy system, including ID generation, caching, 301 vs 302, analytics and abuse.

**Sections**

1. **Requirements.**
   - Functional: shorten, redirect, custom alias, expiry, click analytics.
   - Non-functional: redirect served in under ~20 ms at the server, 99.99% available for redirects, durable links, codes that are hard to enumerate.
2. **Estimation** (calculator preset).
   - 100M new URLs/month ≈ **40 writes/s**. At 100:1, that's **≈ 4,000 redirects/s**, and about 12K/s at peak.
   - Storage: 6B URLs over 5 years × ~500 B ≈ **3 TB** (≈ 9 TB with 3 replicas).
   - 7 base62 characters give 3.5 trillion codes, which is enough.
3. **API.**

   | Method | Path | Body / result |
   |---|---|---|
   | POST | `/api/urls` | `{ longUrl, alias?, expiresAt? }` → `201 { code, shortUrl }` · `409` alias taken · `429` rate limited |
   | GET | `/:code` | `302` (or `301`) to `long_url` · `404` · `410` expired |
   | GET | `/api/urls/:code/stats` | `{ clicks, byDay[], topReferrers[] }` |

4. **Data model.**

   ```sql
   CREATE TABLE urls (
     code        varchar(16) PRIMARY KEY,                -- generated (7 chars) or custom alias
     long_url    text        NOT NULL,
     user_id     bigint,
     created_at  timestamptz NOT NULL DEFAULT now(),
     expires_at  timestamptz
   );
   CREATE INDEX urls_expiry ON urls (expires_at) WHERE expires_at IS NOT NULL;   -- for the cleanup job
   ```

   At larger scale this becomes a key-value table keyed by `code` (DynamoDB or Cassandra), sharded by the hash of the code.
5. **ID generation** (source), expanded:

   | Option | Unique? | Length | Coordination | Guessable? |
   |---|---|---|---|---|
   | Counter + base62 | Yes | Shortest | Counter (use range allocation) | **Yes**, unless scrambled |
   | Hash (MD5/SHA) + truncate | Collisions possible | 7+ | None | No |
   | Random + uniqueness check | Retry on a rare collision (~0.17% when 6B of 3.5T codes are used) | 7 | None | No |
   | Snowflake-style 64-bit id | Yes | 11 in base62 | Worker ids | Partly (time-ordered) |

6. **NEW** Scrambling sequential ids (fixes source bug #4). It's a bijection, so codes stay unique and 7 characters long, but this is obfuscation, not security.
7. **NEW** 301 vs 302: a 301 is cached by browsers and CDNs (fastest, but clicks become invisible). A 302 always hits you (you can count every click).
8. Scaling reads (source). **NEW:** the CDN caches 301s; Redis holds hot codes; a viral link gets an in-process L1 cache.
9. **NEW** Analytics pipeline: the redirect fires a click event (never awaited) → queue → worker → columnar store (e.g. ClickHouse) → stats API.
10. **NEW** Expiry and cleanup (lazy check on read plus a nightly delete job), and how to reuse codes (don't).
11. **NEW** Abuse and safety:
    - Rate-limit creation.
    - Scan destinations against malware lists.
    - Block `javascript:` and `data:` URLs.
    - Reserve words for custom aliases.
    - Give aliases a separate namespace or length so they can't collide with generated codes.

**Diagram: `urlShortener`** (source), scenarios:

- **Create link:** the ID service hands out a range block.
- **Redirect, cache hit:** served by the CDN or Redis.
- **Redirect, miss:** read from Postgres, then fill Redis.
- **Analytics:** an async click event goes through the queue and worker.

**Widgets:**

- CapacityCalculator preset.
- **Base62Playground + RangeAllocator** (P3).
- "Build it in the playground" → challenge `url-shortener` (03 §11).

**Code**

```js
// snippets/base62.js
const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function toBase62(n) {
  let s = '';
  do { s = ALPHABET[n % 62] + s; n = Math.floor(n / 62); } while (n > 0);
  return s;
}
export function fromBase62(s) {
  let n = 0;
  for (const ch of s) n = n * 62 + ALPHABET.indexOf(ch);
  return n;
}
// toBase62(125) → '21' · fromBase62('21') → 125 · 7 chars cover 62^7 ≈ 3.5 trillion codes
// Numbers stay exact up to 2^53; use BigInt beyond 8 characters.
```

```js
// snippets/scramble.js: sequential ids give guessable codes (…aZ, …b0). Multiply by a constant coprime with 62^7.
// The map is a bijection on [0, 62^7), so codes stay unique and 7 characters long.
// It's linear, though: anyone holding two consecutive codes can walk the rest. If enumeration
// must be impossible, use random codes with a uniqueness check instead.
const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const M = 62n ** 7n;                       // 3,521,614,606,208
const P = 2_176_477_561_533n;              // ≈ 0.618·M; odd and not a multiple of 31, so coprime with 2^7·31^7
const P_INV = modInverse(P, M);

export const scramble = id => (BigInt(id) * P) % M;
export const unscramble = x => (BigInt(x) * P_INV) % M;
export const shortCode = id => toBase62Big(scramble(id)).padStart(7, '0');
// shortCode(1) → 'CjIO2GV' · shortCode(2) → 'eDrC5nQ' · shortCode(3) → 'QXaq84L'

function modInverse(a, m) {                // extended Euclid
  let [r0, r1, s0, s1] = [a, m, 1n, 0n];
  while (r1) {
    const q = r0 / r1;
    [r0, r1] = [r1, r0 - q * r1];
    [s0, s1] = [s1, s0 - q * s1];
  }
  return ((s0 % m) + m) % m;
}
function toBase62Big(n) {
  let s = '';
  do { s = ALPHABET[Number(n % 62n)] + s; n /= 62n; } while (n > 0n);
  return s;
}
```

```js
// snippets/range-allocator.js: each app server reserves 1,000 ids per Redis call; no single hot counter
const BLOCK = 1_000;
let next = 0, end = 0, refill = null;

export async function nextId(redis) {
  while (next >= end) {
    refill ??= redis.incrby('url:id', BLOCK)                 // atomic; returns the block's upper bound
      .then(top => { end = top; next = top - BLOCK; })
      .finally(() => { refill = null; });
    await refill;                                            // concurrent callers share one refill
  }
  return next++;
}
// A crash wastes the rest of a block. That's fine: ids only need to be unique, not contiguous.
```

```js
// snippets/routes.js: Express 5 forwards rejected promises to the error handler
app.post('/api/urls', rateLimit, async (req, res) => {
  const url = new URL(req.body.longUrl);                     // throws on garbage → 400 from the error handler
  if (!['http:', 'https:'].includes(url.protocol)) return res.status(400).json({ error: 'Only http(s) URLs' });
  const code = req.body.alias ?? shortCode(await nextId(redis));
  try {
    await pool.query('INSERT INTO urls (code, long_url, user_id, expires_at) VALUES ($1, $2, $3, $4)',
      [code, url.href, req.user?.id ?? null, req.body.expiresAt ?? null]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Alias already taken' });   // unique_violation
    throw e;
  }
  res.status(201).json({ code, shortUrl: `https://short.example/${code}` });
});

app.get('/:code', async (req, res) => {
  const { code } = req.params;
  let longUrl = await redis.get(`u:${code}`);
  if (!longUrl) {
    const { rows } = await pool.query(
      'SELECT long_url, expires_at FROM urls WHERE code = $1 AND (expires_at IS NULL OR expires_at > now())', [code]);
    if (!rows.length) return res.sendStatus(404);
    longUrl = rows[0].long_url;
    const ttl = rows[0].expires_at ? Math.min(86_400, Math.floor((rows[0].expires_at - Date.now()) / 1000)) : 86_400;
    if (ttl > 0) await redis.set(`u:${code}`, longUrl, 'EX', ttl);   // never cache past the link's expiry
  }
  queue.publish('clicks', { code, ts: Date.now(), ref: req.get('referer') }).catch(() => {});   // never block the redirect
  res.redirect(302, longUrl);                                // 301 if per-click analytics don't matter
});
```

**Interview Q&A**

- **Counter-based vs hash-based short codes?** (source; the text is corrected to say counters are guessable unless scrambled)
- **301 or 302?** 302 if analytics matter or the link may change. 301 for pure performance, because browsers and CDNs cache it and you stop seeing clicks.
- **How do custom aliases work?** Validate the charset and length, check reserved words, and rely on the primary-key unique constraint (409 on conflict). Keep aliases out of the generated namespace.
- **How do you expire links?** Store `expires_at`, check it on read (return 410 or 404), cap cache TTLs at the expiry, and run a nightly cleanup. Don't reuse codes.
- **A link goes viral (50K redirects/s). Now what?** Serve it from the CDN with a 301 or a short-max-age 302, add an in-process L1 cache, and make sure analytics are async with batched writes.

**Quiz**

1. How many codes do 7 base62 characters give?
   - 3.5 billion
   - **3.5 trillion** ✓
   - 62 million
2. If you need per-click analytics, return:
   - 301
   - **302** ✓
   - 200 with JavaScript
3. 4,000 redirects/s with a 95% cache hit ratio → the DB sees:
   - 4,000/s
   - **200/s** ✓
   - 20/s

---

## Step 9: Case Study: Notification System (`/learn/case-notification-system`, 40 min)

**Outcomes:** design a multi-channel, prioritised, deduplicated notification pipeline with provider failover, user preferences and quiet hours.

**Sections**

1. **Requirements** (source), plus templates/i18n, priorities (an OTP must never wait behind a marketing blast), scheduling, and analytics.
2. **Estimation.** 50M users × 10 notifications/day = 500M/day ≈ **5.8K/s** average. Campaigns burst to 50K+/s, so queues and throttled campaign fan-out are needed.
3. **API.**

   | Method | Path | Body / result |
   |---|---|---|
   | POST | `/v1/notifications` | `{ idempotencyKey, userIds \| segment, template, data, channels?, priority, sendAt? }` → `202 { notificationId }` |
   | PUT | `/v1/users/:id/notification-preferences` | `{ channels: { push, email, sms }, types: {…}, quietHours: { start, end }, tz }` |
   | POST | `/webhooks/:provider` | Delivery status callbacks (delivered, bounced, complained) |

4. **Data model.**

   ```sql
   CREATE TABLE notification_prefs (user_id bigint, channel text, type text, enabled boolean NOT NULL,
                                    PRIMARY KEY (user_id, channel, type));
   CREATE TABLE device_tokens (token text PRIMARY KEY, user_id bigint NOT NULL, platform text, last_seen timestamptz);
   CREATE TABLE deliveries (id text PRIMARY KEY,                       -- `${eventId}:${channel}`: the dedupe key
                            user_id bigint, channel text, provider text, provider_msg_id text,
                            status text, updated_at timestamptz);
   CREATE INDEX deliveries_provider_msg ON deliveries (provider_msg_id);  -- webhook lookups
   ```

5. Fan-out with queues (source). **NEW:** one queue per channel *and* priority (`notif.sms.critical`, `notif.email.low`…).
6. **NEW** Templates and localisation (template id + version + locale; render in the worker).
7. **NEW** Scheduling and quiet hours, evaluated in the user's time zone at send time.
8. Reliability (source). **NEW:** a provider abstraction with circuit breakers and failover order; permanent vs transient errors.
9. **NEW** Dedupe and idempotency: a deterministic `eventId:channel` id checked before sending.
10. Protecting users (source). **NEW:** daily caps per type, digests (batch 20 likes into one push), one-click unsubscribe, and suppression lists for bounced or complained addresses.
11. **NEW** Device token lifecycle: delete tokens the push provider reports as invalid, and refresh `last_seen`.
12. **NEW** Delivery tracking: provider webhooks → status updates → analytics (sent, delivered, opened, CTR).
13. **NEW** Large campaigns: resolve the segment in pages, enqueue in batches, throttle to the providers' rate limits, and allow pause/cancel.

**Diagram: `notificationPipeline`** (source), scenarios:

- **Normal:** fan-out to the push, email and SMS queues using `with`.
- **SMS provider down:** the breaker opens, the backup provider is used, and the caption explains.
- **Duplicate event dropped.**
- **Quiet hours:** the low-priority message is parked in the delayed queue until 08:00 local time.

**Widgets:**

- A priority-lanes mini-simulation (P2, reuses QueueSim with two lanes) showing an OTP overtaking a 1M-message campaign.
- "Build it" → challenge `notification-system`.

**Code**

```js
// snippets/notify.js: one deterministic message per enabled channel, routed by priority
const PRIORITY = { otp: 'critical', order_update: 'high', marketing: 'low' };

export async function notify({ eventId, userId, type, data }) {
  const prefs = await getPrefs(userId);                     // cached: { push, email, sms, types, quietHours, tz }
  const priority = PRIORITY[type] ?? 'normal';
  const channels = ['push', 'email', 'sms'].filter(ch => prefs[ch] && prefs.types?.[type]?.[ch] !== false);
  for (const ch of channels) {
    await queue.publish(`notif.${ch}.${priority}`, {
      id: `${eventId}:${ch}`,                               // deterministic → safe to dedupe
      userId, type, ch, data,
      notBefore: priority === 'low' ? nextAllowedSendTime(prefs, new Date()) : Date.now(),
    });
  }
}
```

```js
// snippets/quiet-hours.js: is it quiet time for this user right now? { start: 22, end: 8 } in their time zone
export function inQuietHours(now, { tz, quietHours: { start, end } }) {
  const hour = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: tz }).format(now));
  return start > end ? hour >= start || hour < end : hour >= start && hour < end;   // handles windows past midnight
}
// inQuietHours(new Date('2026-10-10T21:30:00Z'), { tz: 'Asia/Kolkata', quietHours: { start: 22, end: 8 } }) → true (03:00 IST)
```

```js
// snippets/deliver.js: provider failover behind circuit breakers; permanent errors aren't retried
const PROVIDERS = { sms: [primarySms, backupSms], email: [primaryEmail, backupEmail], push: [pushService] };

export async function deliver(msg) {
  if (await redis.exists(`sent:${msg.id}`)) return 'duplicate';
  for (const provider of PROVIDERS[msg.ch]) {
    const breaker = breakers.get(provider.name);
    if (breaker.state === 'open') continue;                  // skip a provider that's currently failing
    try {
      const { providerMsgId } = await breaker.call(() => provider.send(msg));
      await redis.set(`sent:${msg.id}`, providerMsgId, 'EX', 7 * 86_400);
      await db.deliveries.upsert({ id: msg.id, provider: provider.name, providerMsgId, status: 'sent' });
      return 'sent';
    } catch (err) {
      if (err.permanent) return markFailed(msg, err);        // invalid number, unsubscribed: don't retry
    }
  }
  throw new Error('all providers failed');                   // the queue retries with backoff, then the DLQ
}
```

```js
// snippets/daily-cap.js: at most 3 marketing pushes per user per day
export async function underDailyCap(userId, type, cap = 3) {
  const key = `cap:${userId}:${type}:${new Date().toISOString().slice(0, 10)}`;
  const n = await redis.incr(key);
  if (n === 1) await redis.expire(key, 86_400);
  return n <= cap;
}
```

```js
// snippets/email-webhook.js: delivery status from the provider (verify the signature over the raw body)
app.post('/webhooks/email', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!verifySignature(req.get('x-signature'), req.body)) return res.sendStatus(401);
  for (const ev of JSON.parse(req.body).events) {          // delivered | bounced | complained | opened
    await db.deliveries.update({ providerMsgId: ev.messageId }, { status: ev.type, updatedAt: ev.timestamp });
    if (ev.type === 'bounced' || ev.type === 'complained') await suppress(ev.email);   // stop emailing this address
  }
  res.sendStatus(200);
});
```

**Interview Q&A**

- **How do you make sure a notification isn't sent twice?** (source)
- **A 10M-user campaign is running. How do OTPs still arrive in seconds?** Separate priority queues with dedicated workers, rate-limited campaign fan-out, and provider capacity reserved for critical traffic.
- **The SMS provider goes down. What happens?** The breaker opens after repeated failures, traffic fails over to the backup provider, retries back off, and permanent failures go to the DLQ with alerts. Track delivery rate per provider.
- **How do quiet hours work across time zones?** Store the IANA time zone per user and evaluate at send time. Low-priority messages get `notBefore` set to the next allowed time. Critical ones ignore quiet hours.
- **How do you send 10M campaign notifications without hurting the system?** Resolve the segment in pages, enqueue in batches, throttle to provider limits, run on separate workers, dedupe per user, and support pause/cancel.

**Quiz**

1. Why use separate queues per channel and priority?
   - Cheaper
   - **Isolation: slow SMS or a big campaign can't block OTPs** ✓
   - Ordering
2. What's the deterministic id `eventId:channel` for?
   - Sorting
   - **Deduplication** ✓
   - Encryption
3. Quiet hours should be checked:
   - When the event is created
   - **At send time, in the user's time zone** ✓
   - In UTC

---

## Step 10: Interview Playbook (`/learn/interview-playbook`, 20 min)

**Outcomes:** run a 45-minute design interview with a repeatable structure; talk about trade-offs clearly; practise with a timer and a rubric.

**Sections**

1. Why it matters (source).
2. Time split (source), shown as an animated `Timeline`, with what to have written down at the end of each phase.
3. **NEW** The framework as a checklist: requirements → estimation → API → data model → high-level design → deep dives → trade-offs and wrap-up. The frontend variant is RADIO: Requirements, Architecture, Data model, Interface, Optimizations.
4. **NEW** What interviewers look for, by level:

   | Signal | Mid | Senior | Staff |
   |---|---|---|---|
   | Requirements | Asks some questions | Drives scope, states non-functional requirements with numbers | Reframes the problem, spots hidden requirements |
   | Design | A working design | Clean components, data flow, scaling | Evolution path, organisational and operational concerns |
   | Deep dive | One area | Two areas in depth, with failure modes | Picks the riskiest area and quantifies it |
   | Trade-offs | Names some | Justifies choices, and when to switch | Cost, complexity and team impact |

5. Talking through trade-offs (source). **NEW** sentence templates:
   - "I'll use X because Y. The cost is Z. If W changes, I'd switch to V."
   - "We could do A or B. A is simpler, B scales further. Given our 4K QPS, A is enough for now."
6. **NEW** Drawing conventions: consistent shapes, label every arrow, number the request flow, keep assumptions in a corner box.
7. Common mistakes (source). **NEW:** handling pushback ("Good point. If that matters, I'd change…"), saying "I don't know X, but here's how I'd reason about it", and getting unstuck by going back to the requirements.
8. Practice order (source). **NEW:** spaced repetition (redo each question after 3, 7 and 21 days) and recording yourself.

**Widgets:**

- **InterviewTimer** (P3): pick a question, then run a timer with phase prompts and a checklist per phase.
- A self-assessment rubric (1–4 on 8 dimensions), saved to progress so the learner can see a trend.

**Interview Q&A**

- **How do you handle an ambiguous problem?** (source)
- **The interviewer pushes back on your choice. What do you do?** Treat it as a hint. Restate their concern, weigh it against your requirements, and either defend with numbers or adapt explicitly.
- **How deep should you go?** Breadth first, until the end-to-end design works. Then go deep where the risk is highest, or where the interviewer steers you.
- **What if you get stuck?** Go back to the requirements and numbers, simplify (one region, one server), then scale step by step out loud.

**Printable checklist** (also on `/cheatsheet`): requirements ✓, numbers ✓, API ✓, data model ✓, diagram with numbered flow ✓, 2 deep dives ✓, failure modes ✓, trade-offs ✓, summary ✓.
