import type { DecisionSpec, FlowSpec, SequenceSpec, TimelineSpec } from "@/components/diagram/types";

export const requestFlows: SequenceSpec = {
  id: "request-flows",
  title: "Five request flows through the same system",
  description:
    "Pick a flow: a read through the CDN and cache, a write with a transactional outbox, an async job, a failing dependency, and a retried payment.",
  actors: [
    { id: "browser", label: "Browser", kind: "client" },
    { id: "cdn", label: "CDN", kind: "cdn" },
    { id: "api", label: "API", kind: "service" },
    { id: "redis", label: "Redis", kind: "cache" },
    { id: "db", label: "Database", kind: "database" },
    { id: "queue", label: "Queue", kind: "queue" },
  ],
  items: [
    {
      alt: [
        {
          when: "Read",
          items: [
            { from: "browser", to: "cdn", label: "GET /products/42", type: "call" },
            {
              alt: [
                {
                  when: "CDN hit",
                  items: [
                    { from: "cdn", to: "browser", label: "200 from the edge (~20 ms)", type: "reply" },
                    { note: "The origin never sees this request", over: ["cdn", "api"] },
                  ],
                },
                {
                  when: "CDN miss",
                  items: [
                    { from: "cdn", to: "api", label: "forward to origin", type: "call" },
                    { from: "api", to: "redis", label: "GET product:42", type: "call" },
                    {
                      alt: [
                        {
                          when: "Redis hit",
                          items: [{ from: "redis", to: "api", label: "hit (~1 ms)", type: "reply" }],
                        },
                        {
                          when: "Redis miss",
                          items: [
                            { from: "redis", to: "api", label: "nil (miss)", type: "reply" },
                            { from: "api", to: "db", label: "SELECT … WHERE id = 42", type: "call" },
                            { from: "db", to: "api", label: "row (~20 ms)", type: "reply" },
                            { from: "api", to: "redis", label: "SET product:42 EX 300", type: "call" },
                          ],
                        },
                      ],
                    },
                    { from: "api", to: "cdn", label: "200 · max-age=60", type: "reply" },
                    { from: "cdn", to: "browser", label: "200 (edge keeps a copy)", type: "reply" },
                  ],
                },
              ],
            },
          ],
        },
        {
          when: "Write",
          items: [
            { from: "browser", to: "cdn", label: "POST /orders", type: "call" },
            { from: "cdn", to: "api", label: "pass through (no cache)", type: "call" },
            { from: "api", to: "api", label: "auth + validate", type: "call" },
            { from: "api", to: "db", label: "BEGIN · INSERT order + outbox row", type: "call" },
            { from: "db", to: "api", label: "COMMIT ok", type: "reply" },
            { from: "api", to: "cdn", label: "201 Created", type: "reply" },
            { from: "cdn", to: "browser", label: "201 + order id", type: "reply" },
            { from: "db", to: "queue", label: "relay: order.created", type: "async" },
            { from: "queue", to: "redis", label: "consumer: DEL cached keys", type: "async" },
            { note: "Email, search index and analytics consume it too", over: ["db", "queue"] },
          ],
        },
        {
          when: "Async",
          items: [
            { from: "browser", to: "api", label: "POST /reports", type: "call" },
            { from: "api", to: "queue", label: "add job #77", type: "async" },
            { from: "api", to: "browser", label: "202 · Location: /reports/77", type: "reply" },
            { note: "A worker picks up job #77 (about 40 s of work)", over: ["db", "queue"] },
            { from: "browser", to: "api", label: "GET /reports/77", type: "call" },
            { from: "api", to: "queue", label: "job state?", type: "call" },
            { from: "queue", to: "api", label: "active, 60%", type: "reply" },
            { from: "api", to: "browser", label: "200 · active, 60%", type: "reply" },
            { from: "queue", to: "db", label: "worker saves the result", type: "async" },
            { from: "browser", to: "api", label: "GET /reports/77 (poll again)", type: "call" },
            { from: "api", to: "browser", label: "200 · completed + result URL", type: "reply" },
            { note: "Or skip polling: push completion over SSE or a webhook", over: ["browser", "cdn", "api"] },
          ],
        },
        {
          when: "Failure",
          items: [
            { from: "browser", to: "api", label: "GET /home", type: "call" },
            { from: "api", to: "db", label: "recommendations query (300 ms timeout)", type: "call" },
            { note: "stuck behind a lock", over: ["db"] },
            { from: "api", to: "api", label: "timeout after 300 ms", type: "call" },
            { from: "api", to: "redis", label: "fallback: popular items", type: "call" },
            { from: "redis", to: "api", label: "cached list", type: "reply" },
            { from: "api", to: "browser", label: "200 (degraded, still fast)", type: "reply" },
            { note: "5 failures in 10 s: the breaker opens", over: ["api", "redis"] },
            { from: "browser", to: "api", label: "GET /home", type: "call" },
            { from: "api", to: "redis", label: "breaker open: skip the DB", type: "call" },
            { from: "redis", to: "api", label: "cached list", type: "reply" },
            { from: "api", to: "browser", label: "200 in ~5 ms (fail fast)", type: "reply" },
            { note: "After 30 s: half-open, one trial query decides", over: ["api", "redis", "db"] },
          ],
        },
        {
          when: "Idempotent retry",
          items: [
            { from: "browser", to: "api", label: "POST /payments · Idempotency-Key: k1", type: "call" },
            { from: "api", to: "redis", label: "SET idem:k1 pending NX", type: "call" },
            { from: "redis", to: "api", label: "OK: claimed", type: "reply" },
            { from: "api", to: "db", label: "charge + save the payment", type: "call" },
            { from: "db", to: "api", label: "paid", type: "reply" },
            { from: "api", to: "redis", label: "SET idem:k1 = result", type: "call" },
            { from: "api", to: "browser", label: "200 paid", type: "reply" },
            { note: "The response is lost: the client times out", over: ["browser", "cdn"] },
            { from: "browser", to: "api", label: "retry POST · same key k1", type: "call" },
            { from: "api", to: "redis", label: "SET idem:k1 NX", type: "call" },
            { from: "redis", to: "api", label: "exists: stored result", type: "reply" },
            { from: "api", to: "browser", label: "200 paid (replayed, no 2nd charge)", type: "reply" },
          ],
        },
      ],
    },
  ],
};

/* ---------- Which flow is this request? ---------- */
export const chooseFlow: DecisionSpec = {
  id: "choose-flow",
  title: "Which flow does this request take?",
  start: "changes",
  nodes: {
    changes: { q: "Does the request change data?", yes: "slow", no: "shared" },
    shared: { q: "Is the answer the same for many users and fine to be a minute old?", yes: "read", no: "ownread" },
    read: {
      result: "Cached read",
      why: "CDN, then Redis, then the database. At 80% CDN and 90% Redis hits only 2% of reads reach the database.",
    },
    ownread: {
      result: "Direct read",
      why: "Per-user or must-be-fresh data skips the CDN. Read Redis or the primary database, and keep a timeout on both.",
    },
    slow: { q: "Does the work take longer than a second or two?", yes: "async", no: "money" },
    async: {
      result: "Async job",
      why: "Enqueue, answer 202 with a status URL, and let a worker finish. A 40 s report must not hold a connection.",
    },
    money: { q: "Would a double run cost money or send a second email?", yes: "idem", no: "write" },
    idem: {
      result: "Write with an idempotency key",
      why: "The client sends one key per operation and reuses it on every retry, so a lost reply never means a second charge.",
    },
    write: {
      result: "Plain write with outbox",
      why: "Commit the row and an outbox event in one transaction, answer 201, and let consumers update caches and search.",
    },
  },
};

/* ---------- Latency budgets ---------- */
export const serialVsParallel: TimelineSpec = {
  id: "serial-vs-parallel",
  title: "Three downstream calls: one after another, or together",
  description: "Serial calls add up to 20 + 30 + 45 = 95 ms. The same calls in parallel finish with the slowest one, at 45 ms.",
  unit: "ms",
  lanes: [
    { id: "serial", label: "Serial" },
    { id: "p1", label: "Parallel: profile" },
    { id: "p2", label: "Parallel: prices" },
    { id: "p3", label: "Parallel: stock" },
  ],
  spans: [
    { lane: "serial", start: 0, end: 20, label: "Profile", tone: 1 },
    { lane: "serial", start: 20, end: 50, label: "Prices", tone: 2 },
    { lane: "serial", start: 50, end: 95, label: "Stock", tone: 3 },
    { lane: "p1", start: 0, end: 20, label: "Profile 20", tone: 1 },
    { lane: "p2", start: 0, end: 30, label: "Prices 30", tone: 2 },
    { lane: "p3", start: 0, end: 45, label: "Stock 45", tone: 3 },
  ],
  markers: [
    { at: 45, label: "Parallel done" },
    { at: 95, label: "Serial done" },
  ],
};

export const deadlineFlow: FlowSpec = {
  id: "deadline-flow",
  title: "A deadline travels with the request",
  description: "Each hop subtracts what it spent and passes the rest on, so a hop that is already too late refuses to start.",
  nodes: [
    { id: "client", label: "Client", kind: "client", col: 0, row: 1, sub: "sets 200 ms" },
    { id: "gateway", label: "Gateway", kind: "gateway", col: 1, row: 1, sub: "passes 190 ms" },
    { id: "orders", label: "Orders", kind: "service", col: 2, row: 1, sub: "passes 120 ms" },
    { id: "payments", label: "Payments", kind: "service", col: 3, row: 1, sub: "45 ms cap" },
  ],
  edges: [
    { from: "client", to: "gateway" },
    { from: "gateway", to: "orders" },
    { from: "orders", to: "payments" },
  ],
  scenarios: [
    {
      id: "shrinks",
      name: "Deadline shrinks",
      steps: [
        { edge: "client>gateway", caption: "The client gives the request 200 ms in total and the gateway writes that deadline into a header." },
        { edge: "gateway>orders", caption: "The gateway spent 10 ms on TLS and a JWT check, so it passes on 190 ms." },
        { edge: "orders>payments", caption: "Orders spent 70 ms (20 of logic, 50 in the database), so payments gets 120 ms and uses its own 45 ms cap.", mark: [{ node: "payments", state: "ok" }] },
        { edge: "orders>payments", reverse: true, tone: "ok", caption: "Payments answers in 40 ms. The total lands near 150 ms, inside the 200 ms budget." },
      ],
    },
    {
      id: "late",
      name: "Already too late",
      steps: [
        { edge: "client>gateway", caption: "The database was slow and orders burned 185 ms of a 200 ms budget." },
        { edge: "orders>payments", tone: "error", caption: "Only 5 ms remain. Calling payments would waste a charge attempt the client has stopped waiting for.", mark: [{ node: "orders", state: "busy" }] },
        { edge: "orders>payments", reverse: true, tone: "error", caption: "Payments sees the expired deadline and answers 504 at once, spending no work.", mark: [{ node: "payments", state: "down" }] },
        { edge: "gateway>orders", reverse: true, caption: "The client gets a fast error it can retry, not a request that works on after it left.", mark: [{ node: "payments", state: null }, { node: "orders", state: null }] },
      ],
    },
  ],
};

/* ---------- Read path ---------- */
export const readPath: FlowSpec = {
  id: "read-path",
  title: "The read path, layer by layer",
  description: "A read stops at the first layer that has the answer: CDN, then Redis, then the database.",
  nodes: [
    { id: "user", label: "Browser", kind: "client", col: 0, row: 1 },
    { id: "cdn", label: "CDN edge", kind: "cdn", col: 1, row: 1, sub: "~20 ms" },
    { id: "api", label: "API", kind: "service", col: 2, row: 1, sub: "+30 ms to reach" },
    { id: "redis", label: "Redis", kind: "cache", col: 3, row: 0, sub: "~1 ms" },
    { id: "db", label: "Postgres", kind: "database", col: 3, row: 2, sub: "~20 ms" },
  ],
  edges: [
    { from: "user", to: "cdn", label: "GET" },
    { from: "cdn", to: "api", label: "miss" },
    { from: "api", to: "redis", label: "check" },
    { from: "api", to: "db", label: "miss" },
  ],
  scenarios: [
    {
      id: "cdn-hit",
      name: "CDN hit",
      steps: [
        { edge: "user>cdn", caption: "GET /products/42 reaches the nearest edge." },
        { edge: "user>cdn", reverse: true, tone: "ok", caption: "Edge hit: 200 in about 20 ms. The origin never hears of it.", mark: [{ node: "cdn", state: "hit" }] },
      ],
    },
    {
      id: "redis-hit",
      name: "Redis hit",
      steps: [
        { edge: "user>cdn", caption: "The edge has no copy of this product.", mark: [{ node: "cdn", state: "miss" }] },
        { edge: "cdn>api", tone: "miss", caption: "The request travels to the origin, about 30 ms more." },
        { edge: "api>redis", caption: "The API asks Redis for product:42." },
        { edge: "api>redis", reverse: true, tone: "ok", caption: "Hit in about 1 ms.", mark: [{ node: "redis", state: "hit" }] },
        { edge: "user>cdn", reverse: true, caption: "The edge keeps a copy for 60 s and answers. Total: 20 + 30 + 1 = about 51 ms." },
      ],
    },
    {
      id: "full-miss",
      name: "Full miss",
      steps: [
        { edge: "user>cdn", caption: "A cold edge again.", mark: [{ node: "cdn", state: "miss" }] },
        { edge: "cdn>api", tone: "miss", caption: "On to the origin." },
        { edge: "api>redis", tone: "miss", caption: "Redis returns nil.", mark: [{ node: "redis", state: "miss" }] },
        { edge: "api>db", tone: "miss", caption: "The database does the real work, about 20 ms." },
        { edge: "api>db", reverse: true, caption: "The row returns and the API fills Redis with a jittered TTL.", mark: [{ node: "redis", state: "hit" }] },
        { edge: "user>cdn", reverse: true, caption: "Answer at about 20 + 30 + 1 + 20 + 1 = 72 ms. The next reader gets a hit." },
      ],
    },
  ],
};

/* ---------- Write path ---------- */
export const writePath: FlowSpec = {
  id: "write-path",
  title: "The write path and its outbox",
  description: "The order and its event commit together; a relay publishes the event afterwards.",
  nodes: [
    { id: "client", label: "Client", kind: "client", col: 0, row: 1 },
    { id: "api", label: "Orders API", kind: "service", col: 1, row: 1 },
    { id: "db", label: "Postgres", kind: "database", col: 2, row: 1, sub: "orders + outbox" },
    { id: "queue", label: "Event queue", kind: "queue", col: 3, row: 0 },
    { id: "consumer", label: "Email, search", kind: "worker", col: 4, row: 0, sub: "dedupe by id" },
  ],
  edges: [
    { from: "client", to: "api", label: "POST" },
    { from: "api", to: "db", label: "save" },
    { from: "api", to: "queue", label: "publish", style: "async" },
    { from: "db", to: "queue", label: "relay", style: "async" },
    { from: "queue", to: "consumer", style: "async" },
  ],
  scenarios: [
    {
      id: "outbox",
      name: "Outbox commit",
      steps: [
        { edge: "client>api", caption: "POST /orders arrives and passes validation." },
        { edge: "api>db", caption: "One transaction inserts the order and an outbox row. Both commit, or neither does." },
        { edge: "api>db", reverse: true, tone: "ok", caption: "Commit ok.", mark: [{ node: "db", state: "ok" }] },
        { edge: "client>api", reverse: true, tone: "ok", caption: "201 Created goes back in about 30 ms. The client is done." },
        { edge: "db>queue", caption: "The relay reads unsent outbox rows and publishes order.created, usually within a few hundred ms." },
        { edge: "queue>consumer", caption: "Email and search consume it. Slow consumers never slow the request." },
      ],
    },
    {
      id: "dual-write",
      name: "Save, then publish",
      steps: [
        { edge: "client>api", caption: "The naive design: write the row, then publish from the app." },
        { edge: "api>db", caption: "The order commits." },
        { edge: "api>db", reverse: true, tone: "ok", caption: "Commit ok. The order exists.", mark: [{ node: "db", state: "ok" }] },
        { edge: "api>queue", tone: "error", caption: "The app crashes before it publishes. The event exists nowhere.", mark: [{ node: "api", state: "down" }] },
        { edge: "queue>consumer", tone: "error", caption: "No confirmation email, no search entry, ever. Nobody knows it was lost.", mark: [{ node: "consumer", state: "miss" }] },
      ],
    },
    {
      id: "relay-crash",
      name: "Relay crash",
      steps: [
        { edge: "db>queue", caption: "The relay publishes event 812 from the outbox." },
        { edge: "db>queue", tone: "error", caption: "It crashes before marking the row sent. Nothing is lost.", mark: [{ node: "db", state: "busy" }] },
        { edge: "db>queue", caption: "After a restart the relay finds event 812 unsent and publishes it again.", mark: [{ node: "db", state: null }] },
        { edge: "queue>consumer", tone: "ok", caption: "The consumer sees id 812 twice, keeps a record of ids it has handled, and acts once.", mark: [{ node: "consumer", state: "ok" }] },
      ],
    },
  ],
};

/* ---------- Async path ---------- */
export const asyncPath: FlowSpec = {
  id: "async-path",
  title: "The async path: job, worker, status",
  description: "The API enqueues and answers 202; a worker does the slow part and stores a result the client can fetch.",
  nodes: [
    { id: "client", label: "Client", kind: "client", col: 0, row: 1 },
    { id: "api", label: "API", kind: "service", col: 1, row: 1 },
    { id: "queue", label: "Job queue", kind: "queue", col: 2, row: 1 },
    { id: "worker", label: "Worker", kind: "worker", col: 3, row: 1, sub: "~40 s of work" },
    { id: "store", label: "Result store", kind: "storage", col: 4, row: 1 },
    { id: "dlq", label: "Dead letters", kind: "queue", col: 3, row: 2, sub: "for a human" },
  ],
  edges: [
    { from: "client", to: "api", label: "POST" },
    { from: "api", to: "queue", label: "add", style: "async" },
    { from: "queue", to: "worker", label: "pull" },
    { from: "worker", to: "store", label: "save" },
    { from: "queue", to: "dlq", label: "3 fails", style: "async" },
  ],
  scenarios: [
    {
      id: "poll",
      name: "Submit and poll",
      steps: [
        { edge: "client>api", caption: "POST /reports starts a 40 s job." },
        { edge: "api>queue", caption: "The API adds job 77 to the queue." },
        { edge: "client>api", reverse: true, tone: "ok", caption: "202 Accepted with Location: /reports/77 comes back in a few ms." },
        { edge: "queue>worker", caption: "A worker pulls job 77 and starts the heavy part.", mark: [{ node: "worker", state: "busy" }] },
        { edge: "worker>store", caption: "The finished report is saved.", mark: [{ node: "worker", state: null }, { node: "store", state: "ok" }] },
        { edge: "client>api", reverse: true, tone: "ok", caption: "The next poll of /reports/77 returns completed with a result URL." },
      ],
    },
    {
      id: "retry",
      name: "Retry with backoff",
      steps: [
        { edge: "queue>worker", caption: "Attempt 1 of 3 starts." },
        { edge: "queue>worker", tone: "error", caption: "The worker hits a transient 503 and fails.", mark: [{ node: "worker", state: "down" }] },
        { edge: "queue>worker", caption: "Exponential backoff: attempt 2 waits 5 s, attempt 3 would wait 10 s. Retrying instantly would hammer a sick dependency.", ms: 1500, mark: [{ node: "worker", state: null }] },
        { edge: "worker>store", tone: "ok", caption: "Attempt 2 succeeds. Total delay added: 5 s.", mark: [{ node: "store", state: "ok" }] },
      ],
    },
    {
      id: "poison",
      name: "Poison job",
      steps: [
        { edge: "queue>worker", caption: "Job 91 carries a malformed file. Attempt 1 fails.", tone: "error", mark: [{ node: "worker", state: "down" }] },
        { edge: "queue>worker", caption: "Attempts 2 and 3 fail the same way after 5 s and 10 s. More retries cannot fix bad input.", tone: "error" },
        { edge: "queue>dlq", tone: "error", caption: "After 3 attempts the job parks in the dead letter queue, where an alert and a human can see it.", mark: [{ node: "dlq", state: "busy" }, { node: "worker", state: null }] },
      ],
    },
  ],
};

export const asyncResult: DecisionSpec = {
  id: "async-result",
  title: "How does the client learn the job is done?",
  start: "browser",
  nodes: {
    browser: { q: "Is the caller a browser tab that stays open?", yes: "progress", no: "server" },
    progress: { q: "Does the user need live progress, not only the end?", yes: "sse", no: "poll" },
    server: { q: "Is the caller another server that can host a callback URL?", yes: "webhook", no: "poll2" },
    sse: {
      result: "SSE or WebSocket",
      why: "One open connection per waiting user, so 1,000 users hold 1,000 connections and send no polls. Fall back to polling if it drops.",
    },
    webhook: {
      result: "Webhook",
      why: "The worker posts the result to the caller's URL. Sign it, retry it with backoff, and let the receiver dedupe by event id.",
    },
    poll: {
      result: "Poll the status URL",
      why: "The default and simplest. 1,000 users polling every 2 s send 500 req/s; with Retry-After set to 5 s it falls to 200 req/s.",
    },
    poll2: {
      result: "Poll the status URL",
      why: "The default and simplest. 1,000 users polling every 2 s send 500 req/s; with Retry-After set to 5 s it falls to 200 req/s.",
    },
  },
};

/* ---------- Failure path ---------- */
export const failurePath: FlowSpec = {
  id: "failure-path",
  title: "A slow dependency, with and without protection",
  description: "Without a timeout, one slow service ties up every thread. With a timeout, a fallback and a breaker, checkout stays fast.",
  nodes: [
    { id: "user", label: "Shoppers", kind: "client", col: 0, row: 1, sub: "100 req/s" },
    { id: "api", label: "Checkout API", kind: "service", col: 1, row: 1, sub: "200 threads" },
    { id: "recs", label: "Recommendations", kind: "service", col: 2, row: 0, sub: "slow: 5 s" },
    { id: "cache", label: "Popular items", kind: "cache", col: 2, row: 2, sub: "~1 ms" },
  ],
  edges: [
    { from: "user", to: "api" },
    { from: "api", to: "recs", label: "call" },
    { from: "api", to: "cache", label: "fallback" },
  ],
  scenarios: [
    {
      id: "no-timeout",
      name: "No timeout",
      steps: [
        { edge: "user>api", caption: "A flash sale sends 100 checkouts a second.", with: [{ edge: "user>api", caption: "" }] },
        { edge: "api>recs", tone: "error", caption: "Recommendations slows to 5 s. Every checkout waits for it, so 100 req/s x 5 s means 500 requests in flight.", mark: [{ node: "recs", state: "busy" }] },
        { edge: "api>recs", tone: "error", caption: "The 200 threads are all taken after 200 / 100 = 2 s. Checkout stops answering, though it never needed recommendations.", mark: [{ node: "api", state: "down" }] },
      ],
    },
    {
      id: "timeout",
      name: "Timeout + fallback",
      steps: [
        { edge: "user>api", caption: "Same traffic, now with a 45 ms timeout on the recommendations call." },
        { edge: "api>recs", tone: "error", caption: "After 45 ms the call is abandoned. In flight: 100 x 0.045 = about 4.5 requests, not 500.", mark: [{ node: "recs", state: "busy" }] },
        { edge: "api>cache", caption: "The API reads a cached list of popular items instead." },
        { edge: "api>cache", reverse: true, tone: "ok", caption: "Checkout answers 200 without personal picks. Slightly worse, never broken.", mark: [{ node: "cache", state: "hit" }] },
      ],
    },
    {
      id: "breaker",
      name: "Breaker open",
      steps: [
        { edge: "api>recs", tone: "error", caption: "Five timeouts in 10 s trip the breaker. Recommendations is declared down.", mark: [{ node: "recs", state: "down" }] },
        { edge: "api>cache", caption: "For the next 30 s the API does not even try. It goes straight to the fallback, about 1 ms." },
        { edge: "api>cache", reverse: true, tone: "ok", caption: "Fast answers, and a struggling service gets room to recover.", mark: [{ node: "cache", state: "hit" }] },
        { edge: "api>recs", caption: "Half-open: one trial call decides. Success closes the breaker; failure waits another 30 s.", mark: [{ node: "recs", state: null }] },
      ],
    },
  ],
};

/* ---------- Retries ---------- */
export const retryAmplify: FlowSpec = {
  id: "retry-amplify",
  title: "Retries multiply across layers",
  description: "Three layers that each try 3 times send 27 attempts at a database that is already failing.",
  nodes: [
    { id: "client", label: "Client", kind: "client", col: 0, row: 1, sub: "3 tries" },
    { id: "gateway", label: "Gateway", kind: "gateway", col: 1, row: 1, sub: "3 tries" },
    { id: "service", label: "Service", kind: "service", col: 2, row: 1, sub: "3 tries" },
    { id: "db", label: "Database", kind: "database", col: 3, row: 1, sub: "failing" },
  ],
  edges: [
    { from: "client", to: "gateway", label: "x3" },
    { from: "gateway", to: "service", label: "x9" },
    { from: "service", to: "db", label: "x27" },
  ],
  scenarios: [
    {
      id: "every-layer",
      name: "Every layer retries",
      steps: [
        { edge: "client>gateway", caption: "One user action starts at the client, which will try up to 3 times.", mark: [{ node: "db", state: "busy" }] },
        {
          edge: "gateway>service",
          tone: "error",
          caption: "The database is failing. Each client try makes the gateway call the service 3 times: 3 x 3 = 9.",
          with: [{ edge: "gateway>service", tone: "error", caption: "" }, { edge: "gateway>service", tone: "error", caption: "" }],
        },
        {
          edge: "service>db",
          tone: "error",
          caption: "Each service call tries the database 3 times: 9 x 3 = 27 calls for one user action.",
          with: [{ edge: "service>db", tone: "error", caption: "" }, { edge: "service>db", tone: "error", caption: "" }],
          mark: [{ node: "db", state: "down" }],
        },
        { edge: "service>db", tone: "error", caption: "Normal load is 1,000 database calls a second. During the outage it is 27,000, so the database cannot recover.", mark: [{ node: "db", state: "down" }] },
      ],
    },
    {
      id: "one-layer",
      name: "One layer, with a budget",
      steps: [
        { edge: "client>gateway", caption: "Only the service retries, and only once.", mark: [{ node: "db", state: null }] },
        { edge: "gateway>service", caption: "The gateway and client pass the failure up without retrying." },
        { edge: "service>db", tone: "error", caption: "A retry budget allows retries up to 10% of calls: 1,000 req/s gives at most 100 extra calls a second, not 26,000." },
        { edge: "service>db", reverse: true, tone: "ok", caption: "The database sees 1,100 calls a second at worst and can recover.", mark: [{ node: "db", state: "ok" }] },
      ],
    },
  ],
};

/* ---------- Idempotent retries ---------- */
export const idempotency: FlowSpec = {
  id: "idempotency",
  title: "An idempotency key through a lost reply",
  description: "The API claims the key once, charges once, and replays the stored result to every retry.",
  nodes: [
    { id: "client", label: "Phone app", kind: "client", col: 0, row: 1, sub: "key k1" },
    { id: "api", label: "Payments API", kind: "service", col: 1, row: 1 },
    { id: "store", label: "Redis", kind: "cache", col: 2, row: 0, sub: "idem:k1" },
    { id: "provider", label: "Card provider", kind: "external", col: 2, row: 2 },
  ],
  edges: [
    { from: "client", to: "api", label: "POST" },
    { from: "api", to: "store", label: "claim" },
    { from: "api", to: "provider", label: "charge" },
  ],
  scenarios: [
    {
      id: "lost-reply",
      name: "Lost reply",
      steps: [
        { edge: "client>api", caption: "The user taps Pay. The app sends POST /payments with Idempotency-Key k1." },
        { edge: "api>store", caption: "SET idem:k1 pending NX succeeds, so this request owns the key." },
        { edge: "api>provider", caption: "The card is charged once." },
        { edge: "api>store", caption: "The result is saved under k1 for 24 h.", mark: [{ node: "store", state: "hit" }] },
        { edge: "client>api", reverse: true, tone: "error", caption: "The 200 is lost on weak signal. The app times out after 3 s and cannot tell if the charge happened.", mark: [{ node: "client", state: "miss" }] },
      ],
    },
    {
      id: "retry",
      name: "Retry replays",
      steps: [
        { edge: "client>api", caption: "The user taps again. The app resends the same key k1, never a new one.", mark: [{ node: "client", state: null }] },
        { edge: "api>store", tone: "miss", caption: "SET NX fails: the key exists, and the value is a stored result." },
        { edge: "client>api", reverse: true, tone: "ok", caption: "The stored 200 is replayed. The provider is not called, so no second charge." },
      ],
    },
    {
      id: "in-flight",
      name: "Duplicate in flight",
      steps: [
        { edge: "client>api", caption: "A double tap sends two requests with key k1 within the same few ms.", with: [{ edge: "client>api", caption: "" }] },
        { edge: "api>store", caption: "SET NX is atomic: exactly one request wins the claim.", mark: [{ node: "store", state: "busy" }] },
        { edge: "api>provider", caption: "Only the winner charges the card." },
        { edge: "client>api", reverse: true, tone: "error", caption: "The loser sees pending and gets 409 Conflict. It retries a moment later and receives the stored result.", mark: [{ node: "store", state: "hit" }] },
      ],
    },
  ],
};

/* ---------- Partial failure ---------- */
export const partialFailure: SequenceSpec = {
  id: "partial-failure",
  title: "When some steps succeed and a later one does not",
  description: "Charging then saving can leave a paid card and no order. Record the intent first, and ask the provider when the outcome is unknown.",
  actors: [
    { id: "app", label: "App", kind: "client" },
    { id: "api", label: "Orders API", kind: "service" },
    { id: "pay", label: "Card provider", kind: "external" },
    { id: "db", label: "Postgres", kind: "database" },
  ],
  items: [
    {
      alt: [
        {
          when: "Charge, then save",
          items: [
            { from: "app", to: "api", label: "POST /orders", type: "call" },
            { from: "api", to: "pay", label: "charge 49.00", type: "call" },
            { from: "pay", to: "api", label: "paid", type: "reply" },
            { from: "api", to: "db", label: "INSERT order", type: "call" },
            { note: "The database times out: the card is charged, no order exists", over: ["api", "db"] },
            { from: "api", to: "app", label: "500 error", type: "reply" },
          ],
        },
        {
          when: "Intent first",
          items: [
            { from: "api", to: "db", label: "INSERT order, status pending", type: "call" },
            { from: "api", to: "pay", label: "charge, key = order id", type: "call" },
            { from: "pay", to: "api", label: "paid", type: "reply" },
            { from: "api", to: "db", label: "UPDATE order paid", type: "call" },
            { note: "If the API dies after the charge, a sweeper finds pending orders older than 5 min", over: ["api", "db"] },
            { from: "api", to: "pay", label: "sweeper: status of key?", type: "call" },
            { from: "pay", to: "api", label: "paid: mark the order paid", type: "reply" },
          ],
        },
        {
          when: "Unknown outcome",
          items: [
            { from: "api", to: "pay", label: "charge, key = order id", type: "call" },
            { note: "No reply within 45 ms: charged or not? Do not guess", over: ["api", "pay"] },
            { from: "api", to: "pay", label: "retry, same key", type: "call" },
            { from: "pay", to: "api", label: "the original result", type: "reply" },
            { from: "api", to: "app", label: "200, one charge", type: "reply" },
          ],
        },
      ],
    },
  ],
};

/* ---------- Trace propagation ---------- */
export const traceFlow: FlowSpec = {
  id: "trace-flow",
  title: "One trace id across services and a queue",
  description: "The traceparent header is copied on every call and into queue messages, so one trace id ties all the logs together.",
  nodes: [
    { id: "gateway", label: "Gateway", kind: "gateway", col: 0, row: 1, sub: "makes the id" },
    { id: "orders", label: "Orders", kind: "service", col: 1, row: 1 },
    { id: "payments", label: "Payments", kind: "service", col: 2, row: 0 },
    { id: "queue", label: "Event queue", kind: "queue", col: 2, row: 2 },
    { id: "mailer", label: "Email worker", kind: "worker", col: 3, row: 2 },
  ],
  edges: [
    { from: "gateway", to: "orders", label: "id" },
    { from: "orders", to: "payments", label: "id" },
    { from: "orders", to: "queue", label: "copy", style: "async" },
    { from: "queue", to: "mailer", style: "async" },
  ],
  scenarios: [
    {
      id: "sync",
      name: "Across calls",
      steps: [
        { edge: "gateway>orders", caption: "The gateway creates trace 4bf9 and sends traceparent: 00-4bf9...-01 with the call." },
        { edge: "orders>payments", caption: "Orders opens its own span, keeps trace id 4bf9, and sends its span id as the new parent." },
        { edge: "orders>payments", reverse: true, tone: "ok", caption: "Every log line in both services carries 4bf9. One search shows the whole request." },
      ],
    },
    {
      id: "queue",
      name: "Across a queue",
      steps: [
        { edge: "orders>queue", caption: "Orders puts the traceparent into the message headers, not only the HTTP call." },
        { edge: "queue>mailer", caption: "The email worker, minutes later, reads the header and continues trace 4bf9 as a linked span.", mark: [{ node: "mailer", state: "ok" }] },
        { edge: "queue>mailer", caption: "Without the copy, the email appears as a new trace and the order that caused it cannot be found.", tone: "miss" },
      ],
    },
  ],
};
