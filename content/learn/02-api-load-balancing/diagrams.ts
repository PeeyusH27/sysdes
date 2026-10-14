import type { FlowSpec } from "@/components/diagram/types";

export const requestPath: FlowSpec = {
  id: "request-path",
  title: "Request path",
  description: "Requests enter through the API gateway, the load balancer spreads them over identical stateless instances, and every instance shares one database and session store.",
  nodes: [
    { id: "client", label: "Client", kind: "client", col: 0, row: 1, sub: "browser / app" },
    { id: "gateway", label: "API gateway", kind: "gateway", col: 1, row: 1, sub: "auth, rate limits" },
    { id: "lb", label: "Load balancer", kind: "lb", col: 2, row: 1, sub: "L7, health checks" },
    { id: "a", label: "Service A", kind: "service", col: 3, row: 0 },
    { id: "b", label: "Service B", kind: "service", col: 3, row: 1 },
    { id: "c", label: "Service C", kind: "service", col: 3, row: 2 },
    { id: "sessions", label: "Redis sessions", kind: "cache", col: 4, row: 0, sub: "~1 ms", note: "Shared session store: any instance can read any user's session" },
    { id: "db", label: "Database", kind: "database", col: 4, row: 1 },
  ],
  edges: [
    { from: "client", to: "gateway" },
    { from: "gateway", to: "lb" },
    { from: "lb", to: "a" },
    { from: "lb", to: "b" },
    { from: "lb", to: "c" },
    { from: "a", to: "db" },
    { from: "b", to: "db" },
    { from: "c", to: "db" },
    { from: "a", to: "sessions" },
    { from: "b", to: "sessions", label: "session" },
  ],
  scenarios: [
    {
      id: "happy",
      name: "Happy path",
      steps: [
        { edge: "client>gateway", caption: "Requests arrive at the API gateway, the single front door." },
        { edge: "gateway>lb", caption: "The gateway checks the token and rate limit, then hands each request to the load balancer." },
        {
          edge: "lb>a",
          caption: "The load balancer spreads requests over the healthy instances: one to A, the next to B, the next to C.",
          with: [{ edge: "lb>b", caption: "" }, { edge: "lb>c", caption: "" }],
        },
        {
          edge: "a>db",
          caption: "The instances are identical and stateless: each reads what it needs from the shared database.",
          with: [{ edge: "b>db", caption: "" }, { edge: "c>db", caption: "" }],
        },
        {
          edge: "lb>a",
          reverse: true,
          tone: "ok",
          caption: "Responses flow back. Need more capacity? Add another instance behind the load balancer.",
          with: [{ edge: "lb>b", reverse: true, tone: "ok", caption: "" }, { edge: "lb>c", reverse: true, tone: "ok", caption: "" }],
        },
        { edge: "client>gateway", reverse: true, tone: "ok", caption: "The client never knows which instance served it." },
      ],
    },
    {
      id: "failure",
      name: "Instance failure",
      steps: [
        { edge: "lb>c", tone: "error", caption: "Service C crashes. The load balancer's health check to /readyz times out: 1 failure.", mark: [{ node: "c", state: "busy" }] },
        { edge: "lb>c", tone: "error", caption: "The second check fails too. One failure could be a blip, so the LB waits for a threshold." },
        { edge: "lb>c", tone: "error", caption: "Third failure in a row: the LB marks C down and stops routing to it.", mark: [{ node: "c", state: "down" }] },
        {
          edge: "lb>a",
          caption: "New requests go only to A and B. Users see no errors, only a little more load on the survivors.",
          with: [{ edge: "lb>b", caption: "" }],
          mark: [{ node: "a", state: "busy" }, { node: "b", state: "busy" }],
        },
        { edge: "lb>c", tone: "ok", caption: "C restarts. After 2 successful checks in a row it's marked up and gets traffic again.", mark: [{ node: "c", state: "ok" }] },
        {
          edge: "lb>a",
          caption: "Load is spread across all three again.",
          with: [{ edge: "lb>b", caption: "" }, { edge: "lb>c", caption: "" }],
          mark: [{ node: "a", state: null }, { node: "b", state: null }, { node: "c", state: null }],
        },
      ],
    },
    {
      id: "sticky",
      name: "Sticky-session pitfall",
      steps: [
        { edge: "client>gateway", caption: "Alice logs in." },
        { edge: "gateway>lb", caption: "The login reaches the load balancer." },
        { edge: "lb>b", caption: "It lands on Service B, which keeps her session in its own memory. Redis isn't used.", mark: [{ node: "b", state: "ok" }] },
        { edge: "gateway>lb", caption: "A moment later, Alice opens her orders page." },
        { edge: "lb>a", tone: "miss", caption: "Round robin sends this request to Service A. A has never seen her session…", mark: [{ node: "a", state: "miss" }] },
        {
          edge: "client>gateway",
          reverse: true,
          tone: "error",
          caption: "…so A answers 401 and Alice is logged out. Sticky sessions only hide this: she is still logged out when B crashes or redeploys.",
        },
      ],
    },
    {
      id: "fix",
      name: "Fix: shared session store",
      steps: [
        { edge: "lb>b", caption: "Alice logs in and the request lands on Service B." },
        { edge: "b>sessions", caption: "B writes the session to Redis (SET session:abc … EX 1800) instead of keeping it in memory.", mark: [{ node: "sessions", state: "ok" }] },
        { edge: "lb>a", caption: "Her next request lands on Service A." },
        { edge: "a>sessions", caption: "A looks up session:abc in Redis: about 1 ms." },
        { edge: "a>sessions", reverse: true, tone: "ok", caption: "Found. A serves the request as Alice.", mark: [{ node: "a", state: "ok" }] },
        {
          edge: "client>gateway",
          reverse: true,
          tone: "ok",
          caption: "Alice stays logged in. Any instance can serve any user, so instances can be added, drained or killed freely.",
        },
      ],
    },
  ],
};
