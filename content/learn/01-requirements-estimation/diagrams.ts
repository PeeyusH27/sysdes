import type { FlowSpec, TimelineSpec } from "@/components/diagram/types";

export const interviewFlow: FlowSpec = {
  id: "interview-flow",
  title: "Interview flow",
  description: "Six stages, each producing something the next stage uses: requirements, estimates, APIs, a data model, the architecture, then a deep dive.",
  nodes: [
    { id: "req", label: "Requirements", kind: "client", col: 0, row: 0, sub: "~5 min", note: "Features, targets, out of scope" },
    { id: "est", label: "Estimate scale", kind: "service", col: 1, row: 0, sub: "~3 min", note: "QPS, peak, storage, bandwidth" },
    { id: "api", label: "APIs", kind: "gateway", col: 2, row: 0, sub: "~2 min", note: "3 to 5 endpoints" },
    { id: "model", label: "Data model", kind: "database", col: 3, row: 0, note: "Entities, keys, access patterns" },
    { id: "arch", label: "Architecture", kind: "service", col: 4, row: 0, sub: "~15 min", note: "Read path and write path" },
    { id: "deep", label: "Deep dive", kind: "cache", col: 4, row: 1, sub: "~15 min", note: "1 or 2 hard parts, trade-offs" },
  ],
  edges: [
    { from: "req", to: "est" },
    { from: "est", to: "api" },
    { from: "api", to: "model" },
    { from: "model", to: "arch" },
    { from: "arch", to: "deep", label: "trade-offs" },
  ],
  scenarios: [
    {
      id: "walkthrough",
      name: "Walkthrough",
      steps: [
        {
          edge: "req>est",
          ms: 2200,
          caption: "Requirements (about 5 min): agree on 3 to 5 core features, the targets for latency, availability and consistency, and what is out of scope. Write them where the interviewer can see them.",
          mark: [{ node: "req", state: "ok" }],
        },
        {
          edge: "est>api",
          ms: 2200,
          caption: "Estimate (about 3 min): average and peak QPS, the read:write ratio, storage over 5 years with replicas, and egress bandwidth. Round hard and say which number matters most.",
          mark: [{ node: "est", state: "ok" }],
        },
        {
          edge: "api>model",
          ms: 2200,
          caption: "APIs (about 2 min): 3 to 5 endpoints with method, path, key parameters and response, for example POST /tweets and GET /timeline?cursor=…",
          mark: [{ node: "api", state: "ok" }],
        },
        {
          edge: "model>arch",
          ms: 2200,
          caption: "Data model: the main entities, their primary keys and how each one is read. The access pattern decides SQL or NoSQL, the indexes and the shard key.",
          mark: [{ node: "model", state: "ok" }],
        },
        {
          edge: "arch>deep",
          ms: 2200,
          caption: "Architecture (about 15 min): boxes and arrows for the main write path and read path, sized with your estimates. Walk one request through it end to end.",
          mark: [{ node: "arch", state: "ok" }],
        },
        {
          edge: "arch>deep",
          reverse: true,
          ms: 2400,
          caption: "Deep dive (about 15 min): pick the 1 or 2 hardest parts (the hot path, a failure mode, a scaling limit), compare options and update the architecture. Keep the last 5 minutes for trade-offs.",
          mark: [{ node: "deep", state: "ok" }],
        },
      ],
    },
    {
      id: "numbers",
      name: "Numbers drive the design",
      steps: [
        {
          edge: "est>api",
          ms: 2000,
          caption: "Instagram-lite: 100M daily users, 10 feed views each, is about 11.6K reads/s on average and 35K/s at peak, against only about 230 uploads/s.",
          mark: [{ node: "est", state: "busy" }],
        },
        {
          edge: "api>model",
          ms: 2000,
          caption: "Reads outnumber writes 50 to 1, so the feed API is a cheap, cursor-paginated GET /feed and the upload API can be slower and asynchronous.",
        },
        {
          edge: "model>arch",
          ms: 2000,
          caption: "10 TB of new photos a day can't live in a database: metadata goes in SQL, image bytes go in object storage.",
        },
        {
          edge: "arch>deep",
          ms: 2000,
          caption: "About 46 Gbps of thumbnail egress makes a CDN mandatory, and 35K feed reads/s calls for a cache and precomputed feeds.",
          mark: [{ node: "arch", state: "ok" }],
        },
        {
          edge: "arch>deep",
          reverse: true,
          ms: 2200,
          caption: "So the deep dive goes to the feed cache, because it carries most of the load. If a number changes, go back and update the design out loud.",
          mark: [{ node: "deep", state: "hit" }, { node: "est", state: null }],
        },
      ],
    },
  ],
};

export const interviewTimeline: TimelineSpec = {
  id: "interview-timeline",
  title: "A 45-minute system design interview",
  description: "5 minutes of requirements, 5 of estimation and APIs, 15 of high-level design, 15 of deep dive and 5 to wrap up. Start drawing by minute 10.",
  unit: "min",
  lanes: [
    { id: "req", label: "Requirements" },
    { id: "est", label: "Estimate + APIs" },
    { id: "hld", label: "High-level design" },
    { id: "deep", label: "Deep dive" },
    { id: "wrap", label: "Wrap-up" },
  ],
  spans: [
    { lane: "req", start: 0, end: 5, label: "Scope", tone: 1 },
    { lane: "est", start: 5, end: 10, label: "Estimate", tone: 2 },
    { lane: "hld", start: 10, end: 25, label: "Data model + main paths", tone: 3 },
    { lane: "deep", start: 25, end: 40, label: "Bottlenecks + failures", tone: 1 },
    { lane: "wrap", start: 40, end: 45, label: "Recap", tone: 2 },
  ],
  markers: [
    { at: 10, label: "Start drawing" },
    { at: 25, label: "Pick 1–2 deep dives" },
    { at: 40, label: "Summarize" },
  ],
};
