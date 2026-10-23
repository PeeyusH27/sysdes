import type { Primer } from "./types";

export const primer: Primer = {
  id: "circuit-breaker",
  title: "What is a circuit breaker?",
  idea: "When a service you depend on keeps failing, stop calling it for a while and fail fast, so trouble does not spread.",
  doodle: "circuit-breaker",
  analogy:
    "A fuse box flips its switch off when too much current surges in, cutting the wire so the house is safe. A breaker does that for calls.",
  flow: {
    id: "primer-circuit-breaker",
    title: "A failing service and a breaker",
    description: "Customers use your app, which calls a pricing service that is failing, through a breaker.",
    nodes: [
      { id: "client", label: "Customers", kind: "client", col: 0, row: 1 },
      { id: "app", label: "Your app", kind: "service", col: 1, row: 1 },
      { id: "breaker", label: "Breaker", kind: "gateway", col: 2, row: 1 },
      { id: "svc", label: "Pricing service", kind: "external", col: 3, row: 1 },
    ],
    edges: [
      { from: "client", to: "app" },
      { from: "app", to: "breaker" },
      { from: "breaker", to: "svc" },
    ],
    scenarios: [
      {
        id: "without",
        name: "Without a breaker",
        steps: [
          {
            edge: "client>app",
            caption: "The pricing service is struggling, but customers keep arriving.",
            with: [{ edge: "client>app", caption: "" }, { edge: "client>app", caption: "" }],
            mark: [{ node: "svc", state: "down" }],
          },
          {
            edge: "app>breaker",
            caption: "With no breaker, every request goes straight through to the service.",
            with: [{ edge: "app>breaker", caption: "" }, { edge: "app>breaker", caption: "" }],
          },
          {
            edge: "breaker>svc",
            tone: "error",
            caption: "The service is stuck. Each call waits 30 seconds, then fails.",
            with: [{ edge: "breaker>svc", tone: "error", caption: "" }],
          },
          {
            edge: "app>breaker",
            reverse: true,
            tone: "error",
            caption: "Waiting calls pile up and use up the app's workers.",
            mark: [{ node: "app", state: "busy" }],
          },
          {
            edge: "client>app",
            reverse: true,
            tone: "error",
            caption: "Now every page is slow, even ones that never needed prices.",
          },
        ],
      },
      {
        id: "with",
        name: "With a breaker",
        steps: [
          {
            edge: "client>app",
            caption: "After a few failures in a row, the breaker trips open, like a fuse.",
            mark: [{ node: "svc", state: "down" }, { node: "breaker", state: "miss" }],
          },
          { edge: "app>breaker", caption: "A new request reaches the breaker." },
          {
            edge: "app>breaker",
            reverse: true,
            tone: "error",
            caption: "It does not even try the service. It fails in about 1 ms.",
          },
          {
            edge: "client>app",
            reverse: true,
            tone: "ok",
            caption: "The customer sees a quick fallback, and the app stays healthy.",
          },
          {
            edge: "breaker>svc",
            caption: "After 30 seconds, the breaker lets one test request through.",
            mark: [{ node: "breaker", state: "busy" }],
          },
          {
            edge: "breaker>svc",
            reverse: true,
            tone: "ok",
            caption: "The service answers. The breaker closes and traffic flows again.",
            mark: [{ node: "svc", state: null }, { node: "breaker", state: null }],
          },
        ],
      },
    ],
  },
  remember: [
    "Waiting on a dead service hurts you more than failing fast.",
    "After a few failures, the breaker stops calls for a while.",
    "It later lets one test call through to check recovery.",
  ],
  whenToUse: "When a slow outside service, like pricing or payments, could tie up every worker waiting on it. Not for fast local code.",
  theCatch: "Trip too early and good calls get a fallback for 30 seconds; trip too late and workers have already piled up.",
  say: "I would wrap remote calls in a circuit breaker with a timeout. After repeated failures it fails fast, serves a fallback, and probes the service before closing again.",
  learnMore: [{ href: "/learn/reliability-observability", label: "Reliability and observability" }],
};
