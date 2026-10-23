import type { Primer } from "./types";

export const primer: Primer = {
  id: "sql-nosql",
  title: "What are SQL and NoSQL databases?",
  idea: "Two ways to keep data: neat tables with strict columns, or flexible documents and lookups that spread across many machines.",
  doodle: "sql-nosql",
  analogy:
    "SQL is a filing cabinet of forms with fixed boxes, cross-referenced by number. NoSQL is a stack of folders, each holding whatever you put inside.",
  flow: {
    id: "primer-sql-nosql",
    title: "One order, stored two ways",
    description: "An app saves an order as a single document, as linked tables, and then as data grows.",
    nodes: [
      { id: "app", label: "Your app", kind: "service", col: 0, row: 1 },
      { id: "sql", label: "SQL tables", kind: "database", col: 1, row: 0 },
      { id: "docs", label: "Documents", kind: "storage", col: 1, row: 2 },
      { id: "more", label: "Another machine", kind: "storage", col: 2, row: 2 },
    ],
    edges: [
      { from: "app", to: "sql" },
      { from: "app", to: "docs" },
      { from: "docs", to: "more", label: "split by key" },
    ],
    scenarios: [
      {
        id: "without",
        name: "Without tables",
        steps: [
          { edge: "app>docs", caption: "The app saves the order as one document: customer, address and items together." },
          {
            edge: "app>docs",
            reverse: true,
            tone: "ok",
            caption: "One read brings back the whole order. Fast and flexible.",
            mark: [{ node: "docs", state: "hit" }],
          },
          { edge: "app>docs", caption: "The customer moves. Their address is copied inside every old order." },
          {
            edge: "app>docs",
            tone: "error",
            caption: "The app must fix each copy. Miss one and the data disagrees.",
            mark: [{ node: "docs", state: "miss" }],
          },
          {
            edge: "app>docs",
            reverse: true,
            tone: "miss",
            caption: "Questions across many orders, like sales per item, are awkward to answer.",
          },
        ],
      },
      {
        id: "with",
        name: "With tables",
        steps: [
          {
            edge: "app>sql",
            caption: "The order splits into customers, orders and items tables. Each fact lives once.",
            mark: [{ node: "docs", state: null }],
          },
          { edge: "app>sql", caption: "The customer moves. One row changes, and every order sees it." },
          {
            edge: "app>sql",
            reverse: true,
            tone: "ok",
            caption: "A join stitches the pieces back together when you read.",
            mark: [{ node: "sql", state: "hit" }],
          },
          {
            edge: "app>sql",
            caption: "Order and stock update together, or not at all. That is a transaction.",
          },
          {
            edge: "app>sql",
            reverse: true,
            tone: "miss",
            caption: "A row with a missing or wrong-type field is rejected.",
          },
        ],
      },
      {
        id: "grow",
        name: "When one machine is not enough",
        steps: [
          {
            edge: "app>sql",
            caption: "Traffic grows. One SQL server handles every write.",
            mark: [{ node: "sql", state: "busy" }],
          },
          {
            edge: "app>sql",
            tone: "error",
            caption: "Copies can serve reads, but writes still funnel into one machine.",
          },
          {
            edge: "app>sql",
            caption: "Splitting tables across machines is possible, but joins and transactions get harder.",
            mark: [{ node: "sql", state: null }],
          },
          { edge: "app>docs", caption: "Documents are found by a key, so they spread across machines easily." },
          {
            edge: "docs>more",
            tone: "ok",
            caption: "Add a machine and some keys move there. Capacity grows.",
            mark: [{ node: "more", state: "hit" }],
          },
        ],
      },
    ],
  },
  remember: [
    "SQL gives strict tables, joins and transactions.",
    "NoSQL trades some of that for flexible shapes and easy spreading.",
    "Start with SQL unless you have a reason not to.",
  ],
  whenToUse: "Start with SQL for orders and money. Use NoSQL for key lookups at huge scale or data whose shape keeps changing.",
  theCatch: "A single SQL machine takes all writes; NoSQL spreads easily, but a changed address must be fixed in every copied order.",
  say: "I would start with a SQL database for correctness and flexibility of queries, and move a workload to NoSQL only when scale or data shape clearly needs it.",
  learnMore: [
    { href: "/deep-dives/choosing-a-data-store", label: "Choosing a data store" },
    { href: "/learn/databases-scaling", label: "Databases and scaling" },
  ],
};
