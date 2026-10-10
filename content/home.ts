import type { FlowSpec } from "@/components/diagram/types";

export const requestJourney: FlowSpec = {
  id: "request-journey",
  title: "A request's journey",
  description: "A request travels from the browser through the CDN and load balancer to a service, which reads Redis and falls back to Postgres on a miss.",
  nodes: [
    { id: "client", label: "Browser", kind: "client", col: 0, row: 1 },
    { id: "cdn", label: "CDN", kind: "cdn", col: 1, row: 1 },
    { id: "lb", label: "Load balancer", kind: "lb", col: 2, row: 1 },
    { id: "svc", label: "Service ×3", kind: "service", col: 3, row: 1 },
    { id: "cache", label: "Redis", kind: "cache", col: 4, row: 0 },
    { id: "db", label: "Postgres", kind: "database", col: 4, row: 2 },
    { id: "queue", label: "Queue", kind: "queue", col: 3, row: 2 },
  ],
  edges: [
    { from: "client", to: "cdn" },
    { from: "cdn", to: "lb" },
    { from: "lb", to: "svc" },
    { from: "svc", to: "cache" },
    { from: "svc", to: "db" },
    { from: "svc", to: "queue", style: "async" },
  ],
  scenarios: [
    {
      id: "loop",
      name: "Loop",
      steps: [
        { edge: "client>cdn", caption: "GET /products/42", ms: 700 },
        { edge: "cdn>lb", caption: "CDN miss", ms: 700 },
        { edge: "lb>svc", caption: "Balanced to a healthy instance", ms: 700 },
        { edge: "svc>cache", tone: "ok", caption: "Cache hit", ms: 700, mark: [{ node: "cache", state: "hit" }] },
        { edge: "client>cdn", reverse: true, caption: "200 OK in 12 ms", ms: 900 },
        { edge: "client>cdn", caption: "POST /orders", ms: 700, mark: [{ node: "cache", state: null }] },
        { edge: "cdn>lb", caption: "Writes go straight through", ms: 700 },
        { edge: "lb>svc", caption: "Validated by the service", ms: 700 },
        { edge: "svc>db", caption: "Committed to Postgres", ms: 700 },
        { edge: "svc>queue", caption: "order.created published for async work", ms: 900 },
      ],
    },
  ],
};
