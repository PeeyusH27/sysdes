import type { FlowSpec } from "@/components/diagram/types";

export const architecture: FlowSpec = {
  id: "rate-limiter-architecture",
  title: "Rate limiter at the gateway",
  description:
    "Every gateway instance runs the same Lua token-bucket script against one shared Redis, so the limit holds across all of them. Rejected requests get a 429 and never reach the service.",
  nodes: [
    { id: "client", label: "Clients", kind: "client", col: 0, row: 1 },
    { id: "gateway", label: "API gateway", kind: "gateway", col: 1, row: 1, sub: "×N, runs limiter", note: "Express middleware or an Envoy/NGINX filter: one check per request." },
    { id: "redis", label: "Redis primary", kind: "cache", col: 2, row: 0, sub: "Lua token bucket", note: "Hash rl:<rule>:<id> with tokens and ts, expired when idle." },
    { id: "replica", label: "Redis replica", kind: "cache", col: 3, row: 0, sub: "promoted on failure" },
    { id: "local", label: "Local buckets", kind: "cache", col: 1, row: 2, sub: "per instance LRU", note: "Only used while Redis is unreachable." },
    { id: "service", label: "Service", kind: "service", col: 3, row: 1, sub: "×3" },
  ],
  edges: [
    { from: "client", to: "gateway", label: "request / 429" },
    { from: "gateway", to: "redis", label: "EVALSHA" },
    { from: "redis", to: "replica", style: "replication" },
    { from: "gateway", to: "local", label: "fallback" },
    { from: "gateway", to: "service", label: "allowed only" },
  ],
  scenarios: [
    {
      id: "allowed",
      name: "Allowed",
      steps: [
        { edge: "client>gateway", caption: "GET /api/orders arrives with API key k_42. The rule for this plan is 5 tokens per second, bursts up to 20." },
        { edge: "gateway>redis", caption: "The gateway runs the token-bucket script on rl:api:k_42. Read, refill, take and write happen in one atomic step." },
        {
          edge: "gateway>redis",
          reverse: true,
          tone: "ok",
          caption: "Redis replies [1, 19, 0]: allowed, 19 tokens left, no wait. The whole check took under a millisecond.",
          mark: [{ node: "redis", state: "ok" }],
        },
        { edge: "gateway>service", caption: "The request is forwarded to the service." },
        { edge: "gateway>service", reverse: true, caption: "The service answers." },
        {
          edge: "client>gateway",
          reverse: true,
          tone: "ok",
          caption: "200 OK, with RateLimit-Limit: 20 and RateLimit-Remaining: 19 so the client can pace itself.",
          mark: [{ node: "redis", state: null }],
        },
      ],
    },
    {
      id: "burst",
      name: "Burst exhausted",
      steps: [
        {
          edge: "client>gateway",
          caption: "A buggy script fires 25 requests at once.",
          with: [{ edge: "client>gateway", caption: "" }, { edge: "client>gateway", caption: "" }],
          mark: [{ node: "gateway", state: "busy" }],
        },
        {
          edge: "gateway>redis",
          caption: "Each request runs the script. Redis executes scripts one at a time, so no two gateways can spend the same token.",
          with: [{ edge: "gateway>redis", caption: "" }, { edge: "gateway>redis", caption: "" }],
        },
        {
          edge: "gateway>service",
          caption: "The first 20 requests drain the bucket and go through: that's the allowed burst.",
          with: [{ edge: "gateway>service", caption: "" }],
        },
        {
          edge: "gateway>redis",
          reverse: true,
          tone: "error",
          caption: "Request 21: the script returns [0, 0, 200]. The bucket is empty, and at 5 tokens per second the next token arrives in about 200 ms.",
          mark: [{ node: "redis", state: "busy" }],
        },
        {
          edge: "client>gateway",
          reverse: true,
          tone: "error",
          caption: "429 Too Many Requests with Retry-After: 1 (200 ms rounded up to whole seconds) and RateLimit-Remaining: 0. The service never sees it.",
          mark: [{ node: "gateway", state: null }],
        },
        {
          edge: "client>gateway",
          reverse: true,
          tone: "error",
          caption: "Requests 22 to 25 get the same answer. A well-behaved client waits for Retry-After instead of hammering.",
          mark: [{ node: "redis", state: null }],
        },
      ],
    },
    {
      id: "redis-down",
      name: "Redis down",
      steps: [
        { edge: "client>gateway", caption: "A request arrives just as the Redis primary crashes.", mark: [{ node: "redis", state: "down" }] },
        {
          edge: "gateway>redis",
          tone: "error",
          caption: "The script call fails at once: ioredis has no offline queue and a 50 ms command timeout, so requests never hang on the limiter.",
        },
        {
          edge: "gateway>local",
          caption: "The gateway falls back to an in-process token bucket for this key, kept in a bounded LRU.",
          mark: [{ node: "local", state: "ok" }],
        },
        {
          edge: "gateway>service",
          caption: "Allowed by the local bucket. The limit is now per instance: with 10 gateways a client could briefly get up to 10× its quota. Accepted, because it's temporary.",
        },
        {
          edge: "client>gateway",
          reverse: true,
          tone: "error",
          caption: "A rule marked fail-closed (login, OTP, payments) would answer 503 with Retry-After: 1 instead of guessing.",
        },
        {
          edge: "redis>replica",
          caption: "Meanwhile Sentinel promotes the replica. The next check goes to Redis again and the global limit is back.",
          mark: [{ node: "redis", state: null }, { node: "replica", state: "ok" }, { node: "local", state: null }],
        },
      ],
    },
  ],
};
