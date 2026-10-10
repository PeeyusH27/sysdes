# 05: Deep dives

Each deep dive keeps the source's diagram, its 5 code cards (fixed where they were buggy) and its "next" note, and adds:

- an animated diagram that replaces Mermaid (02 §5);
- an interactive widget;
- a comparison table;
- 2–4 new code cards;
- interview Q&A and a quiz.

Page layout: hero (title, why, minutes) → diagram → comparison table → widget → code cards (two-column grid on desktop, each card has a title, explanation, highlighted code and a copy button) → Q&A → quiz → next.

---

## 1. Caching techniques (`/deep-dives/caching-techniques`)

**Diagram.** The Mermaid sequence diagram becomes a `SequenceDiagram` with a branch selector: **Cache hit | Cache miss**. A second spec, **Write + invalidate**, animates `UPDATE` → `DEL` → the next read missing → refill.

**Widget: Pattern comparator** (P2). Tabs for each of the six patterns. Each animates the same story ("write price = 12, then read it twice") through App, Cache and DB lanes, with a **staleness window** bar showing how long a reader could see the old price.

| Pattern | Read path | Write path | Staleness | If the cache dies | Use for |
|---|---|---|---|---|---|
| Cache-aside | App checks the cache, loads the DB on a miss, fills the cache | App writes the DB, deletes the key | Until the delete or TTL | Slower, still correct | The default |
| Read-through | The cache loader fetches from the DB | — | Same as cache-aside | Depends on the library | CDN, caching libraries |
| Write-through | Always fresh | Write DB + cache synchronously | Minimal | Correct | Read-after-write heavy data |
| Write-behind | From the cache | Cache now, DB later in batches | The DB lags | **Unflushed writes are lost** | Counters, metrics |
| Write-around | The first read after a write misses | DB only | None (next read loads) | Correct | Write-once, rarely-read data |
| Refresh-ahead | Hot keys always hit | — | Bounded by the refresh interval | Correct | Hot, predictable keys |

**Code cards**

1. **Cache-aside** (source, unchanged).
2. **Write-through** (source, unchanged).
3. **Write-behind** (fixes source bug #11):

```js
// Batch writes in memory and flush every 5 s. If a flush fails, put the batch back without
// overwriting newer values, and never run two flushes at once.
const buffer = new Map();
let flushing = false;
export const write = (id, value) => buffer.set(id, value);       // the latest value per id wins

setInterval(async () => {
  if (flushing || buffer.size === 0) return;
  flushing = true;
  const batch = [...buffer];
  buffer.clear();
  try {
    await db.bulkUpsert(batch);
  } catch (err) {
    for (const [id, value] of batch) if (!buffer.has(id)) buffer.set(id, value);   // retry next tick
    log.warn({ err, size: batch.length }, 'write-behind flush failed');
  } finally {
    flushing = false;
  }
}, 5_000);
// A process crash still loses whatever is in `buffer`. That's the trade-off you accept with write-behind.
```

4. **Invalidation** (source, unchanged).
5. **Stampede protection** (source single-flight), with a note that it's per process only. Across instances, combine it with the Redis lock from Learn 4.

**NEW cards**

```js
// Two-level cache: an in-process LRU (L1, microseconds) in front of Redis (L2, ~1 ms).
// Invalidation fans out over pub/sub. Pub/sub can drop messages, so L1 entries also expire quickly.
const l1 = new Map();                                    // key -> { value, exp }
const L1_TTL_MS = 5_000;
const sub = redis.duplicate();
await sub.subscribe('invalidate');
sub.on('message', (_channel, key) => l1.delete(key));    // every instance drops its copy

export async function get(key, load) {
  const e = l1.get(key);
  if (e && e.exp > Date.now()) return e.value;
  const cached = await redis.get(key);
  const value = cached ? JSON.parse(cached) : await load(key);
  if (!cached) await redis.set(key, JSON.stringify(value), 'EX', 300);
  l1.set(key, { value, exp: Date.now() + L1_TTL_MS });   // cap l1's size in production (e.g. the LRU from Learn 4)
  return value;
}
export async function invalidate(key) {
  await redis.del(key);
  await redis.publish('invalidate', key);
}
```

```js
// Refresh-ahead: once 80% of the TTL has passed, a read triggers a background refresh,
// so hot keys never actually expire for readers
export async function getWithRefreshAhead(key, load, ttlSec = 300) {
  const [[, value], [, ttl]] = await redis.multi().get(key).ttl(key).exec();
  if (value && ttl > 0 && ttl < ttlSec * 0.2) {
    redis.set(`refresh:${key}`, 1, 'EX', 30, 'NX')                    // only one instance refreshes
      .then(won => won && load(key).then(v => redis.set(key, JSON.stringify(v), 'EX', ttlSec)))
      .catch(() => {});                                                  // background work must never crash the read
  }
  if (value) return JSON.parse(value);
  const fresh = await load(key);
  await redis.set(key, JSON.stringify(fresh), 'EX', ttlSec);
  return fresh;
}
```

```js
// Bloom filter in front of the cache: "definitely not present" lets you skip both the cache
// and the DB for ids that don't exist (cache penetration). 1M bits + 7 hashes → ~0.65% false positives at 100K keys.
const fmix = h => { h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return h >>> 0; };
const hash = (s, seed) => { let h = seed; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return fmix(h); };

export class BloomFilter {
  constructor(bits = 1 << 20, hashes = 7) { this.m = bits; this.k = hashes; this.bits = new Uint8Array(bits >> 3); }
  #positions(key) {                                      // double hashing with two independent seeds
    const h1 = hash(key, 0x811c9dc5), h2 = hash(key, 0x9747b28c) | 1;
    return Array.from({ length: this.k }, (_, i) => ((h1 + i * h2) >>> 0) % this.m);
  }
  add(key) { for (const p of this.#positions(key)) this.bits[p >> 3] |= 1 << (p & 7); }
  mightContain(key) { return this.#positions(key).every(p => this.bits[p >> 3] & (1 << (p & 7))); }
}
```

```conf
# redis.conf for a pure cache: evict any key by recency (or allkeys-lfu by frequency).
# Use volatile-lru when some keys have no TTL and must never be evicted.
maxmemory 2gb
maxmemory-policy allkeys-lru
```

**Interview Q&A**

- **Cache-aside or write-through?** Cache-aside is the default: simple and resilient to cache loss. Write-through when reads right after writes dominate and you can afford slower writes.
- **How do you keep in-process caches consistent across 50 instances?** Publish invalidations over pub/sub *and* keep L1 TTLs short, because pub/sub is fire-and-forget. Or only use L1 for data that tolerates seconds of staleness.
- **When is write-behind acceptable?** When losing a few seconds of updates is fine (view counters, analytics), and the store benefits a lot from batching.

**Quiz**

1. Which pattern can lose acknowledged writes?
   - Write-through
   - **Write-behind** ✓
   - Cache-aside
2. What's the safety net for L1 caches?
   - Bigger L1
   - **Short TTLs alongside pub/sub invalidation** ✓

---

## 2. Sharding strategies (`/deep-dives/sharding-strategies`)

**Diagram.** The Mermaid flowchart becomes `FlowDiagram` (`shardRouter`), with scenarios:

- **Route by hash:** `userId 42 → hash → shard 2`.
- **Hot shard:** range sharding by timestamp sends every new write to the last shard, which is marked `busy`.
- **Resharding:** dual-write to old and new shards → backfill → flip reads.

**Widgets:**

- **HashRing** (P1): add or remove nodes and watch only neighbouring keys move; a virtual-nodes slider; a keys-per-node bar chart with an "ideal" line.
- **Line chart:** "% of keys moved going from N to N+1 nodes". Modulo hashing moves `N/(N+1)` (80% at 4 → 5), while consistent hashing moves `1/(N+1)` (20%).

In the browser, the widget hashes with the same `hash(s, seed)` as the Bloom filter above, not Node's `crypto`.

**Sections:**

- **When to shard:** only after vertical scaling, indexes, caching, read replicas and archiving.
- **Choosing the shard key:** high cardinality, even distribution, matches the dominant query, avoids hot ranges.
- **Strategies:** comparison table below.
- **Cross-shard queries:** scatter-gather, global secondary indexes, denormalization.
- **Cross-shard transactions:** avoid them; use sagas.
- **Hot keys:** salting.
- **Resharding steps.**
- **Ids across shards:** Snowflake.

| Strategy | Even spread | Range scans | Rebalancing cost | Extra hop | Typical use |
|---|---|---|---|---|---|
| Hash mod N | ✓ | ✗ | Moves ~all keys | No | Fixed shard count |
| Range | Risk of hot ranges | ✓ | Split or merge ranges | No | Time-series, ordered ids |
| Directory | Manual control | Depends | Move one tenant at a time | Cached lookup | Multi-tenant SaaS with "whales" |
| Consistent hashing (+ vnodes) | ✓ | ✗ | ~1/N of the keys | No | Caches, Dynamo-style stores |
| Rendezvous (HRW) | ✓ | ✗ | ~1/N of the keys | No | Small node sets, no ring to maintain |

**Code cards:** hash (source), range (source), directory (source), online resharding (source, plus the numbered steps). Consistent hashing is replaced to fix source bug #12:

```js
import { createHash } from 'node:crypto';
const hash = s => createHash('md5').update(s).digest().readUInt32BE(0);

export class HashRing {
  constructor(nodes = [], vnodes = 100) { this.vnodes = vnodes; this.ring = []; nodes.forEach(n => this.add(n)); }
  add(node) {
    for (let i = 0; i < this.vnodes; i++) this.ring.push({ pos: hash(`${node}#${i}`), node });
    this.ring.sort((a, b) => a.pos - b.pos);
  }
  remove(node) { this.ring = this.ring.filter(p => p.node !== node); }
  get(key) {                                        // binary search for the first point at or after hash(key)
    const h = hash(key);
    let lo = 0, hi = this.ring.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.ring[mid].pos < h) lo = mid + 1; else hi = mid;
    }
    return this.ring[lo % this.ring.length].node;   // wrap around the ring
  }
}
// 4 → 5 nodes moves ~20% of keys (all of them to the new node); hash % N would move ~80%
```

**NEW cards**

```js
// Rendezvous (highest random weight) hashing: each key picks the node with the largest hash(node + key).
// No ring to maintain, and removing a node only moves that node's keys.
export const rendezvous = (key, nodes) => nodes.reduce((best, n) => (hash(n + key) > hash(best + key) ? n : best));
```

```js
// Scatter-gather: a query that can't use the shard key asks every shard, then merges, re-sorts and cuts
export async function topProducts(limit = 10) {
  const perShard = await Promise.all(shards.map(db =>
    db.query('SELECT id, name, sales FROM products ORDER BY sales DESC LIMIT $1', [limit])));
  return perShard.flatMap(r => r.rows).sort((a, b) => b.sales - a.sales).slice(0, limit);
}
// Latency = the slowest shard. If this query is frequent, maintain a precomputed global table instead.
```

```js
// Hot-key salting: spread one celebrity counter over 16 sub-keys; reads add them up.
// (Separate GETs rather than MGET, because in Redis Cluster the sub-keys live in different slots.)
const SALTS = 16;
export const like = postId => redis.incr(`likes:${postId}:${Math.floor(Math.random() * SALTS)}`);
export async function likes(postId) {
  const parts = await Promise.all(Array.from({ length: SALTS }, (_, i) => redis.get(`likes:${postId}:${i}`)));
  return parts.reduce((sum, v) => sum + Number(v ?? 0), 0);
}
```

```js
// Snowflake-style 64-bit ids: unique across shards with no coordination, roughly time-ordered.
// 41 bits ms since a custom epoch (~69 years) | 10 bits worker | 12 bits sequence (4,096 ids/ms/worker)
const EPOCH = 1_704_067_200_000n;                       // 2024-01-01T00:00:00Z
export function snowflake(workerId) {
  let lastMs = -1n, seq = 0n;
  return function next() {
    let now = BigInt(Date.now());
    if (now < lastMs) throw new Error('clock moved backwards');
    if (now === lastMs) {
      seq = (seq + 1n) & 4095n;
      if (seq === 0n) while ((now = BigInt(Date.now())) <= lastMs) {}   // sequence exhausted: wait for the next ms
    } else seq = 0n;
    lastMs = now;
    return ((now - EPOCH) << 22n) | (BigInt(workerId) << 12n) | seq;
  };
}
// Send ids to browsers as strings: 64-bit values don't fit in a JS number.
```

**Interview Q&A**

- **What's the shard key for a multi-tenant SaaS?** `tenant_id`, so a tenant's queries hit one shard. Use a directory so the few huge tenants can get their own shards, and keep a global table for cross-tenant admin queries.
- **How do you run queries that span shards?** Avoid them on hot paths. Use scatter-gather for admin and reporting, a global secondary index, or precomputed or denormalized tables fed by events.
- **How do you reshard without downtime?** Add the new shards, dual-write, backfill historical data, verify counts and checksums, flip reads behind a flag, stop the old writes, and clean up. Every step can be reversed until the last one.

**Quiz**

1. Going from 4 to 5 nodes with `hash % N` moves about:
   - 20%
   - **80%** ✓
2. Virtual nodes exist to:
   - Add capacity
   - **Even out load across physical nodes** ✓
3. Snowflake ids need:
   - A central counter
   - **A unique worker id per generator** ✓

---

## 3. Choosing the right store (`/deep-dives/choosing-a-data-store`)

**Diagram:**

- The decision flowchart becomes an **interactive `DecisionTree`** (P1): relations and transactions? → large files? → key lookups at scale? → flexible documents? → search or time-series.
- A second `FlowDiagram`, **Polyglot e-commerce**, shows where each fact lives:
  - orders and payments → Postgres;
  - catalog → MongoDB;
  - sessions and cart → Redis;
  - images → S3 + CDN;
  - search → Elasticsearch (fed by CDC);
  - events → Kafka → ClickHouse.

  Its scenario is "a price change propagates": Postgres → CDC → Kafka → Elasticsearch, and the cache gets invalidated.

| Store | Strong at | Weak at | Examples | How it scales |
|---|---|---|---|---|
| Relational | Transactions, constraints, joins, ad-hoc queries | Horizontal write scale | PostgreSQL, MySQL | Replicas, then sharding (Citus, Vitess) |
| Document | Flexible entities read together | Cross-document transactions and joins | MongoDB | Built-in sharding |
| Key-value | Single-key lookups at huge scale | Queries other than by key | Redis, DynamoDB | Partition by key |
| Wide-column | Write-heavy, time-ordered partitions | Ad-hoc queries, joins | Cassandra, ScyllaDB | Partition key + clustering |
| Object storage | Large blobs, cheap and durable | Low-latency small reads | S3, GCS | Effectively unlimited |
| Search | Full text, relevance, facets | Being the source of truth | Elasticsearch, OpenSearch | Shards + replicas |
| Time-series / columnar | Aggregations over time and events | Point updates | ClickHouse, TimescaleDB | Partition by time |
| Graph | Multi-hop relationship queries | Bulk analytics | Neo4j | Hard to shard well |

**Principles:**

- Model by access pattern first.
- **One source of truth per fact.** Derived stores (search, analytics, caches) are fed by CDC or the outbox and can always be rebuilt.
- OLTP and OLAP don't share a database.

**Code cards**

**Relational** (fixes a source bug: the original ignored `rowCount`, so an order committed even with zero stock):

```js
// Decrement stock first; if no row changed, the item is out of stock, so roll back instead of creating an order
const c = await pool.connect();
try {
  await c.query('BEGIN');
  const { rowCount } = await c.query('UPDATE stock SET qty = qty - $2 WHERE sku = $1 AND qty >= $2', [sku, qty]);
  if (rowCount === 0) throw new OutOfStockError(sku);
  await c.query('INSERT INTO orders (user_id, sku, qty, total) VALUES ($1, $2, $3, $4)', [userId, sku, qty, total]);
  await c.query('COMMIT');
} catch (e) {
  await c.query('ROLLBACK');
  throw e;
} finally {
  c.release();
}
```

The source cards for Document, Key-value, Object storage (presigned PUT) and Search via events are kept.

**NEW cards**

```js
// Document modeling: embed bounded data that's read together; reference unbounded data
await db.collection('orders').insertOne({ userId, status: 'paid', items: [{ sku: 'a1', qty: 2, price: 499 }], total: 998 });
await db.collection('reviews').insertOne({ productId, userId, stars: 5, text, createdAt: new Date() });  // millions per product
await db.collection('reviews').createIndex({ productId: 1, createdAt: -1 });
```

```js
// DynamoDB: design around the access pattern "latest 20 orders for a user"
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const { Items } = await ddb.send(new QueryCommand({
  TableName: 'shop',
  KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
  ExpressionAttributeValues: { ':pk': `USER#${userId}`, ':prefix': 'ORDER#' },   // sk = ORDER#<ISO date>
  ScanIndexForward: false,                                                         // newest first
  Limit: 20,
}));
```

```sql
-- Wide-column (Cassandra CQL): partition by (sensor, day) so no partition grows without bound;
-- rows inside a partition are sorted by time
CREATE TABLE readings (
  sensor_id text, day date, ts timestamp, value double,
  PRIMARY KEY ((sensor_id, day), ts)
) WITH CLUSTERING ORDER BY (ts DESC);
```

```js
// Browser side of a presigned upload: the file goes straight to S3, never through your servers
const { url, key } = await fetch('/api/uploads', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: file.type }),
}).then(r => r.json());
await fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });   // must match the signed type
await fetch('/api/photos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key }) });
```

**Interview Q&A**

- **Where do chat messages live?** In a wide-column store (Cassandra or Scylla) partitioned by conversation and sorted by sequence: write-heavy and read by recency. Or MongoDB with a `{conversationId, seq}` index at moderate scale.
- **Why not store images in Postgres?** Large blobs bloat the database, backups and replication, and you can't serve them from a CDN. Store them in object storage and keep only the key and metadata in Postgres.
- **How do you keep Elasticsearch in sync?** CDC (Debezium) or the outbox publishes changes, and an indexer consumes them idempotently. Rebuild with periodic full reindexes, and never treat the index as the source of truth.

**Quiz**

1. Which store for a like counter that's read constantly?
   - Postgres
   - **Redis** ✓
2. Full-text search with relevance ranking?
   - **Elasticsearch / OpenSearch** ✓
   - DynamoDB
3. Money movements?
   - **A relational DB with transactions** ✓
   - Cassandra

---

## 4. Polling, SSE and WebSockets (`/deep-dives/polling-sse-websockets`)

**Diagram.** One `SequenceDiagram` whose branch selector acts as tabs: **Short polling | Long polling | SSE | WebSocket**. Each branch animates three server events and shows when the client actually learns about each one.

**Widget: PollingRace** (P1). Four lanes on a shared time axis, with a seeded random event stream. Each lane draws its requests as arcs and marks when each event arrives. A results table shows average delay, number of requests, and an estimate of header overhead.

| | Short polling | Long polling | SSE | WebSocket | Webhook |
|---|---|---|---|---|---|
| Direction | Client pulls | Client pulls (held) | Server → client | Both ways | Server → server |
| Latency | Up to the interval | Near real time | Real time | Real time | Real time |
| Server cost | Many empty requests | One open request per client | One open stream per client | One socket per client, stateful | Per event |
| Proxies and firewalls | Fine | Mostly fine | Watch for buffering | Needs Upgrade support | Public endpoint |
| Reconnect | n/a | Manual | **Built in** (`Last-Event-ID`) | Manual | Provider retries |
| Best for | Dashboards | Legacy or simple setups | Feeds, scores, progress | Chat, games, collaboration | Provider events |

**Sections:**

- Over HTTP/1.1, browsers allow ~6 connections per origin, which limits SSE tabs. HTTP/2 multiplexes, so it's fine there.
- **Scaling WebSockets:**
  - a pub/sub backplane;
  - no sticky sessions needed when every message goes through pub/sub;
  - file-descriptor limits;
  - heartbeats;
  - draining on deploy.
- **Authenticating sockets:** a cookie or token on connect, then re-auth on expiry.
- **Webhook reliability:**
  - HMAC signatures;
  - timestamps against replay;
  - acknowledge fast;
  - process idempotently;
  - expect retries.

**Code cards**

```js
// Short polling that pauses while the tab is hidden (the source polled forever)
export function startPolling(fn, ms = 5_000) {
  let timer;
  const tick = async () => {
    if (!document.hidden) await fn().catch(() => {});
    timer = setTimeout(tick, ms);
  };
  tick();
  return () => clearTimeout(timer);
}
```

```js
// Long polling client (fixes source bug #7): back off with jitter on errors instead of re-polling instantly
export async function longPoll(onEvents, signal) {
  let since = 0, failures = 0;
  while (!signal.aborted) {
    try {
      const r = await fetch(`/events?since=${since}`, { signal: AbortSignal.any([signal, AbortSignal.timeout(35_000)]) });
      if (r.status === 204) continue;                         // the server waited 30 s with no news: ask again
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const { events, cursor } = await r.json();
      since = cursor; failures = 0;
      onEvents(events);
    } catch {
      if (signal.aborted) return;
      failures++;
      await new Promise(res => setTimeout(res, Math.random() * Math.min(30_000, 1_000 * 2 ** failures)));
    }
  }
}
```

```js
// Long polling server: subscribe first, then check the backlog, so no event slips through the gap
app.get('/events', async (req, res) => {
  const since = Number(req.query.since ?? 0);
  let done = false, timer;
  const finish = (status, body) => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    bus.off('event', onEvent);
    if (status) body ? res.status(status).json(body) : res.status(status).end();
  };
  const onEvent = ev => { if (ev.id > since) finish(200, { events: [ev], cursor: ev.id }); };
  bus.on('event', onEvent);
  timer = setTimeout(() => finish(204), 30_000);
  req.on('close', () => finish());                            // client went away: just clean up
  const backlog = await eventsAfter(since);
  if (backlog.length) finish(200, { events: backlog, cursor: backlog.at(-1).id });
});
```

```js
// SSE server with resume (Last-Event-ID) and heartbeats (the source had neither)
app.get('/stream', async (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no' });  // nginx: don't buffer
  res.flushHeaders();
  const send = ev => res.write(`id: ${ev.id}\nevent: ${ev.type}\ndata: ${JSON.stringify(ev.data)}\n\n`);
  const lastId = Number(req.get('Last-Event-ID') ?? 0);
  (await eventsAfter(lastId)).forEach(send);                  // replay what was missed while disconnected
  const unsubscribe = bus.subscribe(send);                    // then go live
  const ping = setInterval(() => res.write(': ping\n\n'), 15_000);   // comment lines keep idle proxies open
  req.on('close', () => { clearInterval(ping); unsubscribe(); });
});

// Browser: EventSource reconnects by itself and sends Last-Event-ID automatically
const es = new EventSource('/stream');
es.addEventListener('score', e => renderScore(JSON.parse(e.data)));
```

The source's **WebSocket heartbeat** card is kept.

```js
// WebSocket client with reconnect + full jitter, so 100K clients don't all reconnect in the same second after a deploy
export function connect(url, onMessage) {
  let ws, attempt = 0, closed = false;
  const open = () => {
    ws = new WebSocket(url);
    ws.onopen = () => { attempt = 0; };
    ws.onmessage = e => onMessage(JSON.parse(e.data));
    ws.onclose = () => {
      if (closed) return;
      setTimeout(open, Math.random() * Math.min(30_000, 500 * 2 ** attempt++));
    };
  };
  open();
  return {
    send: data => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify(data)),
    close: () => { closed = true; ws.close(); },
  };
}
```

```js
// Scaling Socket.IO across nodes: the Redis adapter relays room broadcasts between servers
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pub = createClient({ url: process.env.REDIS_URL }), sub = pub.duplicate();
await Promise.all([pub.connect(), sub.connect()]);
const io = new Server(httpServer, { adapter: createAdapter(pub, sub) });
io.on('connection', socket => {
  socket.join(`user:${socket.data.userId}`);                       // set during auth middleware
  socket.on('chat', msg => io.to(`user:${msg.to}`).emit('chat', msg));   // reaches the user on any node
});
```

```js
// Webhooks: verify the HMAC over the raw body in constant time, acknowledge fast, process later
import { createHmac, timingSafeEqual } from 'node:crypto';

app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const expected = createHmac('sha256', process.env.WEBHOOK_SECRET).update(req.body).digest();
  const given = Buffer.from(req.get('x-signature') ?? '', 'hex');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return res.sendStatus(401);
  queue.publish('webhook', JSON.parse(req.body));             // the consumer dedupes by event id
  res.sendStatus(200);
});
// Also check a signed timestamp header and reject anything older than ~5 minutes (replay protection).
```

**Interview Q&A**

- **Live sports scores: which technique?** SSE: one-way, automatic reconnect with resume, plain HTTP, and it works with HTTP/2 multiplexing.
- **Why does SSE "hang" behind some proxies?** The proxy buffers the response. Disable buffering (`X-Accel-Buffering: no`), send periodic comment heartbeats, and check idle timeouts.
- **How do you serve 1M concurrent WebSockets?** Spread connections across many gateway nodes (tens of thousands each, limited by memory and file descriptors), route messages over pub/sub, heartbeat to find dead peers, and drain gracefully with jittered client reconnects.

**Quiz**

1. One-way server-to-browser updates with automatic resume?
   - **SSE** ✓
   - WebSocket
2. The first thing a webhook handler does:
   - Process the event
   - **Verify the signature** ✓
3. Why add jitter to reconnects?
   - Lower latency
   - **Avoid a reconnect stampede** ✓

---

## 5. Connections: pooling, keep-alive and limits (`/deep-dives/connections-pooling`)

**Diagram.** The Mermaid flowchart becomes a `FlowDiagram`, with scenarios:

- **Normal:** requests borrow and return connections.
- **Pool exhausted:** requests queue and time out after 2 s, and the caption shows the error.
- **PgBouncer:** 240 app connections are multiplexed onto 40 server connections.

**Widgets:**

- **PoolSim** (P2): pool size, request rate, query time and DB cores. It shows queue wait and timeouts, and that a pool far above the DB's cores makes queries *slower*.
- **HandshakeTimeline** (P2): RTT slider. A cold HTTPS request costs DNS + TCP + TLS 1.3 + the request (~4 RTT) vs ~1 RTT on a kept-alive connection. Toggle TLS 1.2 (+1 RTT) and HTTP/3 (handshake combined).

**Sections:**

- **What a connection costs:** TCP and TLS handshakes, authentication, and server memory (each Postgres connection is a server process).
- **Pool sizing:** total across instances ≤ DB `max_connections` minus headroom. The PostgreSQL wiki heuristic is `(cores × 2) + effective spindles` for active connections.
- **PgBouncer modes** (session, transaction, statement) and caveats: session state doesn't survive transaction pooling, and prepared statements need explicit support (`max_prepared_statements` in PgBouncer ≥ 1.21).
- **Keep-alive:** Node's `fetch` and, since Node 19, the default HTTP agent reuse connections.
- **Timeouts:** connect, request and idle, plus deadline propagation.
- **Concurrency limits.**
- **File descriptors and `ulimit`.**
- **Graceful shutdown.**
- **HTTP/2 multiplexing and HTTP/3.**

**Code cards:** the source cards for pooling, `mapLimit` and graceful shutdown are kept. The keep-alive card is updated:

```js
// Node's fetch (undici) already reuses connections; tune its pool for heavy service-to-service traffic
import { Agent, setGlobalDispatcher } from 'undici';
setGlobalDispatcher(new Agent({ connections: 128, keepAliveTimeout: 10_000, keepAliveMaxTimeout: 60_000 }));
```

```js
// Pool sizing: Postgres max_connections = 200, keep 20 for admin and migrations, 12 app instances
const poolMax = Math.floor((200 - 20) / 12);       // 15 per instance. Adding instances? Put PgBouncer in front first.
const pool = new Pool({ max: poolMax, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 2_000 });
```

```js
// Deadlines: give the whole request a budget and pass what's left downstream
app.use((req, _res, next) => { req.deadline = Date.now() + 2_000; next(); });
const remaining = req => Math.max(0, req.deadline - Date.now());

app.get('/checkout', async (req, res) => {
  const user = await fetch(`${USERS_URL}/${req.userId}`, { signal: AbortSignal.timeout(Math.min(500, remaining(req))) }).then(r => r.json());
  const quote = await fetch(`${PRICING_URL}/quote`, {
    method: 'POST', body: JSON.stringify(user.cart),
    headers: { 'Content-Type': 'application/json', 'x-deadline-ms': String(remaining(req)) },   // downstream can give up early too
    signal: AbortSignal.timeout(remaining(req)),
  });
  res.json(await quote.json());
});
```

```js
// Graceful shutdown for an HTTP + WebSocket server (extends the source card)
process.on('SIGTERM', () => {
  shuttingDown = true;                                         // readiness → 503: the LB stops sending new requests
  wss?.clients.forEach(c => c.close(1001, 'server restarting'));   // clients reconnect elsewhere (with jitter)
  server.close(() => pool.end().then(() => process.exit(0)));  // wait for in-flight requests, then close the DB pool
  server.closeIdleConnections();                               // drop idle keep-alive sockets now
  setTimeout(() => process.exit(1), 25_000).unref();           // hard stop before the orchestrator's kill timeout
});
```

**Interview Q&A**

- **We scaled from 10 to 30 app instances and Postgres started refusing connections. Why?** Each instance opens its own pool, so 30 × 20 = 600 connections, far above `max_connections`. Fix it with smaller per-instance pools sized from the total, and PgBouncer in transaction mode.
- **Why can a bigger pool make things slower?** Beyond the DB's ability to run queries in parallel (roughly its cores), extra connections only add context switching and lock contention, so throughput drops and latency rises.
- **How do you deploy WebSocket servers without dropping users?** Fail readiness, send close frames (1001), let clients reconnect with jitter to other nodes, and drain within the termination grace period.

**Quiz**

1. 12 instances × a pool of 20, with `max_connections` = 200:
   - Fine
   - **Connection errors under load** ✓
2. A cold HTTPS request with TLS 1.3 costs roughly how many round trips before the response?
   - 1
   - **~4 (DNS, TCP, TLS, request)** ✓
3. Does Node's built-in fetch keep connections alive by default?
   - **Yes** ✓
   - No

---

## 6. Request flows end to end (`/deep-dives/request-flows`)

**Diagram.** One `SequenceDiagram` whose branch selector shows each flow:

- **Read:** CDN hit or miss → Redis hit or miss.
- **Write:** transaction + outbox → relay → queue.
- **Async:** 202 + status URL → worker → poll.
- **Failure:** timeout → breaker opens → fallback.
- **Idempotent retry:** the response is lost → the client retries with the same key → the stored result is returned.

**Widget: TraceWaterfall** (P2). Spans for DNS, TLS, CDN, API, Redis, DB and queue publish against a latency budget line (for example 200 ms p99). Toggles: CDN hit, cache hit, slow DB, dependency timeout. The total and budget status are shown in text.

**Sections:**

- **Latency budgets:** split p99 across the hops and leave headroom.
- **Read path.**
- **Write path:** validate → transaction + outbox → respond → async consumers update caches and indexes.
- **Async path:** 202 + `Location`; the client learns about completion by polling, webhook or SSE.
- **Failure path.**
- **Idempotent retries.**
- **Trace context propagation:** the W3C `traceparent` header, which OpenTelemetry handles automatically.

**Code cards:** the source cards for the read path, write path and failure path are kept, plus `withTimeout`. The source's async-path card is extended with a status endpoint:

```js
// Async path: 202 + Location, and a status endpoint (BullMQ)
app.post('/reports', async (req, res) => {
  const job = await reports.add('build', req.body);
  res.status(202).location(`/reports/${job.id}`).json({ jobId: job.id });
});
app.get('/reports/:id', async (req, res) => {
  const job = await reports.getJob(req.params.id);
  if (!job) return res.sendStatus(404);
  const state = await job.getState();                    // waiting | active | completed | failed | delayed
  res.json({ state, progress: job.progress, result: state === 'completed' ? job.returnvalue : undefined });
});
```

```js
// The failure path needs a timeout helper. This doesn't cancel the underlying work; pass an AbortSignal where possible.
export function withTimeout(promise, ms) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`timeout after ${ms} ms`)), ms); }),
  ]).finally(() => clearTimeout(timer));
}
```

**Idempotent retries** (fixes source bug #8). The source let two concurrent requests with the same key both charge the card:

```js
app.post('/payments', async (req, res) => {
  const idemKey = req.get('Idempotency-Key');
  if (!idemKey) return res.status(400).json({ error: 'Idempotency-Key header required' });
  const key = `idem:${req.user.id}:${idemKey}`;
  const claimed = await redis.set(key, 'pending', 'EX', 86_400, 'NX');     // only one request can claim the key
  if (!claimed) {
    const prev = await redis.get(key);
    return prev === 'pending'
      ? res.status(409).json({ error: 'Payment with this key is in progress' })
      : res.json(JSON.parse(prev));                                      // replay the stored result
  }
  try {
    const result = await charge(req.body, { idempotencyKey: idemKey });  // the payment provider dedupes too
    await redis.set(key, JSON.stringify(result), 'EX', 86_400);
    res.json(result);
  } catch (e) {
    await redis.del(key);                                                // let the client retry after a failure
    throw e;
  }
});
```

**Interview Q&A**

- **Walk me through what happens when a user clicks "Buy".**
  1. DNS, TLS, then the CDN (no cache for POST).
  2. LB → gateway (auth, rate limit) → order service.
  3. Validate, then idempotency check.
  4. Transaction: reserve stock and insert the order and the outbox row.
  5. Respond 201.
  6. The relay publishes `order.created`, and consumers handle email, analytics and the search index.
  7. Payment confirmation arrives later by webhook.
- **How do you set a latency budget?** Start from the user-facing p99 target, subtract network and edge time, then split the rest across the hops on the critical path. Enforce it with per-call timeouts and deadline propagation.
- **The client timed out, but the charge went through. What now?** The client retries with the same idempotency key and gets the stored result. If the key had expired, it calls a status endpoint by order id before trying again.

**Quiz**

1. Accepted for async processing:
   - **202** ✓
   - 201
2. What does the outbox prevent?
   - Slow writes
   - **Lost or phantom events from dual writes** ✓
3. Which header carries trace context between services?
   - `x-request-id` only
   - **`traceparent`** ✓
