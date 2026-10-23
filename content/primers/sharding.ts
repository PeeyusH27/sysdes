import type { Primer } from "./types";

export const primer: Primer = {
  id: "sharding",
  title: "What is sharding?",
  idea: "Sharding splits one big dataset into slices by a key, so each machine holds only one slice and does only its share.",
  doodle: "shard",
  analogy: "One overflowing cabinet is split into three narrower ones, and each holds only one slice of the alphabet.",
  flow: {
    id: "primer-sharding",
    title: "One database versus slices",
    description: "One database gets too big or too busy. Splitting the data by a key gives each machine a slice, with two catches.",
    nodes: [
      { id: "app", label: "Your app", kind: "service", col: 0, row: 1 },
      { id: "big", label: "One database", kind: "database", col: 1, row: 0 },
      { id: "router", label: "Router", kind: "gateway", col: 1, row: 1, sub: "picks by key" },
      { id: "s1", label: "Slice 1", kind: "database", col: 2, row: 0 },
      { id: "s2", label: "Slice 2", kind: "database", col: 2, row: 1 },
      { id: "s3", label: "Slice 3", kind: "database", col: 2, row: 2 },
    ],
    edges: [
      { from: "app", to: "big" },
      { from: "app", to: "router" },
      { from: "router", to: "s1" },
      { from: "router", to: "s2" },
      { from: "router", to: "s3" },
    ],
    scenarios: [
      {
        id: "without",
        name: "Without sharding",
        steps: [
          {
            edge: "app>big",
            caption: "Millions of users all ask one database.",
            with: [{ edge: "app>big", caption: "" }, { edge: "app>big", caption: "" }],
            mark: [{ node: "big", state: "busy" }],
          },
          { edge: "app>big", tone: "error", caption: "Its disk is nearly full and its processor is maxed out." },
          { edge: "app>big", reverse: true, tone: "error", caption: "Answers slow down. A bigger machine helps for a while, then costs too much.", mark: [{ node: "big", state: "down" }] },
        ],
      },
      {
        id: "with",
        name: "With sharding",
        steps: [
          { edge: "app>router", caption: "A request for user 42 arrives. The app asks the router.", mark: [{ node: "big", state: null }] },
          { edge: "router>s2", tone: "ok", caption: "The router uses the key, user 42, and picks Slice 2." },
          { edge: "router>s2", reverse: true, tone: "ok", caption: "Slice 2 holds only a third of the data, so it answers fast.", mark: [{ node: "s2", state: "hit" }] },
          {
            edge: "router>s1",
            tone: "ok",
            caption: "Other users go to other slices at the same time.",
            with: [{ edge: "router>s3", tone: "ok", caption: "" }, { edge: "router>s2", tone: "ok", caption: "" }],
            mark: [{ node: "s2", state: null }],
          },
        ],
      },
      {
        id: "catch",
        name: "When it gets awkward",
        steps: [
          { edge: "app>router", caption: "A question asks about all users, such as orders in the last hour." },
          {
            edge: "router>s1",
            caption: "No single key applies, so the router must ask every slice.",
            with: [{ edge: "router>s2", caption: "" }, { edge: "router>s3", caption: "" }],
          },
          { edge: "app>router", reverse: true, tone: "miss", caption: "The answers are merged, which is slower and harder than one lookup." },
          {
            edge: "router>s2",
            tone: "error",
            caption: "A very popular key sends its whole crowd to one slice.",
            with: [{ edge: "router>s2", tone: "error", caption: "" }, { edge: "router>s2", tone: "error", caption: "" }],
            mark: [{ node: "s2", state: "busy" }],
          },
        ],
      },
    ],
  },
  remember: [
    "Sharding splits the data by a key across machines.",
    "Each machine holds a slice and does only its share.",
    "Questions that span slices are harder, and a popular key runs hot.",
  ],
  whenToUse: "When one database cannot take the writes (tens of thousands a second), even with caching and copies. Not for 2K writes.",
  theCatch: "A celebrity's posts all hit one slice and it melts. Questions across slices get slower, and moving data later hurts.",
  say: "I would shard only when one machine cannot cope. I would pick a key that spreads load evenly and keeps common queries on a single shard.",
  learnMore: [{ href: "/deep-dives/sharding-strategies", label: "Sharding strategies" }],
};
