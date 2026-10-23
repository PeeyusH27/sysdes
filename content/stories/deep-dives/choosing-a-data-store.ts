import type { FlowSpec } from "@/components/diagram/types";
import type { Story } from "../types";

// A small shop: one source of truth, with search and analytics as copies built from its changes.
const flow: FlowSpec = {
  id: "story-data-stores",
  title: "One source of truth, many copies",
  description: "The app writes orders to Postgres. Search and analytics stores are built from the change stream.",
  nodes: [
    { id: "app", label: "App", kind: "service", col: 0, row: 1 },
    { id: "pg", label: "Postgres", kind: "database", col: 1, row: 1, sub: "source of truth" },
    { id: "changes", label: "Change stream", kind: "queue", col: 2, row: 1 },
    { id: "es", label: "Search", kind: "search", col: 3, row: 0, sub: "Elasticsearch" },
    { id: "ch", label: "Analytics", kind: "database", col: 3, row: 2, sub: "ClickHouse" },
  ],
  edges: [
    { from: "app", to: "pg" },
    { from: "app", to: "es", label: "2nd write", style: "async" },
    { from: "pg", to: "changes", label: "committed", style: "replication" },
    { from: "changes", to: "es", style: "async" },
    { from: "changes", to: "ch", style: "async" },
  ],
  scenarios: [
    {
      id: "scan",
      name: "One database for everything",
      steps: [
        { edge: "app>pg", caption: "Checkout writes orders to the one database." },
        { edge: "app>pg", caption: "Monday 9 am, a report scans 100M rows on the same machine.", mark: [{ node: "pg", state: "busy" }] },
        { edge: "app>pg", reverse: true, tone: "error", caption: "Checkout times out while the report runs.", mark: [{ node: "pg", state: "down" }] },
      ],
    },
    {
      id: "derived",
      name: "Copies built from changes",
      steps: [
        { edge: "app>pg", caption: "The app writes the order once, to Postgres.", mark: [{ node: "pg", state: null }] },
        { edge: "pg>changes", caption: "The committed change goes onto a stream." },
        { edge: "changes>es", caption: "Search is updated from the stream.", with: [{ edge: "changes>ch", caption: "" }], mark: [{ node: "es", state: "ok" }, { node: "ch", state: "ok" }] },
        { edge: "changes>es", tone: "ok", caption: "Lose a copy and you rebuild it from the source." },
      ],
    },
    {
      id: "dual",
      name: "Two writes in one request",
      steps: [
        { edge: "app>pg", caption: "The app saves the order to Postgres.", mark: [{ node: "pg", state: "ok" }] },
        { edge: "app>es", tone: "error", caption: "Then the search call times out.", mark: [{ node: "es", state: "down" }] },
        { edge: "app>es", reverse: true, tone: "error", caption: "The order exists, but never shows in search. The stores drift apart." },
      ],
    },
  ],
};

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "One database, every job",
      line: "A big report and a checkout share one machine. The report wins.",
      scene: { kind: "flow", spec: flow, scenario: "scan" },
    },
    {
      tag: "sum",
      head: "Do the sum first",
      line: "10 million users is 10 GB. One Postgres holds that in memory.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Users", value: "10 million" },
          { label: "Data per user", value: "1 KB" },
        ],
        result: { label: "Total", value: "10 GB" },
        verdict: { text: "One Postgres is plenty", tone: "good" },
      },
    },
    {
      tag: "sum",
      head: "When does Postgres strain?",
      line: "Drag the write rate. Roughly tens of thousands a second is where it starts.",
      scene: {
        kind: "meter",
        label: "Writes per second",
        unit: "writes/s",
        min: 100,
        max: 100000,
        start: 1000,
        log: true,
        stops: [
          { upTo: 10000, verdict: "No. Plain Postgres is enough.", tone: "good" },
          { upTo: 30000, verdict: "Strain. Replicas, cache, bigger machine first.", tone: "warn" },
          { upTo: 100000, verdict: "Consider sharding or a wide-column store.", tone: "bad" },
        ],
      },
      predict: { q: "At 1,000 writes a second, add another store?", options: ["Yes, for scale", "No, Postgres copes"], answer: 1, why: "Add a store only when the data has a different shape, not for a small load." },
    },
    {
      tag: "choose",
      head: "Match the store to the job",
      line: "Start from how data is read and written, not from the product name.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Orders in Postgres", tone: "good", why: "Transactions and joins" },
          { label: "Search engine", tone: "good", why: "Typos and ranking, not truth" },
          { label: "Videos in S3", tone: "good", why: "Cheap and durable; key in Postgres" },
          { label: "Videos in Postgres", tone: "bad", why: "Blobs bloat the database and backups" },
          { label: "NoSQL for scale", tone: "warn", why: "Pick it after the queries" },
        ],
      },
      predict: { q: "Where do 2 GB product videos belong?", options: ["In Postgres", "In S3"], answer: 1, why: "Blobs bloat a database and its backups. Object storage holds them, with a key in Postgres." },
    },
    {
      tag: "idea",
      head: "One truth, the rest are copies",
      line: "Write each fact once. Search and analytics follow the change stream.",
      scene: { kind: "flow", spec: flow, scenario: "derived" },
    },
    {
      tag: "catch",
      head: "Never write two stores at once",
      line: "One of the two writes will eventually fail, and the stores disagree.",
      scene: { kind: "flow", spec: flow, scenario: "dual" },
    },
    {
      tag: "skip",
      head: "Boring by default",
      line: "Every extra store is one more thing to back up and wake up for.",
      scene: {
        kind: "versus",
        left: { title: "Try first", points: ["Plain Postgres", "An index", "A read replica", "A cache"] },
        right: { title: "Add a store for", points: ["Text search", "Huge event scans", "Big files"] },
      },
    },
  ],
};
