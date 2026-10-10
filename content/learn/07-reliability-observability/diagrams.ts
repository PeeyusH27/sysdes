import type { FlowSpec } from "@/components/diagram/types";

export const circuitBreaker: FlowSpec = {
  id: "circuit-breaker",
  title: "Circuit breaker",
  description:
    "The caller reaches a flaky dependency through a circuit breaker. While the breaker is closed calls pass through; while it is open they fail fast and a fallback cache answers.",
  nodes: [
    { id: "caller", label: "Caller", kind: "client", col: 0, row: 1 },
    { id: "breaker", label: "Circuit breaker", kind: "gateway", col: 1, row: 1, sub: "5 failures, 10 s" },
    { id: "dep", label: "Dependency", kind: "external", col: 2, row: 0, sub: "recommendations" },
    { id: "fallback", label: "Fallback cache", kind: "cache", col: 2, row: 2, sub: "popular items" },
  ],
  edges: [
    { from: "caller", to: "breaker" },
    { from: "breaker", to: "dep", label: "closed" },
    { from: "breaker", to: "fallback", label: "open" },
  ],
  scenarios: [
    {
      id: "healthy",
      name: "Healthy",
      steps: [
        { edge: "caller>breaker", caption: "A request for recommendations reaches the breaker. It is closed, so calls pass through.", mark: [{ node: "breaker", state: "ok" }] },
        { edge: "breaker>dep", caption: "The call goes to the dependency with a 300 ms timeout." },
        { edge: "breaker>dep", reverse: true, tone: "ok", caption: "It answers in 80 ms. Each success resets the failure count to 0." },
        { edge: "caller>breaker", reverse: true, tone: "ok", caption: "The user gets personalised recommendations." },
      ],
    },
    {
      id: "trip",
      name: "Failure spike",
      steps: [
        {
          edge: "caller>breaker",
          caption: "Traffic continues as normal, but the dependency has started to time out.",
          with: [{ edge: "caller>breaker", caption: "" }],
          mark: [{ node: "breaker", state: "ok" }],
        },
        {
          edge: "breaker>dep",
          tone: "error",
          caption: "Calls fail one after another, each costing a full 300 ms timeout: 1, 2, 3, 4…",
          with: [{ edge: "breaker>dep", tone: "error", caption: "" }],
          mark: [{ node: "dep", state: "down" }],
        },
        {
          edge: "breaker>dep",
          reverse: true,
          tone: "error",
          caption: "The 5th consecutive failure trips the breaker. It is now open for a 10 s cooldown.",
          mark: [{ node: "breaker", state: null }],
        },
        { edge: "caller>breaker", caption: "The next request arrives while the breaker is open." },
        {
          edge: "breaker>fallback",
          caption: "No call to the dependency at all: the breaker fails fast in under a millisecond and the fallback cache answers.",
          mark: [{ node: "fallback", state: "hit" }],
        },
        { edge: "breaker>fallback", reverse: true, tone: "ok", caption: "Popular items come back from the cache." },
        { edge: "caller>breaker", reverse: true, tone: "ok", caption: "The user sees slightly less personal results instead of an error, and the struggling dependency gets room to recover." },
      ],
    },
    {
      id: "recover",
      name: "Half-open probe",
      steps: [
        {
          edge: "caller>breaker",
          caption: "Ten seconds later the cooldown has elapsed, so the breaker moves to half-open.",
          mark: [{ node: "dep", state: "down" }, { node: "fallback", state: "hit" }],
        },
        {
          edge: "breaker>dep",
          caption: "Exactly one trial request (the probe) is let through. Every other request still uses the fallback.",
          with: [{ edge: "breaker>fallback", caption: "" }],
        },
        {
          edge: "breaker>dep",
          reverse: true,
          tone: "ok",
          caption: "The probe succeeds: the dependency has recovered.",
          mark: [{ node: "dep", state: null }],
        },
        {
          edge: "breaker>dep",
          caption: "The breaker closes and resets its failure count. Traffic flows to the dependency again.",
          with: [{ edge: "breaker>dep", caption: "" }],
          mark: [{ node: "breaker", state: "ok" }, { node: "fallback", state: null }],
        },
        { edge: "caller>breaker", reverse: true, tone: "ok", caption: "Users get personalised results again, with no manual intervention." },
      ],
    },
  ],
};

export const breakerStates: FlowSpec = {
  id: "breaker-states",
  title: "Circuit breaker states",
  description:
    "Closed lets calls through and counts failures. Five failures open the breaker; after the cooldown it goes half-open and sends one probe, which either closes it or opens it again.",
  nodes: [
    { id: "closed", label: "Closed", kind: "gateway", col: 1, row: 0, sub: "calls pass" },
    { id: "half", label: "Half-open", kind: "external", col: 0, row: 2, sub: "1 probe" },
    { id: "open", label: "Open", kind: "cache", col: 2, row: 2, sub: "fail fast" },
  ],
  edges: [
    { from: "closed", to: "open", label: "5 failures" },
    { from: "open", to: "half", label: "cooldown elapsed" },
    { from: "half", to: "closed", label: "probe ok" },
    { from: "half", to: "open", label: "probe failed" },
  ],
  scenarios: [
    {
      id: "cycle",
      name: "Trip and recover",
      steps: [
        {
          edge: "closed>open",
          tone: "error",
          caption: "Closed: calls flow and failures are counted. The 5th consecutive failure trips the breaker to Open.",
          mark: [{ node: "open", state: "down" }],
          ms: 1500,
        },
        {
          edge: "open>half",
          caption: "Open: every call fails fast and the fallback answers. Once the 10 s cooldown has elapsed, the next call moves it to Half-open.",
          mark: [{ node: "open", state: null }, { node: "half", state: "busy" }],
          ms: 1500,
        },
        {
          edge: "half>closed",
          tone: "ok",
          caption: "Half-open: a single probe is let through. It succeeds, so the breaker closes and the failure count resets.",
          mark: [{ node: "half", state: null }, { node: "closed", state: "ok" }],
          ms: 1500,
        },
      ],
    },
    {
      id: "probe-fails",
      name: "Probe fails",
      steps: [
        {
          edge: "closed>open",
          tone: "error",
          caption: "Five failures in a row: the breaker opens.",
          mark: [{ node: "open", state: "down" }],
        },
        {
          edge: "open>half",
          caption: "The cooldown elapses and the breaker goes half-open.",
          mark: [{ node: "open", state: null }, { node: "half", state: "busy" }],
        },
        {
          edge: "half>open",
          tone: "error",
          caption: "The probe fails: the dependency is still sick. Back to Open for another full cooldown, without a flood of real traffic.",
          mark: [{ node: "half", state: null }, { node: "open", state: "down" }],
          ms: 1500,
        },
        {
          edge: "open>half",
          caption: "Another cooldown elapses: half-open again, and another single probe.",
          mark: [{ node: "open", state: null }, { node: "half", state: "busy" }],
        },
        {
          edge: "half>closed",
          tone: "ok",
          caption: "This probe succeeds, so the breaker closes.",
          mark: [{ node: "half", state: null }, { node: "closed", state: "ok" }],
        },
      ],
    },
  ],
};
