import type { FlowSpec, TimelineSpec } from "@/components/diagram/types";

export const interviewPlan: TimelineSpec = {
  id: "interview-plan",
  title: "The 45-minute plan",
  description:
    "5 minutes of requirements, 5 of estimation and API, 15 of high-level design, 15 of deep dives (two areas), and 5 to wrap up with trade-offs. Each marker is a checkpoint: if you're behind, say so and move on.",
  unit: "min",
  lanes: [
    { id: "req", label: "Requirements" },
    { id: "est", label: "Estimation + API" },
    { id: "hld", label: "High-level design" },
    { id: "deep", label: "Deep dives" },
    { id: "wrap", label: "Wrap-up" },
  ],
  spans: [
    { lane: "req", start: 0, end: 5, label: "Scope", tone: 1 },
    { lane: "est", start: 5, end: 10, label: "QPS, API", tone: 2 },
    { lane: "hld", start: 10, end: 25, label: "Components + data flow", tone: 1 },
    { lane: "deep", start: 25, end: 33, label: "Deep dive 1", tone: 2 },
    { lane: "deep", start: 33, end: 40, label: "Deep dive 2", tone: 3 },
    { lane: "wrap", start: 40, end: 45, label: "Summary", tone: 1 },
  ],
  markers: [
    { at: 5, label: "Scope" },
    { at: 10, label: "API" },
    { at: 25, label: "Design" },
    { at: 40, label: "Wrap" },
  ],
};

export const interviewFramework: FlowSpec = {
  id: "interview-framework",
  title: "The framework",
  description:
    "Requirements, estimation, API and data model, high-level design, deep dives, then trade-offs and a summary. Each stage produces something you write on the board and build on in the next.",
  nodes: [
    { id: "req", label: "Requirements", kind: "dns", col: 0, row: 1, sub: "~5 min", note: "Functional, non-functional with numbers, out of scope." },
    { id: "est", label: "Estimation", kind: "idgen", col: 1, row: 1, sub: "~3 min", note: "QPS (average and peak), storage, read:write ratio, and what they imply." },
    { id: "api", label: "API", kind: "gateway", col: 2, row: 0, sub: "~2 min", note: "The 3–5 endpoints that matter, with status codes." },
    { id: "data", label: "Data model", kind: "database", col: 2, row: 2, sub: "with the design", note: "Tables or keys, and the access pattern that picks the store." },
    { id: "hld", label: "High-level design", kind: "service", col: 3, row: 1, sub: "~15 min", note: "Boxes and labelled arrows, with the request flow numbered." },
    { id: "deep", label: "Deep dives", kind: "search", col: 4, row: 1, sub: "~15 min", note: "Two of the riskiest areas, including failure modes." },
    { id: "wrap", label: "Trade-offs + wrap", kind: "lb", col: 5, row: 1, sub: "~5 min", note: "What you chose, what it cost, when you'd switch, and a short summary." },
  ],
  edges: [
    { from: "req", to: "est", label: "scope agreed" },
    { from: "est", to: "api", label: "numbers" },
    { from: "api", to: "data" },
    { from: "data", to: "hld" },
    { from: "hld", to: "deep", label: "works end to end" },
    { from: "deep", to: "wrap", label: "risks covered" },
  ],
  scenarios: [
    {
      id: "walkthrough",
      name: "45-minute walkthrough",
      steps: [
        {
          edge: "req>est",
          caption: "Minutes 0–5: ask questions and write the requirements down. For a URL shortener: shorten, redirect, expiry, analytics; redirects under 20 ms and 99.99% available.",
          mark: [{ node: "req", state: "ok" }],
          ms: 2000,
        },
        {
          edge: "est>api",
          caption: "Minutes 5–8: numbers, and what they mean. 100M links a month is 40 writes/s; at 100:1 that's 4,000 redirects/s. Read-heavy, so caching will matter.",
          mark: [{ node: "est", state: "ok" }],
          ms: 2000,
        },
        {
          edge: "api>data",
          caption: "Minutes 8–10: the API (POST /api/urls, GET /:code), then the key table: code → long URL, looked up by primary key.",
          mark: [{ node: "api", state: "ok" }],
          ms: 2000,
        },
        {
          edge: "data>hld",
          caption: "Minutes 10–25: boxes and arrows. Number the request flow and walk one create and one redirect end to end.",
          mark: [{ node: "data", state: "ok" }, { node: "hld", state: "busy" }],
          ms: 2000,
        },
        {
          edge: "hld>deep",
          caption: "Minutes 25–40: go deep on the two riskiest parts (code generation, the hot read path), including what happens when something fails.",
          mark: [{ node: "hld", state: "ok" }, { node: "deep", state: "busy" }],
          ms: 2000,
        },
        {
          edge: "deep>wrap",
          tone: "ok",
          caption: "Minutes 40–45: the trade-offs you made, the next bottleneck, what you'd do with more time, and a 30-second summary.",
          mark: [{ node: "deep", state: "ok" }, { node: "wrap", state: "ok" }],
          ms: 2200,
        },
      ],
    },
    {
      id: "unstuck",
      name: "Getting unstuck",
      steps: [
        {
          edge: "hld>deep",
          caption: "Mid deep dive, the interviewer asks what happens at 10× the traffic, and you're not sure where to start.",
          mark: [{ node: "deep", state: "busy" }],
        },
        {
          edge: "req>est",
          reverse: true,
          tone: "miss",
          caption: "Don't guess a technology. Go back to the requirements and numbers out loud: 10× is 40K redirects/s, and redirects must still take under 20 ms.",
          mark: [{ node: "req", state: "busy" }],
          ms: 2000,
        },
        {
          edge: "req>est",
          caption: "Simplify, then ask what breaks first. At a 95% hit ratio the database now sees 2,000 reads/s instead of 200.",
          mark: [{ node: "req", state: null }],
          ms: 2000,
        },
        {
          edge: "data>hld",
          caption: "Scale step by step and say why at each step: a bigger cache, read replicas, then sharding by code.",
          ms: 2000,
        },
        {
          edge: "hld>deep",
          tone: "ok",
          caption: "Back in the deep dive with a reasoned answer. Interviewers score the reasoning, not instant recall.",
          mark: [{ node: "deep", state: "ok" }],
          ms: 2000,
        },
      ],
    },
  ],
};
