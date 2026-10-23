import type { Primer } from "./types";

export const primer: Primer = {
  id: "consistent-hashing",
  title: "What is consistent hashing?",
  idea: "It matches keys to servers so that adding or removing a server moves only a small share of the keys.",
  doodle: "consistent-hash",
  analogy: "Servers sit at spots around a clock face. Each key walks clockwise to the first server it meets.",
  flow: {
    id: "primer-consistent-hashing",
    title: "Adding a server: mod versus a ring",
    description: "With key mod N, adding a server reshuffles most keys. On a ring, only a small part moves, and only to the new server.",
    nodes: [
      { id: "keys", label: "Keys", kind: "client", col: 0, row: 1 },
      { id: "a", label: "Server A", kind: "cache", col: 1, row: 0 },
      { id: "b", label: "Server B", kind: "cache", col: 1, row: 1 },
      { id: "c", label: "Server C", kind: "cache", col: 1, row: 2 },
      { id: "d", label: "Server D", kind: "cache", col: 2, row: 2, sub: "new" },
    ],
    edges: [
      { from: "keys", to: "a" },
      { from: "keys", to: "b" },
      { from: "keys", to: "c" },
      { from: "keys", to: "d" },
    ],
    scenarios: [
      {
        id: "without",
        name: "Without a ring",
        steps: [
          {
            edge: "keys>a",
            caption: "Three cache servers share keys. Rule: key mod 3. Key 42 goes to Server A.",
            with: [{ edge: "keys>b", caption: "" }, { edge: "keys>c", caption: "" }],
          },
          { edge: "keys>d", tone: "ok", caption: "Traffic grows, so Server D is added. The rule becomes key mod 4.", mark: [{ node: "d", state: "ok" }] },
          { edge: "keys>c", tone: "miss", caption: "Key 42 now maps to Server C, because 42 mod 4 is 2.", mark: [{ node: "c", state: "miss" }] },
          {
            edge: "keys>a",
            tone: "miss",
            caption: "About three keys in four change servers, so most lookups miss.",
            with: [{ edge: "keys>b", tone: "miss", caption: "" }, { edge: "keys>d", tone: "miss", caption: "" }],
            mark: [{ node: "a", state: "miss" }, { node: "b", state: "miss" }],
          },
          { edge: "keys>d", tone: "error", caption: "With 100 servers, adding one still moves about 99 keys in 100." },
        ],
      },
      {
        id: "with",
        name: "With a ring",
        steps: [
          { edge: "keys>a", caption: "Picture a clock face. Servers and keys both sit at spots on it.", mark: [{ node: "a", state: null }, { node: "b", state: null }, { node: "c", state: null }, { node: "d", state: null }] },
          { edge: "keys>a", tone: "ok", caption: "A key walks clockwise to the first server it meets. Key 42 reaches Server A." },
          { edge: "keys>d", caption: "Server D is added at one new spot on the clock.", mark: [{ node: "d", state: "ok" }] },
          { edge: "keys>d", tone: "ok", caption: "D takes over only the keys just before it, about one in four." },
          { edge: "keys>a", tone: "ok", caption: "Key 42 stays on Server A. Every other key stays where it was." },
          { edge: "keys>d", tone: "ok", caption: "With 100 servers, adding one moves only about 1 key in 100." },
        ],
      },
    ],
  },
  remember: [
    "Plain key mod N reshuffles almost every key when N changes.",
    "On a ring, a new server takes keys only from its neighbour.",
    "So adding or losing a server disturbs very little.",
  ],
  whenToUse: "When keys are spread over servers that come and go, like a 20-node cache. A fixed server count can use plain mod.",
  theCatch: "With few spots on the ring, one server can own a huge slice and melt, so each takes many spots.",
  say: "I would use consistent hashing so adding or removing a node remaps only about 1/N of the keys, with virtual nodes to even out the load.",
  learnMore: [{ href: "/deep-dives/sharding-strategies", label: "Sharding strategies" }],
};
