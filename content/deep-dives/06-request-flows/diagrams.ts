import type { SequenceSpec } from "@/components/diagram/types";

export const requestFlows: SequenceSpec = {
  id: "request-flows",
  title: "Five request flows through the same system",
  description:
    "Pick a flow: a read through the CDN and cache, a write with a transactional outbox, an async job, a failing dependency, and a retried payment.",
  actors: [
    { id: "browser", label: "Browser", kind: "client" },
    { id: "cdn", label: "CDN", kind: "cdn" },
    { id: "api", label: "API", kind: "service" },
    { id: "redis", label: "Redis", kind: "cache" },
    { id: "db", label: "Database", kind: "database" },
    { id: "queue", label: "Queue", kind: "queue" },
  ],
  items: [
    {
      alt: [
        {
          when: "Read",
          items: [
            { from: "browser", to: "cdn", label: "GET /products/42", type: "call" },
            {
              alt: [
                {
                  when: "CDN hit",
                  items: [
                    { from: "cdn", to: "browser", label: "200 from the edge (~20 ms)", type: "reply" },
                    { note: "The origin never sees this request", over: ["cdn", "api"] },
                  ],
                },
                {
                  when: "CDN miss",
                  items: [
                    { from: "cdn", to: "api", label: "forward to origin", type: "call" },
                    { from: "api", to: "redis", label: "GET product:42", type: "call" },
                    {
                      alt: [
                        {
                          when: "Redis hit",
                          items: [{ from: "redis", to: "api", label: "hit (~1 ms)", type: "reply" }],
                        },
                        {
                          when: "Redis miss",
                          items: [
                            { from: "redis", to: "api", label: "nil (miss)", type: "reply" },
                            { from: "api", to: "db", label: "SELECT … WHERE id = 42", type: "call" },
                            { from: "db", to: "api", label: "row (~20 ms)", type: "reply" },
                            { from: "api", to: "redis", label: "SET product:42 EX 300", type: "call" },
                          ],
                        },
                      ],
                    },
                    { from: "api", to: "cdn", label: "200 · max-age=60", type: "reply" },
                    { from: "cdn", to: "browser", label: "200 (edge keeps a copy)", type: "reply" },
                  ],
                },
              ],
            },
          ],
        },
        {
          when: "Write",
          items: [
            { from: "browser", to: "cdn", label: "POST /orders", type: "call" },
            { from: "cdn", to: "api", label: "pass through (no cache)", type: "call" },
            { from: "api", to: "api", label: "auth + validate", type: "call" },
            { from: "api", to: "db", label: "BEGIN · INSERT order + outbox row", type: "call" },
            { from: "db", to: "api", label: "COMMIT ok", type: "reply" },
            { from: "api", to: "cdn", label: "201 Created", type: "reply" },
            { from: "cdn", to: "browser", label: "201 + order id", type: "reply" },
            { from: "db", to: "queue", label: "relay: order.created", type: "async" },
            { from: "queue", to: "redis", label: "consumer: DEL cached keys", type: "async" },
            { note: "Email, search index and analytics consume it too", over: ["db", "queue"] },
          ],
        },
        {
          when: "Async",
          items: [
            { from: "browser", to: "api", label: "POST /reports", type: "call" },
            { from: "api", to: "queue", label: "add job #77", type: "async" },
            { from: "api", to: "browser", label: "202 · Location: /reports/77", type: "reply" },
            { note: "A worker picks up job #77 (about 40 s of work)", over: ["db", "queue"] },
            { from: "browser", to: "api", label: "GET /reports/77", type: "call" },
            { from: "api", to: "queue", label: "job state?", type: "call" },
            { from: "queue", to: "api", label: "active, 60%", type: "reply" },
            { from: "api", to: "browser", label: "200 · active, 60%", type: "reply" },
            { from: "queue", to: "db", label: "worker saves the result", type: "async" },
            { from: "browser", to: "api", label: "GET /reports/77 (poll again)", type: "call" },
            { from: "api", to: "browser", label: "200 · completed + result URL", type: "reply" },
            { note: "Or skip polling: push completion over SSE or a webhook", over: ["browser", "cdn", "api"] },
          ],
        },
        {
          when: "Failure",
          items: [
            { from: "browser", to: "api", label: "GET /home", type: "call" },
            { from: "api", to: "db", label: "recommendations query (300 ms timeout)", type: "call" },
            { note: "stuck behind a lock", over: ["db"] },
            { from: "api", to: "api", label: "timeout after 300 ms", type: "call" },
            { from: "api", to: "redis", label: "fallback: popular items", type: "call" },
            { from: "redis", to: "api", label: "cached list", type: "reply" },
            { from: "api", to: "browser", label: "200 (degraded, still fast)", type: "reply" },
            { note: "5 failures in 10 s: the breaker opens", over: ["api", "redis"] },
            { from: "browser", to: "api", label: "GET /home", type: "call" },
            { from: "api", to: "redis", label: "breaker open: skip the DB", type: "call" },
            { from: "redis", to: "api", label: "cached list", type: "reply" },
            { from: "api", to: "browser", label: "200 in ~5 ms (fail fast)", type: "reply" },
            { note: "After 30 s: half-open, one trial query decides", over: ["api", "redis", "db"] },
          ],
        },
        {
          when: "Idempotent retry",
          items: [
            { from: "browser", to: "api", label: "POST /payments · Idempotency-Key: k1", type: "call" },
            { from: "api", to: "redis", label: "SET idem:k1 pending NX", type: "call" },
            { from: "redis", to: "api", label: "OK: claimed", type: "reply" },
            { from: "api", to: "db", label: "charge + save the payment", type: "call" },
            { from: "db", to: "api", label: "paid", type: "reply" },
            { from: "api", to: "redis", label: "SET idem:k1 = result", type: "call" },
            { from: "api", to: "browser", label: "200 paid", type: "reply" },
            { note: "The response is lost: the client times out", over: ["browser", "cdn"] },
            { from: "browser", to: "api", label: "retry POST · same key k1", type: "call" },
            { from: "api", to: "redis", label: "SET idem:k1 NX", type: "call" },
            { from: "redis", to: "api", label: "exists: stored result", type: "reply" },
            { from: "api", to: "browser", label: "200 paid (replayed, no 2nd charge)", type: "reply" },
          ],
        },
      ],
    },
  ],
};
