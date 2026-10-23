import type { Primer } from "./types";

export const primer: Primer = {
  id: "connection-pool",
  title: "What is a connection pool?",
  idea: "Open a few database connections once, then lend them to requests and take them back, instead of opening one each time.",
  doodle: "connection-pool",
  analogy:
    "A rack of shared bikes at a station: you borrow one when you need it and return it when done, so nobody buys a new bike per trip.",
  flow: {
    id: "primer-connection-pool",
    title: "Borrowing database connections",
    description: "An app talks to a database, either opening a new connection per request or borrowing from a pool.",
    nodes: [
      { id: "client", label: "Requests", kind: "client", col: 0, row: 1 },
      { id: "app", label: "Your app", kind: "service", col: 1, row: 1 },
      { id: "pool", label: "Connection pool", kind: "queue", col: 2, row: 0 },
      { id: "db", label: "Database", kind: "database", col: 3, row: 1 },
    ],
    edges: [
      { from: "client", to: "app" },
      { from: "app", to: "pool", label: "borrow" },
      { from: "pool", to: "db", label: "10 open" },
      { from: "app", to: "db", label: "new each time" },
    ],
    scenarios: [
      {
        id: "without",
        name: "Without a pool",
        steps: [
          {
            edge: "client>app",
            caption: "Many requests arrive at once.",
            with: [{ edge: "client>app", caption: "" }, { edge: "client>app", caption: "" }],
          },
          {
            edge: "app>db",
            caption: "Each request opens its own new connection. Setup is slow, often tens of milliseconds.",
            with: [{ edge: "app>db", caption: "" }, { edge: "app>db", caption: "" }],
          },
          {
            edge: "app>db",
            tone: "error",
            caption: "Each connection uses memory on the database, so too many hurt it.",
            with: [{ edge: "app>db", tone: "error", caption: "" }],
            mark: [{ node: "db", state: "busy" }],
          },
          {
            edge: "app>db",
            reverse: true,
            tone: "error",
            caption: "At its limit, the database refuses new connections. Customers see errors.",
            mark: [{ node: "db", state: "down" }],
          },
        ],
      },
      {
        id: "with",
        name: "With a pool",
        steps: [
          {
            edge: "pool>db",
            tone: "ok",
            caption: "At startup, the pool opens 10 connections to the database and keeps them.",
            mark: [{ node: "pool", state: "hit" }],
          },
          {
            edge: "client>app",
            caption: "Many requests arrive at once.",
            with: [{ edge: "client>app", caption: "" }, { edge: "client>app", caption: "" }],
          },
          { edge: "app>pool", caption: "Each request asks the pool for a connection." },
          { edge: "app>pool", reverse: true, tone: "ok", caption: "A ready one is handed over. No setup wait." },
          { edge: "pool>db", caption: "The query runs on the borrowed connection." },
          { edge: "pool>db", reverse: true, tone: "ok", caption: "The answer comes back." },
          { edge: "app>pool", caption: "The connection goes back to the pool, ready for the next request." },
        ],
      },
      {
        id: "busy",
        name: "When all are busy",
        steps: [
          {
            edge: "client>app",
            caption: "Twenty requests arrive, but the pool holds only 10 connections.",
            with: [{ edge: "client>app", caption: "" }, { edge: "client>app", caption: "" }],
            mark: [{ node: "pool", state: "busy" }],
          },
          { edge: "app>pool", caption: "The first ten borrow every connection. The rest wait in line." },
          {
            edge: "app>pool",
            tone: "error",
            caption: "A request that waits too long gives up at its timeout, say 2 seconds.",
          },
          {
            edge: "app>pool",
            reverse: true,
            tone: "ok",
            caption: "When a connection returns, the next in line gets it.",
            mark: [{ node: "pool", state: null }],
          },
          {
            edge: "client>app",
            reverse: true,
            caption: "Slow queries holding connections make everyone else wait, so keep them short.",
          },
        ],
      },
    ],
  },
  remember: [
    "Opening a connection is slow, so open a few and reuse them.",
    "The database can only handle so many connections.",
    "When all are busy, requests wait, so set timeouts.",
  ],
  whenToUse: "In almost every backend that talks to a database: opening a connection can take tens of milliseconds, so reuse a few.",
  theCatch: "Ten connections shared by twenty requests means ten wait in line, and one slow query holding a connection makes everyone queue.",
  say: "I would use a connection pool sized to what the database can handle, with a wait timeout, and keep queries short so connections return quickly.",
  learnMore: [{ href: "/deep-dives/connections-pooling", label: "Connections and pooling" }],
};
