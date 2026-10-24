import type { DecisionSpec, FlowSpec, SequenceSpec } from "@/components/diagram/types";

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

/* ------------------------------------------------------------------ PACELC */

export const pacelcRead: FlowSpec = {
  id: "pacelc-read",
  title: "PACELC: a read with no failure",
  description:
    "A user in Paris can read a local replica in a few milliseconds, or the leader in Virginia in about 80 ms. The local copy may lag; the leader is always current.",
  nodes: [
    { id: "user", label: "Client (Paris)", kind: "client", col: 0, row: 1 },
    { id: "local", label: "Replica (Paris)", kind: "database", col: 1, row: 0, sub: "a few ms" },
    { id: "leader", label: "Leader (Virginia)", kind: "database", col: 2, row: 1, sub: "~80 ms away" },
  ],
  edges: [
    { from: "user", to: "local", label: "read" },
    { from: "user", to: "leader", label: "read" },
    { from: "leader", to: "local", label: "async", style: "replication" },
  ],
  scenarios: [
    {
      id: "local",
      name: "Local read: fast, maybe stale",
      steps: [
        { edge: "user>local", caption: "The page reads the like count from the replica in Paris." },
        { edge: "user>local", reverse: true, tone: "ok", caption: "Answer in a few ms. The replica is about 200 ms behind, so the count may be 3 short. Harmless for likes." },
      ],
    },
    {
      id: "leader",
      name: "Leader read: slow, fresh",
      steps: [
        { edge: "user>leader", caption: "The page reads the account balance from the leader across the Atlantic." },
        { edge: "user>leader", reverse: true, tone: "ok", ms: 1500, caption: "Answer after about 80 ms, and it is always current. Worth paying for a balance." },
      ],
    },
    {
      id: "five",
      name: "Five reads in a row",
      steps: [
        { edge: "user>leader", caption: "A page makes 5 reads, one after the other, each to the far leader.", with: [{ edge: "user>leader", caption: "" }] },
        { edge: "user>leader", reverse: true, tone: "miss", ms: 1600, caption: "5 x 80 ms = about 400 ms of pure waiting. The same 5 reads on the local replica cost a few ms each." },
      ],
    },
  ],
};

/* ------------------------------------------------------------------ models */

export const linearizableSeq: SequenceSpec = {
  id: "linearizable",
  title: "Linearizable: after the ack, everyone sees it",
  description: "Once a write is acknowledged, every later read returns it. A lagging replica breaks that promise.",
  actors: [
    { id: "alice", label: "Alice", kind: "client" },
    { id: "store", label: "Store", kind: "database" },
    { id: "bob", label: "Bob", kind: "client" },
  ],
  items: [
    { from: "alice", to: "store", label: "book seat 12A" },
    { from: "store", to: "alice", label: "ack: committed", type: "reply" },
    { note: "Bob starts his read after Alice got her ack", over: ["store", "bob"] },
    {
      alt: [
        {
          when: "linearizable",
          items: [
            { from: "bob", to: "store", label: "read seat 12A" },
            { from: "store", to: "bob", label: "taken", type: "reply" },
          ],
        },
        {
          when: "not linearizable",
          items: [
            { from: "bob", to: "store", label: "read (lagging replica)" },
            { from: "store", to: "bob", label: "free (stale)", type: "reply" },
            { note: "Bob now books a seat that is already sold", over: ["bob"] },
          ],
        },
      ],
    },
  ],
};

export const readYourWrites: SequenceSpec = {
  id: "read-your-writes",
  title: "Read-your-writes",
  description: "After saving, the reload must show the new name. Reading from a lagging replica shows the old one; pinning to the leader for a few seconds fixes it.",
  actors: [
    { id: "user", label: "User", kind: "client" },
    { id: "app", label: "App", kind: "service" },
    { id: "leader", label: "Leader", kind: "database" },
    { id: "replica", label: "Replica", kind: "database" },
  ],
  items: [
    { from: "user", to: "app", label: "save name: Asha" },
    { from: "app", to: "leader", label: "write" },
    { from: "leader", to: "app", label: "ok", type: "reply" },
    { from: "leader", to: "replica", label: "replicate (200 ms lag)", type: "async" },
    {
      alt: [
        {
          when: "read a replica",
          items: [
            { from: "user", to: "app", label: "reload profile" },
            { from: "app", to: "replica", label: "read" },
            { from: "replica", to: "app", label: "old name", type: "reply" },
            { note: "The user thinks the save failed and types it again", over: ["user", "app"] },
          ],
        },
        {
          when: "pin to leader",
          items: [
            { note: "App remembers: this user wrote 1 s ago", over: ["app"] },
            { from: "user", to: "app", label: "reload profile" },
            { from: "app", to: "leader", label: "read (pinned, 5 s)" },
            { from: "leader", to: "app", label: "Asha", type: "reply" },
            { from: "app", to: "user", label: "Asha", type: "reply" },
          ],
        },
      ],
    },
  ],
};

export const causalOrder: SequenceSpec = {
  id: "causal-order",
  title: "Causal consistency",
  description: "Bob's reply depends on Alice's question. Without causal order, a second replica can show the reply first.",
  actors: [
    { id: "alice", label: "Alice", kind: "client" },
    { id: "bob", label: "Bob", kind: "client" },
    { id: "r1", label: "Replica 1", kind: "database" },
    { id: "r2", label: "Replica 2", kind: "database" },
    { id: "carol", label: "Carol", kind: "client" },
  ],
  items: [
    { from: "alice", to: "r1", label: "Q: lunch?" },
    { from: "bob", to: "r1", label: "R: yes (after Q)" },
    {
      alt: [
        {
          when: "no causal order",
          items: [
            { from: "r1", to: "r2", label: "R arrives first", type: "async" },
            { from: "carol", to: "r2", label: "read thread" },
            { from: "r2", to: "carol", label: "R with no Q", type: "reply" },
            { from: "r1", to: "r2", label: "Q arrives late", type: "async" },
          ],
        },
        {
          when: "causal order",
          items: [
            { from: "r1", to: "r2", label: "R arrives first", type: "async" },
            { note: "Replica 2 holds R back until Q, which R depends on, has arrived", over: ["r2"] },
            { from: "r1", to: "r2", label: "Q arrives", type: "async" },
            { from: "carol", to: "r2", label: "read thread" },
            { from: "r2", to: "carol", label: "Q, then R", type: "reply" },
          ],
        },
      ],
    },
  ],
};

export const eventualConverge: FlowSpec = {
  id: "eventual-converge",
  title: "Eventual consistency",
  description: "A write lands on one replica and spreads in the background. Readers of a replica that has not caught up see the old value for a moment, then the new one.",
  nodes: [
    { id: "writer", label: "Writer", kind: "client", col: 0, row: 1 },
    { id: "a", label: "Replica A", kind: "database", col: 1, row: 1 },
    { id: "b", label: "Replica B", kind: "database", col: 2, row: 0 },
    { id: "c", label: "Replica C", kind: "database", col: 2, row: 2 },
    { id: "reader", label: "Reader", kind: "client", col: 3, row: 2 },
  ],
  edges: [
    { from: "writer", to: "a", label: "write" },
    { from: "a", to: "b", label: "async", style: "replication" },
    { from: "a", to: "c", label: "async", style: "replication" },
    { from: "reader", to: "c", label: "read" },
  ],
  scenarios: [
    {
      id: "converge",
      name: "Stale, then fresh",
      steps: [
        { edge: "writer>a", caption: "A like arrives. Replica A now says 1,207." },
        { edge: "a>b", caption: "A streams the change to B and C in the background.", with: [{ edge: "a>c", caption: "" }], ms: 1400 },
        { edge: "reader>c", caption: "A reader asks Replica C before the change has landed.", mark: [{ node: "c", state: "miss" }] },
        { edge: "reader>c", reverse: true, tone: "miss", caption: "It sees 1,204: stale, but nobody is harmed." },
        { edge: "a>c", tone: "ok", caption: "The change lands on C. If writes stopped now, every replica would agree.", mark: [{ node: "c", state: "ok" }, { node: "b", state: "ok" }] },
        { edge: "reader>c", reverse: true, tone: "ok", caption: "The next read returns 1,207." },
      ],
    },
  ],
};

/* ------------------------------------------------------------------ quorums */

export const quorumFlow: FlowSpec = {
  id: "quorum-flow",
  title: "Quorum read and write, N = 3",
  description: "A write waits for 2 of 3 acks. A read asks 2 of 3 and keeps the newest. Any 2 and any 2 of 3 share at least one replica.",
  nodes: [
    { id: "client", label: "Client", kind: "client", col: 0, row: 1 },
    { id: "coord", label: "Coordinator", kind: "service", col: 1, row: 1 },
    { id: "r1", label: "Replica 1", kind: "database", col: 2, row: 0 },
    { id: "r2", label: "Replica 2", kind: "database", col: 2, row: 1 },
    { id: "r3", label: "Replica 3", kind: "database", col: 2, row: 2 },
  ],
  edges: [
    { from: "client", to: "coord" },
    { from: "coord", to: "r1" },
    { from: "coord", to: "r2" },
    { from: "coord", to: "r3" },
  ],
  scenarios: [
    {
      id: "write",
      name: "Write, W = 2",
      steps: [
        { edge: "client>coord", caption: "The client writes x = 2. The coordinator sends it to all 3 replicas." },
        { edge: "coord>r1", caption: "Replicas 1 and 2 store it. Replica 3 is slow.", with: [{ edge: "coord>r2", caption: "" }, { edge: "coord>r3", tone: "miss", caption: "" }] },
        { edge: "coord>r1", reverse: true, tone: "ok", caption: "Two acks arrive: W = 2 is met, so the write succeeds. Replica 3 still has the old value.", with: [{ edge: "coord>r2", reverse: true, tone: "ok", caption: "" }], mark: [{ node: "r1", state: "ok" }, { node: "r2", state: "ok" }, { node: "r3", state: "miss" }] },
        { edge: "client>coord", reverse: true, tone: "ok", caption: "The client gets success after 2 acks, not 3." },
      ],
    },
    {
      id: "read",
      name: "Read, R = 2: overlap",
      steps: [
        { edge: "client>coord", caption: "A read of x. The coordinator asks 2 replicas, Replica 2 and Replica 3.", mark: [{ node: "r1", state: "ok" }, { node: "r2", state: "ok" }, { node: "r3", state: "miss" }] },
        { edge: "coord>r2", caption: "Replica 2 has x = 2 and Replica 3 still has x = 1.", with: [{ edge: "coord>r3", caption: "" }] },
        { edge: "coord>r2", reverse: true, tone: "ok", caption: "x = 2 (version 8) and x = 1 (version 7) come back. The coordinator keeps the newest.", with: [{ edge: "coord>r3", reverse: true, tone: "miss", caption: "" }] },
        { edge: "client>coord", reverse: true, tone: "ok", caption: "The client sees x = 2. R + W = 4 is more than 3, so one of the 2 replicas read must hold the write." },
      ],
    },
    {
      id: "stale",
      name: "Read, R = 1: stale",
      steps: [
        { edge: "client>coord", caption: "The same read, but tuned for speed: R = 1 and W = 2.", mark: [{ node: "r1", state: "ok" }, { node: "r2", state: "ok" }, { node: "r3", state: "miss" }] },
        { edge: "coord>r3", caption: "The coordinator happens to ask only Replica 3." },
        { edge: "coord>r3", reverse: true, tone: "error", caption: "It returns x = 1. R + W = 3 is not more than 3, so no overlap is guaranteed.", mark: [{ node: "r3", state: "down" }] },
        { edge: "client>coord", reverse: true, tone: "miss", caption: "The client reads stale data. Fast, but not strongly consistent." },
      ],
    },
  ],
};

export const sloppyQuorum: FlowSpec = {
  id: "sloppy-quorum",
  title: "Sloppy quorum and hinted handoff",
  description: "When a key's home replica is down, a stand-in node takes the write and hands it back later. Writes stay up, but the overlap rule no longer holds.",
  nodes: [
    { id: "client", label: "Client", kind: "client", col: 0, row: 1 },
    { id: "coord", label: "Coordinator", kind: "service", col: 1, row: 1 },
    { id: "home1", label: "Home replica 1", kind: "database", col: 2, row: 0 },
    { id: "home2", label: "Home replica 2", kind: "database", col: 3, row: 1 },
    { id: "standin", label: "Stand-in node", kind: "database", col: 2, row: 2, sub: "holds a hint" },
  ],
  edges: [
    { from: "client", to: "coord", label: "write" },
    { from: "coord", to: "home1" },
    { from: "coord", to: "home2" },
    { from: "coord", to: "standin" },
    { from: "standin", to: "home2", label: "hand back", style: "async" },
  ],
  scenarios: [
    {
      id: "handoff",
      name: "Hinted handoff",
      steps: [
        { edge: "client>coord", caption: "A write arrives while Home replica 2 is down.", mark: [{ node: "home2", state: "down" }] },
        { edge: "coord>home1", caption: "Home replica 1 takes it. Home replica 2 is unreachable.", with: [{ edge: "coord>home2", tone: "error", caption: "" }] },
        { edge: "coord>standin", caption: "A strict quorum would fail now. A sloppy one asks a neighbour to hold the write, with a hint that it belongs to Home replica 2." },
        { edge: "client>coord", reverse: true, tone: "ok", caption: "Two acks: the write succeeds. But a read that asks the 2 home replicas will not see it yet.", mark: [{ node: "standin", state: "busy" }] },
        { edge: "standin>home2", tone: "ok", ms: 1400, caption: "Home replica 2 comes back. The stand-in hands the write over and deletes its hint.", mark: [{ node: "home2", state: null }, { node: "standin", state: null }] },
      ],
    },
  ],
};

/* ------------------------------------------------------------------ conflicts */

export const lwwLoss: FlowSpec = {
  id: "lww-loss",
  title: "Last-writer-wins",
  description: "Two replicas take a write to the same key. The write with the higher timestamp wins and the other is silently dropped, even if it really came last.",
  nodes: [
    { id: "phone", label: "Phone", kind: "client", col: 0, row: 0 },
    { id: "laptop", label: "Laptop", kind: "client", col: 0, row: 2 },
    { id: "r1", label: "Replica 1", kind: "database", col: 1, row: 0 },
    { id: "r2", label: "Replica 2", kind: "database", col: 1, row: 2 },
  ],
  edges: [
    { from: "phone", to: "r1", label: "write" },
    { from: "laptop", to: "r2", label: "write" },
    { from: "r1", to: "r2", label: "sync", style: "replication" },
  ],
  scenarios: [
    {
      id: "concurrent",
      name: "Concurrent cart edits",
      steps: [
        { edge: "phone>r1", caption: "During a partition the phone sets cart = [book] on Replica 1, stamped 10:00:01.2." },
        { edge: "laptop>r2", caption: "The laptop sets cart = [pen] on Replica 2, stamped 10:00:01.4. Neither saw the other." },
        { edge: "r1>r2", caption: "The partition heals and the replicas compare timestamps.", reverse: true },
        { edge: "r1>r2", tone: "error", caption: "The pen has the higher timestamp, so it wins. The book vanishes with no error. The customer lost an item.", mark: [{ node: "r1", state: "down" }] },
      ],
    },
    {
      id: "skew",
      name: "Clock skew",
      steps: [
        { edge: "phone>r1", caption: "The phone sets the profile photo to photo A at 10:00:01.200 on a correct clock." },
        { edge: "laptop>r2", caption: "Two seconds later the laptop sets photo B. Its clock runs 3 s slow, so it stamps 09:59:58.200." },
        { edge: "r1>r2", tone: "error", caption: "Photo A has the higher timestamp and wins. The write that really came last is dropped.", mark: [{ node: "r2", state: "down" }] },
      ],
    },
    {
      id: "last-seen",
      name: "Fine: last seen",
      steps: [
        { edge: "phone>r1", caption: "last_seen = 10:00:01 is written on Replica 1." },
        { edge: "laptop>r2", caption: "last_seen = 10:00:03 is written on Replica 2." },
        { edge: "r1>r2", tone: "ok", caption: "The later value wins. Losing the earlier one costs nothing, because only the newest value matters here.", mark: [{ node: "r2", state: "ok" }] },
      ],
    },
  ],
};

export const vectorClocks: SequenceSpec = {
  id: "vector-clocks",
  title: "Vector clocks",
  description: "Each node counts its own writes. Comparing two clocks tells you whether one write came before the other or whether they were concurrent.",
  actors: [
    { id: "a", label: "Node A", kind: "database" },
    { id: "b", label: "Node B", kind: "database" },
  ],
  items: [
    { note: "A writes x = 1. Clock A:1", over: ["a"] },
    { from: "a", to: "b", label: "x = 1, clock A:1", type: "async" },
    {
      alt: [
        {
          when: "one after the other",
          items: [
            { note: "B writes x = 2 with clock A:1, B:1", over: ["b"] },
            { from: "b", to: "a", label: "x = 2, clock A:1 B:1", type: "async" },
            { note: "A:1 is behind A:1 B:1, so keep x = 2. No conflict", over: ["a", "b"] },
          ],
        },
        {
          when: "concurrent",
          items: [
            { note: "Cut off from B, A writes x = 2 (A:2) while B writes x = 3 (A:1 B:1)", over: ["a", "b"] },
            { from: "a", to: "b", label: "x = 2, clock A:2", type: "async" },
            { from: "b", to: "a", label: "x = 3, clock A:1 B:1", type: "async" },
            { note: "Neither clock is behind the other: a real conflict. Keep both and merge", over: ["a", "b"] },
          ],
        },
      ],
    },
  ],
};

export const crdtCounter: FlowSpec = {
  id: "crdt-counter",
  title: "A counter CRDT",
  description: "Each node adds to its own slot. Merging takes the larger value per slot, so replicas end at the same total in any order, even if a merge repeats.",
  nodes: [
    { id: "a", label: "Node A", kind: "database", col: 0, row: 1, sub: "slot per node" },
    { id: "b", label: "Node B", kind: "database", col: 2, row: 1, sub: "slot per node" },
  ],
  edges: [{ from: "a", to: "b", label: "merge", style: "replication" }],
  scenarios: [
    {
      id: "merge",
      name: "Two sides keep counting",
      steps: [
        { edge: "a>b", tone: "error", caption: "A partition cuts the link. Both sides keep taking likes.", mark: [{ node: "a", state: "busy" }, { node: "b", state: "busy" }] },
        { edge: "a>b", caption: "Node A gets 1 like: its slots are A:1 B:0. Node B gets 2: A:0 B:2." },
        { edge: "a>b", ms: 1300, caption: "The link heals. Each node sends its slots to the other.", with: [{ edge: "a>b", reverse: true, caption: "" }] },
        { edge: "a>b", tone: "ok", caption: "Both take the larger value per slot: A:1 B:2. The total is 3 on both nodes. No like was lost.", mark: [{ node: "a", state: "ok" }, { node: "b", state: "ok" }] },
        { edge: "a>b", tone: "ok", caption: "If the same state arrives again, nothing changes: the max of a value with itself is itself. That is why repeats are safe." },
      ],
    },
  ],
};

/* ------------------------------------------------------------------ consensus */

export const raftCommit: FlowSpec = {
  id: "raft-commit",
  title: "Raft: commit on a majority",
  description: "The leader appends an entry and sends it to followers. Once a majority of 3 (2 nodes, itself included) holds it, it is committed and survives losing the minority.",
  nodes: [
    { id: "client", label: "Client", kind: "client", col: 0, row: 1 },
    { id: "leader", label: "Leader", kind: "database", col: 1, row: 1 },
    { id: "f1", label: "Follower 1", kind: "database", col: 2, row: 0 },
    { id: "f2", label: "Follower 2", kind: "database", col: 2, row: 2 },
  ],
  edges: [
    { from: "client", to: "leader", label: "write" },
    { from: "leader", to: "f1", label: "append" },
    { from: "leader", to: "f2", label: "append" },
    { from: "f1", to: "f2", label: "vote" },
  ],
  scenarios: [
    {
      id: "commit",
      name: "Commit on 2 of 3",
      steps: [
        { edge: "client>leader", caption: "The client writes. The leader adds the entry to its own log: 1 of 3." },
        { edge: "leader>f1", caption: "It sends the entry to both followers.", with: [{ edge: "leader>f2", caption: "" }] },
        { edge: "leader>f1", reverse: true, tone: "ok", caption: "Follower 1 acknowledges. That is 2 of 3, a majority: the entry is committed.", mark: [{ node: "f1", state: "ok" }, { node: "leader", state: "ok" }] },
        { edge: "client>leader", reverse: true, tone: "ok", caption: "The leader answers the client without waiting for the slow Follower 2." },
      ],
    },
    {
      id: "node-down",
      name: "One node down",
      steps: [
        { edge: "leader>f2", tone: "error", caption: "Follower 2 crashes.", mark: [{ node: "f2", state: "down" }] },
        { edge: "client>leader", caption: "A write arrives. The leader appends it and asks both followers." },
        { edge: "leader>f1", reverse: true, tone: "ok", caption: "Follower 1 acknowledges. 2 of 3 is still a majority, so the write commits. A 3-node cluster tolerates 1 failure." },
        { edge: "client>leader", reverse: true, tone: "ok", caption: "The client gets success." },
      ],
    },
    {
      id: "isolated",
      name: "Leader cut off",
      steps: [
        { edge: "leader>f1", tone: "error", caption: "The leader loses its link to both followers.", with: [{ edge: "leader>f2", tone: "error", caption: "" }], mark: [{ node: "leader", state: "down" }] },
        { edge: "f1>f2", caption: "No heartbeats arrive, so after the election timeout (150 to 300 ms in the Raft paper) Follower 1 asks for votes." },
        { edge: "f1>f2", reverse: true, tone: "ok", caption: "Follower 2 votes yes. Follower 1 has 2 of 3 and becomes leader of a new term.", mark: [{ node: "f1", state: "ok" }, { node: "leader", state: null }] },
        { edge: "client>leader", tone: "error", caption: "The old leader still gets a write, but it can never reach a majority.", mark: [{ node: "leader", state: "down" }] },
        { edge: "client>leader", reverse: true, tone: "error", caption: "It cannot commit, so it does not confirm. When the link heals it sees the higher term and steps down." },
      ],
    },
  ],
};

/* ------------------------------------------------------------------ distributed transactions */

export const twoPhaseCommit: SequenceSpec = {
  id: "two-phase-commit",
  title: "Two-phase commit",
  description: "The coordinator asks every participant to prepare, then commits only if all vote yes. A crash between the phases leaves participants holding locks.",
  actors: [
    { id: "coord", label: "Coordinator", kind: "service" },
    { id: "pay", label: "Payments", kind: "database" },
    { id: "stock", label: "Stock", kind: "database" },
  ],
  items: [
    { from: "coord", to: "pay", label: "prepare" },
    { from: "coord", to: "stock", label: "prepare" },
    {
      alt: [
        {
          when: "all vote yes",
          items: [
            { from: "pay", to: "coord", label: "yes (rows locked)", type: "reply" },
            { from: "stock", to: "coord", label: "yes (rows locked)", type: "reply" },
            { from: "coord", to: "pay", label: "commit" },
            { from: "coord", to: "stock", label: "commit" },
          ],
        },
        {
          when: "one votes no",
          items: [
            { from: "pay", to: "coord", label: "yes (rows locked)", type: "reply" },
            { from: "stock", to: "coord", label: "no: out of stock", type: "reply" },
            { from: "coord", to: "pay", label: "abort (unlock)" },
            { from: "coord", to: "stock", label: "abort" },
          ],
        },
        {
          when: "coordinator dies",
          items: [
            { from: "pay", to: "coord", label: "yes (rows locked)", type: "reply" },
            { from: "stock", to: "coord", label: "yes (rows locked)", type: "reply" },
            { note: "The coordinator crashes before sending commit. Both wait, holding locks, unable to decide", over: ["pay", "stock"] },
          ],
        },
      ],
    },
  ],
};

export const sagaFlow: SequenceSpec = {
  id: "saga-flow",
  title: "A saga with undo steps",
  description: "Each step commits locally. If a later step fails, the saga runs the undo step of every earlier one, in reverse order.",
  actors: [
    { id: "orch", label: "Orchestrator", kind: "service" },
    { id: "pay", label: "Payments", kind: "service" },
    { id: "stock", label: "Stock", kind: "service" },
    { id: "ship", label: "Shipping", kind: "service" },
  ],
  items: [
    { from: "orch", to: "pay", label: "charge 49" },
    { from: "pay", to: "orch", label: "ok", type: "reply" },
    { from: "orch", to: "stock", label: "reserve item" },
    { from: "stock", to: "orch", label: "ok", type: "reply" },
    { from: "orch", to: "ship", label: "book courier" },
    {
      alt: [
        {
          when: "all steps succeed",
          items: [
            { from: "ship", to: "orch", label: "ok", type: "reply" },
            { note: "Order complete. No undo needed", over: ["orch"] },
          ],
        },
        {
          when: "last step fails",
          items: [
            { from: "ship", to: "orch", label: "fail: no courier", type: "reply" },
            { from: "orch", to: "stock", label: "undo: release item" },
            { from: "orch", to: "pay", label: "undo: refund 49" },
            { note: "The customer briefly saw a charge. Sagas are not isolated", over: ["orch", "pay"] },
          ],
        },
      ],
    },
  ],
};

/* ------------------------------------------------------------------ locks */

export const fencedLock: SequenceSpec = {
  id: "fenced-lock",
  title: "Lock expiry and a fencing token",
  description: "A paused client wakes up after its lease expired. Without a token, storage accepts its stale write. With one, storage rejects it.",
  actors: [
    { id: "c1", label: "Client 1", kind: "client" },
    { id: "c2", label: "Client 2", kind: "client" },
    { id: "lock", label: "Lock service", kind: "service" },
    { id: "store", label: "Storage", kind: "storage" },
  ],
  items: [
    { from: "c1", to: "lock", label: "acquire" },
    { from: "lock", to: "c1", label: "token 33, lease 10 s", type: "reply" },
    { note: "Client 1 freezes for 15 s (a GC pause). The lease expires", over: ["c1", "lock"] },
    { from: "c2", to: "lock", label: "acquire" },
    { from: "lock", to: "c2", label: "token 34", type: "reply" },
    { from: "c2", to: "store", label: "write (token 34)" },
    { note: "Client 1 wakes up, still sure it holds the lock", over: ["c1"] },
    {
      alt: [
        {
          when: "no fencing",
          items: [
            { from: "c1", to: "store", label: "write (no check)" },
            { note: "Storage accepts it and overwrites Client 2", over: ["store"] },
          ],
        },
        {
          when: "with fencing",
          items: [
            { from: "c1", to: "store", label: "write (token 33)" },
            { from: "store", to: "c1", label: "rejected: 33 is below 34", type: "reply" },
          ],
        },
      ],
    },
  ],
};

export const lockChoice: DecisionSpec = {
  id: "which-lock",
  title: "Which lock do I need?",
  start: "harm",
  nodes: {
    harm: { q: "Would two holders at once corrupt data (not just waste work)?", yes: "token", no: "redis" },
    token: { q: "Can the storage check a token on each write?", yes: "fenced", no: "idem" },
    redis: { result: "A Redis lock is fine", why: "SET key value NX PX 10000 stops most duplicate work. The worst case is the job runs twice." },
    fenced: { result: "Lock service plus fencing token", why: "Use etcd or ZooKeeper for the lock, and make storage reject any write with an older token." },
    idem: { result: "Skip the lock: use the database", why: "A conditional write, a unique constraint or SELECT FOR UPDATE makes the database the arbiter." },
  },
};

/* ------------------------------------------------------------------ per feature */

export const pickConsistency: DecisionSpec = {
  id: "pick-consistency",
  title: "Which consistency does this feature need?",
  start: "money",
  nodes: {
    money: { q: "Does a stale or conflicting read cost money or break a rule?", yes: "strong", no: "own" },
    own: { q: "Must users see their own edit right after saving?", yes: "ryw", no: "order" },
    order: { q: "Must a reply never show before what it answers?", yes: "causal", no: "eventual" },
    strong: { result: "Strong (linearizable)", why: "Balances, payments, checkout stock. Accept the extra latency and refusals during a split." },
    ryw: { result: "Read-your-writes", why: "Profile edits, settings. Pin that user to the leader for a few seconds after a write." },
    causal: { result: "Causal", why: "Chat and comment threads. Everyone sees causes before effects, with no global order needed." },
    eventual: { result: "Eventual", why: "Likes, views, follower counts. Fastest and cheapest, and a few seconds of lag hurts nobody." },
  },
};

/* ------------------------------------------------------------------ failure modes */

export const splitBrain: FlowSpec = {
  id: "split-brain",
  title: "Split brain",
  description: "A partition makes both halves think the other is dead. If each promotes itself, two leaders accept writes. A third voter breaks the tie.",
  nodes: [
    { id: "ca", label: "Client A", kind: "client", col: 0, row: 0 },
    { id: "cb", label: "Client B", kind: "client", col: 0, row: 2 },
    { id: "na", label: "Old leader", kind: "database", col: 1, row: 0 },
    { id: "nb", label: "Standby", kind: "database", col: 1, row: 2 },
    { id: "w", label: "Witness", kind: "service", col: 2, row: 1, sub: "third voter" },
  ],
  edges: [
    { from: "ca", to: "na", label: "write" },
    { from: "cb", to: "nb", label: "write" },
    { from: "na", to: "nb", label: "link", style: "replication" },
    { from: "na", to: "w", label: "vote" },
    { from: "nb", to: "w", label: "vote" },
  ],
  scenarios: [
    {
      id: "two-leaders",
      name: "Two leaders",
      steps: [
        { edge: "na>nb", tone: "error", caption: "The link between the data centers fails. Both nodes are alive.", mark: [{ node: "na", state: "busy" }, { node: "nb", state: "busy" }] },
        { edge: "na>nb", reverse: true, tone: "error", caption: "The standby sees no heartbeat for 30 s and promotes itself. It never learns the old leader is alive." },
        { edge: "ca>na", caption: "Alice books seat 12A on the old leader." },
        { edge: "cb>nb", caption: "Bob books the same seat 12A on the new leader. Both get success.", mark: [{ node: "na", state: "down" }, { node: "nb", state: "down" }] },
        { edge: "na>nb", tone: "error", caption: "The link heals. Two histories disagree about one seat, and one booking must be thrown away." },
      ],
    },
    {
      id: "majority",
      name: "A majority decides",
      steps: [
        { edge: "na>nb", tone: "error", caption: "The same split, but a third Witness holds a vote and sits on the standby side.", mark: [{ node: "na", state: "busy" }, { node: "nb", state: "busy" }] },
        { edge: "nb>w", caption: "The standby asks for a vote to lead. The Witness agrees: 2 of 3." },
        { edge: "nb>w", reverse: true, tone: "ok", caption: "The standby becomes leader of term 2.", mark: [{ node: "nb", state: "ok" }] },
        { edge: "na>w", tone: "error", caption: "The old leader asks the Witness to confirm it can still lead. No answer: it has 1 of 3, no majority." },
        { edge: "ca>na", reverse: true, tone: "error", caption: "The old leader steps down and refuses Alice's write. She retries and reaches the new leader. One history, no double booking.", mark: [{ node: "na", state: "down" }] },
      ],
    },
  ],
};

export const ambiguousTimeout: SequenceSpec = {
  id: "ambiguous-timeout",
  title: "A timeout does not mean it failed",
  description: "The write committed but the acknowledgement was lost. A blind retry applies it twice. An idempotency key makes the retry safe.",
  actors: [
    { id: "client", label: "Client", kind: "client" },
    { id: "api", label: "API", kind: "service" },
    { id: "db", label: "Database", kind: "database" },
  ],
  items: [
    { from: "client", to: "api", label: "pay 49 (key k1)" },
    { from: "api", to: "db", label: "insert payment" },
    { from: "db", to: "api", label: "committed", type: "reply" },
    { note: "The reply to the client is lost. The client times out after 3 s", over: ["api", "client"] },
    {
      alt: [
        {
          when: "blind retry",
          items: [
            { from: "client", to: "api", label: "pay 49 again" },
            { from: "api", to: "db", label: "insert payment" },
            { note: "The customer is charged twice", over: ["db"] },
          ],
        },
        {
          when: "idempotency key",
          items: [
            { from: "client", to: "api", label: "pay 49 (key k1)" },
            { from: "api", to: "db", label: "key k1 seen?" },
            { from: "db", to: "api", label: "yes: return old result", type: "reply" },
            { from: "api", to: "client", label: "ok (charged once)", type: "reply" },
          ],
        },
      ],
    },
  ],
};
