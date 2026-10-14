import type { FlowSpec } from "@/components/diagram/types";

export const urlShortener: FlowSpec = {
  id: "url-shortener",
  title: "URL shortener architecture",
  description:
    "Redirects are served by the CDN or Redis and fall back to Postgres. New codes come from range blocks handed out by the ID service, and clicks flow asynchronously through a queue into an analytics store.",
  nodes: [
    { id: "client", label: "Client", kind: "client", col: 0, row: 1 },
    { id: "cdn", label: "CDN", kind: "cdn", col: 1, row: 1, sub: "caches 301s", note: "Edge caches answer 301s (and short-max-age 302s) without touching your servers." },
    { id: "app", label: "App servers", kind: "service", col: 2, row: 1, sub: "stateless ×N", note: "Behind a load balancer. Validate, generate codes from a local id block, look up redirects." },
    { id: "ids", label: "ID service", kind: "idgen", col: 2, row: 0, sub: "INCRBY 1,000", note: "A Redis counter. Each call reserves a block of 1,000 ids for one app server." },
    { id: "redis", label: "Redis", kind: "cache", col: 3, row: 0, sub: "hot codes ~1 ms", note: "u:<code> → long URL, with a TTL capped at the link's expiry." },
    { id: "db", label: "Postgres", kind: "database", col: 3, row: 1, sub: "code → URL", note: "Source of truth. Primary key on code; shard by hash(code) at larger scale." },
    { id: "queue", label: "Click queue", kind: "queue", col: 2, row: 2, sub: "fire-and-forget" },
    { id: "worker", label: "Analytics worker", kind: "worker", col: 3, row: 2, sub: "batches" },
    { id: "olap", label: "Analytics DB", kind: "database", col: 4, row: 2, sub: "ClickHouse", note: "Columnar store; the stats API reads per-day rollups from here." },
  ],
  edges: [
    { from: "client", to: "cdn", label: "GET /:code" },
    { from: "cdn", to: "app", label: "miss" },
    { from: "app", to: "ids", label: "new block" },
    { from: "app", to: "redis", label: "lookup" },
    { from: "app", to: "db", label: "on miss" },
    { from: "app", to: "queue", label: "click event", style: "async" },
    { from: "queue", to: "worker", style: "async" },
    { from: "worker", to: "olap", label: "bulk insert" },
  ],
  scenarios: [
    {
      id: "create",
      name: "Create link",
      steps: [
        { edge: "client>cdn", caption: "POST /api/urls with a long URL. Writes are never cached, so the CDN forwards it." },
        { edge: "cdn>app", caption: "An app server checks the rate limit and validates the URL: only http and https are allowed." },
        {
          edge: "app>ids",
          caption: "This server has used up its block of ids, so it asks the ID service for the next one: INCRBY url:id 1000.",
          mark: [{ node: "app", state: "busy" }],
        },
        {
          edge: "app>ids",
          reverse: true,
          tone: "ok",
          caption: "Redis answers 42,000, so this server now owns ids 41,000 to 41,999. Its next 999 links need no call at all.",
          mark: [{ node: "ids", state: "ok" }, { node: "app", state: null }],
        },
        { edge: "app>db", caption: "Id 41,000 is scrambled and base62-encoded into 'oqxem9y', then INSERTed with the long URL. The primary key guarantees uniqueness." },
        { edge: "app>db", reverse: true, caption: "Row committed. A custom alias that already exists would fail here with a unique violation, returned as 409." },
        { edge: "cdn>app", reverse: true, caption: "201 Created with the code and the short URL." },
        { edge: "client>cdn", reverse: true, tone: "ok", caption: "The user gets https://short.example/oqxem9y.", mark: [{ node: "ids", state: null }] },
      ],
    },
    {
      id: "hit",
      name: "Redirect: cache hit",
      steps: [
        { edge: "client>cdn", caption: "Someone clicks short.example/oqxem9y. The request lands on the nearest CDN edge." },
        {
          edge: "cdn>app",
          caption: "We answer with 302s so we can count clicks, and 302s aren't cached at the edge. The CDN forwards to an app server.",
          mark: [{ node: "cdn", state: "miss" }],
        },
        { edge: "app>redis", caption: "The app looks up u:oqxem9y in Redis." },
        {
          edge: "app>redis",
          reverse: true,
          tone: "ok",
          caption: "Hit in about 1 ms. Hot codes almost always live here, so Postgres isn't touched.",
          mark: [{ node: "redis", state: "hit" }],
        },
        { edge: "cdn>app", reverse: true, caption: "302 Found, Location: the long URL. Server time is a few milliseconds." },
        {
          edge: "client>cdn",
          reverse: true,
          tone: "ok",
          caption: "The browser follows the redirect. With a 301, the CDN and the browser would have answered by themselves next time.",
          mark: [{ node: "cdn", state: null }, { node: "redis", state: null }],
        },
      ],
    },
    {
      id: "miss",
      name: "Redirect: cache miss",
      steps: [
        { edge: "client>cdn", caption: "A click on an old, rarely used link arrives at the CDN." },
        { edge: "cdn>app", caption: "Not cached at the edge: forwarded to an app server.", mark: [{ node: "cdn", state: "miss" }] },
        { edge: "app>redis", caption: "The app checks Redis for the code." },
        { edge: "app>redis", reverse: true, tone: "miss", caption: "Miss: the code isn't in the cache.", mark: [{ node: "redis", state: "miss" }] },
        { edge: "app>db", caption: "SELECT long_url, expires_at FROM urls WHERE code = $1 and the link hasn't expired. One primary-key lookup." },
        { edge: "app>db", reverse: true, caption: "Row found (an unknown or expired code would return 404 here)." },
        {
          edge: "app>redis",
          caption: "SET u:code with a TTL of one day, capped at the link's expiry, so the next click is a hit.",
          mark: [{ node: "redis", state: "hit" }],
        },
        {
          edge: "cdn>app",
          reverse: true,
          caption: "302 to the long URL. Only this first click paid the database round trip.",
          mark: [{ node: "cdn", state: null }],
        },
        { edge: "client>cdn", reverse: true, tone: "ok", caption: "Redirect delivered.", mark: [{ node: "redis", state: null }] },
      ],
    },
    {
      id: "analytics",
      name: "Click analytics",
      steps: [
        { edge: "client>cdn", caption: "A redirect request arrives and the app resolves the code as usual." },
        { edge: "cdn>app", caption: "The app has the long URL and is about to answer." },
        {
          edge: "app>queue",
          caption: "It publishes a click event (code, timestamp, referrer) without awaiting it, and at the same moment sends the 302.",
          with: [{ edge: "cdn>app", reverse: true, caption: "" }],
        },
        { edge: "client>cdn", reverse: true, tone: "ok", caption: "The user is already on their way. Analytics never add latency to the redirect." },
        { edge: "queue>worker", caption: "A worker consumes clicks in batches of a few thousand.", mark: [{ node: "worker", state: "busy" }] },
        {
          edge: "worker>olap",
          caption: "One bulk insert into a columnar store. The stats API reads clicks per day and top referrers from rollups.",
          mark: [{ node: "worker", state: null }, { node: "olap", state: "ok" }],
        },
        {
          edge: "queue>worker",
          tone: "error",
          caption: "If the analytics store goes down, events wait in the queue. Redirects keep working; the worker catches up later.",
          mark: [{ node: "olap", state: "down" }, { node: "queue", state: "busy" }],
          ms: 1800,
        },
      ],
    },
  ],
};
