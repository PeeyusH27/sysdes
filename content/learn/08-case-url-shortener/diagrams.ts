import type { FlowSpec, SequenceSpec, DecisionSpec, TimelineSpec } from "@/components/diagram/types";

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

/* ---------- Data model ---------- */

export const dbChoice: DecisionSpec = {
  id: "shortener-db-choice",
  title: "Postgres or a key-value store?",
  start: "queries",
  nodes: {
    queries: {
      q: "Do people list, search or report on their links (by user, by date)?",
      yes: "pg-users",
      no: "size",
    },
    "pg-users": {
      result: "Postgres with an index on user_id",
      why: "Listing a user's links is a range query, which a plain key-value table does badly. Start here and add replicas for reads.",
    },
    size: {
      q: "Will the table pass about 1 TB, or must several regions accept writes?",
      yes: "kv",
      no: "pg",
    },
    pg: {
      result: "Postgres: one primary, a few replicas",
      why: "40 writes a second and 4,000 lookups a second behind a cache is easy work for one primary. Do not shard what fits on one machine.",
    },
    kv: {
      result: "Key-value store sharded by hash of the code",
      why: "Every operation is get or put by code, with no joins. A store such as DynamoDB or Cassandra spreads 3 TB across nodes and replicates across regions.",
    },
  },
};

/* ---------- Generating codes ---------- */

export const hashCodes: FlowSpec = {
  id: "shortener-hash-codes",
  title: "Hash the long URL",
  description:
    "The app hashes the long URL, turns the digest into base62 and keeps the first 7 characters. The same URL always gives the same code, and two different URLs can collide.",
  nodes: [
    { id: "client", label: "Client", kind: "client", col: 0, row: 1 },
    { id: "app", label: "App server", kind: "service", col: 1, row: 1, sub: "md5, base62, cut" },
    { id: "db", label: "Postgres", kind: "database", col: 2, row: 1, sub: "code is the key" },
  ],
  edges: [
    { from: "client", to: "app", label: "create" },
    { from: "app", to: "db", label: "insert" },
  ],
  scenarios: [
    {
      id: "clean",
      name: "No collision",
      steps: [
        { edge: "client>app", caption: "POST a long URL. The app computes md5 of it, writes the digest in base62 and keeps the first 7 characters: k3Fz9aQ." },
        { edge: "app>db", caption: "INSERT code k3Fz9aQ with the long URL." },
        { edge: "app>db", reverse: true, tone: "ok", caption: "The row is new, so the insert succeeds." },
        { edge: "client>app", reverse: true, tone: "ok", caption: "201 Created: short.example/k3Fz9aQ." },
      ],
    },
    {
      id: "collision",
      name: "Collision",
      steps: [
        { edge: "client>app", caption: "A different URL hashes to the same first 7 characters: k3Fz9aQ." },
        { edge: "app>db", caption: "INSERT code k3Fz9aQ." },
        {
          edge: "app>db",
          reverse: true,
          tone: "error",
          caption: "Unique violation: that code already belongs to another URL. Cutting a digest to 7 characters makes this routine, not rare.",
          mark: [{ node: "db", state: "miss" }],
        },
        { edge: "app>db", caption: "The app appends a salt, hashes again and gets k3Fz9aR. Insert again.", mark: [{ node: "db", state: null }] },
        { edge: "app>db", reverse: true, tone: "ok", caption: "Inserted on the second try. The retry loop is part of the design, not an edge case." },
      ],
    },
    {
      id: "same-url",
      name: "Same URL twice",
      steps: [
        { edge: "client>app", caption: "A second user shortens a URL that was already shortened." },
        { edge: "app>db", caption: "Same URL, same hash, same code. The insert finds its own row." },
        { edge: "app>db", reverse: true, tone: "ok", caption: "The existing code is returned, so duplicates cost nothing. The price: both users now share one code and one click count." },
      ],
    },
  ],
};

export const randomCodes: SequenceSpec = {
  id: "shortener-random-codes",
  title: "Random code plus a uniqueness check",
  description:
    "The app draws 7 random base62 characters and inserts. If the key is free the insert succeeds. If it is taken, the primary key rejects it and the app draws again.",
  actors: [
    { id: "app", label: "App server", kind: "service" },
    { id: "db", label: "Postgres", kind: "database" },
  ],
  items: [
    { note: "With 6 billion links stored, 1 insert in about 587 draws a taken code", over: ["app", "db"] },
    { from: "app", to: "db", label: "INSERT code Qx7mP2k", type: "call" },
    {
      alt: [
        {
          when: "free (99.8%)",
          items: [{ from: "db", to: "app", label: "ok, 1 row", type: "reply" }],
        },
        {
          when: "taken (0.17%)",
          items: [
            { from: "db", to: "app", label: "unique violation", type: "reply" },
            { from: "app", to: "db", label: "INSERT code 4tLw0Nb", type: "call" },
            { from: "db", to: "app", label: "ok, 1 row", type: "reply" },
          ],
        },
      ],
    },
  ],
};

export const counterBlocks: FlowSpec = {
  id: "shortener-counter-blocks",
  title: "Counter handed out in blocks",
  description:
    "Each app server reserves a block of 1,000 ids with one INCRBY and mints codes from memory. The counter is called once per 1,000 links, a crash wastes only part of a block, and a lost counter is caught by the primary key.",
  nodes: [
    { id: "a", label: "App server A", kind: "service", col: 0, row: 0 },
    { id: "b", label: "App server B", kind: "service", col: 0, row: 2 },
    { id: "ids", label: "Counter", kind: "idgen", col: 1, row: 0, sub: "INCRBY 1,000" },
    { id: "db", label: "Postgres", kind: "database", col: 2, row: 1, sub: "code is the key" },
  ],
  edges: [
    { from: "a", to: "ids", label: "block" },
    { from: "b", to: "ids", label: "block" },
    { from: "a", to: "db", label: "insert" },
    { from: "b", to: "db", label: "insert" },
  ],
  scenarios: [
    {
      id: "blocks",
      name: "Two blocks",
      steps: [
        { edge: "a>ids", caption: "Server A has no ids yet, so it calls INCRBY url:id 1000.", mark: [{ node: "a", state: "busy" }] },
        { edge: "a>ids", reverse: true, tone: "ok", caption: "The counter answers 1,000: server A owns ids 0 to 999.", mark: [{ node: "a", state: null }, { node: "ids", state: "ok" }] },
        { edge: "b>ids", caption: "Server B asks a moment later.", mark: [{ node: "b", state: "busy" }] },
        { edge: "b>ids", reverse: true, tone: "ok", caption: "The counter answers 2,000: server B owns ids 1,000 to 1,999. Atomic INCRBY means the blocks can never overlap.", mark: [{ node: "b", state: null }] },
        { edge: "a>db", caption: "Each server now scrambles and encodes ids from its own memory. At 40 links a second the counter is called about once every 25 seconds in total.", with: [{ edge: "b>db", caption: "" }], mark: [{ node: "ids", state: null }] },
      ],
    },
    {
      id: "crash",
      name: "Server crash",
      steps: [
        { edge: "a>db", caption: "Server A has used ids 0 to 639 of its block." },
        {
          edge: "a>db",
          tone: "error",
          caption: "Server A crashes. The 360 unused ids in its block are gone for good.",
          mark: [{ node: "a", state: "down" }],
        },
        { edge: "a>ids", caption: "The replacement asks for a fresh block.", mark: [{ node: "a", state: "busy" }] },
        { edge: "a>ids", reverse: true, tone: "ok", caption: "It owns ids 2,000 to 2,999. Ids must be unique, not contiguous, and 360 of 3.5 trillion codes is nothing.", mark: [{ node: "a", state: null }] },
      ],
    },
    {
      id: "counter-lost",
      name: "Counter lost",
      steps: [
        { edge: "a>ids", caption: "The counter machine restarts and, with no persistence, forgets that it had reached 3,000.", mark: [{ node: "ids", state: "down" }] },
        { edge: "a>ids", reverse: true, caption: "It hands out block 0 to 999 a second time.", mark: [{ node: "a", state: "busy" }] },
        { edge: "a>db", caption: "Server A inserts the code for id 5, which was used an hour ago." },
        {
          edge: "a>db",
          reverse: true,
          tone: "error",
          caption: "Unique violation. No old link is overwritten, but inserts keep failing until the counter passes its old high-water mark.",
          mark: [{ node: "db", state: "miss" }],
        },
        {
          edge: "a>ids",
          caption: "Fix: keep the counter durable (a replica and AOF), and after any failover jump the counter ahead by 1 million. That costs 1 million of 3.5 trillion codes.",
          mark: [{ node: "ids", state: "ok" }, { node: "db", state: null }, { node: "a", state: null }],
        },
      ],
    },
  ],
};

export const codeChoice: DecisionSpec = {
  id: "shortener-code-choice",
  title: "Which code scheme?",
  start: "same",
  nodes: {
    same: {
      q: "Must one long URL always get the same code?",
      yes: "hash",
      no: "guess",
    },
    hash: {
      result: "Hash, cut to 7, retry on collision",
      why: "Deterministic codes dedupe for free. Accept the retry loop and that every user of a URL shares one click count.",
    },
    guess: {
      q: "Must codes be impossible to guess (private or unlisted links)?",
      yes: "random",
      no: "counter",
    },
    random: {
      result: "Random 7 characters plus a uniqueness check",
      why: "No pattern to walk. At 40 writes a second you retry about once every 15 seconds at full scale, which is cheap.",
    },
    counter: {
      result: "Counter in blocks, scrambled (the default)",
      why: "No collisions, no retry loop, one counter call per 1,000 links. Scrambling stops casual guessing.",
    },
  },
};

export const enumeration: FlowSpec = {
  id: "shortener-enumeration",
  title: "Walking the codes",
  description:
    "With plain base62 of a counter, neighbouring codes are neighbouring links, so an attacker can read every private link in order. A scrambled code has no visible neighbours.",
  nodes: [
    { id: "attacker", label: "Attacker", kind: "client", col: 0, row: 1 },
    { id: "app", label: "Redirect service", kind: "service", col: 1, row: 1 },
    { id: "db", label: "Postgres", kind: "database", col: 2, row: 1, sub: "6B links" },
  ],
  edges: [
    { from: "attacker", to: "app", label: "GET /:code" },
    { from: "app", to: "db", label: "lookup" },
  ],
  scenarios: [
    {
      id: "plain",
      name: "Plain base62",
      steps: [
        { edge: "attacker>app", caption: "The attacker creates a link and gets g8, which is id 1000. They try g9." },
        { edge: "app>db", caption: "A real link exists at id 1001." },
        { edge: "app>db", reverse: true, tone: "error", caption: "Found. Someone's private document just leaked.", mark: [{ node: "db", state: "miss" }] },
        { edge: "attacker>app", reverse: true, tone: "error", caption: "Then ga, gb, gc. A loop reads the whole table in order." },
      ],
    },
    {
      id: "scrambled",
      name: "Scrambled",
      steps: [
        { edge: "attacker>app", caption: "The attacker's link is oqxem9y. The next id would be 0Kg2oQt, which looks unrelated.", mark: [{ node: "db", state: null }] },
        { edge: "app>db", caption: "A blind guess at a 7-character code." },
        {
          edge: "app>db",
          reverse: true,
          tone: "miss",
          caption: "Almost always a miss: 6 billion links fill 0.17% of 3.5 trillion codes, so about 1 guess in 587 lands on a real link.",
        },
        {
          edge: "attacker>app",
          reverse: true,
          caption: "The weak spot: two consecutive codes reveal the step between them. This is obfuscation. If guessing must be impossible, use random codes.",
        },
      ],
    },
  ],
};

/* ---------- 301 vs 302 ---------- */

export const permanentRedirect: SequenceSpec = {
  id: "shortener-301",
  title: "A 301 is remembered",
  description:
    "After a 301 the browser answers by itself on later clicks. Your servers and your analytics never see them, and a changed destination never reaches that browser.",
  actors: [
    { id: "browser", label: "Browser", kind: "client" },
    { id: "app", label: "Redirect service", kind: "service" },
    { id: "dest", label: "Long URL site", kind: "external" },
  ],
  items: [
    {
      alt: [
        {
          when: "first click",
          items: [
            { from: "browser", to: "app", label: "GET /oqxem9y", type: "call" },
            { from: "app", to: "browser", label: "301, Location: long URL", type: "reply" },
            { from: "browser", to: "dest", label: "GET long URL", type: "call" },
          ],
        },
        {
          when: "repeat click",
          items: [
            { note: "The browser remembers the 301. No request leaves for your servers, and nothing is counted.", over: ["browser", "app"] },
            { from: "browser", to: "dest", label: "GET long URL", type: "call" },
          ],
        },
        {
          when: "after you fix it",
          items: [
            { note: "You changed the destination yesterday. This browser still holds the old 301 and never asks again.", over: ["browser", "app"] },
            { from: "browser", to: "dest", label: "GET the OLD URL", type: "call" },
          ],
        },
      ],
    },
  ],
};

export const temporaryRedirect: FlowSpec = {
  id: "shortener-302",
  title: "A 302 comes back every time",
  description:
    "A 302 is not remembered, so every click reaches the redirect service. That is what lets it count the click, change the destination, or disable the link.",
  nodes: [
    { id: "client", label: "Browser", kind: "client", col: 0, row: 1 },
    { id: "app", label: "Redirect service", kind: "service", col: 1, row: 1 },
    { id: "redis", label: "Redis", kind: "cache", col: 2, row: 0, sub: "code to URL" },
    { id: "queue", label: "Click queue", kind: "queue", col: 2, row: 2 },
  ],
  edges: [
    { from: "client", to: "app", label: "GET" },
    { from: "app", to: "redis", label: "lookup" },
    { from: "app", to: "queue", label: "click", style: "async" },
  ],
  scenarios: [
    {
      id: "count",
      name: "Every click counts",
      steps: [
        { edge: "client>app", caption: "Click one on short.example/oqxem9y." },
        { edge: "app>redis", caption: "The app finds the long URL in Redis." },
        { edge: "app>queue", caption: "It publishes a click event and answers 302 at the same moment." },
        { edge: "client>app", caption: "The same browser clicks again an hour later. A 302 is not remembered, so the request arrives." },
        { edge: "app>queue", tone: "ok", caption: "Click two is counted too. With a 301 the second one would have been invisible." },
      ],
    },
    {
      id: "disable",
      name: "Disable a link",
      steps: [
        { edge: "app>redis", caption: "An abuse report arrives. The link is flagged disabled and its cached copy is replaced.", mark: [{ node: "redis", state: "miss" }] },
        { edge: "client>app", caption: "The next click arrives. It has to, because a 302 was never cached by the browser." },
        { edge: "client>app", reverse: true, tone: "error", caption: "410 Gone with a warning page. Nothing can be done about a 301 already sitting in a user's browser.", mark: [{ node: "redis", state: null }] },
      ],
    },
  ],
};

export const redirectCdn: FlowSpec = {
  id: "shortener-302-cdn",
  title: "302 with a short max-age",
  description:
    "The 302 carries Cache-Control: max-age=60. Each CDN edge keeps it for a minute, so a hot link costs about one origin request per edge per minute, and the destination is fixed within a minute.",
  nodes: [
    { id: "client", label: "Browser", kind: "client", col: 0, row: 1 },
    { id: "cdn", label: "CDN edge", kind: "cdn", col: 1, row: 1, sub: "keeps it 60 s" },
    { id: "app", label: "Redirect service", kind: "service", col: 2, row: 1 },
  ],
  edges: [
    { from: "client", to: "cdn", label: "GET" },
    { from: "cdn", to: "app", label: "miss" },
  ],
  scenarios: [
    {
      id: "first",
      name: "First click",
      steps: [
        { edge: "client>cdn", caption: "The first click of the minute reaches the nearest edge." },
        { edge: "cdn>app", tone: "miss", caption: "Edge miss: forwarded to the redirect service.", mark: [{ node: "cdn", state: "miss" }] },
        { edge: "cdn>app", reverse: true, caption: "302 with Cache-Control: max-age=60. The edge stores it." },
        { edge: "client>cdn", reverse: true, tone: "ok", caption: "Redirect delivered.", mark: [{ node: "cdn", state: "hit" }] },
      ],
    },
    {
      id: "rest",
      name: "Next 59 seconds",
      steps: [
        { edge: "client>cdn", caption: "Thousands more clicks arrive at the same edge during the minute." },
        { edge: "client>cdn", reverse: true, tone: "ok", caption: "Each is answered at the edge. The origin never hears about them, so they are counted from CDN logs, not from the app.", mark: [{ node: "cdn", state: "hit" }] },
      ],
    },
    {
      id: "viral",
      name: "Viral link",
      steps: [
        {
          edge: "client>cdn",
          caption: "A celebrity posts the link and 50,000 clicks a second arrive across the world.",
          with: [{ edge: "client>cdn", caption: "" }, { edge: "client>cdn", caption: "" }],
        },
        {
          edge: "cdn>app",
          caption: "Say there are 200 edge locations. Each asks the origin about once a minute, so the origin sees about 3 requests a second instead of 50,000.",
          mark: [{ node: "cdn", state: "hit" }],
        },
      ],
    },
  ],
};

/* ---------- Scaling the reads ---------- */

export const redisAside: FlowSpec = {
  id: "shortener-redis",
  title: "Redis in front of Postgres",
  description:
    "The redirect service checks Redis first and reads Postgres only on a miss. A cold Redis sends the full 4,000 reads a second to the database until it refills.",
  nodes: [
    { id: "app", label: "Redirect service", kind: "service", col: 0, row: 1 },
    { id: "redis", label: "Redis", kind: "cache", col: 1, row: 0, sub: "~1 ms" },
    { id: "db", label: "Postgres", kind: "database", col: 2, row: 1, sub: "key lookup" },
  ],
  edges: [
    { from: "app", to: "redis", label: "u:code" },
    { from: "app", to: "db", label: "miss" },
  ],
  scenarios: [
    {
      id: "hit",
      name: "Hit",
      steps: [
        { edge: "app>redis", caption: "Look up u:oqxem9y." },
        { edge: "app>redis", reverse: true, tone: "ok", caption: "Hit in about 1 ms. At a 95% hit ratio, 19 of every 20 redirects end here.", mark: [{ node: "redis", state: "hit" }] },
      ],
    },
    {
      id: "miss",
      name: "Miss",
      steps: [
        { edge: "app>redis", caption: "Look up a link nobody clicked for days." },
        { edge: "app>redis", reverse: true, tone: "miss", caption: "Miss.", mark: [{ node: "redis", state: "miss" }] },
        { edge: "app>db", caption: "One primary-key lookup in Postgres." },
        { edge: "app>db", reverse: true, caption: "Row found." },
        { edge: "app>redis", caption: "SET u:oqxem9y with a TTL of one day, capped at the link's expiry.", mark: [{ node: "redis", state: "hit" }] },
      ],
    },
    {
      id: "cold",
      name: "Redis restarts empty",
      steps: [
        { edge: "app>redis", tone: "error", caption: "Redis restarts at 9:00 and comes back with an empty cache.", mark: [{ node: "redis", state: "down" }] },
        {
          edge: "app>redis",
          reverse: true,
          tone: "miss",
          caption: "All 4,000 lookups a second miss.",
          with: [{ edge: "app>redis", reverse: true, tone: "miss", caption: "" }, { edge: "app>redis", reverse: true, tone: "miss", caption: "" }],
        },
        {
          edge: "app>db",
          tone: "error",
          caption: "Postgres suddenly takes 4,000 reads a second instead of 200: 20 times more.",
          with: [{ edge: "app>db", tone: "error", caption: "" }, { edge: "app>db", tone: "error", caption: "" }],
          mark: [{ node: "db", state: "busy" }],
        },
        {
          edge: "app>redis",
          caption: "Fix: one request per code rebuilds it (single flight), the hot set is reloaded from last day's clicks, and a Redis replica makes failover warm.",
          mark: [{ node: "redis", state: "hit" }, { node: "db", state: null }],
        },
      ],
    },
  ],
};

export const viralLink: FlowSpec = {
  id: "shortener-viral",
  title: "One link, 50,000 reads a second",
  description:
    "A viral link is a single hot key. Every read lands on the one Redis node that owns it. A tiny local copy in each app server turns thousands of reads into a handful.",
  nodes: [
    { id: "client", label: "Clients", kind: "client", col: 0, row: 1 },
    { id: "app", label: "App server", kind: "service", col: 1, row: 1, sub: "local copy 5 s" },
    { id: "redis", label: "Redis node", kind: "cache", col: 2, row: 1, sub: "owns the key" },
  ],
  edges: [
    { from: "client", to: "app", label: "GET" },
    { from: "app", to: "redis", label: "lookup" },
  ],
  scenarios: [
    {
      id: "problem",
      name: "The problem",
      steps: [
        {
          edge: "client>app",
          caption: "A celebrity posts the link: 50,000 redirects a second for one code.",
          with: [{ edge: "client>app", caption: "" }, { edge: "client>app", caption: "" }],
        },
        {
          edge: "app>redis",
          tone: "error",
          caption: "Every read goes to the same key on the same node. One Redis node serves on the order of 100K simple operations a second, so this one is nearly full while the rest of the cluster is idle.",
          with: [{ edge: "app>redis", tone: "error", caption: "" }, { edge: "app>redis", tone: "error", caption: "" }],
          mark: [{ node: "redis", state: "busy" }],
        },
      ],
    },
    {
      id: "fix",
      name: "The fix",
      steps: [
        { edge: "client>app", caption: "The same burst arrives. Each app server keeps the hot code in its own memory for 5 seconds.", mark: [{ node: "redis", state: null }] },
        { edge: "client>app", reverse: true, tone: "ok", caption: "Served from local memory in microseconds.", mark: [{ node: "app", state: "hit" }] },
        { edge: "app>redis", caption: "Each server refreshes once every 5 seconds. With 10 servers that is 2 Redis reads a second instead of 50,000." },
      ],
    },
  ],
};

export const replicas: FlowSpec = {
  id: "shortener-replicas",
  title: "Read replicas",
  description:
    "Writes go to the primary and reads go to replicas. Replication takes a moment, so a brand new link can briefly be missing from a replica.",
  nodes: [
    { id: "app", label: "App server", kind: "service", col: 0, row: 1 },
    { id: "primary", label: "Primary", kind: "database", col: 2, row: 0, sub: "writes" },
    { id: "replica", label: "Replica", kind: "database", col: 2, row: 2, sub: "reads" },
  ],
  edges: [
    { from: "app", to: "primary", label: "write" },
    { from: "app", to: "replica", label: "read" },
    { from: "primary", to: "replica", label: "copy", style: "replication" },
  ],
  scenarios: [
    {
      id: "read",
      name: "Reads on replicas",
      steps: [
        { edge: "app>replica", caption: "A cache miss reads the code from a replica, so the primary only takes the 40 writes a second." },
        { edge: "app>replica", reverse: true, tone: "ok", caption: "Row returned." },
      ],
    },
    {
      id: "lag",
      name: "Lag after create",
      steps: [
        { edge: "app>primary", caption: "A user creates a link. The row is committed on the primary." },
        { edge: "app>replica", caption: "Two milliseconds later the user pastes it into chat and a bot clicks. The read goes to a replica." },
        { edge: "app>replica", reverse: true, tone: "miss", caption: "Not copied yet: the replica answers 404 for a link that exists.", mark: [{ node: "replica", state: "miss" }] },
        { edge: "primary>replica", caption: "The copy arrives a moment later.", mark: [{ node: "replica", state: null }] },
        { edge: "app>primary", caption: "Fix: write the new code into Redis when you create it, and on a replica miss ask the primary once before returning 404." },
      ],
    },
  ],
};

/* ---------- Click analytics ---------- */

export const clickCounter: FlowSpec = {
  id: "shortener-click-counter",
  title: "Counting in the urls row",
  description:
    "Every redirect updates a click counter on the link's own row. Updates to one row run one at a time, so a popular link makes the redirect wait on a lock.",
  nodes: [
    { id: "client", label: "Browser", kind: "client", col: 0, row: 1 },
    { id: "app", label: "Redirect service", kind: "service", col: 1, row: 1 },
    { id: "db", label: "Postgres", kind: "database", col: 2, row: 1, sub: "urls.clicks" },
  ],
  edges: [
    { from: "client", to: "app", label: "GET" },
    { from: "app", to: "db", label: "UPDATE" },
  ],
  scenarios: [
    {
      id: "lock",
      name: "A hot row",
      steps: [
        { edge: "client>app", caption: "A link is clicked 500 times a second.", with: [{ edge: "client>app", caption: "" }, { edge: "client>app", caption: "" }] },
        {
          edge: "app>db",
          tone: "error",
          caption: "Each redirect runs UPDATE urls SET clicks = clicks + 1 on the same row. They queue behind its lock, and every update also writes a new row version for the vacuum to clean up.",
          with: [{ edge: "app>db", tone: "error", caption: "" }, { edge: "app>db", tone: "error", caption: "" }],
          mark: [{ node: "db", state: "busy" }],
        },
        { edge: "client>app", reverse: true, tone: "error", caption: "The redirect now waits on a counter. A read-only table has become write-hot, and the slowest part of the path is the one nobody needs to wait for." },
      ],
    },
  ],
};

export const clickPipeline: FlowSpec = {
  id: "shortener-click-pipeline",
  title: "Queue, worker, analytics store",
  description:
    "The redirect service publishes a click event without waiting for it. A worker saves events in batches to a columnar store, and the stats page reads daily rollups.",
  nodes: [
    { id: "app", label: "Redirect service", kind: "service", col: 0, row: 1 },
    { id: "queue", label: "Click queue", kind: "queue", col: 1, row: 1, sub: "Kafka or SQS" },
    { id: "worker", label: "Worker", kind: "worker", col: 2, row: 1, sub: "5,000 per batch" },
    { id: "olap", label: "Analytics DB", kind: "database", col: 3, row: 1, sub: "ClickHouse" },
  ],
  edges: [
    { from: "app", to: "queue", label: "event", style: "async" },
    { from: "queue", to: "worker", style: "async" },
    { from: "worker", to: "olap", label: "bulk" },
  ],
  scenarios: [
    {
      id: "flow",
      name: "Happy path",
      steps: [
        { edge: "app>queue", caption: "Each redirect publishes about 200 bytes: code, time, referrer, country. It does not wait for the answer." },
        { edge: "queue>worker", caption: "At 4,000 clicks a second a batch of 5,000 fills in about 1.25 seconds.", mark: [{ node: "worker", state: "busy" }] },
        { edge: "worker>olap", tone: "ok", caption: "One bulk insert instead of 5,000 single ones. Rollups per day feed the stats API.", mark: [{ node: "worker", state: null }, { node: "olap", state: "ok" }] },
      ],
    },
    {
      id: "store-down",
      name: "Store down",
      steps: [
        { edge: "worker>olap", tone: "error", caption: "The analytics store goes down for an hour.", mark: [{ node: "olap", state: "down" }] },
        { edge: "queue>worker", caption: "Events pile up in the queue: 4,000 a second for an hour is 14.4 million events, about 2.9 GB at 200 bytes. The queue holds them.", mark: [{ node: "queue", state: "busy" }] },
        { edge: "worker>olap", tone: "ok", caption: "The store returns and the worker catches up. No click is lost and no redirect was slower.", mark: [{ node: "olap", state: "ok" }, { node: "queue", state: null }] },
      ],
    },
    {
      id: "queue-down",
      name: "Queue down",
      steps: [
        { edge: "app>queue", tone: "error", caption: "The queue is unreachable. The publish fails and the error is swallowed.", mark: [{ node: "queue", state: "down" }] },
        { edge: "app>queue", caption: "The redirect is still sent. A few counts are lost, and that is the price of never blocking a redirect." },
      ],
    },
  ],
};

export const logAnalytics: FlowSpec = {
  id: "shortener-log-analytics",
  title: "Counting from logs",
  description:
    "Edge and server logs are shipped to cheap storage and a scheduled job turns them into daily rollups. There is no per-click code path at all, at the cost of hours of delay.",
  nodes: [
    { id: "edge", label: "CDN and app logs", kind: "cdn", col: 0, row: 1 },
    { id: "store", label: "Log files", kind: "storage", col: 1, row: 1, sub: "object storage" },
    { id: "job", label: "Hourly job", kind: "worker", col: 2, row: 1 },
    { id: "olap", label: "Rollups", kind: "database", col: 3, row: 1, sub: "per day" },
  ],
  edges: [
    { from: "edge", to: "store", label: "ship" },
    { from: "store", to: "job", label: "read" },
    { from: "job", to: "olap", label: "write" },
  ],
  scenarios: [
    {
      id: "logs",
      name: "Logs to rollups",
      steps: [
        { edge: "edge>store", caption: "Every request, including the ones the CDN answered by itself, is written to a log file." },
        { edge: "store>job", caption: "Once an hour a job reads the new files and drops bots and link-preview fetchers.", mark: [{ node: "job", state: "busy" }] },
        { edge: "job>olap", tone: "ok", caption: "It adds the counts to per-day rollups. Stats are an hour or two behind, and that is fine for a dashboard.", mark: [{ node: "job", state: null }, { node: "olap", state: "ok" }] },
      ],
    },
  ],
};

/* ---------- Expiry ---------- */

export const expiry: FlowSpec = {
  id: "shortener-expiry",
  title: "How a link expires",
  description:
    "A read checks expires_at and the cache never outlives the link. A nightly job deletes old rows in small batches, and codes are never reused.",
  nodes: [
    { id: "client", label: "Browser", kind: "client", col: 0, row: 1 },
    { id: "app", label: "Redirect service", kind: "service", col: 1, row: 1 },
    { id: "redis", label: "Redis", kind: "cache", col: 2, row: 0, sub: "TTL capped" },
    { id: "db", label: "Postgres", kind: "database", col: 2, row: 1, sub: "expires_at" },
    { id: "sweeper", label: "Nightly sweeper", kind: "worker", col: 3, row: 1 },
  ],
  edges: [
    { from: "client", to: "app", label: "GET" },
    { from: "app", to: "redis", label: "lookup" },
    { from: "app", to: "db", label: "miss" },
    { from: "sweeper", to: "db", label: "delete" },
  ],
  scenarios: [
    {
      id: "read",
      name: "Check on read",
      steps: [
        { edge: "client>app", caption: "A click on a link whose expires_at was yesterday." },
        { edge: "app>redis", caption: "Redis was filled with a TTL capped at the expiry, so the key is already gone." },
        { edge: "app>redis", reverse: true, tone: "miss", caption: "Miss.", mark: [{ node: "redis", state: "miss" }] },
        { edge: "app>db", caption: "The row exists but expires_at is in the past." },
        { edge: "app>db", reverse: true, caption: "Not served, and not cached again.", mark: [{ node: "redis", state: null }] },
        { edge: "client>app", reverse: true, tone: "error", caption: "410 Gone. The link is dead even if it was hot a minute ago." },
      ],
    },
    {
      id: "sweep",
      name: "Nightly sweep",
      steps: [
        { edge: "sweeper>db", caption: "At 3:00 the sweeper deletes expired rows 1,000 at a time using the partial index on expires_at.", mark: [{ node: "sweeper", state: "busy" }] },
        { edge: "sweeper>db", tone: "ok", caption: "A short pause between batches keeps locks short and the live traffic unaffected.", mark: [{ node: "sweeper", state: null }] },
        { edge: "client>app", tone: "miss", caption: "Later the code answers 404 instead of 410. The code is never given to anyone else, because it lives on in emails and printed QR codes." },
      ],
    },
  ],
};

/* ---------- Abuse ---------- */

export const abuseScan: FlowSpec = {
  id: "shortener-abuse-scan",
  title: "Scan destinations after creation",
  description:
    "Creation returns at once and a scanner checks the destination against a reputation service. A bad link is disabled, and good links are rescanned later because pages change.",
  nodes: [
    { id: "app", label: "Create API", kind: "service", col: 0, row: 1 },
    { id: "queue", label: "Scan queue", kind: "queue", col: 1, row: 1 },
    { id: "scanner", label: "Scanner", kind: "worker", col: 2, row: 1 },
    { id: "rep", label: "Reputation API", kind: "external", col: 3, row: 0, sub: "malware, phishing" },
    { id: "db", label: "Postgres", kind: "database", col: 3, row: 2, sub: "status column" },
  ],
  edges: [
    { from: "app", to: "queue", label: "new link", style: "async" },
    { from: "queue", to: "scanner", style: "async" },
    { from: "scanner", to: "rep", label: "check" },
    { from: "scanner", to: "db", label: "disable" },
  ],
  scenarios: [
    {
      id: "clean",
      name: "Clean link",
      steps: [
        { edge: "app>queue", caption: "The link is created and answered at once. A scan job is queued; the user does not wait." },
        { edge: "queue>scanner", caption: "A scanner picks it up." },
        { edge: "scanner>rep", caption: "It asks a reputation service about the destination domain and URL." },
        { edge: "scanner>rep", reverse: true, tone: "ok", caption: "Clean. The link stays live and is queued for a rescan in a week.", mark: [{ node: "rep", state: "ok" }] },
      ],
    },
    {
      id: "bad",
      name: "Phishing found",
      steps: [
        { edge: "app>queue", caption: "Someone shortens a login page that imitates a bank." },
        { edge: "queue>scanner", caption: "The scanner picks it up within seconds." },
        { edge: "scanner>rep", caption: "It checks the destination." },
        { edge: "scanner>rep", reverse: true, tone: "error", caption: "Flagged as phishing.", mark: [{ node: "rep", state: "down" }] },
        { edge: "scanner>db", tone: "error", caption: "The link is marked disabled. Its cached copies are purged so the next click shows a warning page.", mark: [{ node: "db", state: "miss" }] },
      ],
    },
  ],
};

export const disableLink: FlowSpec = {
  id: "shortener-disable",
  title: "Disable, then purge",
  description:
    "Disabling flags the row, deletes the Redis key and purges the CDN. The row stays as evidence and the code is never reused.",
  nodes: [
    { id: "report", label: "Abuse report", kind: "client", col: 0, row: 1 },
    { id: "app", label: "Admin API", kind: "service", col: 1, row: 1 },
    { id: "cdn", label: "CDN", kind: "cdn", col: 2, row: 0, sub: "purge by URL" },
    { id: "redis", label: "Redis", kind: "cache", col: 2, row: 1, sub: "delete key" },
    { id: "db", label: "Postgres", kind: "database", col: 2, row: 2, sub: "status = disabled" },
  ],
  edges: [
    { from: "report", to: "app", label: "report" },
    { from: "app", to: "db", label: "flag" },
    { from: "app", to: "redis", label: "delete" },
    { from: "app", to: "cdn", label: "purge" },
  ],
  scenarios: [
    {
      id: "disable",
      name: "Disable a link",
      steps: [
        { edge: "report>app", caption: "A user reports a malicious short link." },
        { edge: "app>db", caption: "First the source of truth: the row gets status disabled. It is not deleted.", mark: [{ node: "db", state: "ok" }] },
        { edge: "app>redis", caption: "Then the Redis key is deleted, or the next click would still be served.", with: [{ edge: "app>cdn", caption: "" }], mark: [{ node: "redis", state: "miss" }] },
        { edge: "report>app", reverse: true, tone: "ok", caption: "Within seconds every layer answers 410 with a warning page. Because the redirect was a 302, no browser holds a copy." },
      ],
    },
  ],
};

export const aliasRace: SequenceSpec = {
  id: "shortener-alias-race",
  title: "Two users claim the same alias",
  description:
    "Both checked that the alias was free, and both inserted. The primary key lets exactly one win and turns the other into a 409.",
  actors: [
    { id: "alice", label: "Alice", kind: "client" },
    { id: "bob", label: "Bob", kind: "client" },
    { id: "db", label: "Postgres", kind: "database" },
  ],
  items: [
    { note: "Both ask for the alias sale in the same millisecond", over: ["alice", "bob"] },
    { from: "alice", to: "db", label: "INSERT code sale", type: "call" },
    { from: "bob", to: "db", label: "INSERT code sale", type: "call" },
    { from: "db", to: "alice", label: "1 row: 201 Created", type: "reply" },
    { from: "db", to: "bob", label: "unique violation: 409", type: "reply" },
    { note: "A SELECT before the INSERT cannot referee this. The key can.", over: ["alice", "db"] },
  ],
};

/* ---------- Interview ---------- */

export const interviewPlan: TimelineSpec = {
  id: "shortener-interview-plan",
  title: "The URL shortener in 45 minutes",
  description:
    "5 minutes of scope, 5 of numbers and API, 10 to draw the create and redirect paths, 20 for three deep dives (codes, redirects and caching, analytics and abuse), and 5 to wrap up.",
  unit: "min",
  lanes: [
    { id: "scope", label: "Scope" },
    { id: "numbers", label: "Numbers + API" },
    { id: "design", label: "Basic design" },
    { id: "deep", label: "Deep dives" },
    { id: "wrap", label: "Wrap-up" },
  ],
  spans: [
    { lane: "scope", start: 0, end: 5, label: "Create, redirect", tone: 1 },
    { lane: "numbers", start: 5, end: 10, label: "40 and 4,000 per s", tone: 2 },
    { lane: "design", start: 10, end: 20, label: "Two paths", tone: 1 },
    { lane: "deep", start: 20, end: 27, label: "Codes", tone: 2 },
    { lane: "deep", start: 27, end: 34, label: "302 + caching", tone: 3 },
    { lane: "deep", start: 34, end: 40, label: "Clicks, abuse", tone: 2 },
    { lane: "wrap", start: 40, end: 45, label: "Trade-offs", tone: 1 },
  ],
  markers: [
    { at: 5, label: "Scope" },
    { at: 10, label: "Numbers" },
    { at: 20, label: "Design" },
    { at: 40, label: "Wrap" },
  ],
};
