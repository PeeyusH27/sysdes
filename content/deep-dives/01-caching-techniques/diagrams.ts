import type { DecisionSpec, FlowSpec, SequenceSpec, TimelineSpec } from "@/components/diagram/types";

export const cacheAsideSequence: SequenceSpec = {
  id: "cache-aside-sequence",
  title: "Cache-aside read",
  description:
    "The app asks Redis first. On a hit it answers in about 1 ms without touching the database; on a miss it reads the database and fills the cache with a TTL.",
  actors: [
    { id: "client", label: "Client", kind: "client" },
    { id: "app", label: "App", kind: "service" },
    { id: "redis", label: "Redis", kind: "cache" },
    { id: "db", label: "Database", kind: "database" },
  ],
  items: [
    { from: "client", to: "app", label: "GET /products/42" },
    { from: "app", to: "redis", label: "GET product:42" },
    {
      alt: [
        {
          when: "cache hit",
          items: [
            { from: "redis", to: "app", label: "JSON value (~1 ms)", type: "reply" },
            { note: "The database is never touched", over: ["redis", "db"] },
            { from: "app", to: "client", label: "200 OK", type: "reply" },
          ],
        },
        {
          when: "cache miss",
          items: [
            { from: "redis", to: "app", label: "nil", type: "reply" },
            { from: "app", to: "db", label: "SELECT … WHERE id = 42" },
            { from: "db", to: "app", label: "row (~50 ms)", type: "reply" },
            { from: "app", to: "redis", label: "SET product:42 EX 317" },
            { note: "TTL = 300 s + random jitter", over: ["redis", "db"] },
            { from: "app", to: "client", label: "200 OK", type: "reply" },
          ],
        },
      ],
    },
  ],
};

export const writeInvalidate: SequenceSpec = {
  id: "write-invalidate",
  title: "Write, then invalidate",
  description:
    "The app updates the database, then deletes the cache key. The next read misses, loads the new row and refills the cache.",
  actors: [
    { id: "admin", label: "Admin", kind: "client" },
    { id: "shopper", label: "Shopper", kind: "client" },
    { id: "app", label: "App", kind: "service" },
    { id: "redis", label: "Redis", kind: "cache" },
    { id: "db", label: "Database", kind: "database" },
  ],
  items: [
    { from: "admin", to: "app", label: "PUT /products/42 price=12" },
    { from: "app", to: "db", label: "UPDATE products SET price = 12" },
    { from: "db", to: "app", label: "OK", type: "reply" },
    { from: "app", to: "redis", label: "DEL product:42" },
    { note: "Delete the key, don't update it", over: ["redis", "db"] },
    { from: "app", to: "admin", label: "200 OK", type: "reply" },
    { note: "Later: the next read", over: ["shopper", "app"] },
    { from: "shopper", to: "app", label: "GET /products/42" },
    { from: "app", to: "redis", label: "GET product:42" },
    { from: "redis", to: "app", label: "nil (miss)", type: "reply" },
    { from: "app", to: "db", label: "SELECT … WHERE id = 42" },
    { from: "db", to: "app", label: "price = 12", type: "reply" },
    { from: "app", to: "redis", label: "SET product:42 EX 300" },
    { from: "app", to: "shopper", label: "price = 12", type: "reply" },
    { note: "Fresh until the next write or the TTL", over: ["redis", "db"] },
  ],
};

/* ---------- The write path ---------- */

export const overwriteRace: SequenceSpec = {
  id: "overwrite-race",
  title: "Two writers: overwrite or delete",
  description:
    "Two writers update the same price. The database applies them in one order, but their cache writes can arrive in the other. Overwriting pins the older value; deleting cannot.",
  actors: [
    { id: "a", label: "Writer A", kind: "service" },
    { id: "b", label: "Writer B", kind: "service" },
    { id: "db", label: "Database", kind: "database" },
    { id: "redis", label: "Redis", kind: "cache" },
  ],
  items: [
    { from: "a", to: "db", label: "UPDATE price = 10" },
    { from: "b", to: "db", label: "UPDATE price = 12" },
    { note: "The database ends at 12: A first, then B", over: ["db", "redis"] },
    {
      alt: [
        {
          when: "overwrite the cache",
          items: [
            { from: "b", to: "redis", label: "SET price = 12" },
            { from: "a", to: "redis", label: "SET price = 10 (late)" },
            { note: "Redis says 10, the database says 12, until the TTL", over: ["db", "redis"] },
          ],
        },
        {
          when: "delete the key",
          items: [
            { from: "b", to: "redis", label: "DEL price" },
            { from: "a", to: "redis", label: "DEL price (late)" },
            { note: "Either order leaves the key empty; the next read loads 12", over: ["db", "redis"] },
          ],
        },
      ],
    },
  ],
};

/* ---------- The six patterns, one picture each ---------- */

export const asideWrite: SequenceSpec = {
  id: "aside-write",
  title: "Cache-aside write, and its weak spot",
  description:
    "The app writes the database first, then deletes the key. If the app dies between the two steps, the old value stays cached until the TTL ends.",
  actors: [
    { id: "app", label: "App", kind: "service" },
    { id: "db", label: "Database", kind: "database" },
    { id: "redis", label: "Redis", kind: "cache" },
  ],
  items: [
    { from: "app", to: "db", label: "UPDATE price = 12" },
    { from: "db", to: "app", label: "OK", type: "reply" },
    {
      alt: [
        {
          when: "normal",
          items: [
            { from: "app", to: "redis", label: "DEL product:42" },
            { note: "Next read misses and loads 12", over: ["redis", "db"] },
          ],
        },
        {
          when: "app dies here",
          items: [
            { note: "Process killed before the delete", over: ["app", "redis"] },
            { note: "Redis still holds 10 until the TTL (up to 300 s)", over: ["redis", "db"] },
          ],
        },
      ],
    },
  ],
};

export const asideFlow: FlowSpec = {
  id: "aside-flow",
  title: "Cache-aside when the cache is down",
  description:
    "The app owns both lookups. With a healthy cache most reads stop at Redis; with a dead cache every read falls through to the database, slower but correct.",
  nodes: [
    { id: "app", label: "App", kind: "service", col: 0, row: 1 },
    { id: "redis", label: "Redis", kind: "cache", col: 1, row: 0, sub: "~1 ms" },
    { id: "db", label: "Database", kind: "database", col: 1, row: 2, sub: "~50 ms" },
  ],
  edges: [
    { from: "app", to: "redis", label: "1 get" },
    { from: "app", to: "db", label: "2 load" },
  ],
  scenarios: [
    {
      id: "healthy",
      name: "Healthy",
      steps: [
        { edge: "app>redis", caption: "The app asks Redis first." },
        { edge: "app>redis", reverse: true, tone: "ok", caption: "At a 90% hit ratio, 9 reads in 10 end here in about 1 ms.", mark: [{ node: "redis", state: "hit" }] },
      ],
    },
    {
      id: "miss",
      name: "Miss",
      steps: [
        { edge: "app>redis", tone: "miss", caption: "Redis has no copy.", mark: [{ node: "redis", state: "miss" }] },
        { edge: "app>db", caption: "The app loads the row (about 50 ms) and sets it with a TTL.", mark: [{ node: "redis", state: "hit" }] },
      ],
    },
    {
      id: "down",
      name: "Cache down",
      steps: [
        { edge: "app>redis", tone: "error", caption: "Redis does not answer. The app times out after a few tens of ms.", mark: [{ node: "redis", state: "down" }] },
        { edge: "app>db", caption: "It reads the database directly. Slower, still correct, as long as the database can take the extra load." },
      ],
    },
  ],
};

export const readThroughSeq: SequenceSpec = {
  id: "read-through-seq",
  title: "Read-through: the cache runs the miss",
  description:
    "The app only calls get on the cache layer. On a miss the cache's own loader reads the database, and good loaders let only one caller per key do it.",
  actors: [
    { id: "app", label: "App", kind: "service" },
    { id: "cache", label: "Cache + loader", kind: "cache" },
    { id: "db", label: "Database", kind: "database" },
  ],
  items: [
    {
      alt: [
        {
          when: "one caller",
          items: [
            { from: "app", to: "cache", label: "get(product:42)" },
            { from: "cache", to: "db", label: "loader: SELECT … id = 42" },
            { from: "db", to: "cache", label: "row (~50 ms)", type: "reply" },
            { from: "cache", to: "app", label: "value, now cached", type: "reply" },
          ],
        },
        {
          when: "100 callers at once",
          items: [
            { from: "app", to: "cache", label: "get(product:42) x 100" },
            { from: "cache", to: "db", label: "loader runs ONCE" },
            { from: "db", to: "cache", label: "row", type: "reply" },
            { from: "cache", to: "app", label: "same value to all 100", type: "reply" },
            { note: "One database read instead of 100", over: ["cache", "db"] },
          ],
        },
      ],
    },
  ],
};

export const writeThroughSeq: SequenceSpec = {
  id: "write-through-seq",
  title: "Write-through: both stores, in order",
  description:
    "The write goes to the database first, then to the cache, and only then is the caller told it worked. If the database refuses, the cache must not keep the value.",
  actors: [
    { id: "app", label: "App", kind: "service" },
    { id: "cache", label: "Cache layer", kind: "cache" },
    { id: "db", label: "Database", kind: "database" },
  ],
  items: [
    { from: "app", to: "cache", label: "save(profile:7, new bio)" },
    { from: "cache", to: "db", label: "UPDATE profiles …" },
    {
      alt: [
        {
          when: "database accepts",
          items: [
            { from: "db", to: "cache", label: "OK (~50 ms)", type: "reply" },
            { note: "Cache stores the new bio", over: ["cache"] },
            { from: "cache", to: "app", label: "OK: reads are fresh", type: "reply" },
          ],
        },
        {
          when: "database rejects",
          items: [
            { from: "db", to: "cache", label: "error (constraint)", type: "reply" },
            { note: "Cache must NOT keep the new bio", over: ["cache"] },
            { from: "cache", to: "app", label: "error", type: "reply" },
          ],
        },
      ],
    },
  ],
};

export const writeBehindBuffer: FlowSpec = {
  id: "write-behind-buffer",
  title: "Write-behind: many writes, one flush",
  description:
    "Writes land in the cache and are acknowledged at once. A timer flushes only the latest value per key to the database, so repeated writes to one key collapse into one.",
  nodes: [
    { id: "app", label: "App", kind: "service", col: 0, row: 1 },
    { id: "cache", label: "Cache + buffer", kind: "cache", col: 1, row: 1, sub: "flush every 5 s" },
    { id: "db", label: "Database", kind: "database", col: 2, row: 1 },
  ],
  edges: [
    { from: "app", to: "cache", label: "write" },
    { from: "cache", to: "db", label: "flush", style: "async" },
  ],
  scenarios: [
    {
      id: "coalesce",
      name: "Writes collapse",
      steps: [
        {
          edge: "app>cache",
          caption: "A viral video gets 1,000 view-count updates a second. Each is acknowledged in about 1 ms.",
          with: [{ edge: "app>cache", caption: "" }, { edge: "app>cache", caption: "" }],
          mark: [{ node: "cache", state: "hit" }],
        },
        { edge: "app>cache", reverse: true, tone: "ok", caption: "The buffer keeps one number per video: the latest total." },
        { edge: "cache>db", caption: "After 5 seconds one UPDATE goes out. 5,000 writes became 1, so the database load dropped 5,000 times for this key." },
      ],
    },
    {
      id: "crash",
      name: "Crash before flush",
      steps: [
        { edge: "app>cache", caption: "A flash sale writes 20,000 orders a second into the buffer.", mark: [{ node: "cache", state: "hit" }] },
        { edge: "app>cache", reverse: true, tone: "ok", caption: "Every order is acknowledged, so customers see success." },
        { edge: "cache>db", tone: "error", caption: "The node dies 4 seconds into a 5 second window. About 80,000 orders exist nowhere else.", mark: [{ node: "cache", state: "down" }] },
      ],
    },
  ],
};

export const writeAroundFlow: FlowSpec = {
  id: "write-around-flow",
  title: "Write-around: writes skip the cache",
  description:
    "Writes go straight to the database. The cache only fills when someone reads, so data that is never read again never takes cache space.",
  nodes: [
    { id: "app", label: "App", kind: "service", col: 0, row: 1 },
    { id: "cache", label: "Redis", kind: "cache", col: 1, row: 0, sub: "fills on read" },
    { id: "db", label: "Database", kind: "database", col: 1, row: 2 },
  ],
  edges: [
    { from: "app", to: "cache", label: "read" },
    { from: "app", to: "db", label: "write" },
  ],
  scenarios: [
    {
      id: "upload",
      name: "A write",
      steps: [
        { edge: "app>db", caption: "An audit log line is written straight to the database." },
        { edge: "app>db", reverse: true, tone: "ok", caption: "Done. The cache was not touched, so it holds no space for a row nobody will read." },
      ],
    },
    {
      id: "first-read",
      name: "First read pays",
      steps: [
        { edge: "app>cache", tone: "miss", caption: "Someone finally reads the row. Redis has never seen it.", mark: [{ node: "cache", state: "miss" }] },
        { edge: "app>db", caption: "The read goes to the database (about 50 ms)." },
        { edge: "app>cache", caption: "Only now is it cached, for the next reader.", mark: [{ node: "cache", state: "hit" }] },
      ],
    },
    {
      id: "already-cached",
      name: "Already cached",
      steps: [
        { edge: "app>cache", caption: "The row was cached earlier, and readers keep getting it.", mark: [{ node: "cache", state: "hit" }] },
        { edge: "app>db", caption: "A write updates only the database. Nothing tells the cache." },
        { edge: "app>cache", tone: "error", caption: "Readers get the old copy until the TTL ends. If the row can be cached, delete its key on write.", mark: [{ node: "cache", state: "down" }] },
      ],
    },
  ],
};

export const refreshAheadTimeline: TimelineSpec = {
  id: "refresh-ahead-timeline",
  title: "Plain TTL against refresh-ahead",
  description:
    "Not to scale. With a plain TTL the first reader after expiry waits for the rebuild. With refresh-ahead the first read after 80% of the TTL triggers a background reload, so the key never expires.",
  unit: "s",
  lanes: [
    { id: "plain", label: "Plain TTL" },
    { id: "ahead", label: "Refresh-ahead" },
  ],
  spans: [
    { lane: "plain", start: 0, end: 300, label: "Hits until the TTL ends", tone: 1 },
    { lane: "plain", start: 300, end: 340, label: "Miss: readers wait", tone: 3 },
    { lane: "ahead", start: 0, end: 240, label: "Hits", tone: 1 },
    { lane: "ahead", start: 240, end: 290, label: "Reload", tone: 2 },
    { lane: "ahead", start: 290, end: 340, label: "Fresh TTL", tone: 1 },
  ],
  markers: [
    { at: 240, label: "80% of TTL" },
    { at: 300, label: "Old expiry" },
  ],
};

export const choosePattern: DecisionSpec = {
  id: "choose-write-pattern",
  title: "Which pattern for this data?",
  start: "own",
  nodes: {
    own: { q: "Must a reader see a write at once?", yes: "through", no: "same" },
    through: {
      result: "Write-through",
      why: "Write the database, then the cache, then confirm. Reads stay fresh and each write costs two stores.",
    },
    same: { q: "Same few keys hit constantly, and losing seconds is fine?", yes: "behind", no: "rare" },
    behind: {
      result: "Write-behind",
      why: "Buffer the writes and flush the latest value per key every few seconds. A crash loses the buffer, so never use it for orders or money.",
    },
    rare: { q: "Written once and rarely read again?", yes: "around", no: "hot" },
    around: {
      result: "Write-around",
      why: "Write only the database and let reads fill the cache. Logs and uploads never push hot keys out.",
    },
    hot: { q: "Do a few hot keys hurt when they expire?", yes: "ahead", no: "aside" },
    ahead: {
      result: "Aside + refresh-ahead",
      why: "Keep cache-aside and reload the few hot keys in the background once 80% of their TTL has passed.",
    },
    aside: {
      result: "Cache-aside (default)",
      why: "Update the database, delete the key, let the next read refill it. Losing the cache only costs speed.",
    },
  },
};

/* ---------- Races the delete does not fix ---------- */

export const slowReaderSeq: SequenceSpec = {
  id: "slow-reader-seq",
  title: "The slow reader refills the old price",
  description:
    "A reader loads the old row, stalls, and writes it into the cache after the writer has already deleted the key. The cache now holds a value the database no longer has.",
  actors: [
    { id: "reader", label: "Reader", kind: "service" },
    { id: "writer", label: "Writer", kind: "service" },
    { id: "db", label: "Database", kind: "database" },
    { id: "redis", label: "Redis", kind: "cache" },
  ],
  items: [
    { from: "reader", to: "redis", label: "GET price (miss)" },
    { from: "reader", to: "db", label: "SELECT price" },
    { from: "db", to: "reader", label: "10 (old)", type: "reply" },
    { note: "Reader stalls: GC pause or slow network", over: ["reader"] },
    { from: "writer", to: "db", label: "UPDATE price = 12" },
    { from: "writer", to: "redis", label: "DEL price" },
    { from: "reader", to: "redis", label: "SET price = 10" },
    { note: "Stale 10 sits in Redis until the TTL", over: ["redis", "db"] },
  ],
};

export const doubleDeleteTimeline: TimelineSpec = {
  id: "double-delete-timeline",
  title: "A delayed second delete",
  description:
    "The reader's stale refill lands at 400 ms. A second delete 1 second after the write removes it, so the stale window is about 1 second instead of the whole TTL.",
  unit: "ms",
  lanes: [
    { id: "reader", label: "Slow reader" },
    { id: "writer", label: "Writer" },
    { id: "cache", label: "Cache state" },
  ],
  spans: [
    { lane: "reader", start: 0, end: 400, label: "Loads the old row", tone: 2 },
    { lane: "reader", start: 400, end: 460, label: "Stale SET", tone: 3 },
    { lane: "writer", start: 100, end: 200, label: "UPDATE + DEL", tone: 1 },
    { lane: "writer", start: 1100, end: 1200, label: "DEL again", tone: 1 },
    { lane: "cache", start: 460, end: 1100, label: "Serving the old price", tone: 3 },
    { lane: "cache", start: 1200, end: 1600, label: "Fresh again", tone: 1 },
  ],
  markers: [
    { at: 400, label: "Stale refill" },
    { at: 1100, label: "Cleaned up" },
  ],
};

export const versionedKeys: FlowSpec = {
  id: "versioned-keys",
  title: "Versioned keys",
  description:
    "The value lives under a key that includes the row version. A write bumps the version, so readers move to a new key and the old one is never read again.",
  nodes: [
    { id: "app", label: "App", kind: "service", col: 0, row: 1 },
    { id: "ver", label: "Version counter", kind: "cache", col: 1, row: 0, sub: "ver:user:42" },
    { id: "val", label: "Versioned value", kind: "cache", col: 1, row: 2, sub: "user:42:v7" },
    { id: "db", label: "Database", kind: "database", col: 2, row: 1 },
  ],
  edges: [
    { from: "app", to: "ver", label: "version" },
    { from: "app", to: "val", label: "value" },
    { from: "app", to: "db", label: "load" },
  ],
  scenarios: [
    {
      id: "read",
      name: "A read",
      steps: [
        { edge: "app>ver", caption: "The app asks for the current version of user 42." },
        { edge: "app>ver", reverse: true, caption: "Version 7." },
        { edge: "app>val", caption: "It reads user:42:v7." },
        { edge: "app>val", reverse: true, tone: "ok", caption: "Hit. Cost: two Redis round trips instead of one.", mark: [{ node: "val", state: "hit" }] },
      ],
    },
    {
      id: "write",
      name: "A write",
      steps: [
        { edge: "app>db", caption: "A writer updates the user row.", mark: [{ node: "val", state: null }] },
        { edge: "app>ver", caption: "Then it bumps the counter: INCR ver:user:42 gives 8." },
        { edge: "app>val", tone: "miss", caption: "The next reader asks for user:42:v8, which does not exist yet.", mark: [{ node: "val", state: "miss" }] },
        { edge: "app>db", caption: "It loads the new row and stores it under v8. A slow reader still holding v7 only writes to the dead v7 key, which nobody reads and the TTL removes.", mark: [{ node: "val", state: "hit" }] },
      ],
    },
  ],
};

export const fillIfNewerSeq: SequenceSpec = {
  id: "fill-if-newer-seq",
  title: "Fill only if newer",
  description:
    "The writer leaves a tombstone at the new version. A fill carrying an older version is rejected, and a fill at the current version is accepted.",
  actors: [
    { id: "writer", label: "Writer", kind: "service" },
    { id: "reader", label: "Reader", kind: "service" },
    { id: "redis", label: "Redis (Lua)", kind: "cache" },
  ],
  items: [
    { from: "writer", to: "redis", label: "INVALIDATE price @ v2" },
    { note: "Key is empty, with a tombstone at v2", over: ["redis"] },
    {
      alt: [
        {
          when: "slow reader (v1)",
          items: [
            { from: "reader", to: "redis", label: "FILL price = 10 @ v1" },
            { from: "redis", to: "reader", label: "rejected: tombstone is v2", type: "reply" },
            { note: "The stale value never lands", over: ["redis"] },
          ],
        },
        {
          when: "fresh reader (v2)",
          items: [
            { from: "reader", to: "redis", label: "FILL price = 12 @ v2" },
            { from: "redis", to: "reader", label: "stored", type: "reply" },
          ],
        },
      ],
    },
  ],
};

/* ---------- Two levels of cache ---------- */

export const l1l2Read: FlowSpec = {
  id: "l1-l2-read",
  title: "Reading through L1, then L2",
  description:
    "Each app instance checks its own memory first (L1, microseconds), then shared Redis (L2, about 1 ms), then the database (about 50 ms).",
  nodes: [
    { id: "client", label: "Client", kind: "client", col: 0, row: 1 },
    { id: "app", label: "App instance", kind: "service", col: 1, row: 1, sub: "L1, µs" },
    { id: "redis", label: "Redis", kind: "cache", col: 2, row: 0, sub: "L2, ~1 ms" },
    { id: "db", label: "Database", kind: "database", col: 2, row: 2, sub: "~50 ms" },
  ],
  edges: [
    { from: "client", to: "app" },
    { from: "app", to: "redis", label: "L1 miss" },
    { from: "app", to: "db", label: "L2 miss" },
  ],
  scenarios: [
    {
      id: "l1",
      name: "L1 hit",
      steps: [
        { edge: "client>app", caption: "A request for a hot feature flag reaches instance 12." },
        { edge: "client>app", reverse: true, tone: "ok", caption: "Found in its own map. No network hop at all.", mark: [{ node: "app", state: "hit" }] },
      ],
    },
    {
      id: "l2",
      name: "L2 hit",
      steps: [
        { edge: "client>app", caption: "Instance 12's copy expired 5 seconds after it was stored.", mark: [{ node: "app", state: "miss" }] },
        { edge: "app>redis", caption: "It asks Redis. Across 50 instances and a 5 second L1 TTL, that is 10 Redis reads a second for this key, not 100,000." },
        { edge: "app>redis", reverse: true, tone: "ok", caption: "Redis hit. The instance keeps the value for another 5 seconds.", mark: [{ node: "app", state: "hit" }] },
      ],
    },
    {
      id: "cold",
      name: "Both miss",
      steps: [
        { edge: "client>app", caption: "A key nobody has asked for in a while.", mark: [{ node: "app", state: "miss" }] },
        { edge: "app>redis", tone: "miss", caption: "L1 misses, then Redis misses.", mark: [{ node: "redis", state: "miss" }] },
        { edge: "app>db", caption: "Only now does the database work (about 50 ms). The answer fills Redis, then L1." },
      ],
    },
  ],
};

export const l1Invalidation: SequenceSpec = {
  id: "l1-invalidation",
  title: "Invalidating every instance's copy",
  description:
    "A write deletes the Redis key and publishes the key name. Each instance drops its own copy when the message arrives. Pub/sub can lose a message, so L1 entries also expire in seconds.",
  actors: [
    { id: "writer", label: "Writer", kind: "service" },
    { id: "redis", label: "Redis", kind: "cache" },
    { id: "i2", label: "Instance 2", kind: "service" },
    { id: "i3", label: "Instance 3", kind: "service" },
  ],
  items: [
    { from: "writer", to: "redis", label: "DEL item:42" },
    { from: "writer", to: "redis", label: "PUBLISH invalidate item:42" },
    {
      alt: [
        {
          when: "all hear it",
          items: [
            { from: "redis", to: "i2", label: "item:42", type: "async" },
            { from: "redis", to: "i3", label: "item:42", type: "async" },
            { note: "Both drop their L1 copy at once", over: ["i2", "i3"] },
          ],
        },
        {
          when: "instance 3 misses it",
          items: [
            { from: "redis", to: "i2", label: "item:42", type: "async" },
            { note: "Instance 3 was reconnecting: the message is gone", over: ["redis", "i3"] },
            { note: "It serves the old copy until its L1 TTL (5 s) ends", over: ["i3"] },
          ],
        },
      ],
    },
  ],
};

/* ---------- Stampede ---------- */

export const stampedeFlow: FlowSpec = {
  id: "stampede-flow",
  title: "A hot key expires",
  description:
    "The homepage key expires at noon and 5,000 requests a second want it. Compare no protection, single flight in each process, and a Redis lock across processes.",
  nodes: [
    { id: "users", label: "Readers", kind: "client", col: 0, row: 1, sub: "5,000 / s" },
    { id: "app", label: "App instances", kind: "service", col: 1, row: 1, sub: "x 50" },
    { id: "redis", label: "Redis", kind: "cache", col: 2, row: 0 },
    { id: "db", label: "Database", kind: "database", col: 2, row: 2, sub: "rebuild ~800 ms" },
  ],
  edges: [
    { from: "users", to: "app" },
    { from: "app", to: "redis", label: "get" },
    { from: "app", to: "db", label: "rebuild" },
  ],
  scenarios: [
    {
      id: "none",
      name: "No protection",
      steps: [
        {
          edge: "users>app",
          caption: "Noon: the key expires. Requests keep arriving at 5,000 a second.",
          with: [{ edge: "users>app", caption: "" }, { edge: "users>app", caption: "" }],
        },
        { edge: "app>redis", tone: "miss", caption: "Every one of them misses.", mark: [{ node: "redis", state: "miss" }] },
        { edge: "app>db", tone: "error", caption: "The rebuild takes 800 ms, so 5,000 x 0.8 = 4,000 requests all run the same heavy query.", with: [{ edge: "app>db", tone: "error", caption: "" }, { edge: "app>db", tone: "error", caption: "" }], mark: [{ node: "db", state: "down" }] },
      ],
    },
    {
      id: "single",
      name: "Single flight",
      steps: [
        { edge: "users>app", caption: "Same burst. Inside each instance, concurrent misses share one promise.", mark: [{ node: "db", state: null }] },
        { edge: "app>redis", tone: "miss", caption: "Every instance still misses once.", mark: [{ node: "redis", state: "miss" }] },
        { edge: "app>db", caption: "Up to 50 rebuilds reach the database, one per instance. Better than 4,000, still not one.", mark: [{ node: "db", state: "busy" }] },
      ],
    },
    {
      id: "lock",
      name: "Plus a Redis lock",
      steps: [
        { edge: "users>app", caption: "Same burst, now with single flight and a lock in Redis.", mark: [{ node: "db", state: null }] },
        { edge: "app>redis", caption: "All 50 instances try SET lock NX. Exactly one wins.", mark: [{ node: "redis", state: "miss" }] },
        { edge: "app>db", caption: "Only the winner rebuilds: one query for the whole fleet.", mark: [{ node: "db", state: "ok" }] },
        { edge: "app>redis", reverse: true, tone: "ok", caption: "It fills the key. The other 49 retry after 50 ms and hit.", mark: [{ node: "redis", state: "hit" }] },
      ],
    },
  ],
};

export const redisLockSeq: SequenceSpec = {
  id: "redis-lock-seq",
  title: "A rebuild lock across instances",
  description:
    "The first instance takes a lock with a timeout, rebuilds and releases it only if the token is still its own. A crashed holder frees the lock when the timeout ends.",
  actors: [
    { id: "i1", label: "Instance 1", kind: "service" },
    { id: "i2", label: "Instance 2", kind: "service" },
    { id: "redis", label: "Redis", kind: "cache" },
    { id: "db", label: "Database", kind: "database" },
  ],
  items: [
    { from: "i1", to: "redis", label: "SET lock:home tok1 NX PX 5000" },
    { from: "redis", to: "i1", label: "OK (you hold it)", type: "reply" },
    { from: "i2", to: "redis", label: "SET lock:home tok2 NX PX 5000" },
    { from: "redis", to: "i2", label: "nil (taken)", type: "reply" },
    {
      alt: [
        {
          when: "holder finishes",
          items: [
            { from: "i1", to: "db", label: "rebuild (~800 ms)" },
            { from: "i1", to: "redis", label: "SET home EX 300" },
            { from: "i1", to: "redis", label: "release if token = tok1" },
            { from: "i2", to: "redis", label: "retry in 50 ms: GET home" },
            { from: "redis", to: "i2", label: "hit", type: "reply" },
          ],
        },
        {
          when: "holder crashes",
          items: [
            { note: "Instance 1 dies mid-rebuild", over: ["i1", "db"] },
            { note: "After 5 s the lock expires by itself", over: ["redis"] },
            { from: "i2", to: "redis", label: "SET lock:home tok2 NX PX 5000" },
            { from: "redis", to: "i2", label: "OK: i2 rebuilds now", type: "reply" },
          ],
        },
      ],
    },
  ],
};

/* ---------- Penetration ---------- */

export const penetrationFlow: FlowSpec = {
  id: "penetration-flow",
  title: "Lookups for ids that do not exist",
  description:
    "A scraper asks for random user ids. Every one misses the cache and the database. A cached not-found answer helps for repeats, and a Bloom filter stops unique ids before they reach anything.",
  nodes: [
    { id: "scraper", label: "Scraper", kind: "client", col: 0, row: 1, sub: "10,000 / s" },
    { id: "app", label: "App", kind: "service", col: 1, row: 1 },
    { id: "bloom", label: "Bloom filter", kind: "cache", col: 2, row: 0, sub: "real ids only" },
    { id: "redis", label: "Redis", kind: "cache", col: 2, row: 1 },
    { id: "db", label: "Database", kind: "database", col: 2, row: 2 },
  ],
  edges: [
    { from: "scraper", to: "app" },
    { from: "app", to: "bloom", label: "exists?" },
    { from: "app", to: "redis", label: "get" },
    { from: "app", to: "db", label: "load" },
  ],
  scenarios: [
    {
      id: "none",
      name: "No defence",
      steps: [
        {
          edge: "scraper>app",
          caption: "GET /users/9137261, then 9137262, then 9137263. None of these users exist.",
          with: [{ edge: "scraper>app", caption: "" }, { edge: "scraper>app", caption: "" }],
        },
        { edge: "app>redis", tone: "miss", caption: "There is never anything to cache, so Redis misses every time.", mark: [{ node: "redis", state: "miss" }] },
        { edge: "app>db", tone: "error", caption: "All 10,000 requests a second reach the database, which finds nothing.", with: [{ edge: "app>db", tone: "error", caption: "" }, { edge: "app>db", tone: "error", caption: "" }], mark: [{ node: "db", state: "down" }] },
      ],
    },
    {
      id: "null",
      name: "Cache the null",
      steps: [
        { edge: "scraper>app", caption: "The same missing id is asked twice.", mark: [{ node: "db", state: null }, { node: "redis", state: null }] },
        { edge: "app>db", caption: "The first lookup reaches the database and finds nothing. The app stores not-found for 60 seconds." },
        { edge: "app>redis", reverse: true, tone: "ok", caption: "The repeat is answered by Redis. But a scraper that never repeats an id still gets through, and fills Redis with up to 600,000 empty keys a minute.", mark: [{ node: "redis", state: "hit" }] },
      ],
    },
    {
      id: "bloom",
      name: "Bloom says no",
      steps: [
        { edge: "scraper>app", caption: "A never-seen, non-existent id arrives.", mark: [{ node: "redis", state: null }] },
        { edge: "app>bloom", caption: "The app asks the filter in memory: is this id a real user?" },
        { edge: "app>bloom", reverse: true, tone: "ok", caption: "Definitely not. The app answers 404. Redis and the database never hear about it.", mark: [{ node: "bloom", state: "hit" }] },
      ],
    },
    {
      id: "false-positive",
      name: "A false positive",
      steps: [
        { edge: "scraper>app", caption: "About 1 in 150 fake ids (0.65% at 100K ids in 1M bits) happens to hit only set bits.", mark: [{ node: "bloom", state: null }] },
        { edge: "app>bloom", reverse: true, caption: "The filter says maybe, so the app falls back to the normal path.", mark: [{ node: "bloom", state: "miss" }] },
        { edge: "app>db", caption: "The database finds nothing. The filter is a gate, not the truth, so a few requests still pass." },
      ],
    },
  ],
};

/* ---------- When the cache dies ---------- */

export const coldStartFlow: FlowSpec = {
  id: "cold-start-flow",
  title: "Redis restarts empty",
  description:
    "At a 90% hit ratio the database sees a tenth of the reads. A restarted, empty cache removes that shield until it warms up.",
  nodes: [
    { id: "users", label: "Readers", kind: "client", col: 0, row: 1, sub: "10,000 / s" },
    { id: "app", label: "App", kind: "service", col: 1, row: 1 },
    { id: "redis", label: "Redis", kind: "cache", col: 2, row: 0 },
    { id: "db", label: "Database", kind: "database", col: 2, row: 2 },
  ],
  edges: [
    { from: "users", to: "app" },
    { from: "app", to: "redis", label: "get" },
    { from: "app", to: "db", label: "load" },
  ],
  scenarios: [
    {
      id: "steady",
      name: "Steady state",
      steps: [
        { edge: "users>app", caption: "10,000 reads a second arrive." },
        { edge: "app>redis", reverse: true, tone: "ok", caption: "90% are hits, answered in about 1 ms.", mark: [{ node: "redis", state: "hit" }] },
        { edge: "app>db", caption: "The database sees the other 10%: 1,000 reads a second." },
      ],
    },
    {
      id: "restart",
      name: "Restart, no warm-up",
      steps: [
        { edge: "users>app", caption: "Redis restarts and comes back empty. Traffic does not slow down.", mark: [{ node: "redis", state: "miss" }] },
        { edge: "app>redis", tone: "miss", caption: "Hit ratio is 0%: every read misses." },
        { edge: "app>db", tone: "error", caption: "The database now sees 10,000 reads a second, ten times its normal load, and slows down. Slower loads leave the cache empty even longer.", with: [{ edge: "app>db", tone: "error", caption: "" }, { edge: "app>db", tone: "error", caption: "" }], mark: [{ node: "db", state: "down" }] },
      ],
    },
    {
      id: "protected",
      name: "Warmed and capped",
      steps: [
        { edge: "users>app", caption: "Same restart, but the team warmed the 1,000 hottest keys first and the app caps concurrent loads.", mark: [{ node: "db", state: null }, { node: "redis", state: "hit" }] },
        { edge: "app>redis", reverse: true, tone: "ok", caption: "Most reads hit from the first second." },
        { edge: "app>db", caption: "Extra misses wait in a bounded queue or get a fallback, so the database stays inside its limit.", mark: [{ node: "db", state: "ok" }] },
      ],
    },
  ],
};
