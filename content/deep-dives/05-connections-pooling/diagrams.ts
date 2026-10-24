import type { DecisionSpec, FlowSpec, SequenceSpec, TimelineSpec } from "@/components/diagram/types";

export const connectionPooling: FlowSpec = {
  id: "connection-pooling",
  title: "Connection pools from the app to PostgreSQL",
  description:
    "Each app instance keeps a pool of 10 open database connections and lends them to requests. PgBouncer, in front of PostgreSQL, multiplexes many client connections onto a few server connections.",
  nodes: [
    { id: "clients", label: "Clients", kind: "client", col: 0, row: 1 },
    { id: "lb", label: "Load balancer", kind: "lb", col: 1, row: 1 },
    { id: "appA", label: "App instance A", kind: "service", col: 2, row: 0, sub: "pool of 10" },
    { id: "appB", label: "App instance B", kind: "service", col: 2, row: 2, sub: "pool of 10" },
    { id: "pgb", label: "PgBouncer", kind: "gateway", col: 3, row: 1, sub: "transaction mode" },
    { id: "db", label: "PostgreSQL", kind: "database", col: 4, row: 1, sub: "max_connections 100" },
  ],
  edges: [
    { from: "clients", to: "lb" },
    { from: "lb", to: "appA" },
    { from: "lb", to: "appB" },
    { from: "appA", to: "pgb", label: "borrow" },
    { from: "appB", to: "pgb", label: "borrow" },
    { from: "pgb", to: "db", label: "server conns" },
  ],
  scenarios: [
    {
      id: "normal",
      name: "Borrow and return",
      steps: [
        { edge: "clients>lb", caption: "A request for /orders/42 arrives at the load balancer." },
        { edge: "lb>appA", caption: "Instance A gets it. Its pool holds 10 open connections; 3 are busy right now." },
        { edge: "appA>pgb", caption: "The handler borrows an idle connection. No TCP, TLS or authentication handshake: borrowing takes microseconds." },
        { edge: "pgb>db", caption: "The query runs on PostgreSQL in about 5 ms." },
        { edge: "pgb>db", reverse: true, tone: "ok", caption: "Rows come back.", mark: [{ node: "db", state: "ok" }] },
        {
          edge: "appA>pgb",
          reverse: true,
          tone: "ok",
          caption: "The connection goes back to the pool, still open. At 5 ms a query, 10 connections can serve up to 2,000 queries per second.",
          ms: 1700,
        },
        { edge: "lb>appA", reverse: true, caption: "The response leaves instance A." },
        { edge: "clients>lb", reverse: true, caption: "The user gets the order. The connection is already serving someone else.", mark: [{ node: "db", state: null }] },
      ],
    },
    {
      id: "exhausted",
      name: "Pool exhausted",
      steps: [
        {
          edge: "clients>lb",
          caption: "A burst of 50 requests arrives, and a missing index makes each query take 3 s instead of 5 ms.",
          with: [{ edge: "clients>lb", caption: "" }, { edge: "clients>lb", caption: "" }],
        },
        {
          edge: "lb>appA",
          caption: "Instance A receives them, but only 10 can hold a connection at a time.",
          with: [{ edge: "lb>appA", caption: "" }, { edge: "lb>appA", caption: "" }],
          mark: [{ node: "appA", state: "busy" }],
        },
        {
          edge: "appA>pgb",
          caption: "All 10 connections are now busy with slow queries. The other 40 requests wait in the pool's queue.",
          with: [{ edge: "appA>pgb", caption: "" }],
        },
        { edge: "pgb>db", caption: "PostgreSQL grinds through the slow queries, 3 s each.", mark: [{ node: "db", state: "busy" }], ms: 1500 },
        {
          edge: "lb>appA",
          reverse: true,
          tone: "error",
          caption: "After connectionTimeoutMillis (2 s) the queued requests fail: Error: timeout exceeded when trying to connect.",
          ms: 1800,
        },
        {
          edge: "clients>lb",
          reverse: true,
          tone: "error",
          caption: "Users see 503s. A bigger pool would only push more slow queries onto the database. Fix the query, set statement_timeout, and shed load early.",
          with: [{ edge: "clients>lb", reverse: true, tone: "error", caption: "" }],
          ms: 2000,
        },
      ],
    },
    {
      id: "pgbouncer",
      name: "PgBouncer multiplexing",
      steps: [
        {
          edge: "lb>appA",
          caption: "Scale out to 24 instances (A and B stand in for all of them), each with a pool of 10.",
          with: [{ edge: "lb>appB", caption: "" }],
        },
        {
          edge: "appA>pgb",
          caption: "That's 24 × 10 = 240 client connections. They all go to PgBouncer, where an idle client connection costs a few KB, not a Postgres process.",
          with: [{ edge: "appB>pgb", caption: "" }],
          ms: 1800,
        },
        {
          edge: "pgb>db",
          caption: "In transaction mode PgBouncer keeps only 40 server connections and lends one to a client for the length of a single transaction.",
          mark: [{ node: "pgb", state: "ok" }],
          ms: 1700,
        },
        { edge: "pgb>db", reverse: true, caption: "At COMMIT the server connection goes straight back to PgBouncer for the next client's transaction." },
        {
          edge: "pgb>db",
          caption: "Most client connections sit idle between transactions, so 240 → 40 works: PostgreSQL runs 40 backends instead of 240.",
          with: [{ edge: "pgb>db", caption: "" }, { edge: "pgb>db", caption: "" }],
          mark: [{ node: "db", state: "ok" }],
          ms: 1700,
        },
        {
          edge: "appA>pgb",
          reverse: true,
          caption: "The catch: session state (SET, advisory locks, LISTEN) doesn't survive between transactions, and prepared statements need max_prepared_statements (PgBouncer 1.21+).",
          ms: 2200,
        },
      ],
    },
  ],
};

export const appPool: FlowSpec = {
  id: "app-pool",
  title: "An app-side pool: reuse, grow, wait",
  description: "A handler borrows a connection from its instance's pool. The pool reuses an idle one, opens a new one up to its maximum, or makes the handler wait.",
  nodes: [
    { id: "handler", label: "Handler", kind: "service", col: 0, row: 1 },
    { id: "pool", label: "Pool", kind: "gateway", col: 1, row: 1, sub: "max 15" },
    { id: "db", label: "PostgreSQL", kind: "database", col: 2, row: 1 },
  ],
  edges: [
    { from: "handler", to: "pool", label: "get" },
    { from: "pool", to: "db", label: "run" },
  ],
  scenarios: [
    {
      id: "reuse",
      name: "Reuse an idle one",
      steps: [
        { edge: "handler>pool", caption: "A handler asks the pool for a connection. The pool has 9 open, 4 of them idle." },
        { edge: "pool>db", caption: "It lends an idle one in microseconds. No TCP, TLS or login: the connection is already open." },
        { edge: "pool>db", reverse: true, tone: "ok", caption: "The query returns in about 5 ms.", mark: [{ node: "db", state: "ok" }] },
        { edge: "handler>pool", reverse: true, tone: "ok", caption: "The handler releases it. The connection stays open for the next request.", mark: [{ node: "db", state: null }] },
      ],
    },
    {
      id: "grow",
      name: "Grow to the max",
      steps: [
        { edge: "handler>pool", caption: "All 9 open connections are busy, but the pool may hold 15.", mark: [{ node: "pool", state: "busy" }] },
        { edge: "pool>db", caption: "It opens a tenth: TCP, TLS and login, once, up to tens of milliseconds.", ms: 1500 },
        { edge: "pool>db", reverse: true, tone: "ok", caption: "The new connection joins the pool and serves this request. The next one reuses it.", mark: [{ node: "pool", state: "ok" }] },
      ],
    },
    {
      id: "full",
      name: "Full, so wait",
      steps: [
        { edge: "handler>pool", caption: "All 15 connections are busy, and the pool is at its maximum.", mark: [{ node: "pool", state: "busy" }] },
        { edge: "handler>pool", tone: "miss", caption: "The handler waits in the pool's queue. It does not open a 16th connection.", ms: 1500 },
        { edge: "pool>db", reverse: true, tone: "ok", caption: "Another request finishes after 5 ms and hands its connection to the waiter.", mark: [{ node: "pool", state: "ok" }] },
        {
          edge: "handler>pool",
          reverse: true,
          tone: "error",
          caption: "If nothing frees up within connectionTimeoutMillis (2 s), the handler gets an error instead of hanging.",
          mark: [{ node: "pool", state: "down" }],
          ms: 1800,
        },
      ],
    },
  ],
};

export const poolDecision: DecisionSpec = {
  id: "pool-decision",
  title: "App-side pool only, or add PgBouncer?",
  start: "fits",
  nodes: {
    fits: { q: "Do instances × pool size fit under max_connections minus headroom?", yes: "enough", no: "shrink" },
    enough: { q: "Is that pool size above queries per second × hold time, plus burst room?", yes: "app-only", no: "slow" },
    slow: { q: "Is one slow query inflating the hold time?", yes: "fix-query", no: "pgbouncer" },
    shrink: { q: "Can each pool shrink and still cover its busy connections?", yes: "smaller", no: "pgbouncer2" },
    "app-only": {
      result: "App-side pools only",
      why: "12 instances × 15 = 180 connections under a limit of 200 with 20 reserved. A proxy would add a hop for nothing.",
    },
    "fix-query": {
      result: "Fix the query, keep the pool",
      why: "1,000 queries/s at 50 ms needs 50 busy connections, but at 5 ms it needs 5. More connections only hide the slow query.",
    },
    smaller: {
      result: "Smaller app-side pools",
      why: "30 instances with a pool of 6 is 180 connections. Busy connections average 5, so 6 still works.",
    },
    pgbouncer: {
      result: "Add PgBouncer, transaction mode",
      why: "50 instances × 20 = 1,000 client connections against a limit near 200. A proxy runs them on a few dozen server connections.",
    },
    pgbouncer2: {
      result: "Add PgBouncer, transaction mode",
      why: "50 instances × 20 = 1,000 client connections against a limit near 200. A proxy runs them on a few dozen server connections.",
    },
  },
};

export const pgbModes: FlowSpec = {
  id: "pgbouncer-modes",
  title: "PgBouncer pooling modes",
  description: "Two clients share two server connections. The mode decides how long a client keeps one.",
  nodes: [
    { id: "a", label: "Client A", kind: "service", col: 0, row: 0 },
    { id: "b", label: "Client B", kind: "service", col: 0, row: 2 },
    { id: "pgb", label: "PgBouncer", kind: "gateway", col: 1, row: 1 },
    { id: "db", label: "PostgreSQL", kind: "database", col: 2, row: 1, sub: "1 server conn" },
  ],
  edges: [
    { from: "a", to: "pgb", label: "app" },
    { from: "b", to: "pgb", label: "app" },
    { from: "pgb", to: "db", label: "db" },
  ],
  scenarios: [
    {
      id: "session",
      name: "Session mode",
      steps: [
        { edge: "a>pgb", caption: "Client A connects. PgBouncer pins it to the only server connection for as long as A stays connected." },
        { edge: "pgb>db", caption: "A runs a query, then goes quiet for 10 s. The server connection stays pinned and idle.", mark: [{ node: "db", state: "busy" }], ms: 1500 },
        { edge: "b>pgb", tone: "miss", caption: "Client B asks for a server connection and has to wait, even though the database is doing nothing.", mark: [{ node: "pgb", state: "busy" }], ms: 1600 },
        { edge: "pgb>db", caption: "Session mode saves handshakes, not connections. Session state works because the connection is yours the whole time." },
      ],
    },
    {
      id: "transaction",
      name: "Transaction mode",
      steps: [
        { edge: "a>pgb", caption: "Client A sends BEGIN. PgBouncer lends it the server connection." },
        { edge: "pgb>db", caption: "A runs two statements and commits.", mark: [{ node: "db", state: "busy" }] },
        { edge: "pgb>db", reverse: true, tone: "ok", caption: "At COMMIT the server connection goes straight back to the pool.", mark: [{ node: "db", state: null }] },
        { edge: "b>pgb", caption: "Client B's transaction gets the same server connection a moment later." },
        { edge: "pgb>db", tone: "ok", caption: "Between transactions a client holds nothing. That is how 240 client connections fit on 40 server ones.", mark: [{ node: "pgb", state: "ok" }], ms: 1700 },
      ],
    },
    {
      id: "statement",
      name: "Statement mode",
      steps: [
        { edge: "a>pgb", caption: "Client A sends one autocommit statement. PgBouncer lends a server connection for that statement only." },
        { edge: "pgb>db", reverse: true, tone: "ok", caption: "The result returns and the connection is released at once." },
        { edge: "a>pgb", tone: "error", caption: "Client A sends BEGIN. Statement mode refuses multi-statement transactions, because the next statement could land on another connection.", mark: [{ node: "pgb", state: "down" }], ms: 2000 },
      ],
    },
  ],
};

export const pgbState: SequenceSpec = {
  id: "pgbouncer-state",
  title: "Session state in transaction mode",
  description: "A plain SET lives on one server connection and is gone when the next transaction lands on another. SET LOCAL lives and dies inside one transaction.",
  actors: [
    { id: "app", label: "App", kind: "service" },
    { id: "pgb", label: "PgBouncer", kind: "gateway" },
    { id: "pg", label: "PostgreSQL", kind: "database" },
  ],
  items: [
    {
      alt: [
        {
          when: "plain SET (breaks)",
          items: [
            { from: "app", to: "pgb", label: "SET statement_timeout = 2s" },
            { from: "pgb", to: "pg", label: "server conn 1 gets the SET" },
            { note: "Conn 1 returns to the pool", over: ["pgb", "pg"] },
            { from: "app", to: "pgb", label: "SELECT slow_report()" },
            { from: "pgb", to: "pg", label: "runs on server conn 2" },
            { note: "Conn 2 never saw the SET", over: ["app", "pg"] },
          ],
        },
        {
          when: "SET LOCAL (works)",
          items: [
            { from: "app", to: "pgb", label: "BEGIN" },
            { from: "app", to: "pgb", label: "SET LOCAL statement_timeout = 2s" },
            { from: "app", to: "pgb", label: "SELECT slow_report()" },
            { note: "One server connection until COMMIT", over: ["pgb", "pg"] },
            { from: "app", to: "pgb", label: "COMMIT" },
            { from: "pg", to: "app", label: "result, setting reset", type: "reply" },
          ],
        },
      ],
    },
  ],
};

export const keepAliveRace: SequenceSpec = {
  id: "keep-alive-race",
  title: "The idle-timeout race behind a load balancer",
  description: "If the server closes idle sockets sooner than the load balancer does, the balancer eventually sends a request into a closed socket and returns a 502.",
  actors: [
    { id: "user", label: "User", kind: "client" },
    { id: "lb", label: "Load balancer", kind: "lb" },
    { id: "app", label: "Node server", kind: "service" },
  ],
  items: [
    {
      alt: [
        {
          when: "server 5 s, LB 60 s",
          items: [
            { from: "user", to: "lb", label: "GET /orders" },
            { from: "lb", to: "app", label: "forwarded on a kept-alive socket" },
            { from: "app", to: "lb", label: "200 OK", type: "reply" },
            { note: "Node closes the idle socket at 5 s. The LB does not know.", over: ["user", "app"] },
            { from: "user", to: "lb", label: "GET /orders (at 30 s)" },
            { from: "lb", to: "app", label: "reuses the dead socket" },
            { from: "lb", to: "user", label: "502 Bad Gateway", type: "reply" },
          ],
        },
        {
          when: "server 65 s, LB 60 s",
          items: [
            { from: "user", to: "lb", label: "GET /orders" },
            { from: "lb", to: "app", label: "forwarded on a kept-alive socket" },
            { from: "app", to: "lb", label: "200 OK", type: "reply" },
            { note: "The LB closes the idle socket at 60 s, before Node.", over: ["user", "app"] },
            { from: "user", to: "lb", label: "GET /orders (at 90 s)" },
            { from: "lb", to: "app", label: "opens a fresh socket" },
            { from: "app", to: "lb", label: "200 OK", type: "reply" },
          ],
        },
      ],
    },
  ],
};

export const deadlineGiveUp: SequenceSpec = {
  id: "deadline-give-up",
  title: "Why the whole request needs one deadline",
  description: "With per-call timeouts the caller gives up but the dependency keeps working. With a propagated deadline the dependency stops when the caller stops.",
  actors: [
    { id: "edge", label: "Edge", kind: "gateway" },
    { id: "orders", label: "Orders service", kind: "service" },
    { id: "pricing", label: "Pricing service", kind: "service" },
  ],
  items: [
    {
      alt: [
        {
          when: "no deadline passed",
          items: [
            { from: "edge", to: "orders", label: "POST /checkout" },
            { from: "orders", to: "pricing", label: "quote (30 s timeout)" },
            { note: "At 2 s the edge returns 504. Pricing keeps working.", over: ["edge", "pricing"] },
            { from: "pricing", to: "orders", label: "answer at 25 s, nobody listening", type: "reply" },
          ],
        },
        {
          when: "deadline passed down",
          items: [
            { from: "edge", to: "orders", label: "POST /checkout, 2000 ms" },
            { from: "orders", to: "pricing", label: "quote, 1780 ms left" },
            { note: "At 2 s everyone stops and frees connections.", over: ["edge", "pricing"] },
            { from: "pricing", to: "orders", label: "aborted", type: "reply" },
            { from: "orders", to: "edge", label: "504 fast", type: "reply" },
          ],
        },
      ],
    },
  ],
};

export const deadlineBudget: TimelineSpec = {
  id: "deadline-budget",
  title: "One 2,000 ms budget spent across three hops",
  description: "The edge sets a 2,000 ms deadline. Each hop works inside what is left and passes the remainder on.",
  unit: "ms",
  lanes: [
    { id: "edge", label: "Edge" },
    { id: "orders", label: "Orders" },
    { id: "users", label: "Users" },
    { id: "pricing", label: "Pricing" },
  ],
  spans: [
    { lane: "edge", start: 0, end: 2000, label: "budget 2,000 ms", tone: 1 },
    { lane: "orders", start: 10, end: 1640, label: "handler 1,630 ms", tone: 2 },
    { lane: "users", start: 20, end: 220, label: "200 ms", tone: 3 },
    { lane: "pricing", start: 230, end: 1130, label: "pricing 900 ms", tone: 3 },
  ],
  markers: [{ at: 230, label: "1,770 ms left" }, { at: 2000, label: "deadline" }],
};

export const concurrencyLimit: FlowSpec = {
  id: "concurrency-limit",
  title: "Capping work in flight",
  description: "A loop over 10,000 ids either hits the pool all at once or goes through a limiter with a fixed number of workers and a bounded queue.",
  nodes: [
    { id: "loop", label: "Loop of 10,000", kind: "service", col: 0, row: 1 },
    { id: "lim", label: "Limiter", kind: "gateway", col: 1, row: 1, sub: "10 workers" },
    { id: "db", label: "Pool of 15", kind: "database", col: 2, row: 1 },
  ],
  edges: [
    { from: "loop", to: "lim", label: "send" },
    { from: "lim", to: "db", label: "call" },
  ],
  scenarios: [
    {
      id: "unbounded",
      name: "No limit",
      steps: [
        {
          edge: "loop>lim",
          caption: "Promise.all fires 10,000 calls in the same tick. With no limiter, all of them go straight on.",
          with: [{ edge: "loop>lim", caption: "" }, { edge: "loop>lim", caption: "" }],
          mark: [{ node: "lim", state: "busy" }],
        },
        {
          edge: "lim>db",
          caption: "The pool has 15 connections. The other 9,985 calls wait in memory, each holding a socket and a timer.",
          with: [{ edge: "lim>db", caption: "" }],
          mark: [{ node: "db", state: "busy" }],
          ms: 1700,
        },
        {
          edge: "lim>db",
          reverse: true,
          tone: "error",
          caption: "Acquire timeouts fire for most of them, and every other request on this instance is stuck behind the pile.",
          mark: [{ node: "db", state: "down" }],
          ms: 1800,
        },
      ],
    },
    {
      id: "limited",
      name: "10 workers",
      steps: [
        { edge: "loop>lim", caption: "The loop submits 10,000 calls. The limiter lets 10 run at a time and queues the rest.", with: [{ edge: "loop>lim", caption: "" }], mark: [{ node: "lim", state: "ok" }] },
        { edge: "lim>db", caption: "10 workers use 10 of the 15 pool connections. At 5 ms a call, they finish 10 ÷ 0.005 s = 2,000 calls per second.", mark: [{ node: "db", state: "ok" }], ms: 1500 },
        { edge: "lim>db", reverse: true, tone: "ok", caption: "Each finished call frees a worker for the next id. The 10,000 ids finish in about 5 s, and 5 pool connections stay free for other requests.", ms: 1700 },
      ],
    },
    {
      id: "shed",
      name: "Queue full, shed",
      steps: [
        { edge: "loop>lim", caption: "Requests arrive faster than 2,000 per second. The queue fills to its bound of 100.", with: [{ edge: "loop>lim", caption: "" }], mark: [{ node: "lim", state: "busy" }] },
        { edge: "loop>lim", reverse: true, tone: "error", caption: "The 101st waiting call is rejected at once with a 429 or 503. That takes microseconds and costs no connection.", mark: [{ node: "lim", state: "down" }], ms: 1800 },
        { edge: "lim>db", tone: "ok", caption: "Accepted calls wait at most 50 ms: 100 queued ÷ 2,000 per second.", mark: [{ node: "lim", state: "ok" }], ms: 1700 },
      ],
    },
  ],
};

export const shutdownTimeline: TimelineSpec = {
  id: "shutdown-timeline",
  title: "A graceful shutdown inside a 30 s grace period",
  description: "SIGTERM arrives at second 0. The app fails readiness, drains, closes its pools and exits well before the orchestrator's kill.",
  unit: "s",
  lanes: [
    { id: "orch", label: "Orchestrator" },
    { id: "lb", label: "Load balancer" },
    { id: "app", label: "App" },
  ],
  spans: [
    { lane: "orch", start: 0, end: 30, label: "grace period 30 s", tone: 1 },
    { lane: "lb", start: 0, end: 3, label: "sees 503, stops routing", tone: 2 },
    { lane: "app", start: 0, end: 1, label: "ready 503", tone: 3 },
    { lane: "app", start: 1, end: 9, label: "finish in-flight requests", tone: 2 },
    { lane: "app", start: 9, end: 10, label: "pool.end()", tone: 3 },
  ],
  markers: [{ at: 0, label: "SIGTERM" }, { at: 25, label: "hard stop in code" }, { at: 30, label: "SIGKILL" }],
};

export const httpVersions: FlowSpec = {
  id: "http-versions",
  title: "How each HTTP version shares connections",
  description: "HTTP/1.1 opens several connections with one request each. HTTP/2 runs many streams over one TCP connection. HTTP/3 runs them over QUIC, so a lost packet stalls only its own stream.",
  nodes: [
    { id: "browser", label: "Browser", kind: "client", col: 0, row: 1 },
    { id: "conn", label: "Connection", kind: "gateway", col: 1, row: 1 },
    { id: "server", label: "Server", kind: "service", col: 2, row: 1 },
  ],
  edges: [
    { from: "browser", to: "conn" },
    { from: "conn", to: "server" },
  ],
  scenarios: [
    {
      id: "h1",
      name: "HTTP/1.1",
      steps: [
        { edge: "browser>conn", caption: "A page needs 30 files. HTTP/1.1 allows one request at a time per connection, so the browser opens about 6.", with: [{ edge: "browser>conn", caption: "" }, { edge: "browser>conn", caption: "" }], ms: 1700 },
        { edge: "conn>server", caption: "Each of the 6 connections pays its own TCP and TLS handshake, then carries one request at a time.", with: [{ edge: "conn>server", caption: "" }, { edge: "conn>server", caption: "" }], mark: [{ node: "conn", state: "busy" }], ms: 1700 },
        { edge: "conn>server", reverse: true, caption: "The other 24 files queue behind them: 30 files over 6 connections is 5 rounds." },
      ],
    },
    {
      id: "h2",
      name: "HTTP/2",
      steps: [
        { edge: "browser>conn", caption: "HTTP/2 opens one connection and sends all 30 requests as separate streams at once.", with: [{ edge: "browser>conn", caption: "" }, { edge: "browser>conn", caption: "" }] },
        { edge: "conn>server", caption: "One TCP and TLS handshake in total. The server interleaves the 30 responses on the same connection.", with: [{ edge: "conn>server", caption: "" }, { edge: "conn>server", caption: "" }], mark: [{ node: "conn", state: "ok" }], ms: 1500 },
        { edge: "conn>server", reverse: true, tone: "error", caption: "One TCP packet is lost. TCP holds back everything after it, so every stream stalls until the retransmit arrives.", mark: [{ node: "conn", state: "down" }], ms: 2000 },
      ],
    },
    {
      id: "h3",
      name: "HTTP/3",
      steps: [
        { edge: "browser>conn", caption: "HTTP/3 runs over QUIC on UDP. Transport and TLS share one handshake, so a new connection costs one round trip.", with: [{ edge: "browser>conn", caption: "" }, { edge: "browser>conn", caption: "" }] },
        { edge: "conn>server", reverse: true, tone: "error", caption: "A packet carrying stream 7 is lost. Only stream 7 waits for the retransmit.", mark: [{ node: "conn", state: "miss" }], ms: 1700 },
        { edge: "conn>server", reverse: true, tone: "ok", caption: "The other 29 streams keep delivering. The connection also survives a switch from Wi-Fi to mobile data.", mark: [{ node: "conn", state: "ok" }], ms: 1800 },
      ],
    },
  ],
};

export const grpcBalancing: FlowSpec = {
  id: "grpc-balancing",
  title: "gRPC behind layer 4 and layer 7 balancers",
  description: "gRPC keeps one long-lived HTTP/2 connection. A layer-4 balancer picks a backend once per connection, a layer-7 balancer picks one per request.",
  nodes: [
    { id: "client", label: "gRPC client", kind: "client", col: 0, row: 1 },
    { id: "lb", label: "Balancer", kind: "lb", col: 1, row: 1 },
    { id: "a", label: "Backend A", kind: "service", col: 2, row: 0 },
    { id: "b", label: "Backend B", kind: "service", col: 2, row: 1 },
    { id: "c", label: "Backend C", kind: "service", col: 2, row: 2 },
  ],
  edges: [
    { from: "client", to: "lb", label: "1 conn" },
    { from: "lb", to: "a" },
    { from: "lb", to: "b" },
    { from: "lb", to: "c" },
  ],
  scenarios: [
    {
      id: "l4",
      name: "Layer 4",
      steps: [
        { edge: "client>lb", caption: "The client opens one HTTP/2 connection and keeps it for hours." },
        { edge: "lb>a", caption: "A layer-4 balancer sees one TCP connection and picks Backend A for it, once.", mark: [{ node: "a", state: "busy" }] },
        { edge: "lb>a", caption: "All 1,000 requests per second ride that connection into Backend A. B and C sit idle.", with: [{ edge: "lb>a", caption: "" }, { edge: "lb>a", caption: "" }], ms: 1800 },
      ],
    },
    {
      id: "l7",
      name: "Layer 7",
      steps: [
        { edge: "client>lb", caption: "The client still holds one connection, but the balancer reads each request inside it." },
        { edge: "lb>a", caption: "Request by request it spreads the load: about 333 per second to each backend.", with: [{ edge: "lb>b", caption: "" }, { edge: "lb>c", caption: "" }], mark: [{ node: "a", state: "ok" }, { node: "b", state: "ok" }, { node: "c", state: "ok" }], ms: 1800 },
      ],
    },
  ],
};

export const connectionStorm: FlowSpec = {
  id: "connection-storm",
  title: "A connection storm after a deploy",
  description: "Thirty instances restart together and each opens up to 20 database connections at once. PgBouncer and a rolling deploy flatten the spike.",
  nodes: [
    { id: "inst", label: "New instances", kind: "service", col: 0, row: 1, sub: "30 restarting" },
    { id: "pgb", label: "PgBouncer", kind: "gateway", col: 1, row: 0, sub: "cap 40" },
    { id: "db", label: "PostgreSQL", kind: "database", col: 2, row: 1, sub: "max 200" },
  ],
  edges: [
    { from: "inst", to: "db", label: "connect" },
    { from: "inst", to: "pgb", label: "connect" },
    { from: "pgb", to: "db", label: "server" },
  ],
  scenarios: [
    {
      id: "storm",
      name: "The storm",
      steps: [
        { edge: "inst>db", caption: "Friday 15:00, a deploy restarts all 30 instances in one minute. Traffic returns and every cold pool starts opening connections.", with: [{ edge: "inst>db", caption: "" }, { edge: "inst>db", caption: "" }], mark: [{ node: "inst", state: "busy" }] },
        { edge: "inst>db", caption: "30 × 20 = 600 connection attempts against max_connections 200. Each login also costs CPU on the server.", mark: [{ node: "db", state: "busy" }], ms: 1700 },
        { edge: "inst>db", reverse: true, tone: "error", caption: "PostgreSQL answers FATAL: sorry, too many clients already. Requests fail, and the callers retry in the same second.", mark: [{ node: "db", state: "down" }], ms: 1800 },
        { edge: "inst>db", tone: "error", caption: "The retries are a second storm. The database stays at the limit even though the new code is fine.", ms: 1700 },
      ],
    },
    {
      id: "fix",
      name: "Flattened",
      steps: [
        { edge: "inst>pgb", caption: "Deploy 5 instances at a time, and let pools grow as traffic arrives. Clients now connect to PgBouncer instead.", with: [{ edge: "inst>pgb", caption: "" }], mark: [{ node: "inst", state: "ok" }] },
        { edge: "pgb>db", caption: "PgBouncer caps itself at 40 server connections no matter how many clients arrive, and queues the rest briefly.", mark: [{ node: "pgb", state: "ok" }], ms: 1700 },
        { edge: "pgb>db", reverse: true, tone: "ok", caption: "Failed connects retry with exponential backoff and jitter, so retries spread across seconds instead of landing together.", mark: [{ node: "db", state: "ok" }], ms: 1800 },
      ],
    },
  ],
};

export const idleInTransaction: SequenceSpec = {
  id: "idle-in-transaction",
  title: "A network call inside a transaction",
  description: "A transaction holds its connection and its row locks until COMMIT. Calling a slow API in the middle holds both for the whole call.",
  actors: [
    { id: "app", label: "Handler", kind: "service" },
    { id: "pg", label: "PostgreSQL", kind: "database" },
    { id: "pay", label: "Payments API", kind: "external" },
  ],
  items: [
    {
      alt: [
        {
          when: "call inside",
          items: [
            { from: "app", to: "pg", label: "BEGIN; UPDATE orders" },
            { from: "app", to: "pay", label: "charge card" },
            { note: "API stalls 30 s: connection idle, row locked", over: ["app", "pay"] },
            { from: "pay", to: "app", label: "ok, 30 s later", type: "reply" },
            { from: "app", to: "pg", label: "COMMIT" },
          ],
        },
        {
          when: "call outside",
          items: [
            { from: "app", to: "pay", label: "charge card" },
            { from: "pay", to: "app", label: "ok", type: "reply" },
            { from: "app", to: "pg", label: "BEGIN; UPDATE orders; COMMIT" },
            { note: "Held about 5 ms, no call inside", over: ["app", "pg"] },
          ],
        },
      ],
    },
  ],
};

export const leakedConnection: SequenceSpec = {
  id: "leaked-connection",
  title: "A connection that never goes back",
  description: "If the release sits after the query instead of in a finally block, any error strands the connection and the pool shrinks by one.",
  actors: [
    { id: "app", label: "Handler", kind: "service" },
    { id: "pool", label: "Pool of 15", kind: "gateway" },
    { id: "pg", label: "PostgreSQL", kind: "database" },
  ],
  items: [
    {
      alt: [
        {
          when: "release in finally",
          items: [
            { from: "app", to: "pool", label: "connect()" },
            { from: "app", to: "pg", label: "UPDATE (throws)" },
            { from: "app", to: "pool", label: "release() in finally" },
            { note: "Pool back to 15 usable connections", over: ["pool", "pg"] },
          ],
        },
        {
          when: "release after query",
          items: [
            { from: "app", to: "pool", label: "connect()" },
            { from: "app", to: "pg", label: "UPDATE (throws)" },
            { note: "Exception skips release(): 14 usable left", over: ["app", "pool"] },
            { note: "After 15 errors: stuck, database idle", over: ["app", "pg"] },
          ],
        },
      ],
    },
  ],
};
