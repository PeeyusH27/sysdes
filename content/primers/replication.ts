import type { Primer } from "./types";

export const primer: Primer = {
  id: "replication",
  title: "What are replicas?",
  idea: "A replica is a live copy of a database. Copies share the reading, and one can take over if the original fails.",
  doodle: "replica",
  analogy: "A copy machine: every change to the original cabinet is duplicated into more cabinets, so people can read from any of them.",
  flow: {
    id: "primer-replication",
    title: "One database versus copies",
    description: "One database handles all reads and writes and is a single point of failure. Copies take the reads, but can lag a moment behind.",
    nodes: [
      { id: "app", label: "Your app", kind: "service", col: 0, row: 1 },
      { id: "main", label: "Main database", kind: "database", col: 1, row: 1 },
      { id: "r1", label: "Copy 1", kind: "database", col: 1, row: 0 },
      { id: "r2", label: "Copy 2", kind: "database", col: 1, row: 2 },
    ],
    edges: [
      { from: "app", to: "main", label: "writes" },
      { from: "app", to: "r1", label: "reads" },
      { from: "app", to: "r2", label: "reads" },
      { from: "main", to: "r1", style: "replication" },
      { from: "main", to: "r2", style: "replication" },
    ],
    scenarios: [
      {
        id: "without",
        name: "Without copies",
        steps: [
          {
            edge: "app>main",
            caption: "Every read and every write goes to one database.",
            with: [{ edge: "app>main", caption: "" }, { edge: "app>main", caption: "" }],
            mark: [{ node: "main", state: "busy" }],
          },
          { edge: "app>main", tone: "error", caption: "Reads pile up, and writes wait behind them." },
          { edge: "app>main", reverse: true, tone: "error", caption: "The machine fails, and no other machine has a live copy.", mark: [{ node: "main", state: "down" }] },
          { edge: "app>main", tone: "error", caption: "Nothing can be read or written, so the whole app stops." },
        ],
      },
      {
        id: "with",
        name: "With copies",
        steps: [
          { edge: "app>main", caption: "A write goes to the main database.", mark: [{ node: "main", state: null }] },
          {
            edge: "main>r1",
            caption: "The main database sends each change on to its copies.",
            with: [{ edge: "main>r2", caption: "" }],
          },
          {
            edge: "app>r1",
            caption: "Reads now go to the copies.",
            with: [{ edge: "app>r2", caption: "" }],
          },
          {
            edge: "app>r1",
            reverse: true,
            tone: "ok",
            caption: "Each copy answers its share, so the main database has room for writes.",
            with: [{ edge: "app>r2", reverse: true, tone: "ok", caption: "" }],
          },
          { edge: "main>r1", tone: "error", caption: "If the main machine fails, a copy can take its place.", mark: [{ node: "main", state: "down" }] },
        ],
      },
      {
        id: "behind",
        name: "When a copy is behind",
        steps: [
          { edge: "app>main", caption: "You change your name. The write goes to the main database.", mark: [{ node: "main", state: null }] },
          { edge: "main>r1", caption: "The change is still travelling to the copies.", ms: 1500 },
          { edge: "app>r1", caption: "Right away, you read your profile from a copy." },
          { edge: "app>r1", reverse: true, tone: "error", caption: "The copy still shows your old name. It is a moment behind.", mark: [{ node: "r1", state: "miss" }] },
          { edge: "main>r1", tone: "ok", caption: "A moment later the copy catches up.", mark: [{ node: "r1", state: null }] },
        ],
      },
    ],
  },
  remember: [
    "A replica is a live copy of the database.",
    "Copies take the reads and can replace a failed main database.",
    "A copy can be a moment behind the original.",
  ],
  whenToUse: "When reads far outnumber writes, like ten to one, or the business cannot survive losing one database. Not for hobby apps.",
  theCatch: "You change your name, reload, and a lagging copy still shows the old one. Fresh reads go to the main.",
  say: "I would add read replicas to scale reads and survive failures. The cost is replication lag, so reads that must be fresh go to the main database.",
  learnMore: [{ href: "/learn/databases-scaling", label: "Scaling databases" }],
};
