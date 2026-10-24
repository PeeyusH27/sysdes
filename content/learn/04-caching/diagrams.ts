import type { FlowSpec, SequenceSpec } from "@/components/diagram/types";

export const cacheAside: FlowSpec = {
  id: "cache-aside",
  title: "Cache-aside flow",
  description: "The app checks Redis first, reads Postgres only on a miss, then fills the cache with a TTL.",
  nodes: [
    { id: "client", label: "Client", kind: "client", col: 0, row: 1 },
    { id: "app", label: "App", kind: "service", col: 1, row: 1 },
    { id: "cache", label: "Redis", kind: "cache", col: 2, row: 0, sub: "~1 ms" },
    { id: "db", label: "Postgres", kind: "database", col: 2, row: 2, sub: "~50 ms" },
  ],
  edges: [
    { from: "client", to: "app" },
    { from: "app", to: "cache", label: "1 check" },
    { from: "app", to: "db", label: "2 on miss" },
  ],
  scenarios: [
    {
      id: "hit",
      name: "Cache hit",
      steps: [
        { edge: "client>app", caption: "GET /products/42 reaches the app." },
        { edge: "app>cache", caption: "The app asks Redis for product:42." },
        { edge: "app>cache", reverse: true, tone: "ok", caption: "Hit. The value comes back in about 1 ms.", mark: [{ node: "cache", state: "hit" }] },
        { edge: "client>app", reverse: true, caption: "Response sent. The database was never touched." },
      ],
    },
    {
      id: "miss",
      name: "Cache miss",
      steps: [
        { edge: "client>app", caption: "GET /products/42 reaches the app." },
        { edge: "app>cache", caption: "The app asks Redis for product:42." },
        { edge: "app>cache", reverse: true, tone: "miss", caption: "Miss: Redis returns nil.", mark: [{ node: "cache", state: "miss" }] },
        { edge: "app>db", caption: "The app reads the row from Postgres (about 50 ms)." },
        { edge: "app>db", reverse: true, caption: "Row returned." },
        { edge: "app>cache", caption: "SET product:42 with a jittered TTL, so the next read is a hit.", mark: [{ node: "cache", state: null }] },
        { edge: "client>app", reverse: true, caption: "Response sent." },
      ],
    },
    {
      id: "stampede",
      name: "Stampede",
      steps: [
        {
          edge: "client>app",
          caption: "A hot key has expired, and a burst of requests arrives at once.",
          with: [{ edge: "client>app", caption: "" }, { edge: "client>app", caption: "" }],
          mark: [{ node: "app", state: "busy" }],
        },
        {
          edge: "app>cache",
          tone: "miss",
          caption: "Every request misses. Without protection, all of them would go to Postgres.",
          with: [{ edge: "app>cache", tone: "miss", caption: "" }, { edge: "app>cache", tone: "miss", caption: "" }],
          mark: [{ node: "cache", state: "miss" }],
        },
        { edge: "app>cache", caption: "One request wins SET lock NX. The others wait 50 ms and retry." },
        { edge: "app>db", caption: "Only the lock holder queries Postgres: one query instead of thousands." },
        { edge: "app>cache", caption: "It refills the key and releases the lock.", mark: [{ node: "cache", state: "hit" }, { node: "app", state: null }] },
        {
          edge: "app>cache",
          reverse: true,
          tone: "ok",
          caption: "The waiting requests retry and now hit the cache.",
          with: [{ edge: "app>cache", reverse: true, tone: "ok", caption: "" }],
        },
      ],
    },
    {
      id: "write-race",
      name: "Write race",
      steps: [
        { edge: "app>cache", tone: "miss", caption: "Reader A misses the cache.", mark: [{ node: "cache", state: "miss" }] },
        { edge: "app>db", caption: "Reader A loads the OLD row from Postgres… and then stalls (GC pause, slow network)." },
        { edge: "app>db", caption: "Meanwhile writer B updates the row in Postgres." },
        { edge: "app>cache", caption: "Writer B deletes the cache key, as it should.", mark: [{ node: "cache", state: null }] },
        {
          edge: "app>cache",
          tone: "error",
          caption: "Reader A wakes up and SETs the OLD value. The cache is now stale until the TTL expires.",
          mark: [{ node: "cache", state: "down" }],
        },
        { edge: "app>cache", caption: "Fixes: a short TTL as a safety net, a delayed second delete, or versioned keys.", mark: [{ node: "cache", state: null }] },
      ],
    },
  ],
};

export const cacheLayers: FlowSpec = {
  id: "cache-layers",
  title: "Where caches live",
  description: "Each layer absorbs part of the traffic so the database sees a small fraction of requests.",
  nodes: [
    { id: "browser", label: "Browser cache", kind: "client", col: 0, row: 0, sub: "0 ms" },
    { id: "cdn", label: "CDN edge", kind: "cdn", col: 1, row: 0, sub: "~10–30 ms" },
    { id: "proxy", label: "Reverse proxy", kind: "lb", col: 2, row: 0, sub: "~1 ms" },
    { id: "app", label: "In-process LRU", kind: "service", col: 3, row: 0, sub: "µs" },
    { id: "redis", label: "Redis", kind: "cache", col: 4, row: 0, sub: "~1 ms" },
    { id: "db", label: "DB buffer pool", kind: "database", col: 5, row: 0, sub: "ms" },
  ],
  edges: [
    { from: "browser", to: "cdn", label: "miss" },
    { from: "cdn", to: "proxy", label: "miss" },
    { from: "proxy", to: "app", label: "miss" },
    { from: "app", to: "redis", label: "miss" },
    { from: "redis", to: "db", label: "miss" },
  ],
  scenarios: [
    {
      id: "deep-miss",
      name: "A cold request",
      steps: [
        { edge: "browser>cdn", caption: "Nothing in the browser cache: the request goes to the nearest CDN edge.", ms: 900 },
        { edge: "cdn>proxy", caption: "CDN miss: forwarded to your reverse proxy.", ms: 900 },
        { edge: "proxy>app", caption: "Proxy miss: the app handles it.", ms: 900 },
        { edge: "app>redis", caption: "Not in the in-process LRU: ask Redis.", ms: 900 },
        { edge: "redis>db", caption: "Redis miss: the database finally does the work. Every layer stores the answer on the way back.", ms: 1400 },
      ],
    },
  ],
};

export const cdnEdge: FlowSpec = {
  id: "cdn-edge",
  title: "CDN edge cache",
  description: "The first visitor in a region pays the trip to the origin; everyone after is served from a nearby edge.",
  nodes: [
    { id: "user", label: "User (Mumbai)", kind: "client", col: 0, row: 1 },
    { id: "edge", label: "CDN edge", kind: "cdn", col: 1, row: 1, sub: "~20 ms" },
    { id: "origin", label: "Origin (Virginia)", kind: "service", col: 2, row: 1, sub: "~250 ms" },
  ],
  edges: [
    { from: "user", to: "edge", label: "GET" },
    { from: "edge", to: "origin", label: "miss" },
  ],
  scenarios: [
    {
      id: "first",
      name: "First visitor",
      steps: [
        { edge: "user>edge", caption: "A user in Mumbai asks for the logo. The nearest edge has never seen it." },
        { edge: "edge>origin", tone: "miss", caption: "Edge miss: the request crosses the world to the origin, about 250 ms.", mark: [{ node: "edge", state: "miss" }] },
        { edge: "edge>origin", reverse: true, caption: "The origin answers with Cache-Control: max-age=86400." },
        { edge: "user>edge", reverse: true, caption: "The edge stores a copy for a day and passes it on.", mark: [{ node: "edge", state: "hit" }] },
      ],
    },
    {
      id: "next",
      name: "Everyone after",
      steps: [
        { edge: "user>edge", caption: "The next user in Mumbai asks for the same logo." },
        { edge: "user>edge", reverse: true, tone: "ok", caption: "Edge hit: about 20 ms, and the origin never hears about it.", mark: [{ node: "edge", state: "hit" }] },
      ],
    },
  ],
};

export const twoLevel: FlowSpec = {
  id: "two-level",
  title: "In-process cache in front of Redis",
  description: "Each app server keeps a tiny local copy of the hottest keys, then falls back to Redis, then the database.",
  nodes: [
    { id: "client", label: "Client", kind: "client", col: 0, row: 1 },
    { id: "app", label: "App server", kind: "service", col: 1, row: 1, sub: "local LRU, µs" },
    { id: "redis", label: "Redis", kind: "cache", col: 2, row: 0, sub: "~1 ms" },
    { id: "db", label: "Postgres", kind: "database", col: 2, row: 2, sub: "~50 ms" },
  ],
  edges: [
    { from: "client", to: "app" },
    { from: "app", to: "redis", label: "L1 miss" },
    { from: "app", to: "db", label: "L2 miss" },
  ],
  scenarios: [
    {
      id: "l1-hit",
      name: "Local hit",
      steps: [
        { edge: "client>app", caption: "A request for the feature flags arrives." },
        { edge: "client>app", reverse: true, tone: "ok", caption: "Found in the server's own memory: microseconds, no network at all.", mark: [{ node: "app", state: "hit" }] },
      ],
    },
    {
      id: "l1-miss",
      name: "Local miss",
      steps: [
        { edge: "client>app", caption: "A request for a product arrives. The local copy is empty or expired.", mark: [{ node: "app", state: "miss" }] },
        { edge: "app>redis", caption: "The app asks the shared Redis next." },
        { edge: "app>redis", reverse: true, tone: "ok", caption: "Redis hit. The app keeps a copy locally for 5 seconds.", mark: [{ node: "app", state: "hit" }] },
        { edge: "client>app", reverse: true, caption: "Served. Ten app servers each hold their own copy, so they can briefly disagree." },
      ],
    },
  ],
};

export const browserRevalidate: SequenceSpec = {
  id: "browser-revalidate",
  title: "Browser cache with revalidation",
  description: "Within max-age the browser skips the network; after it, a conditional request costs a 304 with no body.",
  actors: [
    { id: "user", label: "User", kind: "client" },
    { id: "browser", label: "Browser cache", kind: "cache" },
    { id: "server", label: "Server", kind: "service" },
  ],
  items: [
    { from: "user", to: "browser", label: "GET /app.css" },
    {
      alt: [
        {
          when: "fresh",
          items: [
            { note: "Inside max-age: no network request at all", over: ["browser", "server"] },
            { from: "browser", to: "user", label: "cached copy (0 ms)", type: "reply" },
          ],
        },
        {
          when: "stale, unchanged",
          items: [
            { from: "browser", to: "server", label: "If-None-Match: \"v7\"" },
            { from: "server", to: "browser", label: "304 Not Modified (no body)", type: "reply" },
            { from: "browser", to: "user", label: "cached copy, freshened", type: "reply" },
          ],
        },
        {
          when: "stale, changed",
          items: [
            { from: "browser", to: "server", label: "If-None-Match: \"v7\"" },
            { from: "server", to: "browser", label: "200 OK, ETag \"v8\" + body", type: "reply" },
            { from: "browser", to: "user", label: "new copy", type: "reply" },
          ],
        },
      ],
    },
  ],
};

export const readThrough: FlowSpec = {
  id: "read-through",
  title: "Read-through",
  description: "The app only ever talks to the cache. On a miss, the cache itself loads from the database.",
  nodes: [
    { id: "app", label: "App", kind: "service", col: 0, row: 1 },
    { id: "cache", label: "Cache layer", kind: "cache", col: 1, row: 1, sub: "loads for you" },
    { id: "db", label: "Postgres", kind: "database", col: 2, row: 1, sub: "~50 ms" },
  ],
  edges: [
    { from: "app", to: "cache", label: "get(key)" },
    { from: "cache", to: "db", label: "miss" },
  ],
  scenarios: [
    {
      id: "miss",
      name: "Miss, then hit",
      steps: [
        { edge: "app>cache", caption: "The app asks the cache. It never calls the database itself." },
        { edge: "cache>db", tone: "miss", caption: "Miss: the cache fetches the row on the app's behalf.", mark: [{ node: "cache", state: "miss" }] },
        { edge: "cache>db", reverse: true, caption: "It stores the row, then returns it." },
        { edge: "app>cache", reverse: true, tone: "ok", caption: "The app got an answer. The next read of this key is a hit.", mark: [{ node: "cache", state: "hit" }] },
      ],
    },
  ],
};

export const writeThrough: FlowSpec = {
  id: "write-through",
  title: "Write-through",
  description: "Every write goes to the cache and the database before the app is told it succeeded.",
  nodes: [
    { id: "app", label: "App", kind: "service", col: 0, row: 1 },
    { id: "cache", label: "Cache", kind: "cache", col: 1, row: 1, sub: "always fresh" },
    { id: "db", label: "Postgres", kind: "database", col: 2, row: 1, sub: "~50 ms" },
  ],
  edges: [
    { from: "app", to: "cache", label: "write" },
    { from: "cache", to: "db", label: "write" },
  ],
  scenarios: [
    {
      id: "write",
      name: "One write",
      steps: [
        { edge: "app>cache", caption: "The app writes the new profile to the cache layer." },
        { edge: "cache>db", caption: "The cache writes the same data to the database before replying.", mark: [{ node: "cache", state: "hit" }] },
        { edge: "cache>db", reverse: true, caption: "The database confirms." },
        { edge: "app>cache", reverse: true, tone: "ok", caption: "The app is told it succeeded. Reads are always fresh, but this write paid for two stores." },
      ],
    },
  ],
};

export const writeBehind: FlowSpec = {
  id: "write-behind",
  title: "Write-behind",
  description: "The cache acknowledges at once and flushes to the database later, in batches.",
  nodes: [
    { id: "app", label: "App", kind: "service", col: 0, row: 1 },
    { id: "cache", label: "Cache", kind: "cache", col: 1, row: 1, sub: "holds dirty data" },
    { id: "db", label: "Postgres", kind: "database", col: 2, row: 1, sub: "catches up" },
  ],
  edges: [
    { from: "app", to: "cache", label: "write" },
    { from: "cache", to: "db", label: "flush", style: "async" },
  ],
  scenarios: [
    {
      id: "flush",
      name: "Fast, then flushed",
      steps: [
        { edge: "app>cache", caption: "A view-count update is written to the cache only.", mark: [{ node: "cache", state: "hit" }] },
        { edge: "app>cache", reverse: true, tone: "ok", caption: "Acknowledged in about 1 ms. The database has not heard of it yet." },
        { edge: "cache>db", caption: "Every few seconds the cache flushes a batch of changes to the database." },
        { edge: "cache>db", reverse: true, caption: "The database catches up." },
      ],
    },
    {
      id: "crash",
      name: "Crash before flush",
      steps: [
        { edge: "app>cache", caption: "A payment status is written to the cache only.", mark: [{ node: "cache", state: "hit" }] },
        { edge: "app>cache", reverse: true, tone: "ok", caption: "Acknowledged. The app believes the data is safe." },
        { edge: "cache>db", tone: "error", caption: "The cache node dies before the flush. The write exists nowhere else.", mark: [{ node: "cache", state: "down" }] },
      ],
    },
  ],
};

export const hotKey: FlowSpec = {
  id: "hot-key",
  title: "Hot key and its fixes",
  description: "One celebrity key can overload a single Redis node; local copies or key copies spread the load.",
  nodes: [
    { id: "users", label: "Millions of fans", kind: "client", col: 0, row: 1 },
    { id: "app", label: "App servers", kind: "service", col: 1, row: 1, sub: "×50" },
    { id: "shard", label: "Redis node", kind: "cache", col: 2, row: 1, sub: "owns the key" },
  ],
  edges: [
    { from: "users", to: "app" },
    { from: "app", to: "shard", label: "user:celeb" },
  ],
  scenarios: [
    {
      id: "problem",
      name: "The problem",
      steps: [
        {
          edge: "users>app",
          caption: "A celebrity posts. Everyone opens the same profile.",
          with: [{ edge: "users>app", caption: "" }, { edge: "users>app", caption: "" }],
        },
        {
          edge: "app>shard",
          tone: "error",
          caption: "All 200K reads per second land on the one Redis node that owns user:celeb.",
          with: [{ edge: "app>shard", tone: "error", caption: "" }, { edge: "app>shard", tone: "error", caption: "" }],
          mark: [{ node: "shard", state: "busy" }],
        },
        { edge: "app>shard", tone: "error", caption: "That node saturates its CPU or network, even though the rest of the cluster is idle.", mark: [{ node: "shard", state: "down" }] },
      ],
    },
    {
      id: "fix",
      name: "The fix",
      steps: [
        { edge: "users>app", caption: "Same traffic.", mark: [{ node: "shard", state: null }] },
        { edge: "users>app", reverse: true, tone: "ok", caption: "Fix 1: each app server keeps user:celeb in its own memory for 2 to 5 seconds, so most reads never leave the server.", mark: [{ node: "app", state: "hit" }] },
        { edge: "app>shard", caption: "Fix 2: store copies as user:celeb#1 to #N on different nodes, and read a random one. A shard now sees 1/N of the load." },
      ],
    },
  ],
};
