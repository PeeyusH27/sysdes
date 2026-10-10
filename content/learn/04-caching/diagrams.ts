import type { FlowSpec } from "@/components/diagram/types";

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
          caption: "A hot key just expired and a burst of requests arrives at once.",
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
