import type { FlowSpec } from "@/components/diagram/types";

export const primaryReplica: FlowSpec = {
  id: "primary-replica",
  title: "Primary-replica replication",
  description: "All writes go to the primary, which streams its changes to two replicas. Reads are spread across the replicas.",
  nodes: [
    { id: "app", label: "App servers", kind: "service", col: 0, row: 1, sub: "×N" },
    { id: "r1", label: "Replica 1", kind: "database", col: 1, row: 0, sub: "reads" },
    { id: "r2", label: "Replica 2", kind: "database", col: 1, row: 2, sub: "reads" },
    { id: "primary", label: "Primary", kind: "database", col: 2, row: 1, sub: "all writes" },
  ],
  edges: [
    { from: "app", to: "primary", label: "writes" },
    { from: "app", to: "r1", label: "reads" },
    { from: "app", to: "r2", label: "reads" },
    { from: "primary", to: "r1", label: "replicate", style: "replication" },
    { from: "primary", to: "r2", label: "replicate", style: "replication" },
  ],
  scenarios: [
    {
      id: "write",
      name: "Write",
      steps: [
        { edge: "app>primary", caption: "UPDATE users SET bio = … goes to the primary, the only node that accepts writes." },
        {
          edge: "app>primary",
          reverse: true,
          tone: "ok",
          caption: "The primary appends the change to its write-ahead log, commits and acknowledges. With async replication it doesn't wait for the replicas.",
          mark: [{ node: "primary", state: "ok" }],
        },
        {
          edge: "primary>r1",
          caption: "A few milliseconds later the change streams to both replicas, which apply it in the same order.",
          with: [{ edge: "primary>r2", caption: "" }],
        },
        {
          edge: "primary>r1",
          reverse: true,
          tone: "ok",
          caption: "Both replicas have caught up. Every node now holds the same data.",
          with: [{ edge: "primary>r2", reverse: true, tone: "ok", caption: "" }],
          mark: [{ node: "r1", state: "ok" }, { node: "r2", state: "ok" }],
        },
      ],
    },
    {
      id: "read",
      name: "Read from replicas",
      steps: [
        {
          edge: "app>r1",
          caption: "SELECT queries are spread across the replicas, leaving the primary's CPU and I/O for writes.",
          with: [{ edge: "app>r2", caption: "" }],
        },
        {
          edge: "app>r1",
          reverse: true,
          tone: "ok",
          caption: "Each replica answers from its own full copy. Adding a replica adds read capacity, but no write capacity.",
          with: [{ edge: "app>r2", reverse: true, tone: "ok", caption: "" }],
          mark: [{ node: "r1", state: "hit" }, { node: "r2", state: "hit" }],
        },
      ],
    },
    {
      id: "stale-read",
      name: "Stale read + fix",
      steps: [
        { edge: "app>primary", caption: "Alice saves a new bio. The write goes to the primary." },
        { edge: "app>primary", reverse: true, tone: "ok", caption: "Committed. The app shows “Saved”." },
        { edge: "primary>r1", ms: 1800, caption: "Replica 1 is busy and 2 s behind: the change is still on its way.", mark: [{ node: "r1", state: "busy" }] },
        { edge: "app>r1", caption: "Alice reloads her profile, and the read goes to Replica 1…" },
        {
          edge: "app>r1",
          reverse: true,
          tone: "error",
          caption: "…which returns the OLD bio. To Alice it looks as if her save was lost.",
          mark: [{ node: "r1", state: "miss" }],
        },
        { edge: "app>primary", caption: "Fix (read-your-writes): for 5 s after a user writes, send that user's reads to the primary.", mark: [{ node: "r1", state: "busy" }] },
        { edge: "app>primary", reverse: true, tone: "ok", caption: "Alice sees her new bio. Everyone else keeps reading from replicas, where 2 s of staleness is harmless." },
        { edge: "primary>r1", caption: "Replica 1 catches up, and once the 5 s window ends Alice's reads go back to the replicas.", mark: [{ node: "r1", state: "ok" }] },
      ],
    },
    {
      id: "failover",
      name: "Failover",
      steps: [
        { edge: "app>primary", tone: "error", caption: "The primary's host dies. Writes start timing out.", mark: [{ node: "primary", state: "down" }] },
        {
          edge: "app>primary",
          tone: "error",
          caption: "The failover manager (Patroni, RDS, Orchestrator) sees several missed health checks in a row, so this isn't a blip.",
        },
        {
          edge: "app>r1",
          ms: 1800,
          caption: "It promotes Replica 1, the replica furthest ahead, and fences the old primary so it can never accept writes again (no split brain).",
          mark: [{ node: "r1", state: "ok" }],
        },
        { edge: "app>r1", caption: "The app's connection string (a DNS name or a proxy) now points at Replica 1. Writes resume, and Replica 2 starts following the new primary." },
        {
          edge: "app>r1",
          reverse: true,
          tone: "ok",
          ms: 1800,
          caption: "Downtime was tens of seconds. But writes the old primary acknowledged and never shipped are gone: with async replication, data loss (RPO) isn't zero.",
        },
      ],
    },
  ],
};

export const replicaQuiz: FlowSpec = {
  id: "replica-quiz",
  title: "Where does the read replica go?",
  description: "The app writes to the primary and reads from a node that receives the primary's changes.",
  nodes: [
    { id: "client", label: "Client", kind: "client", col: 0, row: 1 },
    { id: "app", label: "App servers", kind: "service", col: 1, row: 1 },
    { id: "primary", label: "Primary", kind: "database", col: 2, row: 0, sub: "writes" },
    { id: "replica", label: "Read replica", kind: "database", col: 2, row: 2, sub: "reads" },
  ],
  edges: [
    { from: "client", to: "app" },
    { from: "app", to: "primary", label: "writes" },
    { from: "app", to: "replica", label: "reads" },
    { from: "primary", to: "replica", label: "replicate", style: "replication" },
  ],
  scenarios: [
    {
      id: "write",
      name: "Write",
      steps: [
        { edge: "client>app", caption: "A user saves a change." },
        { edge: "app>primary", caption: "The write goes to the primary." },
        { edge: "primary>replica", caption: "The primary streams the change to the read replica." },
      ],
    },
    {
      id: "read",
      name: "Read",
      steps: [
        { edge: "client>app", caption: "A user loads a page." },
        { edge: "app>replica", caption: "The read goes to the replica, sparing the primary." },
        { edge: "app>replica", reverse: true, tone: "ok", caption: "Rows come back from the replica's copy." },
      ],
    },
  ],
};
