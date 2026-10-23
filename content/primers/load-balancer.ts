import type { Primer } from "./types";

export const primer: Primer = {
  id: "load-balancer",
  title: "What is a load balancer?",
  idea: "A load balancer stands in front of several servers and shares incoming requests among them, skipping any server that is down.",
  doodle: "load-balancer",
  analogy: "A traffic cop at a junction: every arriving car is waved into one of several lanes, and a blocked lane is skipped.",
  flow: {
    id: "primer-load-balancer",
    title: "One server versus a load balancer",
    description: "Without a balancer one server takes the whole crowd and falls over. With one, requests are shared and a dead server is skipped.",
    nodes: [
      { id: "users", label: "Users", kind: "client", col: 0, row: 0 },
      { id: "lb", label: "Load balancer", kind: "lb", col: 1, row: 1 },
      { id: "a", label: "Server A", kind: "service", col: 2, row: 0 },
      { id: "b", label: "Server B", kind: "service", col: 2, row: 1 },
      { id: "c", label: "Server C", kind: "service", col: 2, row: 2 },
    ],
    edges: [
      { from: "users", to: "a" },
      { from: "users", to: "lb" },
      { from: "lb", to: "a" },
      { from: "lb", to: "b" },
      { from: "lb", to: "c" },
    ],
    scenarios: [
      {
        id: "without",
        name: "Without a balancer",
        steps: [
          {
            edge: "users>a",
            caption: "Every user is sent to Server A, and a big crowd arrives.",
            with: [{ edge: "users>a", caption: "" }, { edge: "users>a", caption: "" }],
            mark: [{ node: "a", state: "busy" }],
          },
          {
            edge: "users>a",
            tone: "error",
            caption: "The line of waiting requests keeps growing.",
            with: [{ edge: "users>a", tone: "error", caption: "" }, { edge: "users>a", tone: "error", caption: "" }],
          },
          { edge: "users>a", reverse: true, tone: "error", caption: "Replies get slower and slower." },
          { edge: "users>a", reverse: true, tone: "error", caption: "Server A runs out of memory and crashes. The site is down.", mark: [{ node: "a", state: "down" }] },
          { edge: "users>a", tone: "error", caption: "New users get errors, while two spare servers sit idle." },
        ],
      },
      {
        id: "with",
        name: "With a balancer",
        steps: [
          {
            edge: "users>lb",
            caption: "The same crowd arrives, but now at a load balancer.",
            with: [{ edge: "users>lb", caption: "" }, { edge: "users>lb", caption: "" }],
            mark: [{ node: "a", state: null }],
          },
          {
            edge: "lb>a",
            caption: "It hands requests out in turns: A, then B, then C.",
            with: [{ edge: "lb>b", caption: "" }, { edge: "lb>c", caption: "" }],
          },
          {
            edge: "lb>a",
            reverse: true,
            tone: "ok",
            caption: "Each server has a third of the work and answers fast.",
            with: [{ edge: "lb>b", reverse: true, tone: "ok", caption: "" }, { edge: "lb>c", reverse: true, tone: "ok", caption: "" }],
            mark: [{ node: "a", state: "ok" }, { node: "b", state: "ok" }, { node: "c", state: "ok" }],
          },
          { edge: "users>lb", reverse: true, tone: "ok", caption: "Replies go back to users through the balancer." },
        ],
      },
      {
        id: "dead",
        name: "When a server dies",
        steps: [
          { edge: "lb>b", caption: "The balancer keeps asking each server: are you alive?", mark: [{ node: "a", state: null }, { node: "b", state: null }, { node: "c", state: null }] },
          { edge: "lb>b", reverse: true, tone: "error", caption: "Server B does not answer. The balancer marks it as dead.", mark: [{ node: "b", state: "down" }] },
          {
            edge: "users>lb",
            caption: "New requests arrive.",
            with: [{ edge: "users>lb", caption: "" }],
          },
          {
            edge: "lb>a",
            tone: "ok",
            caption: "They go only to Servers A and C.",
            with: [{ edge: "lb>c", tone: "ok", caption: "" }],
          },
          { edge: "users>lb", reverse: true, tone: "ok", caption: "Users notice nothing, and the site stays up." },
        ],
      },
    ],
  },
  remember: [
    "One server has a limit, and a crowd can break it.",
    "A load balancer shares requests across many servers.",
    "It checks health and stops sending traffic to dead servers.",
  ],
  whenToUse: "When one server cannot carry the traffic, or its crash would take the site down. Not for a one-server hobby app.",
  theCatch: "Everything flows through it, so if the only balancer dies, three healthy servers become unreachable. Run two.",
  say: "I would put a load balancer in front of stateless servers. It spreads traffic, health-checks them, and lets us add servers or lose one without downtime.",
  learnMore: [{ href: "/learn/api-load-balancing", label: "APIs and load balancing" }],
};
