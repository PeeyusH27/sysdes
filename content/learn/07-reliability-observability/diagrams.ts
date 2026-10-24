import type { DecisionSpec, FlowSpec, SequenceSpec, TimelineSpec } from "@/components/diagram/types";

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

/* ------------------------------------------------------------------ SLOs */

export const sloChooser: DecisionSpec = {
  id: "which-sli",
  title: "Which SLI fits this service?",
  start: "waits",
  nodes: {
    waits: { q: "Does a user wait for each response (an API or a page)?", yes: "slow", no: "pipeline" },
    slow: { q: "Is slow as bad as failed (checkout, search)?", yes: "both", no: "avail" },
    both: {
      result: "Availability and latency",
      why: "Good request = a non-5xx answer in under 300 ms. Target 99.9% of valid requests over 30 days.",
    },
    avail: {
      result: "Availability",
      why: "Good request = a non-5xx answer. Count the share of valid requests that succeed over 30 days.",
    },
    pipeline: { q: "Does it move data in the background (a pipeline)?", yes: "fresh", no: "store" },
    fresh: {
      result: "Freshness",
      why: "Share of items processed within 5 minutes of arrival. A pipeline can be up and still hours behind.",
    },
    store: { q: "Does it hold data users cannot recreate?", yes: "durable", no: "correct" },
    durable: {
      result: "Durability",
      why: "Share of stored objects never lost. Object stores quote 11 nines; a lost photo is not fixed by a retry.",
    },
    correct: {
      result: "Correctness",
      why: "Share of results that match a known-good check, such as billing totals against the ledger.",
    },
  },
};

/* ------------------------------------------------------------------ how failures spread */

export const retryAmplification: FlowSpec = {
  id: "retry-amplification",
  title: "Retries multiply across layers",
  description:
    "A client, a gateway and a service each retry a failing call 3 times. One user request becomes 27 calls at the database, which was already struggling.",
  nodes: [
    { id: "client", label: "Client app", kind: "client", col: 0, row: 1, sub: "3 tries" },
    { id: "gw", label: "Gateway", kind: "gateway", col: 1, row: 1, sub: "3 tries" },
    { id: "svc", label: "Orders service", kind: "service", col: 2, row: 1, sub: "3 tries" },
    { id: "db", label: "Database", kind: "database", col: 3, row: 1, sub: "slow" },
  ],
  edges: [
    { from: "client", to: "gw", label: "x3" },
    { from: "gw", to: "svc", label: "x3" },
    { from: "svc", to: "db", label: "x3" },
  ],
  scenarios: [
    {
      id: "every-layer",
      name: "Retry at every layer",
      steps: [
        { edge: "client>gw", caption: "The database has slowed to 5 s. A user request starts, and the client library allows 3 tries.", mark: [{ node: "db", state: "busy" }] },
        { edge: "gw>svc", caption: "Each call that reaches the gateway is retried 3 times on its way to the service: 3 x 3 = 9 calls.", with: [{ edge: "gw>svc", caption: "" }, { edge: "gw>svc", caption: "" }] },
        { edge: "svc>db", tone: "error", caption: "The service retries the database 3 times for each call: 9 x 3 = 27 calls for one user request.", with: [{ edge: "svc>db", tone: "error", caption: "" }, { edge: "svc>db", tone: "error", caption: "" }] },
        { edge: "svc>db", reverse: true, tone: "error", caption: "At 1,000 requests a second that is 27,000 calls a second at a database that could not serve 1,000. The retries are now the outage.", mark: [{ node: "db", state: "down" }] },
      ],
    },
    {
      id: "one-layer",
      name: "Retry in one layer",
      steps: [
        { edge: "client>gw", caption: "Same slow database. Only the service retries; the client and gateway pass errors straight up.", mark: [{ node: "db", state: "busy" }] },
        { edge: "gw>svc", caption: "One call travels down. No multiplication." },
        { edge: "svc>db", tone: "error", caption: "The service tries the database 3 times: 3 calls, not 27.", with: [{ edge: "svc>db", tone: "error", caption: "" }, { edge: "svc>db", tone: "error", caption: "" }] },
        { edge: "svc>db", reverse: true, tone: "ok", caption: "With a 10% retry budget on top, the extra load is capped near 10%, so the database recovers.", mark: [{ node: "db", state: "ok" }] },
      ],
    },
  ],
};

export const threadExhaustion: FlowSpec = {
  id: "thread-exhaustion",
  title: "A slow dependency eats the thread pool",
  description:
    "Checkout calls a recommendations service and a payments service from one pool of 200 threads. When recommendations hangs, every thread ends up waiting on it and checkout fails although payments is fine.",
  nodes: [
    { id: "user", label: "Users", kind: "client", col: 0, row: 1, sub: "500 req/s" },
    { id: "api", label: "Checkout API", kind: "service", col: 1, row: 1, sub: "200 threads" },
    { id: "recs", label: "Recs service", kind: "external", col: 2, row: 0 },
    { id: "pay", label: "Payments", kind: "external", col: 2, row: 2 },
  ],
  edges: [
    { from: "user", to: "api" },
    { from: "api", to: "recs", label: "call" },
    { from: "api", to: "pay", label: "call" },
  ],
  scenarios: [
    {
      id: "normal",
      name: "Normal",
      steps: [
        { edge: "user>api", caption: "500 requests a second arrive. Each also asks recommendations, which answers in about 80 ms." },
        { edge: "api>recs", caption: "Threads in use = rate x time = 500 x 0.08 s = 40. Plenty of room in a pool of 200.", mark: [{ node: "api", state: "ok" }] },
      ],
    },
    {
      id: "hang",
      name: "Recs hangs",
      steps: [
        { edge: "user>api", caption: "Recommendations stops answering, and the call has no timeout (or a 30 s one).", mark: [{ node: "recs", state: "down" }] },
        { edge: "api>recs", tone: "error", caption: "Each stuck call holds a thread for 30 s. Needed to cover 500 req/s: 500 x 30 = 15,000 threads. The pool has 200.", with: [{ edge: "api>recs", tone: "error", caption: "" }, { edge: "api>recs", tone: "error", caption: "" }] },
        { edge: "api>recs", caption: "200 threads / 500 per second: the pool is empty in 0.4 seconds.", mark: [{ node: "api", state: "down" }] },
        { edge: "api>pay", tone: "error", caption: "Checkout now has no thread left to call payments, which is perfectly healthy. One optional call took down the main flow." },
      ],
    },
    {
      id: "fixed",
      name: "Timeout + breaker",
      steps: [
        { edge: "api>recs", tone: "error", caption: "A 300 ms timeout caps the damage: at most 500 x 0.3 = 150 threads wait at once, not 15,000.", mark: [{ node: "recs", state: "down" }] },
        { edge: "api>recs", reverse: true, tone: "error", caption: "After 5 failures the breaker opens and calls fail in under a millisecond. No threads are held at all." },
        { edge: "api>pay", caption: "Payments calls keep their threads and checkout works. A bulkhead (a separate small pool for recommendations) makes this safe even before the breaker trips.", mark: [{ node: "api", state: "ok" }] },
      ],
    },
  ],
};

export const cascadeOverload: FlowSpec = {
  id: "cascade-overload",
  title: "Cascading overload",
  description:
    "Three servers each run at 70% busy. When one dies, the other two must carry its load, go over 100% and fail too. At 60% busy the two survivors would run at 90% and live.",
  nodes: [
    { id: "lb", label: "Load balancer", kind: "lb", col: 0, row: 1 },
    { id: "s1", label: "Server 1", kind: "service", col: 1, row: 0, sub: "70% busy" },
    { id: "s2", label: "Server 2", kind: "service", col: 1, row: 1, sub: "70% busy" },
    { id: "s3", label: "Server 3", kind: "service", col: 1, row: 2, sub: "70% busy" },
  ],
  edges: [
    { from: "lb", to: "s1" },
    { from: "lb", to: "s2" },
    { from: "lb", to: "s3" },
  ],
  scenarios: [
    {
      id: "cascade",
      name: "At 70% busy",
      steps: [
        { edge: "lb>s2", caption: "Peak hour: 3 servers at 70% carry 210 units of work (100 is one server's full capacity).", with: [{ edge: "lb>s1", caption: "" }, { edge: "lb>s3", caption: "" }], mark: [{ node: "s1", state: "ok" }, { node: "s2", state: "ok" }, { node: "s3", state: "ok" }] },
        { edge: "lb>s1", tone: "error", caption: "Server 1 crashes on a memory bug.", mark: [{ node: "s1", state: "down" }] },
        { edge: "lb>s2", caption: "210 units over 2 servers is 105% each. Queues grow and responses slow down.", with: [{ edge: "lb>s3", caption: "" }], mark: [{ node: "s2", state: "busy" }, { node: "s3", state: "busy" }] },
        { edge: "lb>s2", tone: "error", caption: "Server 2 is so slow that its health check times out, and the balancer pulls it out.", mark: [{ node: "s2", state: "down" }] },
        { edge: "lb>s3", tone: "error", caption: "Server 3 now gets 210%. One failure became a full outage, in a minute.", mark: [{ node: "s3", state: "down" }] },
      ],
    },
    {
      id: "headroom",
      name: "At 60% busy",
      steps: [
        { edge: "lb>s2", caption: "The servers are sized so peak load is only 60% each: 180 units in total.", with: [{ edge: "lb>s1", caption: "" }, { edge: "lb>s3", caption: "" }], mark: [{ node: "s1", state: "ok" }, { node: "s2", state: "ok" }, { node: "s3", state: "ok" }] },
        { edge: "lb>s1", tone: "error", caption: "Server 1 crashes.", mark: [{ node: "s1", state: "down" }] },
        { edge: "lb>s2", caption: "180 units over 2 servers is 90% each. Tight, but alive, and load shedding trims the rest.", with: [{ edge: "lb>s3", caption: "" }], mark: [{ node: "s2", state: "ok" }, { node: "s3", state: "ok" }] },
      ],
    },
  ],
};

export const sharedFate: FlowSpec = {
  id: "shared-fate",
  title: "Redundancy that fails together",
  description:
    "Two app servers behind a balancer look redundant, but they share one database and receive the same deploy at the same minute. Either one takes both down.",
  nodes: [
    { id: "lb", label: "Load balancer", kind: "lb", col: 0, row: 1 },
    { id: "a", label: "App A", kind: "service", col: 1, row: 0, sub: "zone 1" },
    { id: "b", label: "App B", kind: "service", col: 1, row: 2, sub: "zone 2" },
    { id: "db", label: "One database", kind: "database", col: 2, row: 1 },
  ],
  edges: [
    { from: "lb", to: "a" },
    { from: "lb", to: "b" },
    { from: "a", to: "db" },
    { from: "b", to: "db" },
  ],
  scenarios: [
    {
      id: "db-dies",
      name: "Database dies",
      steps: [
        { edge: "lb>a", caption: "Both app servers are healthy and in different zones. It looks redundant.", with: [{ edge: "lb>b", caption: "" }], mark: [{ node: "a", state: "ok" }, { node: "b", state: "ok" }] },
        { edge: "a>db", tone: "error", caption: "The single database fails.", with: [{ edge: "b>db", tone: "error", caption: "" }], mark: [{ node: "db", state: "down" }] },
        { edge: "lb>a", tone: "error", caption: "Both servers return errors. Two copies of the app protected nothing: the database was the single point of failure.", with: [{ edge: "lb>b", tone: "error", caption: "" }], mark: [{ node: "a", state: "down" }, { node: "b", state: "down" }] },
      ],
    },
    {
      id: "bad-push",
      name: "Bad config push",
      steps: [
        { edge: "lb>a", caption: "A config change is pushed to every server at once, at 14:02.", with: [{ edge: "lb>b", caption: "" }] },
        { edge: "lb>a", tone: "error", caption: "The change has a typo. Both servers crash on start.", with: [{ edge: "lb>b", tone: "error", caption: "" }], mark: [{ node: "a", state: "down" }, { node: "b", state: "down" }] },
        { edge: "lb>a", caption: "Fix: roll out to one server (or 1% of traffic) first and watch it, so a bad change hits a slice, not everything.", mark: [{ node: "a", state: null }, { node: "b", state: "ok" }] },
      ],
    },
  ],
};

export const defenceChooser: DecisionSpec = {
  id: "which-defence",
  title: "Which defence for which failure?",
  start: "dep",
  nodes: {
    dep: { q: "Is a dependency slow or failing while you are healthy?", yes: "optional", no: "overload" },
    optional: { q: "Can the request still succeed without it?", yes: "soft", no: "hard" },
    soft: {
      result: "Timeout, breaker, fallback",
      why: "Give up in 300 ms, stop calling after 5 failures, show cached bestsellers or hide the widget.",
    },
    hard: {
      result: "Timeout, one retry, bulkhead",
      why: "Checkout cannot skip payments. Retry once with an idempotency key, and cap the pool so other calls keep their threads.",
    },
    overload: { q: "Is your own service overloaded (queue growing)?", yes: "shed", no: "gone" },
    shed: {
      result: "Shed load by priority",
      why: "Autoscaling takes minutes. Reject the excess in milliseconds with 503 and Retry-After, and drop prefetch before checkout.",
    },
    gone: { q: "Is a whole machine, zone or region gone?", yes: "redundant", no: "deploy" },
    redundant: {
      result: "Redundancy and failover",
      why: "N+1 capacity across 3 zones, health checks and automatic failover. A human is too slow for a 4-minute budget.",
    },
    deploy: {
      result: "Roll back first",
      why: "Most outages follow a change. Roll back or flip the flag, then find the cause once users are fine.",
    },
  },
};

/* ------------------------------------------------------------------ timeouts and retries */

export const deadlineBudget: SequenceSpec = {
  id: "deadline-budget",
  title: "A deadline travels with the request",
  description:
    "The client allows 1,000 ms. Each hop passes on only the time that is left, so a slow dependency is abandoned when the user has already given up, not 30 seconds later.",
  actors: [
    { id: "client", label: "Client", kind: "client" },
    { id: "gw", label: "Gateway", kind: "gateway" },
    { id: "orders", label: "Orders", kind: "service" },
    { id: "pay", label: "Payments", kind: "external" },
  ],
  items: [
    { from: "client", to: "gw", label: "POST /order (deadline 1,000 ms)" },
    { from: "gw", to: "orders", label: "900 ms left" },
    { from: "orders", to: "pay", label: "700 ms left" },
    {
      alt: [
        {
          when: "on time",
          items: [
            { from: "pay", to: "orders", label: "ok after 250 ms", type: "reply" },
            { from: "orders", to: "gw", label: "ok", type: "reply" },
            { from: "gw", to: "client", label: "201 Created", type: "reply" },
          ],
        },
        {
          when: "payments hangs",
          items: [
            { note: "Orders gives up at 700 ms, not 30 s", over: ["orders", "pay"] },
            { from: "orders", to: "gw", label: "504 timeout", type: "reply" },
            { from: "gw", to: "client", label: "503 try again", type: "reply" },
          ],
        },
      ],
    },
  ],
};

export const retryFlow: FlowSpec = {
  id: "retry-flow",
  title: "Retry: a blip versus an overload",
  description:
    "A retry rescues a request when the failure was a one-off. When the dependency is overloaded, the same retries triple its load.",
  nodes: [
    { id: "client", label: "Client", kind: "client", col: 0, row: 1 },
    { id: "api", label: "Orders API", kind: "service", col: 1, row: 1 },
    { id: "dep", label: "Dependency", kind: "external", col: 2, row: 1, sub: "inventory" },
  ],
  edges: [
    { from: "client", to: "api" },
    { from: "api", to: "dep", label: "call" },
  ],
  scenarios: [
    {
      id: "blip",
      name: "A blip",
      steps: [
        { edge: "client>api", caption: "A request arrives. The API calls inventory with a 250 ms timeout." },
        { edge: "api>dep", tone: "error", caption: "One packet is lost. Nothing comes back, and the timeout fires at 250 ms." },
        { edge: "api>dep", caption: "After a random wait of 0 to 100 ms the API tries again.", mark: [{ node: "api", state: "busy" }] },
        { edge: "api>dep", reverse: true, tone: "ok", caption: "It answers in 80 ms. The call is safe to repeat, so the retry was free." },
        { edge: "client>api", reverse: true, tone: "ok", caption: "The user waits under half a second and never sees an error.", mark: [{ node: "api", state: null }] },
      ],
    },
    {
      id: "overload",
      name: "An overload",
      steps: [
        { edge: "client>api", caption: "Inventory is at 100% CPU and answers in 2 s. 1,000 requests a second still arrive.", mark: [{ node: "dep", state: "busy" }] },
        { edge: "api>dep", tone: "error", caption: "Every call times out. Each is retried 3 times, so 1,000 a second become 3,000.", with: [{ edge: "api>dep", tone: "error", caption: "" }, { edge: "api>dep", tone: "error", caption: "" }] },
        { edge: "api>dep", reverse: true, tone: "error", caption: "Inventory sinks. The retries made the outage deeper.", mark: [{ node: "dep", state: "down" }] },
        { edge: "api>dep", caption: "Fix: backoff with jitter, a retry budget of 10% (1,100 calls, not 3,000) and a breaker that stops calling.", mark: [{ node: "dep", state: null }] },
      ],
    },
  ],
};

export const idempotentCharge: SequenceSpec = {
  id: "idempotent-charge",
  title: "Retrying a payment safely",
  description:
    "The first charge succeeds but its reply is lost. The retry carries the same idempotency key, so the payment service returns the saved result instead of charging again.",
  actors: [
    { id: "app", label: "App", kind: "client" },
    { id: "pay", label: "Payments", kind: "service" },
    { id: "store", label: "Key store", kind: "database" },
  ],
  items: [
    { from: "app", to: "pay", label: "POST /charge $20, key k-91" },
    {
      alt: [
        {
          when: "first try",
          items: [
            { from: "pay", to: "store", label: "new key: charge card, save result" },
            { from: "pay", to: "app", label: "201 (reply lost)", type: "reply" },
            { note: "The app times out and will retry", over: ["app", "pay"] },
          ],
        },
        {
          when: "retry, same key",
          items: [
            { from: "pay", to: "store", label: "key k-91 seen: load result" },
            { from: "pay", to: "app", label: "201, same result, no new charge", type: "reply" },
          ],
        },
      ],
    },
  ],
};

/* ------------------------------------------------------------------ circuit breakers and bulkheads */

export const bulkhead: FlowSpec = {
  id: "bulkhead",
  title: "Bulkheads: one pool per dependency",
  description:
    "The API has 100 threads, split into 20 for recommendations and 80 for checkout. If recommendations hangs, it can only ever hold its own 20.",
  nodes: [
    { id: "api", label: "API", kind: "service", col: 0, row: 1, sub: "100 threads" },
    { id: "poolR", label: "Recs pool", kind: "worker", col: 1, row: 0, sub: "20 threads" },
    { id: "poolC", label: "Checkout pool", kind: "worker", col: 1, row: 2, sub: "80 threads" },
    { id: "recs", label: "Recs service", kind: "external", col: 2, row: 0 },
    { id: "pay", label: "Payments", kind: "external", col: 2, row: 2 },
  ],
  edges: [
    { from: "api", to: "poolR", label: "recs" },
    { from: "api", to: "poolC", label: "pay" },
    { from: "poolR", to: "recs" },
    { from: "poolC", to: "pay" },
  ],
  scenarios: [
    {
      id: "hang",
      name: "Recs hangs",
      steps: [
        { edge: "poolR>recs", tone: "error", caption: "Recommendations stops answering. Calls pile up in its pool.", mark: [{ node: "recs", state: "down" }] },
        { edge: "api>poolR", tone: "error", caption: "All 20 recs threads are stuck. New recs calls are rejected instantly instead of waiting.", mark: [{ node: "poolR", state: "down" }] },
        { edge: "api>poolC", caption: "Checkout has its own 80 threads and does not notice.", mark: [{ node: "poolC", state: "ok" }] },
        { edge: "poolC>pay", reverse: true, tone: "ok", caption: "Payments answers as usual. Only the optional widget degraded." },
      ],
    },
    {
      id: "sizing",
      name: "Sizing a pool",
      steps: [
        { edge: "api>poolR", caption: "Threads needed = requests per second x seconds per call. Recs: 100 per second x 0.08 s = 8 threads. Give it 20, about 2.5 times the need." },
        { edge: "api>poolC", caption: "Checkout: 300 per second x 0.2 s = 60 threads. Give it 80. Total 100, and no dependency can take more than its share." },
      ],
    },
  ],
};

/* ------------------------------------------------------------------ load shedding */

export const shedFlow: FlowSpec = {
  id: "shed-flow",
  title: "Shed at the door",
  description:
    "A load shedder in front of the API admits what it can serve and rejects the rest in under a millisecond, with 503 and a Retry-After header.",
  nodes: [
    { id: "client", label: "Clients", kind: "client", col: 0, row: 1 },
    { id: "gate", label: "Load shedder", kind: "gateway", col: 1, row: 1, sub: "queue cap 100" },
    { id: "api", label: "Checkout API", kind: "service", col: 2, row: 0, sub: "1,000 req/s" },
    { id: "rej", label: "503 Retry-After", kind: "external", col: 2, row: 2 },
  ],
  edges: [
    { from: "client", to: "gate" },
    { from: "gate", to: "api", label: "admit" },
    { from: "gate", to: "rej", label: "shed" },
  ],
  scenarios: [
    {
      id: "spike",
      name: "A spike",
      steps: [
        { edge: "client>gate", caption: "A flash sale sends 3,000 requests a second to an API that can finish 1,000.", with: [{ edge: "client>gate", caption: "" }, { edge: "client>gate", caption: "" }] },
        { edge: "gate>api", tone: "ok", caption: "1,000 a second are admitted and finish in their normal 100 ms.", mark: [{ node: "api", state: "ok" }] },
        { edge: "gate>rej", tone: "error", caption: "The other 2,000 get 503 with Retry-After: 2 within a millisecond. Without this, the backlog would grow by 2,000 a second.", with: [{ edge: "gate>rej", tone: "error", caption: "" }] },
      ],
    },
    {
      id: "priority",
      name: "By priority",
      steps: [
        { edge: "client>gate", caption: "Checkout, login and prefetch requests arrive together, and the system is at its limit.", with: [{ edge: "client>gate", caption: "" }] },
        { edge: "gate>rej", tone: "error", caption: "Prefetch, analytics and batch calls are rejected first.", mark: [{ node: "gate", state: "busy" }] },
        { edge: "gate>api", tone: "ok", caption: "Checkout and login are always admitted. The reserved capacity goes to the work that earns money.", mark: [{ node: "api", state: "ok" }] },
      ],
    },
    {
      id: "stale",
      name: "Stale work",
      steps: [
        { edge: "client>gate", caption: "Each request carries a deadline of 1 s. This one has already waited 1.2 s in a queue." },
        { edge: "gate>rej", tone: "error", caption: "Drop it. The caller timed out and left, so finishing the work would only burn capacity for nobody." },
        { edge: "gate>api", tone: "ok", caption: "Capacity goes to requests that still have someone waiting.", mark: [{ node: "api", state: "ok" }] },
      ],
    },
  ],
};

/* ------------------------------------------------------------------ graceful degradation */

export const degradeFlow: FlowSpec = {
  id: "degrade-flow",
  title: "A fallback for every dependency",
  description:
    "The product page calls recommendations and reviews. When recommendations is down, cached bestsellers appear; when reviews is down, the section is hidden; a kill switch turns recommendations off under load.",
  nodes: [
    { id: "user", label: "Shopper", kind: "client", col: 0, row: 1 },
    { id: "page", label: "Product page", kind: "service", col: 1, row: 1 },
    { id: "recs", label: "Recs service", kind: "external", col: 2, row: 0 },
    { id: "rev", label: "Reviews", kind: "service", col: 2, row: 1 },
    { id: "cache", label: "Bestsellers", kind: "cache", col: 2, row: 2, sub: "cached" },
  ],
  edges: [
    { from: "user", to: "page" },
    { from: "page", to: "recs", label: "call" },
    { from: "page", to: "rev", label: "call" },
    { from: "page", to: "cache", label: "fallback" },
  ],
  scenarios: [
    {
      id: "recs-down",
      name: "Recs down",
      steps: [
        { edge: "user>page", caption: "A shopper opens a product page." },
        { edge: "page>recs", tone: "error", caption: "Recommendations does not answer within 100 ms.", mark: [{ node: "recs", state: "down" }] },
        { edge: "page>cache", caption: "The page falls back to the cached bestsellers list.", mark: [{ node: "cache", state: "hit" }] },
        { edge: "user>page", reverse: true, tone: "ok", caption: "The shopper sees a slightly less personal page and can still buy." },
      ],
    },
    {
      id: "reviews-down",
      name: "Reviews down",
      steps: [
        { edge: "user>page", caption: "Another product page request." },
        { edge: "page>rev", tone: "error", caption: "Reviews times out. It is not worth a fallback.", mark: [{ node: "rev", state: "down" }] },
        { edge: "user>page", reverse: true, tone: "ok", caption: "The page renders without the reviews section. The page still sells." },
      ],
    },
    {
      id: "kill-switch",
      name: "Kill switch",
      steps: [
        { edge: "user>page", caption: "A traffic spike makes every extra call expensive. On-call flips the flag recs.enabled to false." },
        { edge: "page>cache", caption: "The page stops calling recommendations at all and reads the cache directly.", mark: [{ node: "cache", state: "hit" }, { node: "recs", state: null }] },
        { edge: "user>page", reverse: true, tone: "ok", caption: "No deploy was needed. Flip the flag back when the spike passes." },
      ],
    },
  ],
};

/* ------------------------------------------------------------------ redundancy and failover */

export const zoneLoss: FlowSpec = {
  id: "zone-loss",
  title: "Losing a zone",
  description:
    "Three zones share the traffic. If each runs at 60% busy, losing one leaves two at 90%. At 80% busy the two survivors would need 120% and fail.",
  nodes: [
    { id: "lb", label: "Load balancer", kind: "lb", col: 0, row: 1 },
    { id: "za", label: "Zone A", kind: "service", col: 1, row: 0, sub: "60% busy" },
    { id: "zb", label: "Zone B", kind: "service", col: 1, row: 1, sub: "60% busy" },
    { id: "zc", label: "Zone C", kind: "service", col: 1, row: 2, sub: "60% busy" },
  ],
  edges: [
    { from: "lb", to: "za" },
    { from: "lb", to: "zb" },
    { from: "lb", to: "zc" },
  ],
  scenarios: [
    {
      id: "at-60",
      name: "At 60% busy",
      steps: [
        { edge: "lb>zb", caption: "Three zones at 60% carry 180 units of work (100 is one zone's full capacity).", with: [{ edge: "lb>za", caption: "" }, { edge: "lb>zc", caption: "" }], mark: [{ node: "za", state: "ok" }, { node: "zb", state: "ok" }, { node: "zc", state: "ok" }] },
        { edge: "lb>za", tone: "error", caption: "Zone A loses power. Health checks remove it within seconds.", mark: [{ node: "za", state: "down" }] },
        { edge: "lb>zb", caption: "180 units over 2 zones is 90% each. Everyone is served.", with: [{ edge: "lb>zc", caption: "" }], mark: [{ node: "zb", state: "ok" }, { node: "zc", state: "ok" }] },
      ],
    },
    {
      id: "at-80",
      name: "At 80% busy",
      steps: [
        { edge: "lb>zb", caption: "The same three zones at 80% carry 240 units. It looks efficient.", with: [{ edge: "lb>za", caption: "" }, { edge: "lb>zc", caption: "" }] },
        { edge: "lb>za", tone: "error", caption: "Zone A fails.", mark: [{ node: "za", state: "down" }] },
        { edge: "lb>zb", tone: "error", caption: "240 units over 2 zones is 120% each. Both overload, and the outage spreads.", with: [{ edge: "lb>zc", tone: "error", caption: "" }], mark: [{ node: "zb", state: "down" }, { node: "zc", state: "down" }] },
      ],
    },
  ],
};

export const replicationModes: SequenceSpec = {
  id: "replication-modes",
  title: "Where the copy lives decides what you lose",
  description:
    "A synchronous replica in another zone has every committed write. An asynchronous replica in another region is behind by the replication lag, and those writes are lost if the primary dies.",
  actors: [
    { id: "app", label: "App", kind: "client" },
    { id: "primary", label: "Primary", kind: "database" },
    { id: "zoneb", label: "Zone B replica", kind: "database" },
    { id: "region2", label: "Region 2 replica", kind: "database" },
  ],
  items: [
    { from: "app", to: "primary", label: "write" },
    {
      alt: [
        {
          when: "sync, zone B",
          items: [
            { from: "primary", to: "zoneb", label: "replicate" },
            { from: "zoneb", to: "primary", label: "ack (1 to 2 ms)", type: "reply" },
            { from: "primary", to: "app", label: "committed", type: "reply" },
            { note: "Two copies exist before the ack: RPO 0", over: ["primary", "zoneb"] },
          ],
        },
        {
          when: "async, region 2",
          items: [
            { from: "primary", to: "app", label: "committed (instant)", type: "reply" },
            { from: "primary", to: "region2", label: "replicate later", type: "async" },
            { note: "Lag of seconds: a crash now loses these writes", over: ["primary", "region2"] },
          ],
        },
        {
          when: "primary lost",
          items: [
            { note: "The primary region is gone", over: ["primary", "region2"] },
            { from: "region2", to: "app", label: "promoted: data up to the last applied write", type: "reply" },
          ],
        },
      ],
    },
  ],
};

export const failoverModes: FlowSpec = {
  id: "failover-modes",
  title: "Active-passive and active-active",
  description:
    "Active-passive keeps a standby region idle until the primary fails, so failover takes minutes. Active-active serves from both regions at once, so a survivor only needs to absorb the lost region's share.",
  nodes: [
    { id: "users", label: "Users", kind: "client", col: 0, row: 1 },
    { id: "router", label: "Traffic router", kind: "lb", col: 1, row: 1, sub: "health checks" },
    { id: "ra", label: "Region A", kind: "service", col: 2, row: 0 },
    { id: "rb", label: "Region B", kind: "service", col: 2, row: 2 },
  ],
  edges: [
    { from: "users", to: "router" },
    { from: "router", to: "ra", label: "serve" },
    { from: "router", to: "rb", label: "serve" },
  ],
  scenarios: [
    {
      id: "active-passive",
      name: "Active-passive",
      steps: [
        { edge: "users>router", caption: "All traffic goes to region A. Region B is a warm standby with an async copy of the data.", mark: [{ node: "ra", state: "ok" }] },
        { edge: "router>ra", tone: "error", caption: "Region A fails. Health checks notice after a few missed beats.", mark: [{ node: "ra", state: "down" }] },
        { edge: "router>rb", caption: "An operator or script promotes the replica and scales region B up. DNS caches (a TTL of 60 s) delay the switch. Typical RTO: tens of minutes.", mark: [{ node: "rb", state: "busy" }] },
        { edge: "router>rb", tone: "ok", caption: "Region B serves. Writes since the last replication tick (the RPO) are lost.", mark: [{ node: "rb", state: "ok" }] },
      ],
    },
    {
      id: "active-active",
      name: "Active-active",
      steps: [
        { edge: "users>router", caption: "Traffic is split 50/50, and both regions already serve and hold data.", with: [{ edge: "users>router", caption: "" }], mark: [{ node: "ra", state: "ok" }, { node: "rb", state: "ok" }] },
        { edge: "router>ra", tone: "error", caption: "Region A fails.", mark: [{ node: "ra", state: "down" }] },
        { edge: "router>rb", tone: "ok", caption: "The router sends everything to B within seconds. B must hold 100% of the traffic, so each region runs below 50%.", mark: [{ node: "rb", state: "ok" }] },
        { edge: "router>rb", caption: "The price: writes can happen in both regions, so conflicts need a rule (last write wins, or merge)." },
      ],
    },
  ],
};

export const failoverDetect: SequenceSpec = {
  id: "failover-detect",
  title: "Detecting a dead primary, and split brain",
  description:
    "A monitor promotes a new primary after missed heartbeats. If the old primary is only unreachable, two primaries accept writes (split brain) unless storage rejects the stale one with a fencing token.",
  actors: [
    { id: "monitor", label: "Monitor", kind: "service" },
    { id: "old", label: "Old primary", kind: "database" },
    { id: "next", label: "New primary", kind: "database" },
    { id: "store", label: "Storage", kind: "storage" },
  ],
  items: [
    { from: "monitor", to: "old", label: "heartbeat every 5 s" },
    {
      alt: [
        {
          when: "really dead",
          items: [
            { note: "3 missed beats in a row: 15 s", over: ["monitor", "old"] },
            { from: "monitor", to: "next", label: "promote" },
            { note: "Clients now write to the new primary", over: ["next", "store"] },
          ],
        },
        {
          when: "only network broke",
          items: [
            { from: "monitor", to: "next", label: "promote (old is silent)" },
            { note: "Old is alive and clients still reach it: both accept writes", over: ["old", "next"] },
            { note: "Two histories: split brain", over: ["old", "store"] },
          ],
        },
        {
          when: "fencing token",
          items: [
            { from: "monitor", to: "next", label: "promote, token 8" },
            { from: "old", to: "store", label: "write, token 7" },
            { from: "store", to: "old", label: "rejected: 7 is stale", type: "reply" },
            { from: "next", to: "store", label: "write, token 8" },
            { from: "store", to: "next", label: "ok", type: "reply" },
          ],
        },
      ],
    },
  ],
};

export const redundancyChooser: DecisionSpec = {
  id: "which-redundancy",
  title: "Which redundancy setup?",
  start: "loss",
  nodes: {
    loss: { q: "Is losing one committed write unacceptable (money)?", yes: "region", no: "disaster" },
    region: { q: "Must you also survive a whole region going down?", yes: "multi", no: "syncz" },
    multi: {
      result: "Multi-region with consensus",
      why: "Writes wait for a majority across regions. RPO 0, but every write pays tens of milliseconds. Use only where it earns its cost.",
    },
    syncz: {
      result: "Sync replica, other zone",
      why: "RPO 0 and RTO of 1 to 2 min with automatic failover. The default for a payments database.",
    },
    disaster: { q: "Must you stay up through a regional disaster?", yes: "asyncr", no: "backups" },
    asyncr: {
      result: "Async replica, other region",
      why: "RPO of seconds to minutes, RTO tens of minutes. Cheap protection for most products.",
    },
    backups: {
      result: "Backups plus a restore drill",
      why: "RPO up to 24 h and RTO of hours. Fine for a blog. An untested restore is not a backup.",
    },
  },
};

/* ------------------------------------------------------------------ safe deploys */

export const canaryFlow: FlowSpec = {
  id: "canary-flow",
  title: "Canary release",
  description:
    "A small slice of traffic goes to the new version while metrics are compared with the old one. A healthy canary is widened step by step; a bad one is rolled back automatically.",
  nodes: [
    { id: "lb", label: "Load balancer", kind: "lb", col: 0, row: 1 },
    { id: "v1", label: "v1 stable", kind: "service", col: 1, row: 0, sub: "99% of traffic" },
    { id: "v2", label: "v2 canary", kind: "service", col: 1, row: 2, sub: "1% of traffic" },
    { id: "mon", label: "Metrics", kind: "external", col: 2, row: 1, sub: "errors, p99" },
  ],
  edges: [
    { from: "lb", to: "v1", label: "99%" },
    { from: "lb", to: "v2", label: "1%" },
    { from: "v1", to: "mon", label: "stats" },
    { from: "v2", to: "mon", label: "stats" },
  ],
  scenarios: [
    {
      id: "good",
      name: "Good canary",
      steps: [
        { edge: "lb>v2", caption: "1% of 10,000 requests a second is 100 a second to v2. In 5 minutes that is 30,000 requests.", mark: [{ node: "v2", state: "busy" }] },
        { edge: "v2>mon", caption: "v2 shows 0.1% errors and the same p99 as v1. A real regression to 2% would show as 600 errors, not 30." },
        { edge: "lb>v2", tone: "ok", caption: "Healthy, so the canary widens: 1%, then 10%, 50%, 100%, with the same check at each step.", mark: [{ node: "v2", state: "ok" }] },
      ],
    },
    {
      id: "bad",
      name: "Bad canary",
      steps: [
        { edge: "lb>v2", caption: "The canary gets 1% of traffic.", mark: [{ node: "v2", state: "busy" }] },
        { edge: "v2>mon", tone: "error", caption: "Within 2 minutes v2 shows 2.5% errors against 0.1% for v1.", mark: [{ node: "v2", state: "down" }] },
        { edge: "lb>v2", tone: "error", caption: "Automatic rollback sends the 1% back to v1. 99% of users never saw the bug.", mark: [{ node: "v2", state: null }, { node: "v1", state: "ok" }] },
      ],
    },
  ],
};

export const blueGreen: FlowSpec = {
  id: "blue-green",
  title: "Blue/green deploy",
  description:
    "The new version runs next to the old one. The load balancer switches all traffic at once, and switching back is just as fast. Both versions share one database, so schema changes must work for both.",
  nodes: [
    { id: "lb", label: "Load balancer", kind: "lb", col: 0, row: 1 },
    { id: "blue", label: "Blue (v1)", kind: "service", col: 1, row: 0, sub: "live" },
    { id: "green", label: "Green (v2)", kind: "service", col: 1, row: 2, sub: "idle, tested" },
    { id: "db", label: "Database", kind: "database", col: 2, row: 1 },
  ],
  edges: [
    { from: "lb", to: "blue", label: "live" },
    { from: "lb", to: "green", label: "switch" },
    { from: "blue", to: "db" },
    { from: "green", to: "db" },
  ],
  scenarios: [
    {
      id: "switch",
      name: "Switch",
      steps: [
        { edge: "lb>blue", caption: "Blue serves all traffic while green is started and smoke-tested with no users on it.", mark: [{ node: "blue", state: "ok" }] },
        { edge: "lb>green", caption: "One change at the load balancer moves all traffic to green.", mark: [{ node: "green", state: "ok" }, { node: "blue", state: null }] },
        { edge: "green>db", caption: "Green reads and writes the same database, which is why a migration must be backward compatible." },
      ],
    },
    {
      id: "rollback",
      name: "Roll back",
      steps: [
        { edge: "lb>green", tone: "error", caption: "Green starts failing checkouts right after the switch.", mark: [{ node: "green", state: "down" }] },
        { edge: "lb>blue", tone: "ok", caption: "Flip back: blue is still running, so rollback takes seconds, not a new deploy.", mark: [{ node: "blue", state: "ok" }, { node: "green", state: null }] },
      ],
    },
  ],
};

export const flagRollout: SequenceSpec = {
  id: "flag-rollout",
  title: "Feature flag: dark, ramp, kill",
  description:
    "New code ships switched off. A flag service decides per user, using a hash so the same user always gets the same answer, and turning the flag off needs no deploy.",
  actors: [
    { id: "user", label: "User", kind: "client" },
    { id: "app", label: "App server", kind: "service" },
    { id: "flags", label: "Flag store", kind: "cache" },
  ],
  items: [
    { from: "user", to: "app", label: "open checkout" },
    { from: "app", to: "flags", label: "new-checkout for u-42?" },
    {
      alt: [
        {
          when: "dark (0%)",
          items: [
            { from: "flags", to: "app", label: "off", type: "reply" },
            { from: "app", to: "user", label: "old checkout", type: "reply" },
            { note: "Code is deployed but nobody runs it", over: ["app", "flags"] },
          ],
        },
        {
          when: "ramp (1%)",
          items: [
            { note: "hash(flag:user) mod 100 is below 1 for 1 user in 100", over: ["app", "flags"] },
            { from: "flags", to: "app", label: "on for 1%, off for u-42", type: "reply" },
            { from: "app", to: "user", label: "old checkout", type: "reply" },
          ],
        },
        {
          when: "kill",
          items: [
            { note: "On-call sets the flag to 0% without a deploy", over: ["flags"] },
            { from: "flags", to: "app", label: "off within seconds", type: "reply" },
            { from: "app", to: "user", label: "old checkout", type: "reply" },
          ],
        },
      ],
    },
  ],
};

/* ------------------------------------------------------------------ observability and incidents */

export const alertChooser: DecisionSpec = {
  id: "page-or-ticket",
  title: "Page, ticket or dashboard?",
  start: "users",
  nodes: {
    users: { q: "Are users seeing errors or slowness against the SLO?", yes: "fast", no: "runout" },
    fast: { q: "Burn 14.4x or more (2% of the budget in an hour)?", yes: "page", no: "slow" },
    page: {
      result: "Page now",
      why: "On a 99.9% SLO that is 1.44% errors. At this speed the whole budget lasts 50 hours. A human must act.",
    },
    slow: { q: "Burn 1x or more (10% of the budget in 3 days)?", yes: "ticket", no: "dash" },
    ticket: {
      result: "Ticket, next business day",
      why: "A slow burn is real but not urgent. Fix it in working hours, before the budget runs out.",
    },
    runout: { q: "Will a disk, certificate or quota run out within days?", yes: "ticket2", no: "dash2" },
    dash: {
      result: "Dashboard only",
      why: "CPU, memory and queue depth explain a problem; they are not the problem. Nobody should wake up for them alone.",
    },
    ticket2: {
      result: "Ticket, next business day",
      why: "A slow burn is real but not urgent. Fix it in working hours, before the budget runs out.",
    },
    dash2: {
      result: "Dashboard only",
      why: "CPU, memory and queue depth explain a problem; they are not the problem. Nobody should wake up for them alone.",
    },
  },
};

export const incidentTimeline: TimelineSpec = {
  id: "incident-timeline",
  title: "An example incident, minute by minute",
  description:
    "A bad deploy at minute 0 is detected by a burn-rate alert at minute 4, mitigated by rollback at minute 18, and only then investigated. The postmortem comes later.",
  unit: "min",
  lanes: [
    { id: "detect", label: "Detect" },
    { id: "triage", label: "Triage" },
    { id: "mitigate", label: "Mitigate" },
    { id: "learn", label: "Learn" },
  ],
  spans: [
    { lane: "detect", start: 0, end: 4, label: "Burn-rate alert fires", tone: 1 },
    { lane: "triage", start: 4, end: 10, label: "Commander named, status page", tone: 2 },
    { lane: "mitigate", start: 10, end: 18, label: "Roll back the deploy", tone: 3 },
    { lane: "learn", start: 18, end: 30, label: "Confirm recovery, hand over", tone: 1 },
  ],
  markers: [
    { at: 0, label: "Bad deploy" },
    { at: 4, label: "Page" },
    { at: 18, label: "Users recover" },
  ],
};
