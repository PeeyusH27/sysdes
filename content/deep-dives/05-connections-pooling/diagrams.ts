import type { FlowSpec } from "@/components/diagram/types";

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
