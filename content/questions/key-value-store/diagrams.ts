import type { FlowSpec, SequenceSpec } from "@/components/diagram/types";

export const architecture: FlowSpec = {
  id: "key-value-store-architecture",
  title: "Distributed key-value store",
  description:
    "Any node can coordinate a request. It hashes the key onto the ring, finds the three replicas in the key's preference list, and sends the write or read to them. A write succeeds after W acknowledgements, a read after R responses. Down replicas get their writes through a stand-in (hinted handoff), and a background process compares Merkle trees to repair drift.",
  nodes: [
    { id: "client", label: "Client SDK", kind: "client", col: 0, row: 1, sub: "knows the ring" },
    { id: "coord", label: "Coordinator", kind: "service", col: 1, row: 1, sub: "any node", note: "Whichever node receives the request. It is not special: every node can compute the key's replicas, so there is no leader and no single point of failure." },
    { id: "ring", label: "Ring + gossip", kind: "cache", col: 1, row: 0, sub: "membership", note: "Every node keeps the full ring in memory, learned by gossip: each node tells a few random peers what it knows every second." },
    { id: "r1", label: "Replica 1", kind: "database", col: 2, row: 0, sub: "LSM storage" },
    { id: "r2", label: "Replica 2", kind: "database", col: 2, row: 1, sub: "LSM storage" },
    { id: "r3", label: "Replica 3", kind: "database", col: 2, row: 2, sub: "LSM storage" },
    { id: "repair", label: "Anti-entropy", kind: "worker", col: 3, row: 0, sub: "Merkle trees", note: "Background job. Replicas of a key range exchange Merkle tree hashes and copy only the keys under mismatching branches." },
    { id: "standin", label: "Stand-in node", kind: "database", col: 3, row: 2, sub: "holds hints", note: "The next healthy node on the ring. It stores writes meant for a down replica and hands them over when it returns." },
  ],
  edges: [
    { from: "client", to: "coord", label: "put / get" },
    { from: "coord", to: "ring", label: "preference list" },
    { from: "coord", to: "r1", label: "replicate" },
    { from: "coord", to: "r2", label: "replicate" },
    { from: "coord", to: "r3", label: "replicate" },
    { from: "coord", to: "standin", label: "hint", style: "async" },
    { from: "standin", to: "r3", label: "hand back", style: "async" },
    { from: "repair", to: "r1", label: "compare trees", style: "replication" },
    { from: "repair", to: "r3", label: "compare trees", style: "replication" },
  ],
  scenarios: [
    {
      id: "write",
      name: "Write, W = 2 of 3",
      steps: [
        { edge: "client>coord", caption: "put('cart:42', value). The SDK sends it to any node; this one becomes the coordinator." },
        { edge: "coord>ring", caption: "The coordinator hashes the key onto the ring. The next three distinct nodes clockwise are the replicas." },
        {
          edge: "coord>r1",
          caption: "It sends the write to all three replicas at once, stamped with a version (a vector clock).",
          with: [{ edge: "coord>r2", caption: "" }, { edge: "coord>r3", caption: "" }],
        },
        { edge: "coord>r1", reverse: true, caption: "Replica 1 appends to its log and acknowledges.", mark: [{ node: "r1", state: "ok" }] },
        { edge: "coord>r2", reverse: true, tone: "ok", caption: "Replica 2 acknowledges. That is W = 2 acks, so the coordinator can answer the client now.", mark: [{ node: "r2", state: "ok" }] },
        { edge: "client>coord", reverse: true, tone: "ok", caption: "The client gets success. Replica 3 is slow, and will catch up on its own." },
      ],
    },
    {
      id: "read-repair",
      name: "Read and read repair",
      steps: [
        { edge: "client>coord", caption: "get('cart:42'). The coordinator asks R = 2 replicas." },
        { edge: "coord>r1", caption: "Replica 1 and replica 2 are asked together.", with: [{ edge: "coord>r2", caption: "" }] },
        { edge: "coord>r1", reverse: true, caption: "Replica 1 returns version 7.", mark: [{ node: "r1", state: "ok" }] },
        { edge: "coord>r2", reverse: true, tone: "miss", caption: "Replica 2 returns version 6: it missed the last write.", mark: [{ node: "r2", state: "miss" }] },
        { edge: "client>coord", reverse: true, tone: "ok", caption: "Version 7 supersedes version 6 (its clock includes it), so the client gets version 7. Reads and writes overlap on at least one replica, because R + W = 4 > 3." },
        { edge: "coord>r2", caption: "Read repair: the coordinator also writes version 7 to replica 2 in the background.", mark: [{ node: "r2", state: "ok" }] },
      ],
    },
    {
      id: "hinted",
      name: "Replica down: hinted handoff",
      steps: [
        { edge: "coord>r3", tone: "error", caption: "Replica 3's machine is down. The write cannot reach it.", mark: [{ node: "r3", state: "down" }] },
        { edge: "coord>r1", caption: "Replicas 1 and 2 still acknowledge, so the write succeeds with W = 2.", with: [{ edge: "coord>r2", caption: "" }] },
        { edge: "coord>standin", caption: "The coordinator also hands the write to the next healthy node on the ring, tagged 'for replica 3'.", mark: [{ node: "standin", state: "ok" }] },
        { edge: "standin>r3", caption: "Later, replica 3 comes back. The stand-in notices and delivers the hinted writes.", mark: [{ node: "r3", state: null }] },
        { edge: "standin>r3", tone: "ok", caption: "Replica 3 is current again without any operator action. The stand-in deletes the hints.", mark: [{ node: "r3", state: "ok" }] },
      ],
    },
    {
      id: "anti-entropy",
      name: "Anti-entropy repair",
      steps: [
        { edge: "repair>r1", caption: "Hints can be lost, and a disk can silently lose a key. A background job compares replicas of the same key range." },
        { edge: "repair>r3", caption: "Each replica builds a Merkle tree: hashes of leaves, hashes of hashes, up to one root." },
        { edge: "repair>r3", reverse: true, tone: "miss", caption: "The roots differ. The job walks down only the branches whose hashes differ.", mark: [{ node: "r3", state: "miss" }] },
        { edge: "repair>r1", caption: "In about 21 comparisons it finds the one leaf that differs, out of 1,024." },
        { edge: "repair>r3", tone: "ok", caption: "Only the keys in that leaf are copied. Replica 3 matches again.", mark: [{ node: "r3", state: "ok" }] },
      ],
    },
  ],
};

export const conflictSequence: SequenceSpec = {
  id: "key-value-store-conflict-sequence",
  title: "Two writes during a partition",
  description:
    "Two clients write the same key through different coordinators without seeing each other. Vector clocks detect that neither write supersedes the other and keep both as siblings. Last-write-wins instead keeps the one with the later timestamp and silently drops the other.",
  actors: [
    { id: "a", label: "Client A", kind: "client" },
    { id: "x", label: "Node X", kind: "database" },
    { id: "y", label: "Node Y", kind: "database" },
    { id: "b", label: "Client B", kind: "client" },
  ],
  items: [
    { note: "Both clients read the cart at clock {X:1}", over: ["a", "b"] },
    { from: "a", to: "x", label: "put cart=[pen], clock {X:1}" },
    { note: "Network split: X and Y cannot talk", over: ["x", "y"] },
    { from: "b", to: "y", label: "put cart=[mug], clock {X:1}" },
    {
      alt: [
        {
          when: "vector clocks",
          items: [
            { note: "X stores [pen] at {X:2}. Y stores [mug] at {X:1,Y:1}", over: ["x", "y"] },
            { note: "The split heals. Neither clock includes the other: concurrent", over: ["x", "y"] },
            { from: "a", to: "x", label: "get cart" },
            { from: "x", to: "a", label: "siblings: [pen], [mug]", type: "reply" },
            { from: "a", to: "x", label: "put [pen, mug], context {X:2,Y:1}" },
            { note: "The merged write supersedes both siblings. No update was lost.", over: ["x", "y"] },
          ],
        },
        {
          when: "last write wins",
          items: [
            { note: "X stamps [pen] at 12:00:00.300. Y stamps [mug] at 12:00:00.100 (its clock runs slow)", over: ["x", "y"] },
            { note: "The split heals. The higher timestamp wins: [pen]", over: ["x", "y"] },
            { from: "b", to: "y", label: "get cart" },
            { from: "y", to: "b", label: "[pen]", type: "reply" },
            { note: "B's mug is gone, silently. Simple, but only safe when overwrites are fine", over: ["b", "y"] },
          ],
        },
      ],
    },
  ],
};
