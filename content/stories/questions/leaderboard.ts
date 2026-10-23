import type { FlowSpec } from "@/components/diagram/types";
import type { Story } from "../types";

// "My rank" asked two ways: SQL counts every higher score, a Redis sorted set reads the rank off a skip list.
// The page's own architecture has 10 nodes, so this picture is a small one.
const rank: FlowSpec = {
  id: "story-leaderboard",
  title: "Asking for my rank",
  description: "A player opens My rank. The API asks either the scores table or a Redis sorted set.",
  nodes: [
    { id: "app", label: "Player app", kind: "client", col: 0, row: 1 },
    { id: "api", label: "Leaderboard API", kind: "service", col: 1, row: 1 },
    { id: "db", label: "Scores table", kind: "database", col: 2, row: 0, sub: "SQL" },
    { id: "zset", label: "Sorted set", kind: "cache", col: 2, row: 2, sub: "Redis" },
  ],
  edges: [
    { from: "app", to: "api" },
    { from: "api", to: "db" },
    { from: "api", to: "zset" },
  ],
  scenarios: [
    {
      id: "sql",
      name: "Count in SQL",
      steps: [
        { edge: "app>api", caption: "A million players open My rank after a final.", with: [{ edge: "app>api", caption: "" }, { edge: "app>api", caption: "" }] },
        { edge: "api>db", caption: "Each asks: how many players score higher?", with: [{ edge: "api>db", caption: "" }, { edge: "api>db", caption: "" }], mark: [{ node: "db", state: "busy" }] },
        { edge: "api>db", reverse: true, tone: "error", caption: "Every query walks millions of rows.", mark: [{ node: "db", state: "down" }] },
        { edge: "app>api", reverse: true, tone: "error", caption: "Ranks arrive late, or not at all." },
      ],
    },
    {
      id: "sorted",
      name: "Read from the sorted set",
      steps: [
        { edge: "app>api", caption: "The same crowd opens My rank.", with: [{ edge: "app>api", caption: "" }, { edge: "app>api", caption: "" }], mark: [{ node: "db", state: null }] },
        { edge: "api>zset", caption: "The API asks for Maya's rank.", with: [{ edge: "api>zset", caption: "" }] },
        { edge: "api>zset", reverse: true, tone: "ok", caption: "Counts add up on the way down: a few dozen hops.", mark: [{ node: "zset", state: "hit" }] },
        { edge: "app>api", reverse: true, tone: "ok", caption: "Maya's rank comes back, even among 50 million." },
      ],
    },
  ],
};

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "My rank counts everyone",
      line: "Top 100 is easy. Your own rank means counting all higher scores.",
      scene: { kind: "flow", spec: rank, scenario: "sql" },
      predict: { q: "To rank one player, SQL must do what?", options: ["Read one row", "Count every higher score"], answer: 1, why: "A rank is one plus the number of players above you." },
    },
    {
      tag: "sum",
      head: "SQL or sorted set?",
      line: "Drag the player count. Rank reads grow with it.",
      scene: {
        kind: "meter",
        label: "Players",
        unit: "players",
        min: 1000,
        max: 100000000,
        start: 1000000,
        log: true,
        stops: [
          { upTo: 50000, verdict: "SQL is fine. Skip Redis.", tone: "good" },
          { upTo: 5000000, verdict: "Borderline. Cache or add replicas.", tone: "warn" },
          { upTo: 100000000, verdict: "Sorted set. SQL scans millions each time.", tone: "bad" },
        ],
      },
      predict: { q: "50M players, 12K rank reads a second. Stay on SQL?", options: ["Yes", "No, use a sorted set"], answer: 1, why: "Each read would scan millions of rows, 12K times a second." },
    },
    {
      tag: "idea",
      head: "The set counts for you",
      line: "Each link keeps a count. Adding them on the way down gives the rank.",
      scene: { kind: "flow", spec: rank, scenario: "sorted" },
    },
    {
      tag: "choose",
      head: "Pick a tie rule",
      line: "Equal scores need a rule. Say which one you use.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Shared ranks", tone: "good", why: "Count above you plus one: 1, 2, 2, 4" },
          { label: "Dense ranks", tone: "warn", why: "Needs a second set" },
          { label: "First to reach", tone: "warn", why: "Packs time into the score" },
          { label: "Built-in rank only", tone: "bad", why: "Breaks ties by member name" },
        ],
      },
      predict: { q: "Tied players: the built-in rank orders them by what?", options: ["Time reached", "Member name"], answer: 1, why: "Redis orders equal scores by member name, not by who got there first." },
    },
    {
      tag: "catch",
      head: "A replay counts points twice",
      line: "A redelivered event adds its points again. The script remembers the last one applied.",
      scene: {
        kind: "versus",
        left: { title: "Replayed event", points: ["The same event arrives twice", "Points are added twice", "Maya gains points twice"] },
        right: { title: "Remember and skip", points: ["Store the last event applied", "Seen it? Skip it", "Check and add in one step"] },
      },
    },
    {
      tag: "skip",
      head: "Do not shard yet",
      line: "Add the peak and the memory. One primary and a replica hold it.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Peak score events", value: "12K a second" },
          { label: "All boards in memory", value: "~17 GB" },
        ],
        result: { label: "Redis setup", value: "1 + replica" },
        verdict: { text: "One node is enough", tone: "good" },
      },
    },
  ],
};
