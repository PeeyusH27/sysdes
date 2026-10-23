import type { Primer } from "./types";

export const primer: Primer = {
  id: "db-index",
  title: "What is a database index?",
  idea: "An index is a sorted lookup list beside a table, so the database can jump to a row instead of reading all.",
  doodle: "index",
  analogy: "The edge tabs of a book: you jump straight to the section you want instead of reading every page.",
  flow: {
    id: "primer-db-index",
    title: "Finding a row with and without an index",
    description: "Without an index the database reads every row. With one it jumps to the row, at the cost of space and slower writes.",
    nodes: [
      { id: "app", label: "Your app", kind: "service", col: 0, row: 1 },
      { id: "index", label: "Index", kind: "search", col: 1, row: 0, sub: "sorted emails" },
      { id: "table", label: "Users table", kind: "database", col: 2, row: 1, sub: "10 million rows" },
    ],
    edges: [
      { from: "app", to: "table" },
      { from: "app", to: "index" },
      { from: "index", to: "table" },
    ],
    scenarios: [
      {
        id: "without",
        name: "Without an index",
        steps: [
          { edge: "app>table", caption: "The app asks for the user with one email address." },
          { edge: "app>table", caption: "With no index, the database reads row one, then row two.", mark: [{ node: "table", state: "busy" }] },
          { edge: "app>table", tone: "error", caption: "It keeps going through all 10 million rows to be sure." },
          { edge: "app>table", reverse: true, tone: "error", caption: "After a long wait, the one matching row is found." },
        ],
      },
      {
        id: "with",
        name: "With an index",
        steps: [
          { edge: "app>index", caption: "The database first looks in the index, a sorted list of emails.", mark: [{ node: "table", state: null }] },
          { edge: "app>index", reverse: true, tone: "ok", caption: "Because it is sorted, it finds the email in a few steps.", mark: [{ node: "index", state: "hit" }] },
          { edge: "index>table", caption: "The index says exactly where the row is, so only that row is read." },
          { edge: "app>table", reverse: true, tone: "ok", caption: "The answer returns in milliseconds, not a long scan." },
        ],
      },
      {
        id: "cost",
        name: "When you write",
        steps: [
          { edge: "app>table", caption: "A new user signs up, and the row is added to the table.", mark: [{ node: "index", state: null }] },
          { edge: "app>index", tone: "miss", caption: "The index must be updated too, so it stays sorted.", mark: [{ node: "index", state: "busy" }] },
          { edge: "index>table", tone: "miss", caption: "Every index adds work to each write and takes extra disk space." },
        ],
      },
    ],
  },
  remember: [
    "An index is a sorted list that points to rows.",
    "It turns reading every row into jumping to one.",
    "It costs disk space and makes writes a little slower.",
  ],
  whenToUse: "When a slow query hunts one email among 10 million users, or sorts by a column. Tiny tables do not need one.",
  theCatch: "Every new user row must also update each index, so ten indexes on a busy table slow writes and eat disk.",
  say: "I would index the columns used in frequent lookups, joins and sorts. I would accept slower writes and extra storage, and avoid indexing everything.",
  learnMore: [{ href: "/learn/databases-scaling", label: "Scaling databases" }],
};
