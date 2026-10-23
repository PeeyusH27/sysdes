import type { FlowSpec } from "@/components/diagram/types";
import type { Story } from "../types";

// Small inline pictures: a quorum write, and a stand-in holding a write for a down replica.
const quorum: FlowSpec = {
  id: "story-kv-quorum",
  title: "A write to three replicas",
  description: "The coordinator sends the write to all three replicas and answers after two acknowledge.",
  nodes: [
    { id: "coord", label: "Coordinator", kind: "service", col: 0, row: 1, sub: "any node" },
    { id: "a", label: "Replica A", kind: "database", col: 1, row: 0 },
    { id: "b", label: "Replica B", kind: "database", col: 1, row: 1 },
    { id: "c", label: "Replica C", kind: "database", col: 1, row: 2, sub: "slow" },
  ],
  edges: [
    { from: "coord", to: "a" },
    { from: "coord", to: "b" },
    { from: "coord", to: "c" },
  ],
  scenarios: [
    {
      id: "quorum",
      name: "Quorum",
      steps: [
        { edge: "coord>a", caption: "The write goes to all three replicas at once.", with: [{ edge: "coord>b", caption: "" }, { edge: "coord>c", caption: "" }] },
        { edge: "coord>a", reverse: true, caption: "A acknowledges.", mark: [{ node: "a", state: "ok" }] },
        { edge: "coord>b", reverse: true, tone: "ok", caption: "B acknowledges. Two acks: the client gets success.", mark: [{ node: "b", state: "ok" }] },
        { edge: "coord>c", reverse: true, caption: "C is slow. It catches up on its own.", mark: [{ node: "c", state: "ok" }] },
      ],
    },
  ],
};

const hint: FlowSpec = {
  id: "story-kv-hint",
  title: "Hinted handoff",
  description: "A healthy neighbour holds a write for a down replica and hands it over when the replica returns.",
  nodes: [
    { id: "coord", label: "Coordinator", kind: "service", col: 0, row: 1 },
    { id: "c", label: "Replica C", kind: "database", col: 1, row: 0, sub: "down" },
    { id: "stand", label: "Stand-in", kind: "database", col: 1, row: 2, sub: "next on ring" },
  ],
  edges: [
    { from: "coord", to: "c" },
    { from: "coord", to: "stand", label: "hint", style: "async" },
    { from: "stand", to: "c", label: "hand back", style: "async" },
  ],
  scenarios: [
    {
      id: "hint",
      name: "Hint",
      steps: [
        { edge: "coord>c", tone: "error", caption: "Replica C is down. The write cannot reach it.", mark: [{ node: "c", state: "down" }] },
        { edge: "coord>stand", caption: "A stand-in keeps the write, tagged for C.", mark: [{ node: "stand", state: "ok" }] },
        { edge: "stand>c", tone: "ok", caption: "C returns. The stand-in hands the write over.", mark: [{ node: "c", state: "ok" }] },
      ],
    },
  ],
};

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "More data than one machine",
      line: "Keep three copies of everything, and the disks add up fast.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Data", value: "100 TB" },
          { label: "Copies", value: "3" },
          { label: "Usable per node", value: "6 TB" },
        ],
        result: { label: "Nodes", value: "50" },
        verdict: { text: "Spread across many machines", tone: "warn" },
      },
    },
    {
      tag: "fix",
      head: "Copies on three nodes",
      line: "Write to all three. Answer when two have it.",
      scene: { kind: "flow", spec: quorum, scenario: "quorum" },
    },
    {
      tag: "choose",
      head: "Where does a key live?",
      line: "Add a machine, and see how many keys must move.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Hash mod N", tone: "bad", why: "Over 90% of keys move" },
          { label: "Ring, 1 point", tone: "warn", why: "Some nodes get 3x load" },
          { label: "Ring, many points", tone: "good", why: "About 2% move, load is even" },
        ],
      },
      predict: { q: "Add node 51 to a 50-node ring. Keys moved?", options: ["About 2%", "About 90%"], answer: 0, why: "The new node takes small arcs: roughly 1 in 51 keys." },
    },
    {
      tag: "sum",
      head: "How many acks?",
      line: "Reads ask 2 replicas. Drag the acks a write waits for.",
      scene: {
        kind: "meter",
        label: "Write acks needed",
        unit: "acks",
        min: 1,
        max: 3,
        start: 2,
        stops: [
          { upTo: 1.4, verdict: "1 + 2 is not above 3. Stale reads.", tone: "bad" },
          { upTo: 2.4, verdict: "2 + 2 is above 3. Reads see the latest.", tone: "good" },
          { upTo: 3, verdict: "Safe, but one dead node blocks writes.", tone: "warn" },
        ],
      },
    },
    {
      tag: "catch",
      head: "A replica is down",
      line: "Do not fail the write. Hold it for the replica.",
      scene: { kind: "flow", spec: hint, scenario: "hint" },
    },
    {
      tag: "skip",
      head: "Start simple",
      line: "A leaderless store is a lot to run.",
      scene: {
        kind: "versus",
        left: { title: "Try first", points: ["One primary, replicas", "Fixed shards", "Last write wins"] },
        right: { title: "Add when", points: ["No downtime allowed: leaderless", "Nodes come and go: ring", "Concurrent writes: vector clocks"] },
      },
    },
  ],
};
