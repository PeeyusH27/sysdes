# 06: Interview questions (hub, page template, detailed answers, backlog)

## 1. Questions hub `/questions`

- **Filters**, all kept in the URL (`?cat=Backend&lv=Medium&tag=redis&q=rate`) so a filtered view can be shared:
  - category chips: All, Frontend, Backend, Full-stack;
  - level chips: Easy, Medium, Hard;
  - topic tags (multi-select): caching, queues, websockets, consistency, concurrency, pagination, redis, sql…;
  - a search box.

  The filter bar is a client component using `useSearchParams`, wrapped in `<Suspense>` (01 §3).
- **Sort:** recommended order (the source's practice order), level, or time.
- **Each card shows:**
  - category and level badges, title, one-line intro and minutes;
  - 3 key-concept tags;
  - status badges: **Solved** (quiz ≥ 2/3), **Bookmarked**, and the **challenge score**.
- **Practice modes** (a toggle at the top of the hub and on every question page):
  - **Read:** everything expanded.
  - **Mock interview:** sections are collapsed behind **Reveal**, a 45-minute timer runs with phase prompts, and at the end the learner rates themselves 1–4 per rubric dimension (saved to progress).
  - **Flashcards:** the follow-up questions from every question, one at a time, with **Show answer**.
- **Empty state:** "No questions match. Clear filters."

## 2. Question page template

| # | Section | Component | Required (content test) |
|---|---|---|---|
| 1 | Header: badges, title, minutes, related lessons, bookmark, mode toggle | `QuestionLayout` | ✓ |
| 2 | **30-second answer** (TL;DR) | `TLDR` | ✓ |
| 3 | Requirements: functional, non-functional, out of scope | `Requirements` | ✓ |
| 4 | Clarifying questions to ask | list | |
| 5 | Capacity estimate | `CapacityCalculator preset` or a numbers table | Backend and full-stack |
| 6 | API / interface | `ApiTable` or component props | ✓ |
| 7 | Data model | SQL / Mongo / client state shape | ✓ |
| 8 | Architecture diagram with scenarios | `FlowDiagram` / `SequenceDiagram` / `ClassDiagram` | ✓ |
| 9 | How to approach it in the interview | `Steps` (the source's `QX.ap`, kept) | ✓ |
| 10 | Step-by-step answer (8–10 steps) | `Steps` with prose and code excerpts | ✓ |
| 11 | Implementation (complete files) | `CodeTabs` | ✓ |
| 12 | Failure modes | `FailureModes` (what breaks → effect → mitigation) | ✓ |
| 13 | Trade-offs | `TradeOffTable` (option, pros, cons, choose when) | ✓ |
| 14 | Follow-up questions **with answers** | `FollowUps` | ✓ |
| 15 | Quiz (3 questions) | `Quiz` | ✓ |
| 16 | Build it in the playground | Challenge CTA | Where a challenge exists |
| 17 | Previous / next | `PrevNext` | ✓ |

```mdx
{/* content/questions/rate-limiter/page.mdx (skeleton) */}
import * as d from './diagrams'
import { quiz } from './quiz'

<TLDR>Token bucket per key in Redis, checked by one atomic Lua script on Redis time; 429 with Retry-After; fail open with a local fallback.</TLDR>

<Requirements
  functional={['Limit each user or API key, e.g. 100 requests/minute', 'Different limits per endpoint and plan', '429 with Retry-After']}
  nonFunctional={['< 5 ms added p99', 'Consistent across 50 app servers', 'Limiter failure never takes the API down']}
  outOfScope={['Billing for overages', 'Network-level DDoS (CDN/WAF)']} />

## Architecture
<FlowDiagram spec={d.architecture} />

## Step-by-step answer
<Steps>
  <Step title="Pick the identity key">…</Step>
</Steps>

## Implementation
<CodeTabs files={['snippets/token-bucket.js', 'snippets/token-bucket.lua', 'snippets/redis-limiter.js', 'snippets/middleware.js']} />

<FollowUps>
  <FollowUp q="Per-IP or per-user limits?">…</FollowUp>
</FollowUps>
<Quiz items={quiz} />
```

---

## 3. Detailed answers

### Q1. Design a Parking Lot (LLD): Backend · Medium · 35 min

**30-second answer.** Model ParkingLot → Floor → Spot, plus Vehicle and Ticket. Put what changes (spot selection, pricing, payment) behind small strategy interfaces. Keep a free set per spot type on each floor, so allocation doesn't scan every spot. In one process the event loop makes allocation atomic. Across servers, let the database pick and lock a spot with `FOR UPDATE SKIP LOCKED`.

**Requirements**

- **Functional:**
  - Floors with bike, compact and large spots.
  - A ticket at entry and a fee at exit.
  - Availability per floor and type on display boards.
  - Several payment methods and multiple gates.
- **Non-functional:**
  - A spot is never given out twice, even with concurrent gates.
  - Allocation is fast.
  - New vehicle types or pricing rules don't require edits to core classes.
  - Deterministic tests (inject the clock).
- **Out of scope:** reservations (a follow-up) and plate-recognition hardware.

**Clarifying questions:**

- How many floors and spots?
- Which vehicles fit which spots, and may a bike use a compact spot?
- What's the pricing model: hourly, flat, peak hours, daily cap, grace period?
- Is payment at the exit gate or at pay stations?
- One lot (LLD) or a chain of lots (HLD)?

**Diagrams**

- `ClassDiagram` with:
  - `ParkingLot` ◆— `Floor` (1..*) ◆— `Spot` (1..*);
  - `Ticket` → `Spot`, `Vehicle`;
  - `ParkingLot` → `SpotSelector` «interface» ◁— `LowestFloorFirst`, `NearestToGate`;
  - `ParkingLot` → `PricingStrategy` «interface» ◁— `HourlyPricing`, `DailyCap` (decorator);
  - `DisplayBoard` ⋯> `ParkingLot` (observer);
  - `PaymentMethod` «interface» ◁— `Card`, `Cash`, `Wallet`.
- `SequenceDiagram` with branches: **Park** (Gate → Lot → Selector → Floor → Ticket) with alt *lot full*, and **Exit** (Gate → Lot.quote → Pricing → Payment → Lot.exit → Floor.release → DisplayBoard) with alt *payment failed*.

**How to approach it** (source `QX.ap`, kept):

1. Clarify.
2. List the nouns.
3. Sketch the methods.
4. Extract what varies.
5. Walk a scenario.

**Step-by-step answer**

1. **Use cases first:** park, quote, pay and exit, show availability. Say them aloud before drawing anything.
2. **Nouns become classes, verbs become methods.** `Spot`, `Vehicle` and `Ticket` are thin data classes. Behaviour lives in `ParkingLot`, `Floor` and the strategies.
3. **Relationships:** the lot owns its floors and the floors own their spots (composition). A ticket *references* a spot and a vehicle.
4. **Allocation in O(spot types):** each floor keeps `Map<spotType, Set<Spot>>` of free spots. Try the smallest type that fits first, so trucks never block bike spots. EV charging is a spot *feature* the selector filters on, not a new class.
5. **Pricing as a strategy:** `fee(durationMs, vehicle)`. Caps, peak hours and discounts are **decorators** that wrap another strategy, so rules combine without editing classes (open/closed). Inject the clock to test hour boundaries.
6. **Payment flow:** `quote(ticket)` → pay → `exit(ticket, payment)`. Exit checks the amount, frees the spot and deletes the ticket, so the same ticket can't exit twice.
7. **Concurrency:** in one Node process, `take()` runs to completion without interleaving, so it's atomic. With several gate servers, the source of truth moves to the database: one `UPDATE … WHERE id = (SELECT … FOR UPDATE SKIP LOCKED)`, with ticket creation in the same transaction.
8. **Display boards:** use the observer pattern. The lot emits `changed(floor)` and boards update their counts.
9. **Extensibility check:**
   - A new vehicle type means a new enum value plus its row in `FITS`.
   - Reservations mean a hold with a TTL on a spot type.
   - EV means a feature flag on spots plus a decorator for energy fees.
10. **Tests:** cover lot full, an unknown ticket, the grace period, exact hour boundaries, the daily cap, and the observer firing.

**Implementation**

```js
// models.js
export const VehicleType = Object.freeze({ BIKE: 'bike', CAR: 'car', TRUCK: 'truck' });
export const SpotType = Object.freeze({ BIKE: 'bike', COMPACT: 'compact', LARGE: 'large' });

// Which spot types each vehicle may use, smallest first, so big vehicles never take small spots
export const FITS = {
  [VehicleType.BIKE]: [SpotType.BIKE, SpotType.COMPACT, SpotType.LARGE],
  [VehicleType.CAR]: [SpotType.COMPACT, SpotType.LARGE],
  [VehicleType.TRUCK]: [SpotType.LARGE],
};

export class Spot {
  constructor(id, type, floor) { Object.assign(this, { id, type, floor, features: new Set() }); }   // features: 'ev', 'accessible'…
}
```

```js
// floor.js: free spots grouped by type
export class Floor {
  constructor(level, spots) {
    this.level = level;
    this.free = new Map();                                   // spotType -> Set<Spot>
    for (const s of spots) {
      if (!this.free.has(s.type)) this.free.set(s.type, new Set());
      this.free.get(s.type).add(s);
    }
  }
  take(types, accept = () => true) {                         // accept() filters on features (e.g. EV chargers)
    for (const t of types) {
      for (const spot of this.free.get(t) ?? []) {
        if (!accept(spot)) continue;
        this.free.get(t).delete(spot);
        return spot;
      }
    }
    return null;
  }
  release(spot) { this.free.get(spot.type).add(spot); }
  available(type) { return this.free.get(type)?.size ?? 0; }
}
```

```js
// strategies.js
export class LowestFloorFirst {                              // a SpotSelector
  choose(floors, vehicle, fits) {
    for (const floor of floors) {
      const spot = floor.take(fits[vehicle.type], s => !vehicle.needsCharger || s.features.has('ev'));
      if (spot) return spot;
    }
    return null;
  }
}

export class HourlyPricing {                                 // a PricingStrategy
  constructor(rates = { bike: 10, car: 20, truck: 40 }, graceMinutes = 10) {
    this.rates = rates;
    this.graceMs = graceMinutes * 60_000;
  }
  fee(ms, vehicle) {
    if (ms <= this.graceMs) return 0;
    return Math.ceil(ms / 3_600_000) * this.rates[vehicle.type];   // every started hour counts
  }
}

export class DailyCap {                                      // decorator: same interface, one extra rule
  constructor(inner, cap) { this.inner = inner; this.cap = cap; }
  fee(ms, vehicle) {
    const days = Math.floor(ms / 86_400_000);
    return days * this.cap + Math.min(this.inner.fee(ms - days * 86_400_000, vehicle), this.cap);
  }
}
```

```js
// parking-lot.js
import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import { FITS } from './models.js';

export class ParkingLot extends EventEmitter {
  constructor({ floors, selector, pricing, clock = () => Date.now() }) {
    super();
    Object.assign(this, { floors, selector, pricing, clock, tickets: new Map() });
  }
  park(vehicle) {
    const spot = this.selector.choose(this.floors, vehicle, FITS);    // atomic within one Node process
    if (!spot) throw new Error(`Lot full for ${vehicle.type}`);
    const ticket = { id: randomUUID(), vehicle, spot, entry: this.clock() };
    this.tickets.set(ticket.id, ticket);
    this.emit('changed', spot.floor);                                 // display boards listen to this
    return ticket;
  }
  quote(ticketId) {
    const t = this.#ticket(ticketId);
    return this.pricing.fee(this.clock() - t.entry, t.vehicle);
  }
  exit(ticketId, payment) {
    const t = this.#ticket(ticketId);
    const fee = this.quote(ticketId);
    if (payment.amount < fee) throw new Error(`Payment of ${fee} required`);
    this.tickets.delete(ticketId);                                    // a ticket can only exit once
    this.floors[t.spot.floor].release(t.spot);
    this.emit('changed', t.spot.floor);
    return { fee, change: payment.amount - fee };
  }
  #ticket(id) {
    const t = this.tickets.get(id);
    if (!t) throw new Error('Unknown ticket');
    return t;
  }
}
```

```js
// parking-lot.test.js
import { test, expect } from 'vitest';
import { Spot } from './models.js';
import { Floor } from './floor.js';
import { LowestFloorFirst, HourlyPricing, DailyCap } from './strategies.js';
import { ParkingLot } from './parking-lot.js';

const makeLot = clock => {
  const floors = [
    new Floor(0, [new Spot('0-C1', 'compact', 0), new Spot('0-L1', 'large', 0)]),
    new Floor(1, [new Spot('1-B1', 'bike', 1)]),
  ];
  return { floors, lot: new ParkingLot({ floors, selector: new LowestFloorFirst(), pricing: new HourlyPricing(), clock }) };
};

test('trucks only take large spots; fees round up per started hour', () => {
  let now = 0;
  const { lot, floors } = makeLot(() => now);
  const t = lot.park({ type: 'truck', plate: 'KA01AB1234' });
  expect(t.spot.id).toBe('0-L1');
  expect(() => lot.park({ type: 'truck', plate: 'KA02' })).toThrow(/Lot full/);
  now = 61 * 60_000;                                                  // 61 minutes = 2 started hours × 40
  expect(lot.exit(t.id, { amount: 100 })).toEqual({ fee: 80, change: 20 });
  expect(floors[0].available('large')).toBe(1);
});

test('grace period and daily cap', () => {
  const pricing = new DailyCap(new HourlyPricing(), 150);
  expect(pricing.fee(5 * 60_000, { type: 'car' })).toBe(0);
  expect(pricing.fee(23 * 3_600_000, { type: 'car' })).toBe(150);
  expect(pricing.fee(26 * 3_600_000, { type: 'car' })).toBe(190);    // 1 day capped + 2 hours
});

test('display boards hear about every change', () => {
  const { lot } = makeLot(() => 0);
  const changed = [];
  lot.on('changed', floor => changed.push(floor));
  lot.exit(lot.park({ type: 'car' }).id, { amount: 0 });
  expect(changed).toEqual([0, 0]);
});
```

```sql
-- allocate.sql: many gates on many servers. Postgres picks and locks one free spot atomically.
UPDATE spots SET ticket_id = $1, taken_at = now()
WHERE id = (
  SELECT id FROM spots
  WHERE lot_id = $2 AND type = ANY($3) AND ticket_id IS NULL
  ORDER BY array_position($3, type), floor, id      -- smallest fitting type, then lowest floor
  LIMIT 1
  FOR UPDATE SKIP LOCKED                            -- concurrent gates skip rows another gate is locking
)
RETURNING id, floor;
```

**Failure modes**

| What breaks | Effect | Mitigation |
|---|---|---|
| Two gates allocate at the same moment | The same spot is assigned twice | One process: the event loop serialises it. Several servers: `SKIP LOCKED` in a transaction. |
| Gate crashes after taking a spot but before printing the ticket | Spot leaked | Spot update and ticket insert in one transaction; a reconciliation job frees orphaned spots |
| Lost ticket | Can't compute the fee | Look up by plate (stored on the ticket), or charge the daily maximum |
| Gate loses its network | Can't reach the central DB | The local lot service works offline and syncs later (see follow-ups) |

**Trade-offs**

| Choice | Pros | Cons | Choose when |
|---|---|---|---|
| Free sets per type vs linear scan | O(types) allocation | More state to keep consistent | Hundreds+ of spots |
| Strategy classes vs `if/else` | Swappable, testable rules | More files | Rules change often (they do) |
| In-memory vs DB as the source of truth | Simple and fast | One process only | Single gate controller; switch to the DB for multiple servers |

**Follow-ups (with answers)**

- **How would you scale to 500 lots?** Each lot runs a local service, so the gates keep working if the WAN drops. It syncs tickets and payments to a central service whose database is sharded by `lot_id`. The availability API for apps reads aggregated counts that each lot pushes every few seconds.
- **How do you handle a lost ticket?** Tickets store the plate. The attendant looks up the open ticket by plate (ANPR, if available) and charges from the real entry time. Without a match, charge the posted maximum daily fee.
- **How would you add reservations?** Reserve a *spot type* for a time window rather than a specific spot, with a count per type and window. On arrival, convert the reservation into a normal allocation. Release no-shows after a grace TTL, and define an over-booking policy.
- **How would you add EV charging?** Add an `ev` feature to some spots, a selector filter (`needsCharger`), and an `EnergyFee` pricing decorator. No existing class changes, which is open/closed in practice.
- **Is `take()` really atomic in Node?** Yes, within one process: synchronous code isn't interleaved. With worker threads or several processes it isn't, so move allocation to the database (`SKIP LOCKED`) or Redis (`SET NX` per spot).

**Quiz**

1. What keeps allocation fast?
   - Sorting spots on each request
   - **A free set per spot type per floor** ✓
2. Adding a "daily cap" without editing `HourlyPricing` uses which pattern?
   - **Decorator** ✓
   - Singleton
3. What prevents two gate servers from taking the same spot?
   - **`FOR UPDATE SKIP LOCKED` in one statement** ✓
   - A JS `Map`

**Playground:** no challenge. This is an LLD question.

---

### Q2. Design a Rate Limiter: Backend · Medium · 35 min

**30-second answer.** Use a token bucket per identity (user, API key or IP), stored in Redis and checked by **one Lua script** so the read-modify-write is atomic across all app servers. The script uses **Redis's clock** to avoid skew. Enforce it at the gateway. Return `429` with `Retry-After` and `RateLimit-*` headers. If Redis is down, fail open for normal endpoints with a local in-memory limiter, and fail closed for login, OTP and expensive endpoints.

**Requirements**

- **Functional:**
  - Limits per user, API key or IP.
  - Different rules per endpoint and plan.
  - `429` + `Retry-After` + remaining quota.
- **Non-functional:**
  - < 5 ms added p99.
  - Consistent across N servers.
  - A limiter outage must not take the API down.
  - Memory-bounded for millions of keys.
- **Out of scope:** billing overages, and volumetric DDoS (the CDN/WAF's job).

**Clarifying questions:**

- Who is limited (user, key, IP)?
- Are short bursts allowed?
- Hard or soft limit?
- One region or global?
- On limiter failure, fail open or closed?

**Estimate.** At a peak of 10K req/s there are 10K script calls/s. One Redis primary handles about 100K simple ops/s, and Lua scripts cost more but still fit. 1M active keys at a few hundred bytes each is a few hundred MB. Idle keys expire.

| Algorithm | State per key | Accuracy | Bursts | Note |
|---|---|---|---|---|
| Fixed window | 1 counter | Up to 2× the limit at window edges | Yes, at edges | Simplest |
| Sliding log | Every timestamp | Exact | No | Memory grows with traffic |
| **Sliding window counter** | 2 counters | ~Exact | Limited | Good for "N per minute" quotas |
| **Token bucket** | Tokens + timestamp | Exact average rate | Up to capacity | Default for APIs |
| Leaky bucket | Queue | Smooth output | No | Adds latency (queueing) |

**API contract:** `RateLimit-Limit`, `RateLimit-Remaining` and `RateLimit-Reset` (the IETF RateLimit header fields draft) on every response, plus `Retry-After` on a 429.

**Diagram: `architecture`**, scenarios:

- **Allowed.**
- **Burst exhausted:** 429 with a computed `Retry-After`.
- **Redis down:** the local fallback bucket answers, and the caption explains that it's per instance.

**Widgets:** TokenBucketViz (P1), plus a fixed-vs-sliding boundary demo (two windows; 2× burst at the edge).

**How to approach it** (source `QX.ap`, kept):

1. Clarify.
2. Pick an algorithm.
3. Place the state.
4. Make it atomic.
5. Failure and UX.

**Step-by-step answer**

1. **Identity:** the authenticated user or API key first. Use IP only for anonymous traffic, and keep it loose because of shared NATs.
2. **Algorithm:** a token bucket (rate `r`, capacity `b`) allows short bursts and enforces the average. Use a sliding-window counter for strict "100 per minute" quotas.
3. **Where to enforce:** global limits at the gateway; expensive operations inside the service; client-side throttling for UX only (it's not security).
4. **State:** a Redis hash `rl:<rule>:<id>` holding `tokens` and `ts`, with a TTL equal to the time to refill completely, so idle keys disappear.
5. **Atomicity:** one Lua script reads, refills, takes and writes. Separate GET/SET calls from 50 servers would race.
6. **Clock:** use `redis.call('TIME')` inside the script, so app-server clock skew doesn't matter.
7. **Response:** a 429 with `Retry-After` computed from the token deficit, and quota headers on every response so clients can pace themselves.
8. **Failure policy:**
   - Fail open plus a per-instance local bucket for normal endpoints.
   - Fail closed (503) for login, OTP and payments.
   - Configure ioredis to **fail fast**: no offline queue, no retries, a 50 ms command timeout. Otherwise requests hang while Redis is down.
9. **Rules and regions:** rules (rate and capacity per plan and endpoint) live in config and are cached in process. Across regions, give each region its share of the budget, or accept an approximate global limit synced asynchronously.
10. **Observability:** count allowed and limited requests per rule, and alert on sudden 429 spikes (a client bug or an attack).

**Implementation**

```js
// token-bucket.js: in-memory (single instance, and the fallback when Redis is down)
export class TokenBucket {
  constructor({ ratePerSec, capacity, now = () => Date.now() }) {
    Object.assign(this, { ratePerSec, capacity, now, tokens: capacity, last: now() });
  }
  take(n = 1) {
    const t = this.now();
    this.tokens = Math.min(this.capacity, this.tokens + ((t - this.last) / 1000) * this.ratePerSec);
    this.last = t;
    if (this.tokens >= n) {
      this.tokens -= n;
      return { ok: true, remaining: Math.floor(this.tokens), retryAfterMs: 0 };
    }
    return { ok: false, remaining: 0, retryAfterMs: Math.ceil(((n - this.tokens) / this.ratePerSec) * 1000) };
  }
}
```

```js
// token-bucket.test.js
import { test, expect } from 'vitest';
import { TokenBucket } from './token-bucket.js';

test('bursts up to capacity, then refills at the rate', () => {
  let now = 0;
  const bucket = new TokenBucket({ ratePerSec: 2, capacity: 3, now: () => now });
  expect([bucket.take(), bucket.take(), bucket.take()].every(r => r.ok)).toBe(true);
  expect(bucket.take()).toEqual({ ok: false, remaining: 0, retryAfterMs: 500 });   // 1 token at 2/s
  now = 500;
  expect(bucket.take().ok).toBe(true);
});
```

```lua
-- token-bucket.lua · KEYS[1] = bucket key · ARGV[1] = tokens per second · ARGV[2] = capacity
local rate = tonumber(ARGV[1])
local cap = tonumber(ARGV[2])
local t = redis.call('TIME')                                      -- Redis's clock: no skew between app servers
local now = tonumber(t[1]) * 1000 + math.floor(tonumber(t[2]) / 1000)
local s = redis.call('HMGET', KEYS[1], 'tokens', 'ts')
local tokens = tonumber(s[1]) or cap
local ts = tonumber(s[2]) or now
tokens = math.min(cap, tokens + math.max(0, now - ts) * rate / 1000)
local allowed = 0
if tokens >= 1 then tokens = tokens - 1; allowed = 1 end
redis.call('HSET', KEYS[1], 'tokens', tokens, 'ts', now)
redis.call('PEXPIRE', KEYS[1], math.ceil(cap / rate * 1000))      -- an idle bucket is full again by then, so drop it
local retry = 0
if allowed == 0 then retry = math.ceil((1 - tokens) / rate * 1000) end
return { allowed, math.floor(tokens), retry }
```

```js
// redis-limiter.js
import Redis from 'ioredis';
import { readFileSync } from 'node:fs';

// Fail fast: never queue commands while disconnected and never wait long. The limiter must not become the outage.
export const redis = new Redis(process.env.REDIS_URL, { enableOfflineQueue: false, maxRetriesPerRequest: 0, commandTimeout: 50 });
redis.defineCommand('tokenBucket', { numberOfKeys: 1, lua: readFileSync(new URL('./token-bucket.lua', import.meta.url), 'utf8') });

export async function check(key, ratePerSec, capacity) {
  const [allowed, remaining, retryAfterMs] = await redis.tokenBucket(`rl:${key}`, ratePerSec, capacity);
  return { ok: allowed === 1, remaining, retryAfterMs };
}
```

```js
// sliding-window.js: approximate sliding window from two fixed-window counters
export async function slidingWindowAllow(redis, key, limit, windowMs, now = Date.now()) {
  const window = Math.floor(now / windowMs);
  const elapsed = (now % windowMs) / windowMs;                        // how far into the current window we are
  const cur = `sw:${key}:${window}`, prev = `sw:${key}:${window - 1}`;
  const [[, count], [, before]] = await redis.multi().incr(cur).get(prev).pexpire(cur, windowMs * 2).exec();
  return Number(before ?? 0) * (1 - elapsed) + count <= limit;        // the previous window counts for the part that still overlaps
}
// Rejected requests are counted too, which makes this slightly stricter. Usually fine for quotas.
```

```js
// middleware.js
import { check } from './redis-limiter.js';
import { TokenBucket } from './token-bucket.js';
import { LRU } from './lru.js';                                       // from Learn 4

const fallback = new LRU(10_000);                                     // bounded per-instance buckets for Redis outages

export function rateLimit({ name = 'api', ratePerSec = 5, capacity = 20, keyOf = req => req.user?.id ?? req.ip, failClosed = false } = {}) {
  return async (req, res, next) => {
    const key = `${name}:${keyOf(req)}`;
    let result;
    try {
      result = await check(key, ratePerSec, capacity);
    } catch {
      if (failClosed) return res.status(503).set('Retry-After', '1').json({ error: 'Try again shortly' });
      let bucket = fallback.get(key);
      if (!bucket) fallback.set(key, (bucket = new TokenBucket({ ratePerSec, capacity })));
      result = bucket.take();                                         // approximate: per instance, not global
    }
    res.set({ 'RateLimit-Limit': String(capacity), 'RateLimit-Remaining': String(result.remaining) });
    if (result.ok) return next();
    res.set('Retry-After', String(Math.ceil(result.retryAfterMs / 1000)));
    res.status(429).json({ error: 'Too many requests' });
  };
}
// app.use('/api', rateLimit());
// app.post('/login', rateLimit({ name: 'login', ratePerSec: 0.1, capacity: 5, keyOf: r => r.ip, failClosed: true }), login);
```

**Failure modes**

| What breaks | Effect | Mitigation |
|---|---|---|
| Redis down | No shared state | Fail fast, use the local fallback (open) or 503 (closed) per rule |
| Redis slow | Adds latency to every request | 50 ms command timeout, then treat it as down |
| One API key sends huge traffic | A hot key on one Redis shard | A local pre-limiter in front of Redis for keys that are already over the limit |
| App servers' clocks skewed | Wrong refill amounts | Redis `TIME` inside the script |
| Millions of idle keys | Memory growth | `PEXPIRE` set to the full-refill time |

**Trade-offs**

| Choice | Pros | Cons | Choose when |
|---|---|---|---|
| Central Redis vs local only | Accurate global limits | Network hop and a dependency | Many instances and strict quotas |
| Token bucket vs sliding window | Burst-friendly, tiny state | Less strict "per minute" semantics | General APIs vs billing quotas |
| Fail open vs fail closed | Availability | Abuse during outages | Normal endpoints vs login, OTP, payments |

**Follow-ups (with answers)**

- **Per-IP vs per-user, and what about shared NATs?** Limit authenticated traffic by user or key. Keep per-IP limits generous and only for anonymous endpoints, because a campus or carrier NAT puts thousands of users behind one IP. Combine the two for login (per IP *and* per account).
- **How do you handle 1M distinct keys?** TTLs drop idle buckets, and the state is about 2 fields per key. For more throughput, use Redis Cluster: single-key scripts are cluster-safe because each bucket lives in one slot.
- **How do you avoid clock skew between servers?** Take time from Redis (`TIME`) inside the script. The app servers' clocks never enter the calculation.
- **How do you rate-limit globally across regions?** Give each region a fraction of the limit (simple, slightly conservative), or sync counters asynchronously and accept brief overshoot. Strict global limits would need a cross-region round trip per request, which is rarely worth it.
- **Rate limiting vs load shedding?** Rate limiting is about fairness per client. Load shedding protects the service as a whole: it drops low-priority work when saturated, whoever sends it. You need both.

**Quiz**

1. Why one Lua script instead of GET then SET?
   - It's faster to write
   - **Atomic read-modify-write across servers** ✓
2. A fixed window can let through up to how much of the limit around a window edge?
   - **2×** ✓
   - 1×
3. Login endpoint when Redis is down?
   - **Fail closed** ✓
   - Fail open

**Playground:** challenge `rate-limiter`. Rubric:

- clients → gateway → service;
- the gateway uses Redis;
- the service has replicas;
- Redis has a replica, so the limiter isn't a single point of failure.

---

### Q3. Design Movie Ticket Booking: Backend · Medium · 40 min

**30-second answer.** Seats move `available → held → booked`. One **conditional UPDATE** holds all requested seats or none, and the database's row locking guarantees exactly one winner per seat. Payment uses an idempotency key. The webhook confirms the booking with another conditional update ("still held by me"), and refunds if the hold was lost. Expired holds count as free. Seat maps update live over SSE. Launch-day spikes go through a waiting room that admits users at a controlled rate.

**Requirements**

- **Functional:**
  - Browse shows and seat maps.
  - Hold seats for 5 minutes, pay, confirm.
  - Release on expiry or failure.
  - Cancel.
- **Non-functional:**
  - Never double-book.
  - Seat maps fresh within ~1–2 s.
  - Survive 100× spikes for big releases.
  - Idempotent payments.
- **Out of scope:** recommendations, dynamic pricing, refund policy details.

**Clarifying questions:**

- Maximum seats per booking?
- Hold duration?
- Is payment confirmation synchronous or by webhook?
- Waitlists?
- Assigned seating or general admission?

**Estimate.** 10M bookings/month is only about 4/s on average. The real problem is spikes: a blockbuster can bring 500K users in the first minutes. The seat map is read far more than it's written (many viewers per show), so cache the snapshot and push changes.

| Method | Path | Result |
|---|---|---|
| GET | `/shows/:id/seats` | Seat-map snapshot (CDN-cached for 1–2 s) |
| GET | `/shows/:id/seats/stream` | SSE stream of seat changes |
| POST | `/shows/:id/holds` | `{ seats }` → `201 { holdId, expiresAt }` · `409` taken |
| POST | `/payments` | `{ holdId }` + `Idempotency-Key` → payment intent |
| POST | `/webhooks/payments` | The provider confirms → booking is confirmed or refunded |
| DELETE | `/holds/:id` | Release early |

**Data model**

```sql
CREATE TABLE seats (
  show_id    bigint NOT NULL,
  seat_no    text   NOT NULL,
  status     text   NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'held', 'booked')),
  held_by    bigint,
  held_until timestamptz,
  booking_id bigint,
  PRIMARY KEY (show_id, seat_no)
);
CREATE INDEX seats_expiring ON seats (held_until) WHERE status = 'held';   -- keeps the sweeper cheap

CREATE TABLE bookings (
  id         bigserial PRIMARY KEY,
  user_id    bigint NOT NULL,
  show_id    bigint NOT NULL,
  seats      text[] NOT NULL,
  payment_id text   NOT NULL UNIQUE,                                     -- a retried webhook can't book twice
  status     text   NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

**Diagrams**

- `architecture` FlowDiagram: Client → CDN → API → Postgres, plus Redis (pub/sub, waiting room), the payment provider and its webhook. Scenarios: hold, pay and confirm; seat taken; late payment and refund.
- `bookingSequence` (from source `QX`) as a SequenceDiagram with branches: **all seats free | a seat taken** and **payment ok | payment failed | payment after expiry**.

**Widget: SeatRace** (P1). Alice and Bob click A5 together, and each one's conditional UPDATE animates. Bob's re-checks the condition after Alice commits and matches 0 rows.

**How to approach it** (source `QX.ap`, kept):

1. Clarify.
2. Model seat states.
3. Prevent double booking.
4. Handle expiry.
5. Scale for launches.

**Step-by-step answer**

1. **State the invariant aloud:** "a seat is booked at most once". Everything else serves it.
2. **Seat state machine:** `available → held` (hold), `held → booked` (payment confirmed), `held → available` (expired or released). `booked` is final unless cancelled.
3. **Hold atomically:** one `UPDATE … WHERE status = 'available' OR (status = 'held' AND held_until < now())` for all the seats. If `rowCount` doesn't match the number of seats, roll back: all or nothing.
4. **Why it's safe:** under READ COMMITTED, Postgres locks each row it updates. A concurrent transaction waits on that lock, then **re-evaluates the WHERE clause** against the committed row. Alice's hold now makes the condition false for Bob, so he matches 0 rows. No application lock is needed.
5. **Payment:** create the payment intent with `Idempotency-Key = holdId`, so double clicks can't charge twice. The provider's webhook (verified, possibly retried, possibly late) drives confirmation.
6. **Confirm:** insert the booking with `ON CONFLICT (payment_id) DO NOTHING` (a retried webhook becomes a no-op), then `UPDATE seats … WHERE status = 'held' AND held_by = me`. If the hold was lost, roll back and refund. The refund must be idempotent too.
7. **Expiry:** lazy, because expired holds count as available in step 3. A sweeper also frees them every 30 s so seat maps look right, and publishes the change.
8. **Live seat map:** the CDN serves a 1–2 s snapshot. Changes are published to Redis and pushed over SSE. Each instance holds **one** subscription and fans out locally.
9. **Launch spikes:**
   - A waiting room (FIFO) admits N users per second with admission tokens, and the booking API rejects requests without one.
   - Cache the seat map.
   - Rate-limit per account.
   - Add CAPTCHA at queue join against bots.
   - Pre-scale.
10. **Redis holds?** `SET NX PX` per seat (a Lua script for several seats) is fast. But the database must stay the source of truth for bookings, so use Redis as a front-line filter, not the final arbiter.

**Implementation**

```js
// hold-seats.js (fixes source bug #2: booked seats can never match)
export async function holdSeats(pool, redis, { showId, seats, userId }) {
  const wanted = [...new Set(seats)];                               // dedupe so rowCount can match
  if (wanted.length === 0 || wanted.length > 10) throw new Error('Pick 1–10 seats');
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const { rowCount } = await c.query(
      `UPDATE seats SET status = 'held', held_by = $1, held_until = now() + interval '5 minutes'
       WHERE show_id = $2 AND seat_no = ANY($3)
         AND (status = 'available' OR (status = 'held' AND held_until < now()))`,
      [userId, showId, wanted]);
    if (rowCount !== wanted.length) {
      await c.query('ROLLBACK');                                     // all or nothing
      return { ok: false, reason: 'Some of those seats were just taken' };
    }
    await c.query('COMMIT');
    await redis.publish(`show:${showId}:seats`, JSON.stringify({ seats: wanted, status: 'held' }));
    return { ok: true, seats: wanted, expiresInSec: 300 };
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}
```

```js
// confirm-booking.js: called from the verified payment webhook (it may be retried, and it may be late)
export async function confirmBooking(pool, { showId, seats, userId, paymentId }) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const { rows: [booking] } = await c.query(
      `INSERT INTO bookings (user_id, show_id, seats, payment_id, status) VALUES ($1, $2, $3, $4, 'confirmed')
       ON CONFLICT (payment_id) DO NOTHING RETURNING id`,
      [userId, showId, seats, paymentId]);
    if (!booking) { await c.query('ROLLBACK'); return { ok: true, duplicate: true }; }   // webhook retry
    const { rowCount } = await c.query(
      `UPDATE seats SET status = 'booked', booking_id = $1, held_until = NULL
       WHERE show_id = $2 AND seat_no = ANY($3) AND status = 'held' AND held_by = $4`,   // still ours, even if just expired
      [booking.id, showId, seats, userId]);
    if (rowCount !== seats.length) {
      await c.query('ROLLBACK');
      await refundPayment(paymentId);                                 // idempotent, keyed by paymentId
      return { ok: false, reason: 'Hold lost; payment refunded' };
    }
    await c.query('COMMIT');
    return { ok: true, bookingId: booking.id };
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}
```

```js
// expiry-sweeper.js: expired holds already count as free (see holdSeats); this keeps seat maps accurate
setInterval(async () => {
  const { rows } = await pool.query(
    `UPDATE seats SET status = 'available', held_by = NULL, held_until = NULL
     WHERE status = 'held' AND held_until < now()
     RETURNING show_id, seat_no`);
  for (const r of rows) await redis.publish(`show:${r.show_id}:seats`, JSON.stringify({ seats: [r.seat_no], status: 'available' }));
}, 30_000);
```

```js
// seat-stream.js: one Redis subscription per instance, fanned out to every viewer on that instance
const viewers = new Map();                                            // showId -> Set<res>
const sub = redis.duplicate();
await sub.psubscribe('show:*:seats');
sub.on('pmessage', (_pattern, channel, msg) => {
  for (const res of viewers.get(channel.split(':')[1]) ?? []) res.write(`data: ${msg}\n\n`);
});

app.get('/shows/:id/seats/stream', (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' }).flushHeaders();
  const set = viewers.get(req.params.id) ?? new Set();
  viewers.set(req.params.id, set.add(res));
  req.on('close', () => set.delete(res));
});
```

```js
// waiting-room.js: admit users in arrival order, at a rate the booking path can absorb
export async function joinQueue(redis, showId, userId) {
  const ticket = await redis.incr(`wait:${showId}:seq`);
  await redis.zadd(`wait:${showId}`, 'NX', ticket, userId);          // re-joining keeps your original place
  const mine = Number((await redis.zscore(`wait:${showId}`, userId)) ?? ticket);
  const admitted = Number((await redis.get(`wait:${showId}:admitted`)) ?? 0);
  return { position: Math.max(1, mine - admitted) };                  // clients poll this every few seconds
}

// One leader instance runs this every second for each hot show
export async function admitBatch(redis, showId, perTick = 200) {
  const batch = await redis.zpopmin(`wait:${showId}`, perTick);      // [userId, score, userId, score, …]
  for (let i = 0; i < batch.length; i += 2) {
    await redis.set(`admit:${showId}:${batch[i]}`, 1, 'EX', 600);    // 10 minutes to pick seats and pay
    await redis.set(`wait:${showId}:admitted`, batch[i + 1]);
  }
}
export const isAdmitted = (redis, showId, userId) => redis.exists(`admit:${showId}:${userId}`);   // checked by the booking API
```

```lua
-- hold-seats.lua: Redis front-line hold for several seats at once.
-- KEYS are seat keys sharing a hash tag, e.g. {show:42}:A5, so Redis Cluster keeps them in one slot.
-- ARGV[1] = userId · ARGV[2] = ttl in ms
for _, k in ipairs(KEYS) do
  if redis.call('EXISTS', k) == 1 then return 0 end
end
for _, k in ipairs(KEYS) do
  redis.call('SET', k, ARGV[1], 'PX', ARGV[2])
end
return 1
```

**Failure modes**

| What breaks | Effect | Mitigation |
|---|---|---|
| Payment webhook arrives after the hold expired | The seat may already belong to someone else | Book if still held by me; otherwise roll back and refund automatically |
| The webhook is retried | Duplicate booking | `UNIQUE (payment_id)` + `ON CONFLICT DO NOTHING` |
| Double-clicking Pay | Two charges | Idempotency key = holdId at the payment provider |
| DB failover mid-hold | The transaction errors | The client retries the hold. It's idempotent in effect: the same seats get held again or come back as taken. |
| Launch-day herd | The DB is overwhelmed | Waiting room, cached seat map, per-account rate limits, CAPTCHA |

**Trade-offs**

| Choice | Pros | Cons | Choose when |
|---|---|---|---|
| Conditional UPDATE vs `SELECT … FOR UPDATE` then UPDATE | One round trip, short locks | Less flexible logic | Default |
| DB holds vs Redis holds | One source of truth | More DB writes | Normal load; add the Redis filter for mega-launches |
| Showing a countdown vs silently extending holds | Fair and predictable | Some lost sales | Default; extend only while payment is in flight |

**Follow-ups (with answers)**

- **What if payment succeeds after the hold expires?** If the seats are still held by the same user (not yet reclaimed), confirm the booking anyway. If someone else took them, roll back and refund automatically, and tell the user. The UI shows the countdown to make this rare.
- **Seat-level or show-level locking?** Seat-level (row) locks let thousands of people book different seats at the same time. A show-level lock would serialise every booking for a show, which is exactly the hot spot you want to avoid.
- **How do you survive a launch-day thundering herd?** A waiting room with admission tokens; seat maps served from the CDN and SSE instead of DB reads; per-account limits; pre-scaled DB and API; queue-based admission that you tune from DB metrics.
- **How do you stop bots from grabbing all the seats?** CAPTCHA or attestation when joining the queue, purchase limits per account and per card, velocity checks, and delayed release of suspicious holds.
- **How would you suggest the "best available" seats?** Score seats by distance from the centre of the screen and row preference, and find contiguous runs of N free seats in the cached seat map. Then hold them through the same conditional UPDATE.

**Quiz**

1. Why can't two users both hold A5?
   - Redis lock
   - **The row lock + re-checked WHERE clause lets one UPDATE match** ✓
2. What makes webhook retries safe?
   - **`UNIQUE (payment_id)` + `ON CONFLICT DO NOTHING`** ✓
   - Longer timeouts
3. What absorbs a launch spike before it reaches the DB?
   - Bigger DB
   - **A waiting room with admission tokens** ✓

**Playground:** challenge `ticket-booking`. Rubric:

- waiting room (queue) before the booking service;
- a DB with a replica;
- an SSE/pub-sub path for seat updates;
- the payment provider as an external node with a webhook back.

---

### Q4. Build an Autocomplete (Typeahead): Frontend · Medium · 30 min

Answer it with **RADIO**: Requirements, Architecture, Data model, Interface, Optimizations.

**30-second answer.**

- Debounce input (about 250 ms).
- Abort stale requests so responses can't arrive out of order.
- Cache results per query in an LRU with a TTL.
- Render an accessible combobox (ARIA roles, arrow keys, Enter, Escape, `aria-activedescendant`).
- Highlight matches without `innerHTML`.
- On the backend, serve top-K results per prefix from a trie or search index, with CDN caching for popular prefixes.

**Requirements**

- **Functional:**
  - Suggestions as you type.
  - Keyboard navigation and selection.
  - Selecting fills the input and runs the search.
  - Optional recent searches.
- **Non-functional:**
  - Feels instant after the pause.
  - Never shows results for an older query.
  - Accessible (the WAI-ARIA combobox pattern).
  - Works on slow and flaky networks, on mobile, and with IME input.
- **Out of scope:** search results page, spelling correction model.

**Architecture.** Component tree: `Typeahead` → `input[role=combobox]` + `ul[role=listbox]` → `li[role=option]` → `Highlight`. The data layer is a `useTypeahead` hook (debounce, cache, abort) plus `fetchSuggestions(q, signal)`.

**Diagram: `typeaheadFlow`** (from source `QX`): Keystroke → Debounce → Cache? → Abortable fetch → Render. Scenarios:

- **Fast typing:** 5 keystrokes collapse into 1 request.
- **Backspace:** served from the cache.
- **Slow response:** the old request is aborted when a newer one starts.

**Data model:** `{ query, status: 'idle' | 'loading' | 'success' | 'error', items, activeIndex, open }`, plus a `Map<query, { items, at }>` used as an LRU.

**Interface:**

- Component: `<Typeahead fetchSuggestions minChars={2} debounceMs={250} onSelect />`.
- API: `GET /api/suggest?q=rea&limit=8` → `{ q, items: [{ id, label, type }] }` with `Cache-Control: public, max-age=300`.

**Optimizations:**

- Minimum characters and debounce.
- Abort, LRU + TTL cache.
- Prefetch trending suggestions on focus.
- Cap at about 8 items (no virtualization needed).
- `autocomplete="off"`, `enterKeyHint="search"`.
- Skip fetching during IME composition.
- A live region that announces the result count.

**Widget: DebounceViz** (P1). Type into a real input. The timeline shows keystrokes, debounce timer resets, the requests fired, and aborted responses.

**How to approach it** (source `QX.ap`, kept):

1. Clarify.
2. Stabilize input.
3. Fix races.
4. Add caching.
5. Accessibility and backend.

**Step-by-step answer**

1. **Clarify** the data source, result count, keyboard support, mobile, and whether it's for search or form fill.
2. **Debounce** about 250 ms after the last keystroke, with a 2-character minimum. That removes most requests.
3. **Fix races:** each request gets an `AbortController`. A newer keystroke aborts the old request, and the hook also ignores any result whose signal was aborted.
4. **Cache:** a Map from query to `{ items, at }`. Re-insert on access for LRU order, cap at 100 entries, and expire after 60 s. Backspace becomes instant.
5. **Render accessibly:**
   - The input has `role="combobox"`, `aria-expanded`, `aria-controls` and `aria-activedescendant`.
   - The list is `role="listbox"` with `role="option"` items carrying `aria-selected`.
   - ↑/↓ move the active option, Enter selects, Escape closes.
   - The mouse handler keeps focus in the input.
6. **Highlight safely:** split the label on an escaped regex and wrap matches in `<mark>`. React escapes the text, so no XSS.
7. **States:** loading (keep showing the old items), empty ("No suggestions"), and error (non-blocking; typing still works).
8. **Backend:** a trie with top-K results stored per node (O(prefix length) lookup), or a search engine's completion suggester. CDN-cache popular prefixes, and rank by popularity, recency and personalisation on the server.

**Implementation**

```js
// debounce.js
export function debounce(fn, ms) {
  let timer;
  const debounced = (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
  debounced.cancel = () => clearTimeout(timer);
  return debounced;
}
```

```js
// useTypeahead.js: debounce + abort + LRU/TTL cache, in one effect
import { useEffect, useEffectEvent, useRef, useState } from 'react';

export function useTypeahead(fetchSuggestions, { delay = 250, minChars = 2, ttlMs = 60_000, maxEntries = 100 } = {}) {
  const [query, setQuery] = useState('');
  const [state, setState] = useState({ status: 'idle', items: [] });
  const cache = useRef(new Map());                                     // q -> { items, at }; Map order = LRU order
  const load = useEffectEvent((q, signal) => fetchSuggestions(q, signal));   // always the latest prop (React 19.2)

  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (q.length < minChars) { setState({ status: 'idle', items: [] }); return; }
    const hit = cache.current.get(q);
    if (hit && Date.now() - hit.at < ttlMs) { setState({ status: 'success', items: hit.items }); return; }

    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setState(s => ({ ...s, status: 'loading' }));                    // keep the previous items visible meanwhile
      try {
        const items = await load(q, ctrl.signal);
        if (ctrl.signal.aborted) return;                              // a newer query took over
        cache.current.delete(q);
        cache.current.set(q, { items, at: Date.now() });
        if (cache.current.size > maxEntries) cache.current.delete(cache.current.keys().next().value);
        setState({ status: 'success', items });
      } catch (e) {
        if (e.name !== 'AbortError') setState({ status: 'error', items: [] });
      }
    }, delay);
    return () => { clearTimeout(timer); ctrl.abort(); };              // the next keystroke cancels the wait and the request
  }, [query, delay, minChars, ttlMs, maxEntries]);

  return { query, setQuery, ...state };
}
```

```jsx
// Typeahead.jsx: WAI-ARIA combobox with a listbox popup
import { useId, useState } from 'react';
import { useTypeahead } from './useTypeahead.js';
import { Highlight } from './Highlight.jsx';

export function Typeahead({ fetchSuggestions, onSelect, label = 'Search' }) {
  const { query, setQuery, status, items } = useTypeahead(fetchSuggestions);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const id = useId();
  const expanded = open && items.length > 0;

  const choose = item => { onSelect(item); setQuery(item.label); setOpen(false); setActive(-1); };
  const onKeyDown = e => {
    if (e.nativeEvent.isComposing) return;                           // IME: let the user finish composing
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive(i => Math.min(i + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && expanded && active >= 0) { e.preventDefault(); choose(items[active]); }
    else if (e.key === 'Escape') { setOpen(false); setActive(-1); }
  };

  return (
    <div className="typeahead">
      <label htmlFor={`${id}-input`}>{label}</label>
      <input id={`${id}-input`} role="combobox" aria-expanded={expanded} aria-controls={`${id}-list`}
        aria-autocomplete="list" aria-activedescendant={expanded && active >= 0 ? `${id}-opt-${active}` : undefined}
        value={query} autoComplete="off" enterKeyHint="search"
        onChange={e => { setQuery(e.target.value); setOpen(true); setActive(-1); }}
        onKeyDown={onKeyDown} onBlur={() => setOpen(false)} />
      <ul id={`${id}-list`} role="listbox" hidden={!expanded}>
        {items.map((item, i) => (
          <li key={item.id} id={`${id}-opt-${i}`} role="option" aria-selected={i === active}
            onMouseDown={e => e.preventDefault()}                     // keep focus in the input
            onClick={() => choose(item)}>
            <Highlight text={item.label} query={query} />
          </li>
        ))}
      </ul>
      <div aria-live="polite" className="sr-only">
        {status === 'error' ? 'Suggestions unavailable' : expanded ? `${items.length} suggestions` : ''}
      </div>
    </div>
  );
}
```

```jsx
// Highlight.jsx: no innerHTML; React escapes every piece
const escapeRegExp = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function Highlight({ text, query }) {
  const q = query.trim();
  if (!q) return text;
  return text.split(new RegExp(`(${escapeRegExp(q)})`, 'ig'))
    .map((part, i) => (part.toLowerCase() === q.toLowerCase() ? <mark key={i}>{part}</mark> : part));
}
```

```js
// trie.js (server): every node keeps its top-K completions, so a lookup is O(prefix length)
class TrieNode { constructor() { this.children = new Map(); this.top = []; } }

export class Trie {
  constructor(k = 8) { this.root = new TrieNode(); this.k = k; }
  insert(word, score) {
    let node = this.root;
    for (const ch of word.toLowerCase()) {
      if (!node.children.has(ch)) node.children.set(ch, new TrieNode());
      node = node.children.get(ch);
      node.top = [...node.top.filter(e => e.word !== word), { word, score }]
        .sort((a, b) => b.score - a.score)
        .slice(0, this.k);
    }
  }
  suggest(prefix) {
    let node = this.root;
    for (const ch of prefix.toLowerCase()) {
      node = node.children.get(ch);
      if (!node) return [];
    }
    return node.top.map(e => e.word);
  }
}
```

```js
// suggest-route.js: popular prefixes are served from the CDN
app.get('/api/suggest', (req, res) => {
  const q = String(req.query.q ?? '').trim().toLowerCase().slice(0, 50);
  res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
  res.json({ q, items: trie.suggest(q).map((label, i) => ({ id: `${q}:${i}`, label })) });
});
```

```jsx
// useTypeahead.test.jsx
import { renderHook, act } from '@testing-library/react';
import { test, expect, vi } from 'vitest';
import { useTypeahead } from './useTypeahead.js';

test('debounces keystrokes into one request for the latest query', async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn(q => new Promise(resolve => setTimeout(() => resolve([{ id: q, label: q }]), 100)));
  const { result } = renderHook(() => useTypeahead(fetcher, { delay: 250 }));
  act(() => result.current.setQuery('re'));
  act(() => result.current.setQuery('rea'));
  act(() => result.current.setQuery('reac'));
  await act(() => vi.advanceTimersByTimeAsync(400));                 // 250 ms debounce + 100 ms response
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher).toHaveBeenCalledWith('reac', expect.any(AbortSignal));
  expect(result.current.items).toEqual([{ id: 'reac', label: 'reac' }]);
  vi.useRealTimers();
});
```

**Failure modes**

| What breaks | Effect | Mitigation |
|---|---|---|
| Responses arrive out of order | Results for an old query flash | Abort, plus ignoring aborted results |
| API down | No suggestions | Error state in the live region; typing and search still work |
| Slow network | Feels laggy | Keep the previous items, show a spinner after ~300 ms, serve from cache |
| Labels contain HTML | XSS | React text nodes; never `innerHTML` |

**Trade-offs**

| Choice | Pros | Cons | Choose when |
|---|---|---|---|
| Longer vs shorter debounce | Fewer requests | Feels slower | 200–300 ms is the usual sweet spot |
| Client cache TTL | Instant backspace | Stale suggestions | 30–120 s for search suggestions |
| Client vs server ranking | Offline ranking possible | No global popularity data | Server ranking almost always |

**Follow-ups (with answers)**

- **How do you highlight the matched text safely?** Split on an escaped regex and wrap matches in `<mark>` (shown above). Never build HTML strings.
- **What happens on a slow or offline network?** Show cached results immediately. Mark the request "loading" after a short delay. On failure, show a quiet "Suggestions unavailable" and keep the input usable. Listen to `online`/`offline` events and skip requests while offline.
- **How would you rank suggestions?** On the server: prefix matches before substring matches, then popularity (query logs), recency, and personalisation (the user's history). Store top-K per prefix offline so the lookup stays O(prefix).
- **What changes on mobile?** Larger touch targets, `enterKeyHint="search"`, no hover-only UI, and a full-screen sheet for results on small screens. Respect IME composition (CJK keyboards).
- **How do you show recent searches?** On focus with an empty query, show the last few searches from localStorage under their own heading, with a remove button for each.

**Quiz**

1. What prevents results from an old query appearing?
   - Debounce alone
   - **Aborting stale requests / ignoring aborted results** ✓
2. Which element gets `role="combobox"`?
   - **The input** ✓
   - The list
3. Why `onMouseDown={e => e.preventDefault()}` on options?
   - Styling
   - **Keep focus in the input so the click registers** ✓

---

### Q5. Build an Infinite Scroll Feed: Frontend · Medium · 30 min

**30-second answer.**

- An IntersectionObserver on a sentinel triggers fetching the next page by **cursor** (not page number).
- Pages are cached in an infinite query, and rows are **virtualized** with measured heights so the DOM stays small.
- Media gets reserved space to avoid layout shift.
- Scroll position is restored on back navigation.
- The list uses ARIA `feed` semantics.
- New posts show as a banner and are never inserted above the reader.

**Requirements**

- **Functional:**
  - Load more near the bottom.
  - Loading, error/retry and end-of-list states.
  - Restore position on back.
  - A "new posts" banner.
- **Non-functional:**
  - Smooth scrolling with thousands of items.
  - Bounded memory.
  - Accessible.
  - The first page is server-rendered for SEO and fast paint.

**Architecture.** FeedPage (SSR first page) → Feed (client) → virtualized rows → Post. The data layer is a TanStack Query infinite query. There's also a sentinel/loader row and a NewPostsBanner.

**Diagram: `feedFlow`** (from source `QX`). Scenarios:

- **Next page:** sentinel → fetch → append.
- **Error and retry.**
- **End of list.**
- **Back navigation:** cache hit, then scroll restore.

**Data model:** `pages: [{ data: Post[], nextCursor }]`; the flattened `items`; a scroll anchor `{ postId, offset }` in `sessionStorage`.

**Interface:**

- `GET /api/feed?cursor=&limit=20` → `{ data, nextCursor }` (the endpoint from Learn 2's `cursor-pagination.js`).
- `GET /api/feed/new-count?after=<id>` → `{ count }`.

**Optimizations:**

- `rootMargin` about 600 px to prefetch.
- Virtualization with `measureElement`.
- Images with `width`/`height`, `loading="lazy"` and `decoding="async"`.
- Skeleton rows.
- Below a few hundred items, `content-visibility: auto` with `contain-intrinsic-size` gets much of the benefit without virtualization, and keeps Ctrl+F working.

**Widget: VirtualListViz** (P2). Scroll a list of 10,000 rows while an overlay shows "mounted DOM rows: 23 / 10,000". Toggling virtualization off shows the difference.

**How to approach it** (source `QX.ap`, kept):

1. Clarify.
2. Choose the trigger.
3. Use cursors.
4. Control the DOM.
5. Handle states.

**Step-by-step answer**

1. **Clarify:** page size, ordering, item height (fixed or variable), back-navigation behaviour, whether real-time updates are needed.
2. **Trigger:** an IntersectionObserver on a sentinel, not scroll listeners (no per-frame work), with `rootMargin` so the next page loads before the user reaches the bottom.
3. **Cursor pagination:** `?cursor=<last id>`. Offsets duplicate or skip items as new posts arrive, and deep offsets are slow in SQL.
4. **Guard the fetch:** keep one request in flight (a `busy` ref reset in `finally`), use an AbortController on unmount, and on error show **Retry** instead of looping.
5. **Virtualize:** render only visible rows plus overscan. Measure variable heights (`measureElement`) and position rows with transforms.
6. **Cache pages:** with an infinite query, going back is instant. To bound memory over long sessions, use `maxPages` together with `getPreviousPageParam`.
7. **Stability:** reserve image space (aspect ratio), and never insert above the viewport. The banner says "12 new posts ↑", and tapping it scrolls to the top and refetches.
8. **Accessibility:** `role="feed"` with `aria-busy` while loading; each post is an `article` with `aria-posinset`/`aria-setsize` (−1 means unknown); posts are focusable for keyboard reading; the end of the list is announced.

**Implementation**

```js
// useInfiniteFeed.js (fixes source bug #6: busy reset in finally, observer cleanup, abort)
import { useCallback, useEffect, useRef, useState } from 'react';

export function useInfiniteFeed(url, limit = 20) {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('idle');                      // idle | loading | error | done
  const cursor = useRef(null), busy = useRef(false), ctrl = useRef(null);

  const loadMore = useCallback(async () => {
    if (busy.current || cursor.current === 'END') return;
    busy.current = true;
    setStatus('loading');
    ctrl.current = new AbortController();
    try {
      const qs = new URLSearchParams({ limit: String(limit), ...(cursor.current && { cursor: cursor.current }) });
      const res = await fetch(`${url}?${qs}`, { signal: ctrl.current.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { data, nextCursor } = await res.json();
      setItems(prev => [...prev, ...data]);
      cursor.current = nextCursor ?? 'END';
      setStatus(nextCursor ? 'idle' : 'done');
    } catch (e) {
      if (e.name !== 'AbortError') setStatus('error');               // the UI offers Retry → loadMore()
    } finally {
      busy.current = false;
    }
  }, [url, limit]);

  const sentinel = useCallback(node => {                              // React 19: ref callbacks can return a cleanup
    if (!node) return;
    const io = new IntersectionObserver(([entry]) => entry.isIntersecting && loadMore(), { rootMargin: '600px 0px' });
    io.observe(node);
    return () => io.disconnect();
  }, [loadMore]);

  useEffect(() => () => ctrl.current?.abort(), []);
  return { items, status, loadMore, sentinel };
}
```

```jsx
// Feed.jsx: feed semantics, reserved media space, retry and end states
export function Feed() {
  const { items, status, loadMore, sentinel } = useInfiniteFeed('/api/feed');
  return (
    <>
      <div role="feed" aria-busy={status === 'loading'} aria-label="Latest posts">
        {items.map((post, i) => (
          <article key={post.id} data-post-id={post.id} tabIndex={0} aria-labelledby={`t-${post.id}`}
                   aria-posinset={i + 1} aria-setsize={status === 'done' ? items.length : -1}>
            <h2 id={`t-${post.id}`}>{post.title}</h2>
            <img src={post.image} width={post.width} height={post.height} loading="lazy" decoding="async" alt={post.alt ?? ''} />
          </article>
        ))}
      </div>
      {status === 'error' && <button onClick={loadMore}>Couldn't load more posts. Retry</button>}
      {status === 'done' ? <p role="status">You're all caught up.</p> : <div ref={sentinel} aria-hidden style={{ height: 1 }} />}
    </>
  );
}
```

```jsx
// FeedVirtual.jsx: TanStack Query (cache + dedupe) + TanStack Virtual (dynamic heights)
import { useEffect, useRef } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';

export function FeedVirtual() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: ({ pageParam, signal }) =>
      fetch(`/api/feed?limit=20${pageParam ? `&cursor=${pageParam}` : ''}`, { signal }).then(r => r.json()),
    initialPageParam: null,
    getNextPageParam: last => last.nextCursor ?? undefined,           // undefined = no more pages
  });
  const items = data?.pages.flatMap(p => p.data) ?? [];
  const parentRef = useRef(null);
  const virtualizer = useVirtualizer({
    count: hasNextPage ? items.length + 1 : items.length,             // +1 row for the loader
    getScrollElement: () => parentRef.current,
    estimateSize: () => 360,
    overscan: 5,
  });
  const rows = virtualizer.getVirtualItems();

  useEffect(() => {
    const last = rows.at(-1);
    if (last && last.index >= items.length - 1 && hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [rows, items.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div ref={parentRef} style={{ height: '100dvh', overflowY: 'auto' }}>
      <div role="feed" aria-busy={isFetchingNextPage} style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {rows.map(row => (
          <div key={row.key} data-index={row.index} ref={virtualizer.measureElement}   // measures each row's real height
               style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${row.start}px)` }}>
            {items[row.index] ? <Post post={items[row.index]} index={row.index} /> : <PostSkeleton />}
          </div>
        ))}
      </div>
    </div>
  );
}
```

```js
// scroll-restore.js: remember the first visible post and its offset (for non-virtualized lists;
// with a virtualizer, store the index and call virtualizer.scrollToIndex on return)
export function saveAnchor(key) {
  const el = [...document.querySelectorAll('[data-post-id]')].find(n => n.getBoundingClientRect().bottom > 0);
  if (el) sessionStorage.setItem(key, JSON.stringify({ id: el.dataset.postId, top: el.getBoundingClientRect().top }));
}
export function restoreAnchor(key) {
  const saved = JSON.parse(sessionStorage.getItem(key) ?? 'null');
  const el = saved && document.querySelector(`[data-post-id="${CSS.escape(saved.id)}"]`);
  if (el) window.scrollBy(0, el.getBoundingClientRect().top - saved.top);
}
```

```jsx
// NewPostsBanner.jsx: poll a cheap count; never insert posts above the reader without consent
import { useEffect, useState } from 'react';

export function NewPostsBanner({ newestId, onShow }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!newestId) return;
    const t = setInterval(async () => {
      if (document.hidden) return;
      const r = await fetch(`/api/feed/new-count?after=${newestId}`).catch(() => null);
      if (r?.ok) setCount((await r.json()).count);
    }, 30_000);
    return () => clearInterval(t);
  }, [newestId]);
  if (!count) return null;
  return <button className="new-posts" onClick={() => { setCount(0); onShow(); }}>{count} new posts ↑</button>;
}
```

**Failure modes**

| What breaks | Effect | Mitigation |
|---|---|---|
| Fetch error | The feed stops (the source's bug) | `finally` resets `busy`; a Retry button |
| Fast scrolling past the loader | Blank area | Overscan, skeleton rows, a larger `rootMargin` |
| Images load late | Layout shift | `width`/`height` or `aspect-ratio`, plus skeletons |
| Very long session | Memory grows | Virtualization plus `maxPages` with bi-directional page params |

**Trade-offs**

| Choice | Pros | Cons | Choose when |
|---|---|---|---|
| Virtualization vs a plain list | Constant DOM size | Breaks Ctrl+F, needs measuring, harder accessibility | More than a few hundred items |
| `content-visibility: auto` | Native, keeps find-in-page | All nodes still exist in the DOM | Medium-length lists |
| Infinite scroll vs a "Load more" button | Seamless | Footer unreachable, harder for keyboard users | Feeds vs search results or archives |

**Follow-ups (with answers)**

- **How do you show "new posts" at the top?** Poll a count endpoint (or listen on SSE), show a banner, and on click scroll to the top and refetch the first page. Never shift content above the reader without consent.
- **How do you stop memory growing in a long session?** Virtualize, cap the cached pages (`maxPages` with `getPreviousPageParam` so earlier pages can be fetched again), and let offscreen images be garbage-collected.
- **What about SEO?** Server-render the first page, and add real paginated URLs (`?cursor=…` links in `<nav>`) so crawlers can reach older content. The infinite scroll is a progressive enhancement on top.
- **What if items get deleted while the user is paginating?** Cursor-by-id stays stable. The server filters out tombstoned items, and the client removes an item when it gets a deletion event.
- **What about bi-directional scrolling (like chat)?** Use `getPreviousPageParam` plus a sentinel at the top, and keep the scroll anchor stable when prepending (measure before and after, then adjust `scrollTop`).

**Quiz**

1. Why cursors instead of page numbers?
   - Shorter URLs
   - **Stable when new items arrive** ✓
2. What does virtualization keep small?
   - **The number of mounted DOM nodes** ✓
   - The payload size
3. What does `aria-setsize="-1"` mean?
   - Error
   - **The total is unknown (still loading)** ✓

---

### Q6. Design a Real-Time Chat App: Full-stack · Hard · 45 min

**30-second answer.**

- Clients hold a **WebSocket** to any gateway node. Redis pub/sub routes messages to whichever node holds the recipient's sockets.
- Each message gets a **per-conversation sequence number**, is stored first, then acked, then fanned out. A client-generated id makes retries idempotent.
- Offline users get a push notification. On reconnect, clients **sync from their last seq**.
- Receipts are watermarks ("read up to seq 1042"), not one row per message.
- The client is optimistic, reconciles on ack, and reconnects with jittered backoff.

**Requirements**

- **Functional:**
  - 1:1 and group (≤ 500 members) messaging.
  - Delivery and read receipts.
  - Offline delivery with push.
  - History pagination.
  - Typing indicators and presence.
  - Media attachments.
- **Non-functional:**
  - < 200 ms delivery for online users in the same region.
  - Never lose an acked message.
  - Per-conversation order.
  - Multi-device.
  - 99.99% availability.
- **Out of scope:** E2EE (a follow-up) and voice/video.

**Estimate.**

- 50M DAU × 40 messages = 2B messages/day ≈ **23K/s** (≈ 70K/s peak).
- At ~200 B each, that's ≈ 400 GB/day (≈ 146 TB/year before replication).
- 10M concurrent sockets at ~50K per gateway ≈ **200 gateway nodes**.

**API.** WebSocket events:

| Direction | Event | Payload |
|---|---|---|
| Client → server | `send` | `{ clientId, conversationId, text }` |
| Client → server | `sync` | `{ conversationId, after }` (last seq the client has) |
| Client → server | `read` | `{ conversationId, seq }` |
| Client → server | `typing` | `{ conversationId }` (throttled) |
| Server → client | `ack` | `{ clientId, seq }` |
| Server → client | `message` | Stored message, including `seq` |
| Server → client | `receipt` | `{ conversationId, userId, readUpTo }` |
| Server → client | `typing`, `presence` | Ephemeral |

REST:

- `GET /conversations`
- `GET /conversations/:id/messages?before=<seq>&limit=50`
- `POST /uploads` (presigned)

**Data model** (MongoDB at moderate scale; Cassandra with `PRIMARY KEY ((conversation_id), seq)` at very large scale):

```js
await db.messages.createIndex({ conversationId: 1, seq: -1 });             // history pages and sync
await db.messages.createIndex({ from: 1, clientId: 1 }, { unique: true });  // retries can't duplicate a message
await db.members.createIndex({ conversationId: 1, userId: 1 }, { unique: true });   // { lastReadSeq: 0, … }
await db.members.createIndex({ userId: 1 });                                 // "my conversations"
```

**Diagrams**

- `architecture` FlowDiagram: Clients → LB → WS gateways ↔ Redis pub/sub; gateways → chat service → Mongo; push service → APNs/FCM; S3 for media.
- `chatSequence` (from source `QX`) as a SequenceDiagram with branches:
  - **Bob online.**
  - **Bob offline:** push notification, then sync on reconnect.
  - **Ack lost:** Alice retries with the same `clientId`, and the server re-acks without storing twice.

**Widget: ChatSim** (P2). Two phones side by side in the browser, with a simulated network (latency, drop %, take Bob offline). Message ticks go sending → sent → delivered → read.

**How to approach it** (source `QX.ap`, kept):

1. Clarify.
2. Pick the transport.
3. Route messages.
4. Persist and ack.
5. Cover edge cases.

**Step-by-step answer**

1. **Clarify:** group size, receipts, multi-device, history retention, E2EE, scale.
2. **Transport:** WebSocket for online users, push notifications for offline ones, REST for history and uploads. Authenticate during the HTTP upgrade.
3. **Connection registry:** each gateway keeps `userId → Set<socket>` (multi-device) and subscribes to `user:<id>` on Redis while the user has at least one socket there.
4. **Send path:** check membership → dedupe by `(from, clientId)` → `seq = INCR seq:<conversation>` → store → **ack the sender** → publish to each member's channel. Store before acking, so an acked message is never lost.
5. **Ordering:** order is per conversation, from the seq. Clients sort by seq and tolerate gaps (a failed insert can burn a seq). Global ordering isn't needed.
6. **Offline and sync:** on reconnect the client sends `sync { after: lastSeq }` and the server replays the gap. Pub/sub is fire-and-forget, so sync is also what repairs any missed live message.
7. **Receipts:** a watermark per member (`lastReadSeq`, `lastDeliveredSeq`). One small update per read, not per message, and only ever moves forward.
8. **Presence and typing:** ephemeral data in Redis with TTL heartbeats. Typing is throttled (one event per 3 s), never stored, and only sent to people with the conversation open.
9. **Groups:** for small groups, fan out per member on write. For huge channels, fan out on read: clients pull the channel's recent messages, and per-member delivery receipts are skipped.
10. **Client:** an optimistic bubble (`sending`) keyed by `clientId`, reconciled on ack. Unacked messages are kept and resent after reconnect. Reconnect uses full-jitter backoff.

**Implementation**

```js
// server.js: WebSocket gateway. Any node can hold any user's sockets; Redis pub/sub routes between nodes.
import { WebSocketServer } from 'ws';
import Redis from 'ioredis';

const pub = new Redis(process.env.REDIS_URL);
const sub = new Redis(process.env.REDIS_URL);                     // a subscribed connection can't run other commands
const local = new Map();                                          // userId -> Set<WebSocket> on this node
const wss = new WebSocketServer({ noServer: true });

// Authenticate during the HTTP upgrade, so no message can arrive before we know who's talking
httpServer.on('upgrade', async (req, socket, head) => {
  const userId = await authenticate(req).catch(() => null);       // e.g. verify the session cookie
  if (!userId) { socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n'); return socket.destroy(); }
  wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req, userId));
});

sub.on('message', (channel, payload) => {
  for (const ws of local.get(channel.slice('user:'.length)) ?? []) ws.send(payload);
});

wss.on('connection', (ws, _req, userId) => {
  let mine = local.get(userId);
  if (!mine) { local.set(userId, (mine = new Set())); sub.subscribe(`user:${userId}`).catch(console.error); }
  mine.add(ws);

  ws.on('message', raw => {
    let m;
    try { m = JSON.parse(raw); } catch { return; }
    const handler = { send: onSend, sync: onSync, read: onRead }[m.type];
    handler?.(ws, userId, m).catch(() => ws.send(JSON.stringify({ type: 'error', clientId: m.clientId })));
  });
  ws.on('close', () => {
    mine.delete(ws);
    if (mine.size === 0) { local.delete(userId); sub.unsubscribe(`user:${userId}`).catch(console.error); }
  });
});

async function broadcast(conversationId, event) {
  const payload = JSON.stringify(event);
  await Promise.all((await membersOf(conversationId)).map(m => pub.publish(`user:${m}`, payload)));
}

async function onSend(ws, userId, { clientId, conversationId, text }) {
  if (!(await isMember(userId, conversationId))) throw new Error('not a member');
  const ack = seq => ws.send(JSON.stringify({ type: 'ack', clientId, seq }));
  const existing = await db.messages.findOne({ from: userId, clientId });
  if (existing) return ack(existing.seq);                         // a retry: already stored, just ack again
  const seq = await pub.incr(`seq:${conversationId}`);            // per-conversation order
  const msg = { conversationId, seq, from: userId, clientId, text, ts: Date.now() };
  try {
    await db.messages.insertOne(msg);
  } catch (e) {
    if (e.code !== 11000) throw e;                                // duplicate key: a concurrent retry won the race
    return ack((await db.messages.findOne({ from: userId, clientId })).seq);
  }
  ack(seq);                                                       // ack only once the message is durable
  await broadcast(conversationId, { type: 'message', ...msg });   // offline members get a push from a separate consumer
}

async function onSync(ws, userId, { conversationId, after = 0 }) {
  if (!(await isMember(userId, conversationId))) throw new Error('not a member');
  const missed = await db.messages.find({ conversationId, seq: { $gt: after } }).sort({ seq: 1 }).limit(500).toArray();
  for (const m of missed) ws.send(JSON.stringify({ type: 'message', ...m }));
}

async function onRead(_ws, userId, { conversationId, seq }) {
  const r = await db.members.updateOne(
    { conversationId, userId, lastReadSeq: { $lt: seq } },        // watermarks only move forward
    { $set: { lastReadSeq: seq } });
  if (r.modifiedCount) await broadcast(conversationId, { type: 'receipt', conversationId, userId, readUpTo: seq });
}
```

```js
// useChat.js (client): optimistic sends, ack reconciliation, resend after reconnect, gap sync.
// Render the chat with key={conversationId} so state resets when switching conversations.
import { useEffect, useRef, useState } from 'react';

export function useChat(conversationId) {
  const [messages, setMessages] = useState([]);                   // sorted by seq; unsent ones last
  const ws = useRef(null), pending = useRef(new Map()), lastSeq = useRef(0);

  const upsert = m => setMessages(list => {
    const i = list.findIndex(x => x.clientId === m.clientId);    // our own echo, an ack, or a replay
    const next = i >= 0 ? list.with(i, { ...list[i], ...m }) : [...list, m];
    return next.sort((a, b) => (a.seq ?? Infinity) - (b.seq ?? Infinity) || 0);
  });

  useEffect(() => {
    let attempt = 0, stopped = false, timer;
    const connect = () => {
      const sock = new WebSocket(WS_URL);
      ws.current = sock;
      sock.onopen = () => {
        attempt = 0;
        sock.send(JSON.stringify({ type: 'sync', conversationId, after: lastSeq.current }));   // fetch the gap
        for (const m of pending.current.values()) sock.send(JSON.stringify(m));                // resend unacked
      };
      sock.onmessage = e => {
        const evt = JSON.parse(e.data);
        if (evt.type === 'ack') {
          pending.current.delete(evt.clientId);
          upsert({ clientId: evt.clientId, seq: evt.seq, status: 'sent' });
        } else if (evt.type === 'message' && evt.conversationId === conversationId) {
          lastSeq.current = Math.max(lastSeq.current, evt.seq);
          upsert({ ...evt, status: 'sent' });
        }
      };
      sock.onclose = () => {
        if (!stopped) timer = setTimeout(connect, Math.random() * Math.min(30_000, 1_000 * 2 ** attempt++));   // full jitter
      };
    };
    connect();
    return () => { stopped = true; clearTimeout(timer); ws.current?.close(); };
  }, [conversationId]);

  const send = text => {
    const msg = { type: 'send', clientId: crypto.randomUUID(), conversationId, text };
    pending.current.set(msg.clientId, msg);
    upsert({ ...msg, from: 'me', status: 'sending' });            // optimistic bubble
    if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify(msg));
  };
  return { messages, send };
}
```

```js
// presence.js: online = a heartbeat key exists. Expiry handles crashed clients for free.
export const heartbeat = (redis, userId) => redis.set(`presence:${userId}`, Date.now(), 'EX', 70);   // on connect + each pong (30 s)
export const isOnline = (redis, userId) => redis.exists(`presence:${userId}`);
// On the client, typing is throttled: send at most one { type: 'typing' } every 3 s; receivers hide it after 5 s of silence.
```

**Failure modes**

| What breaks | Effect | Mitigation |
|---|---|---|
| A gateway node dies | Its sockets drop | Clients reconnect to another node with jitter and `sync` from their last seq |
| A pub/sub message is lost | A live message is missed | Sync on reconnect and when a conversation is opened |
| The client retries after a lost ack | Duplicate message | Unique `(from, clientId)`; the server re-acks the stored seq |
| Out-of-order arrival | Wrong display order | Clients sort by seq |
| A huge group | Fan-out storm | Fan out on read for channels; no per-member receipts |

**Trade-offs**

| Choice | Pros | Cons | Choose when |
|---|---|---|---|
| WebSocket vs long polling | Low latency, two-way | Stateful connections to scale | Chat (always) |
| Redis pub/sub vs Kafka for routing | Simple and fast | No durability or replay | Routing only (durability comes from the DB + sync) |
| Fan-out on write vs read for groups | Fast reads | Write amplification | Small groups vs large channels |
| MongoDB vs Cassandra | Flexible, simpler ops | Less write scale | Moderate vs very large scale |

**Follow-ups (with answers)**

- **How do you guarantee message ordering?** Per conversation: `INCR seq:<conversationId>` assigns the order, storage is indexed by `(conversationId, seq)`, and clients sort by seq. Cross-conversation order doesn't matter to users.
- **How would you build presence and typing at scale?** Presence is a Redis key with a TTL refreshed by heartbeats, read on demand. Changes go only to contacts with the app open, never to everyone. Typing is throttled, ephemeral and scoped to open conversations, and never stored.
- **How does end-to-end encryption change the design?** Clients encrypt with per-device keys (the Signal protocol: X3DH/PQXDH key agreement plus the Double Ratchet). The server stores and routes ciphertext and public prekey bundles only. Search, previews and moderation move to the client, and multi-device means encrypting to every device.
- **What about very large channels (100K members)?** Don't fan out per member. Members read the channel timeline (fan-out on read), with notifications batched or mention-only, and no per-member delivery receipts.
- **How do media messages work?** The client uploads to object storage with a presigned URL, then sends a message containing the object key. A worker generates thumbnails asynchronously, and recipients download through a CDN with signed URLs.

**Quiz**

1. When does the server ack a message?
   - On receipt
   - **After it's durably stored** ✓
2. What repairs messages missed by pub/sub?
   - **Sync from the client's last seq** ✓
   - Redis persistence
3. What are read receipts stored as?
   - One row per message per member
   - **A watermark per member** ✓

**Playground:** challenge `chat`. Rubric:

- clients → LB → WS gateway ×2+;
- gateways ↔ pub/sub;
- a chat service → DB with a replica;
- a push service as an external node;
- object storage for media.

---

### Q7. Design a News Feed (Twitter or Instagram): Full-stack · Hard · 45 min

**30-second answer.**

- **Hybrid fan-out:** pushing a new post's id into each follower's cached feed (fan-out on write) makes reads one fast lookup.
- **Celebrities** (more than ~100K followers) skip fan-out, and their recent posts are merged at read time.
- Feeds are Redis sorted sets scored by time and capped (about 800 ids), kept only for active users.
- Reads hydrate ids into post bodies through a post cache, rank lightly, and paginate by score cursor.
- The client is an infinite list with optimistic likes and a "new posts" banner.

**Requirements**

- **Functional:**
  - Follow and unfollow.
  - Post text and media.
  - A home feed (ranked or reverse-chronological).
  - Like and comment.
  - New posts appear.
- **Non-functional:**
  - Feed p99 < 200 ms.
  - Followers see posts within seconds.
  - Celebrities have millions of followers.
  - 300M DAU.

**Estimate.**

| Quantity | Calculation | Result |
|---|---|---|
| Feed reads | 300M × 10/day | ≈ **35K/s** (~100K/s peak) |
| New posts | 50M/day | ≈ 580/s |
| Fan-out writes | 50M posts × 200 average followers | ≈ **116K/s** |
| Cached feed memory | 300M × 800 ids × ~40 B | ≈ 9.6 TB |

The memory number is too much, so cache feeds only for recently active users, cap their length, and rebuild cold feeds on demand.

| Method | Path | Notes |
|---|---|---|
| POST | `/posts` | Creates a post; fan-out runs asynchronously |
| GET | `/feed?cursor=&limit=20` | `{ posts, nextCursor }` |
| POST/DELETE | `/users/:id/follow` | Follow or unfollow |
| POST | `/posts/:id/like` | Optimistic on the client |
| GET | `/feed/new-count?after=<ts>` | For the banner |

**Data model:**

- `posts` (by author and time; SQL or a wide-column store);
- `follows(follower_id, followee_id)`, indexed both ways;
- `feed:<userId>` ZSET (score = createdAt ms, member = postId);
- `posts:<authorId>` ZSET (the author timeline, used for the celebrity merge);
- `post:<id>` cache.

**Diagram: `feedArchitecture`** (from source `QX`). Scenarios:

- **Normal user posts:** the fan-out queue → workers add to followers' feeds.
- **Celebrity posts:** stored only, no fan-out.
- **User opens the feed:** read their ZSET + merge their celebrities' timelines → hydrate → rank → render.

A second diagram, `pushVsPull`, shows fan-out on write and fan-out on read side by side.

**Widget: FanoutCalc** (P2). Inputs: follower count, posts/day, fan-out throughput. Outputs: writes per post, time to deliver one post to everyone, feed memory, and a push/pull recommendation.

**How to approach it** (source `QX.ap`, kept):

1. Clarify.
2. Compare fan-out strategies.
3. Choose hybrid.
4. Define storage.
5. Design the client.

**Step-by-step answer**

1. **Clarify:** follow-graph size, ranking or chronological, freshness, celebrities, media.
2. **Push (fan-out on write):** each post's id goes into every follower's feed. Reads are cheap, but a post by someone with 10M followers means 10M writes and slow delivery.
3. **Pull (fan-out on read):** merge recent posts from everyone you follow at read time. Writes are cheap, but reads fan out across hundreds of timelines.
4. **Hybrid:** push for normal authors, pull for celebrities. The threshold (around 100K followers) is a tunable trade-off between write amplification and read cost.
5. **Feed storage:**
   - a ZSET per user scored by time, capped at 800 entries;
   - fan-out workers skip users inactive for 30 days, whose feeds are rebuilt on login;
   - writes go in batches of 1,000 followers per queue message.
6. **Read path:** read your ZSET page by score cursor, read each followed celebrity's timeline for the same window, merge, sort, cut. Hydrate ids through the post cache (DB on a miss), and filter out deleted posts.
7. **Ranking:** start chronological. Then apply a simple, explainable score (engagement with time decay × affinity to the author) to a candidate set of a few hundred. ML ranking comes later.
8. **Freshness:** the client polls `new-count` or listens on SSE and shows a banner.
9. **Unfollow and delete:** filter at read time (deleted flag, follow check), and clean up asynchronously by removing the author's recent post ids from the follower's ZSET.
10. **Client:** cursor infinite list (Q5), optimistic like with rollback, the first page server-rendered, and image placeholders.

**Implementation**

```js
// publish.js: write path with hybrid fan-out
const CELEBRITY_THRESHOLD = 100_000;

export async function publishPost(post) {                         // { id, authorId, createdAt, … }
  await db.posts.insert(post);
  await redis.zadd(`posts:${post.authorId}`, post.createdAt, post.id);   // author timeline (used for pull)
  await redis.zremrangebyrank(`posts:${post.authorId}`, 0, -801);
  if ((await graph.followerCount(post.authorId)) > CELEBRITY_THRESHOLD) return;   // merged at read time instead
  for await (const batch of graph.followersInBatches(post.authorId, 1_000)) {
    await queue.publish('fanout', { postId: post.id, ts: post.createdAt, to: batch });   // 1 message per 1,000 followers
  }
}

// fanout worker. With ioredis enableAutoPipelining, these calls are batched per node (works with Redis Cluster).
export async function fanoutWorker({ postId, ts, to }) {
  const active = await activeSince(to, 30);                       // skip users inactive for 30 days
  await Promise.all(active.flatMap(userId => [
    redis.zadd(`feed:${userId}`, ts, postId),
    redis.zremrangebyrank(`feed:${userId}`, 0, -801),             // keep the newest 800
  ]));
}
```

```js
// feed.js: read path (fixes source bug #5: score cursor instead of list offsets, plus the celebrity merge)
const pairs = flat => {                                           // [id, score, id, score…] → [{ id, ts }]
  const out = [];
  for (let i = 0; i < flat.length; i += 2) out.push({ id: flat[i], ts: Number(flat[i + 1]) });
  return out;
};

export async function getFeed(userId, cursor = null, limit = 20) {
  const max = cursor ? `(${cursor}` : '+inf';                     // "(" = exclusive: strictly older than the cursor
  const [pushed, celebs] = await Promise.all([
    redis.zrevrangebyscore(`feed:${userId}`, max, '-inf', 'WITHSCORES', 'LIMIT', 0, limit),
    graph.celebritiesFollowedBy(userId),
  ]);
  const pulled = await Promise.all(celebs.map(c =>
    redis.zrevrangebyscore(`posts:${c}`, max, '-inf', 'WITHSCORES', 'LIMIT', 0, limit)));
  const page = [pushed, ...pulled].flatMap(pairs).sort((a, b) => b.ts - a.ts).slice(0, limit);
  return { posts: await hydrate(page.map(e => e.id)), nextCursor: page.at(-1)?.ts ?? null };
}
// Two posts in the same millisecond can straddle a page boundary. Use ids as a tiebreaker if that matters.
```

```js
// hydrate.js: ids → post bodies through the cache; deleted posts disappear lazily
export async function hydrate(ids) {
  if (!ids.length) return [];
  const cached = await Promise.all(ids.map(id => redis.get(`post:${id}`)));
  const missing = ids.filter((_, i) => !cached[i]);
  const fromDb = missing.length ? await db.posts.findMany(missing) : [];
  await Promise.all(fromDb.map(p => redis.set(`post:${p.id}`, JSON.stringify(p), 'EX', 3_600)));
  const byId = new Map([...cached.filter(Boolean).map(s => JSON.parse(s)), ...fromDb].map(p => [p.id, p]));
  return ids.map(id => byId.get(id)).filter(p => p && !p.deleted);
}
```

```js
// rank.js: simple, explainable scoring. Engagement decays with age (HN-style gravity), boosted by affinity.
export function score(post, viewer, now = Date.now()) {
  const ageHours = (now - post.createdAt) / 3_600_000;
  const engagement = post.likes + 2 * post.comments + 3 * post.shares;
  const affinity = viewer.affinity[post.authorId] ?? 1;           // 1–3, from past interactions
  return (affinity * (engagement + 1)) / Math.pow(ageHours + 2, 1.5);
}
// Rank a candidate set (e.g. the newest 300 from getFeed), not the whole history.
```

```js
// useLike.js (client): optimistic like with rollback (TanStack Query v5)
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: postId => fetch(`/api/posts/${postId}/like`, { method: 'POST' }).then(r => { if (!r.ok) throw new Error('like failed'); }),
    onMutate: async postId => {
      await qc.cancelQueries({ queryKey: ['feed'] });
      const previous = qc.getQueryData(['feed']);
      qc.setQueryData(['feed'], data => data && {
        ...data,
        pages: data.pages.map(p => ({ ...p, posts: p.posts.map(x => (x.id === postId ? { ...x, liked: true, likes: x.likes + 1 } : x)) })),
      });
      return { previous };
    },
    onError: (_err, _postId, ctx) => qc.setQueryData(['feed'], ctx.previous),   // roll back
    // No blanket invalidate: refetching an infinite feed reloads every page. Reconcile the one post if needed.
  });
}
```

**Failure modes**

| What breaks | Effect | Mitigation |
|---|---|---|
| Fan-out queue backlog | Followers see posts late | Autoscale workers on queue age; the author sees their own post immediately |
| A Redis feed is lost or evicted | Empty feed | Rebuild from follows + author timelines (fan-out on read) and repopulate |
| A celebrity's timeline gets hammered | A hot key | An in-process L1 cache with a few seconds' TTL; replicate the key |
| A post is deleted after fan-out | A ghost post | Filter at hydrate time (deleted flag); clean up asynchronously |
| Unfollow | Old posts linger | Filter by the follow check at read time; remove asynchronously |

**Trade-offs**

| Strategy | Write cost | Read cost | Freshness | Choose when |
|---|---|---|---|---|
| Fan-out on write (push) | High (× followers) | Very low | Seconds | Most users |
| Fan-out on read (pull) | Low | High (merge many timelines) | Instant | Celebrities, inactive users |
| **Hybrid** | Bounded | Low + a small merge | Seconds | Real systems |
| Ranked vs chronological | Ranking compute | Same | Same | Engagement goals vs transparency |

**Follow-ups (with answers)**

- **How would you rank posts?** Get candidates (recent pushed and pulled posts), compute features (engagement, recency, affinity, content type), score them (start with a formula, then a learned model), re-rank for diversity (no five posts in a row from one author), and cache the ranked page briefly.
- **How do you handle unfollows and deleted posts?** Filter both at read time (cheap and correct), then clean the feed ZSETs asynchronously. Never block the user action on fan-out cleanup.
- **How do you cache viral posts?** Post bodies sit in Redis with an L1 in-process cache. Counters (likes) are salted across sub-keys or batched (write-behind), and counts are shown approximately ("12.3K").
- **What does a new user see?** Onboarding follow suggestions plus a "popular" feed (pull from trending timelines) until their graph is big enough.
- **How do you handle inactive users?** Skip them during fan-out to save writes and memory. On their next login, rebuild the feed with a one-off fan-out on read and return to push afterwards.

**Quiz**

1. Why skip fan-out for celebrities?
   - Privacy
   - **10M writes per post would delay delivery** ✓
2. What cursor fixes duplicate and skipped items?
   - List offset
   - **A score (timestamp) cursor** ✓
3. Feeds for users inactive for 30 days are:
   - Kept forever
   - **Skipped during fan-out and rebuilt on login** ✓

**Playground:** challenge `news-feed`. Rubric:

- post service → queue → fan-out workers → feed cache;
- celebrity timelines readable by the feed service;
- a post cache;
- a DB with replicas;
- a CDN for media.

---

## 4. Question backlog (15 new questions)

Add these in Phase 5 using the same template. The order below is the recommended priority.

| # | Question | Category | Level | Core concepts | Signature diagram / widget | Signature JS snippet |
|---|---|---|---|---|---|---|
| 1 | Design a Unique ID Generator | Backend | Medium | Snowflake layout, clock skew, worker ids, k-sorted ids | A bit-layout Timeline that fills as ids are generated | `snowflake.js` (Deep dive 2) |
| 2 | Design a Payment System | Backend | Hard | Idempotency, double-entry ledger, provider webhooks, reconciliation, sagas | SequenceDiagram with failure branches (timeout, duplicate webhook, refund) | Ledger posting that rejects unbalanced entries |
| 3 | Design a Leaderboard | Backend | Medium | Redis ZSET, rank queries, ties, sharded and time-windowed boards | Animated bar race | `ZINCRBY` + `ZREVRANK` + "around me" query |
| 4 | Design an E-commerce Flash Sale | Full-stack | Hard | Inventory reservation, queue-based admission, oversell prevention, bots | SeatRace variant with 1,000 buyers and 100 units | Redis Lua `DECR` guard + order queue |
| 5 | Build a Kanban Board | Frontend | Medium | Drag and drop (dnd-kit), optimistic reorder, fractional indexing, real-time sync | Live dnd-kit board | Fractional index between two keys |
| 6 | Design Google Docs (collaborative editing) | Full-stack | Hard | OT vs CRDT, presence and cursors, snapshots + ops log | Two-client simulator with network delay | Tiny sequence CRDT (insert/delete with ids) |
| 7 | Design YouTube | Full-stack | Hard | Resumable upload, transcoding DAG, HLS/DASH adaptive bitrate, CDN | Transcoding pipeline + ABR bitrate chart | Chunked resumable upload client |
| 8 | Design Uber (ride matching) | Full-stack | Hard | Geospatial index (geohash/H3), location updates, matching, surge | Grid map with drivers moving and matching | Geohash encode plus a neighbour search |
| 9 | Design a Distributed Key-Value Store | Backend | Hard | Consistent hashing, quorums, vector clocks, hinted handoff, Merkle trees, gossip | HashRing + QuorumPlayground combined | Vector-clock compare (before / after / concurrent) |
| 10 | Design a Web Crawler | Backend | Hard | URL frontier, per-host politeness, robots.txt, dedupe (Bloom filter), DNS cache | Crawler pipeline FlowDiagram | Frontier with per-host queues and delays |
| 11 | Design a Distributed Job Scheduler | Backend | Hard | Leases, at-least-once, time buckets, missed runs | Timeline of leases and retries | Lease claim with `FOR UPDATE SKIP LOCKED` |
| 12 | Design Dropbox (file sync) | Full-stack | Hard | Chunking, content hashing and dedupe, metadata service, conflicts, notifications | Upload/sync FlowDiagram | Chunk and hash a file with Web Crypto (`crypto.subtle.digest`) |
| 13 | Design a Metrics/Logging Pipeline | Backend | Hard | Agents, Kafka, sampling, columnar storage, retention tiers | Pipeline with backpressure scenario | Batching exporter with a size/time flush |
| 14 | Build an Offline-first Notes App | Frontend | Hard | Service worker, IndexedDB, sync queue, conflict resolution | Timeline: offline edits → reconnect → merge | Outbox sync queue with retry |
| 15 | Build an Image Carousel / Gallery | Frontend | Easy | Lazy loading, `srcset`/`sizes`, preloading the next image, swipe, ARIA carousel pattern | VirtualListViz variant | Accessible carousel hook (`aria-roledescription="carousel"`, live region) |
