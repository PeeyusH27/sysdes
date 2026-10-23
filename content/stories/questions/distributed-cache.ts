import type { FlowSpec } from "@/components/diagram/types";
import type { Story } from "../types";

// Small inline pictures: the cache absorbing reads, and a node dying.
const absorb: FlowSpec = {
  id: "story-dcache-absorb",
  title: "The cache absorbs the reads",
  description: "Most reads are answered by cache nodes. Only misses reach the database.",
  nodes: [
    { id: "app", label: "App servers", kind: "service", col: 0, row: 1 },
    { id: "cache", label: "Cache nodes", kind: "cache", col: 1, row: 1, sub: "in memory" },
    { id: "db", label: "Database", kind: "database", col: 2, row: 1, sub: "20K reads/s" },
  ],
  edges: [
    { from: "app", to: "cache", label: "get" },
    { from: "app", to: "db", label: "miss" },
  ],
  scenarios: [
    {
      id: "absorb",
      name: "Absorb",
      steps: [
        { edge: "app>cache", caption: "A read arrives. Ask the cache first." },
        { edge: "app>cache", reverse: true, tone: "ok", caption: "Hit. 98 of every 100 reads end here.", mark: [{ node: "cache", state: "hit" }] },
        { edge: "app>cache", tone: "miss", caption: "A miss: the key is not cached.", mark: [{ node: "cache", state: "miss" }] },
        { edge: "app>db", caption: "Only misses reach the database. Then fill the cache.", mark: [{ node: "cache", state: null }] },
      ],
    },
  ],
};

const lose: FlowSpec = {
  id: "story-dcache-lose",
  title: "A cache node dies",
  description: "A dead node's keys move to the survivors, and the burst of misses must not overwhelm the database.",
  nodes: [
    { id: "app", label: "App servers", kind: "service", col: 0, row: 1 },
    { id: "dead", label: "Cache node B", kind: "cache", col: 1, row: 0, sub: "down" },
    { id: "alive", label: "Other nodes", kind: "cache", col: 1, row: 2 },
    { id: "db", label: "Database", kind: "database", col: 2, row: 1 },
  ],
  edges: [
    { from: "app", to: "dead" },
    { from: "app", to: "alive" },
    { from: "app", to: "db", label: "misses" },
  ],
  scenarios: [
    {
      id: "lose",
      name: "Lose a node",
      steps: [
        { edge: "app>dead", tone: "error", caption: "Node B dies. About 8% of keys vanish.", mark: [{ node: "dead", state: "down" }] },
        { edge: "app>alive", caption: "Its keys move to the surviving nodes. Nothing else moves." },
        { edge: "app>db", tone: "miss", caption: "The first reads of those keys miss. A burst hits the database.", mark: [{ node: "db", state: "busy" }] },
        { edge: "app>db", tone: "ok", caption: "One load per key, then a rate limit. The survivors refill.", mark: [{ node: "db", state: null }, { node: "alive", state: "ok" }] },
      ],
    },
  ],
};

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "The database cannot take it",
      line: "Traffic is far above what the database can read.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Reads a second", value: "1,000,000" },
          { label: "Database limit", value: "20,000" },
        ],
        result: { label: "Must be cached", value: "98%" },
        verdict: { text: "The cache must absorb nearly all", tone: "warn" },
      },
    },
    {
      tag: "fix",
      head: "Answer from memory",
      line: "Ask the cache first. Only misses go on.",
      scene: { kind: "flow", spec: absorb, scenario: "absorb" },
    },
    {
      tag: "sum",
      head: "Does the hit ratio hold?",
      line: "Drag the hit ratio. See what reaches the database.",
      scene: {
        kind: "meter",
        label: "Cache hit ratio",
        unit: "%",
        min: 50,
        max: 100,
        start: 95,
        stops: [
          { upTo: 90, verdict: "Over 100K reads a second reach the database.", tone: "bad" },
          { upTo: 97.9, verdict: "Still over 20K a second. Too many.", tone: "warn" },
          { upTo: 100, verdict: "At or below 20K a second. Safe.", tone: "good" },
        ],
      },
      predict: { q: "At a 95% hit ratio, reads reaching the database?", options: ["50,000 a second", "5,000 a second"], answer: 0, why: "5% of 1,000,000 is 50,000, more than double the limit." },
    },
    {
      tag: "choose",
      head: "A hot key expires",
      line: "1,000 requests miss in the same moment. What helps?",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Single flight", tone: "good", why: "One load, everyone waits" },
          { label: "Jittered TTLs", tone: "good", why: "Keys stop expiring together" },
          { label: "Retry fast", tone: "bad", why: "Multiplies the database load" },
          { label: "Do nothing", tone: "bad", why: "1,000 identical queries" },
        ],
      },
    },
    {
      tag: "catch",
      head: "A node dies",
      line: "About 8% of keys miss at once.",
      scene: { kind: "flow", spec: lose, scenario: "lose" },
    },
    {
      tag: "skip",
      head: "Start simple",
      line: "Add each guard when the traffic needs it.",
      scene: {
        kind: "versus",
        left: { title: "Try first", points: ["One cache node", "Cache-aside with a TTL", "Delete on write"] },
        right: { title: "Add when", points: ["Big working set: shard", "Stampedes: single flight", "Hot keys: local copies"] },
      },
    },
  ],
};
