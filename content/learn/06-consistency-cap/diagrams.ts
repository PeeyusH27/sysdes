import type { FlowSpec } from "@/components/diagram/types";

export const leaderReplication: FlowSpec = {
  id: "leader-replication",
  title: "Leader replication",
  description:
    "Client A writes to the leader, which replicates to two followers. Client B talks to Follower 2. A network partition can cut Follower 2 off from the other two.",
  nodes: [
    { id: "clientA", label: "Client A", kind: "client", col: 0, row: 1 },
    { id: "leader", label: "Leader", kind: "database", col: 1, row: 1, sub: "accepts writes" },
    { id: "f1", label: "Follower 1", kind: "database", col: 2, row: 0 },
    { id: "f2", label: "Follower 2", kind: "database", col: 2, row: 2 },
    { id: "clientB", label: "Client B", kind: "client", col: 3, row: 2, note: "On the far side of the partition, close to Follower 2." },
  ],
  edges: [
    { from: "clientA", to: "leader", label: "write" },
    { from: "leader", to: "f1", label: "replicate", style: "replication" },
    { from: "leader", to: "f2", label: "replicate", style: "replication" },
    { from: "clientB", to: "f2" },
  ],
  scenarios: [
    {
      id: "normal",
      name: "Normal replication",
      steps: [
        { edge: "clientA>leader", caption: "Client A books seat 12A for Alice. The write goes to the leader." },
        {
          edge: "leader>f1",
          caption: "The leader appends it to its log and streams it to both followers.",
          with: [{ edge: "leader>f2", caption: "" }],
        },
        {
          edge: "leader>f1",
          reverse: true,
          tone: "ok",
          caption: "Followers acknowledge. A majority (2 of 3) has the write, so it is committed.",
          with: [{ edge: "leader>f2", reverse: true, tone: "ok", caption: "" }],
        },
        { edge: "clientA>leader", reverse: true, tone: "ok", caption: "The leader confirms to Client A." },
        { edge: "clientB>f2", caption: "Client B reads seat 12A from Follower 2." },
        { edge: "clientB>f2", reverse: true, tone: "ok", caption: "It sees Alice: the replicas agree. (With async replication this read could lag by a few ms.)" },
      ],
    },
    {
      id: "cp",
      name: "Partition: CP choice",
      steps: [
        {
          edge: "leader>f2",
          tone: "error",
          caption: "A switch fails. Follower 2 can no longer reach the leader or Follower 1: a network partition.",
          mark: [{ node: "f2", state: "down" }],
        },
        { edge: "clientB>f2", caption: "Client B tries to book seat 12A for Bob on Follower 2." },
        {
          edge: "clientB>f2",
          reverse: true,
          tone: "error",
          caption: "Follower 2 is in the minority (1 of 3), so it can't commit anything. It rejects the write: consistent, but unavailable to Client B.",
          mark: [{ node: "clientB", state: "miss" }],
        },
        { edge: "clientA>leader", caption: "On the majority side, Client A books seat 14C. The leader still reaches Follower 1." },
        { edge: "leader>f1", tone: "ok", caption: "2 of 3 replicas have it, a majority, so the write commits.", mark: [{ node: "f1", state: "ok" }] },
        { edge: "clientA>leader", reverse: true, tone: "ok", caption: "Client A gets success. No seat can be sold twice." },
        {
          edge: "leader>f2",
          tone: "ok",
          caption: "The partition heals. Follower 2 catches up from the leader's log, and Client B can retry.",
          mark: [{ node: "f2", state: null }, { node: "clientB", state: null }, { node: "f1", state: null }],
        },
      ],
    },
    {
      id: "ap",
      name: "Partition: AP choice",
      steps: [
        {
          edge: "leader>f2",
          tone: "error",
          caption: "The same partition, but this store favours availability: every replica keeps accepting writes.",
          mark: [{ node: "f2", state: "miss" }],
        },
        { edge: "clientA>leader", caption: "Client A adds a book to the shared cart on the leader side." },
        { edge: "clientB>f2", caption: "Client B adds a pen to the same cart on Follower 2, which accepts it." },
        {
          edge: "clientA>leader",
          reverse: true,
          tone: "ok",
          caption: "Both clients get success. The replicas now disagree: a conflict.",
          with: [{ edge: "clientB>f2", reverse: true, tone: "ok", caption: "" }],
          mark: [{ node: "leader", state: "busy" }, { node: "f2", state: "busy" }],
        },
        {
          edge: "leader>f2",
          caption: "The partition heals and the replicas exchange the writes they missed.",
          with: [{ edge: "leader>f2", reverse: true, caption: "" }],
        },
        {
          edge: "leader>f2",
          tone: "ok",
          caption: "Merge: last-writer-wins would keep only the pen and silently drop the book. A CRDT (a set union) keeps both items.",
          mark: [{ node: "leader", state: "ok" }, { node: "f2", state: "ok" }],
        },
      ],
    },
  ],
};
