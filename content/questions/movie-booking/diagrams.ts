import type { FlowSpec, SequenceSpec } from "@/components/diagram/types";

export const architecture: FlowSpec = {
  id: "movie-booking-architecture",
  title: "Movie ticket booking architecture",
  description:
    "Seat-map reads come from the CDN and an SSE stream; every hold and booking is one conditional UPDATE on the Postgres primary. Redis carries seat changes between API instances and runs the launch-day waiting room.",
  nodes: [
    { id: "client", label: "Browser / app", kind: "client", col: 0, row: 1 },
    { id: "cdn", label: "CDN", kind: "cdn", col: 1, row: 1, sub: "seat map ~1 s", note: "Caches GET /shows/:id/seats for 1–2 s; passes writes and the SSE stream through." },
    { id: "waiting", label: "Waiting room", kind: "queue", col: 2, row: 0, sub: "Redis ZSET", note: "FIFO queue plus admission keys, only switched on for hot shows." },
    { id: "api", label: "Booking API", kind: "service", col: 2, row: 1, sub: "×N" },
    { id: "pubsub", label: "Redis pub/sub", kind: "pubsub", col: 2, row: 2, sub: "show:*:seats" },
    { id: "payment", label: "Payment provider", kind: "external", col: 3, row: 0, sub: "intent + webhook" },
    { id: "pg", label: "Postgres primary", kind: "database", col: 3, row: 1, sub: "seats, bookings", note: "The source of truth. Row locks decide every seat." },
    { id: "replica", label: "Read replica", kind: "database", col: 4, row: 1, sub: "snapshots" },
  ],
  edges: [
    { from: "client", to: "cdn", label: "HTTPS + SSE" },
    { from: "cdn", to: "api", label: "writes, misses" },
    { from: "api", to: "waiting", label: "admitted?" },
    { from: "api", to: "pg", label: "conditional UPDATE" },
    { from: "pg", to: "replica", style: "replication" },
    { from: "api", to: "pubsub", label: "publish", style: "async" },
    { from: "api", to: "payment", label: "intent / webhook" },
  ],
  scenarios: [
    {
      id: "hold-pay-confirm",
      name: "Hold, pay, confirm",
      steps: [
        { edge: "client>cdn", caption: "Alice opens show 42. GET /shows/42/seats goes to the CDN." },
        {
          edge: "client>cdn",
          reverse: true,
          tone: "ok",
          caption: "The CDN serves a snapshot at most a second or two old. The database does no work for this read.",
          mark: [{ node: "cdn", state: "hit" }],
        },
        { edge: "client>cdn", caption: "She picks A5 and A6. POST /shows/42/holds isn't cacheable, so the CDN passes it through.", mark: [{ node: "cdn", state: null }] },
        { edge: "cdn>api", caption: "The booking API receives the hold request." },
        { edge: "api>pg", caption: "One conditional UPDATE marks both seats held for 5 minutes, but only rows that are available or whose hold has expired." },
        { edge: "api>pg", reverse: true, tone: "ok", caption: "rowCount is 2, matching the request: COMMIT. Both seats are Alice's until the hold expires.", mark: [{ node: "pg", state: "ok" }] },
        { edge: "api>pubsub", caption: "The API publishes 'A5, A6 held' on show:42:seats." },
        {
          edge: "api>pubsub",
          reverse: true,
          caption: "Every API instance receives it once and pushes it over SSE to its viewers: their seat maps grey out A5 and A6 within a second.",
        },
        { edge: "api>payment", caption: "Alice clicks Pay. The API creates a payment intent with Idempotency-Key = holdId, so a double click can't charge her twice." },
        { edge: "api>payment", reverse: true, tone: "ok", caption: "The provider's signed webhook arrives: payment succeeded.", mark: [{ node: "payment", state: "ok" }] },
        {
          edge: "api>pg",
          caption: "confirmBooking inserts the booking (a retried webhook hits UNIQUE payment_id and does nothing), then flips the seats to booked WHERE they're still held by Alice.",
        },
        { edge: "api>pg", reverse: true, tone: "ok", caption: "Both rows match: COMMIT. A5 and A6 are booked for good." },
        {
          edge: "client>cdn",
          reverse: true,
          tone: "ok",
          caption: "Alice's page shows the booking confirmed.",
          mark: [{ node: "pg", state: null }, { node: "payment", state: null }],
        },
      ],
    },
    {
      id: "seat-taken",
      name: "Seat taken",
      steps: [
        { edge: "client>cdn", caption: "Alice and Bob click A5 in the same millisecond.", with: [{ edge: "client>cdn", caption: "" }] },
        { edge: "cdn>api", caption: "Both hold requests reach the API, possibly on different instances.", with: [{ edge: "cdn>api", caption: "" }] },
        {
          edge: "api>pg",
          caption: "Both run the same conditional UPDATE. Postgres locks the A5 row for Alice's transaction; Bob's UPDATE waits on that lock.",
          with: [{ edge: "api>pg", caption: "" }],
          mark: [{ node: "pg", state: "busy" }],
        },
        { edge: "api>pg", reverse: true, tone: "ok", caption: "Alice's transaction commits: rowCount 1, A5 is held by her." },
        {
          edge: "api>pg",
          reverse: true,
          tone: "error",
          caption: "Bob's UPDATE wakes up and re-checks its WHERE clause against the committed row. A5 is now held and not expired, so it matches 0 rows: ROLLBACK.",
          mark: [{ node: "pg", state: null }],
        },
        { edge: "cdn>api", reverse: true, tone: "error", caption: "Bob gets 409 Conflict: 'Some of those seats were just taken'." },
        {
          edge: "client>cdn",
          reverse: true,
          tone: "error",
          caption: "His seat map already shows A5 held, pushed over SSE, so he picks another seat. No double booking, and no application lock.",
        },
      ],
    },
    {
      id: "late-payment",
      name: "Late payment refunded",
      steps: [
        { edge: "api>payment", caption: "Alice holds A5 and starts paying, but her bank's 3-D Secure page is slow." },
        {
          edge: "api>pg",
          caption: "Five minutes pass and her hold expires. Bob's hold matches A5 (held, and held_until is in the past) and takes it.",
          mark: [{ node: "pg", state: "busy" }],
        },
        { edge: "api>payment", reverse: true, caption: "Seven minutes in, the webhook finally arrives: Alice's payment succeeded." },
        { edge: "api>pg", caption: "confirmBooking inserts her booking, then runs UPDATE seats … WHERE status = 'held' AND held_by = Alice." },
        {
          edge: "api>pg",
          reverse: true,
          tone: "error",
          caption: "0 of 1 rows match, because A5 is Bob's now. ROLLBACK, which removes her booking row too.",
          mark: [{ node: "pg", state: null }],
        },
        { edge: "api>payment", tone: "error", caption: "The API refunds the payment, keyed by paymentId, so a retried webhook can't refund twice." },
        { edge: "api>payment", reverse: true, tone: "ok", caption: "Refund accepted.", mark: [{ node: "payment", state: "ok" }] },
        {
          edge: "client>cdn",
          reverse: true,
          caption: "Alice is told her hold expired and the money is on its way back. A visible countdown makes this rare.",
          mark: [{ node: "payment", state: null }],
        },
      ],
    },
    {
      id: "launch",
      name: "Launch-day spike",
      steps: [
        {
          edge: "client>cdn",
          caption: "Tickets for a blockbuster open: 500K people arrive in the first minutes.",
          with: [{ edge: "client>cdn", caption: "" }, { edge: "client>cdn", caption: "" }],
          mark: [{ node: "cdn", state: "busy" }],
        },
        { edge: "cdn>api", caption: "The CDN absorbs the seat-map reads. Only queue joins reach the API.", with: [{ edge: "cdn>api", caption: "" }] },
        {
          edge: "api>waiting",
          caption: "joinQueue takes a sequence number and adds the user to a sorted set with NX, so refreshing the page keeps your place.",
          mark: [{ node: "waiting", state: "busy" }],
        },
        { edge: "api>waiting", reverse: true, caption: "Bob is number 48,210. His page polls for its position every few seconds." },
        { edge: "api>waiting", caption: "Every second a leader pops the next 200 users and gives each an admission key valid for 10 minutes." },
        {
          edge: "api>pg",
          caption: "The booking API rejects holds without an admission key, so Postgres sees a steady 200 new shoppers per second instead of a wall.",
          mark: [{ node: "pg", state: "ok" }, { node: "cdn", state: null }],
        },
        {
          edge: "pg>replica",
          caption: "Seat-map snapshots for the CDN can come from the replica. Every hold and booking stays on the primary.",
          mark: [{ node: "waiting", state: null }, { node: "pg", state: null }],
        },
      ],
    },
  ],
};

export const bookingSequence: SequenceSpec = {
  id: "movie-booking-sequence",
  title: "Hold, pay, confirm",
  description:
    "A hold is one conditional UPDATE; confirmation is driven by the payment provider's webhook. Switch branches to see a seat taken, a failed payment, or a payment that arrives after the hold expired.",
  actors: [
    { id: "user", label: "User", kind: "client" },
    { id: "api", label: "Booking API", kind: "service" },
    { id: "db", label: "Postgres", kind: "database" },
    { id: "redis", label: "Redis", kind: "pubsub" },
    { id: "pay", label: "Payment", kind: "external" },
  ],
  items: [
    { from: "user", to: "api", label: "POST /holds [A5, A6]" },
    { from: "api", to: "db", label: "UPDATE → held (if free)" },
    {
      alt: [
        {
          when: "all seats free",
          items: [
            { from: "db", to: "api", label: "rowCount 2 → COMMIT", type: "reply" },
            { from: "api", to: "redis", label: "publish A5, A6 held", type: "async" },
            { from: "api", to: "user", label: "201 holdId, expiresAt", type: "reply" },
            { from: "user", to: "api", label: "POST /payments" },
            { from: "api", to: "pay", label: "create intent, key = holdId" },
            { from: "user", to: "pay", label: "pay (card, UPI, wallet)" },
            {
              alt: [
                {
                  when: "payment ok",
                  items: [
                    { from: "pay", to: "api", label: "webhook: succeeded", type: "async" },
                    { from: "api", to: "db", label: "INSERT booking" },
                    { from: "api", to: "db", label: "UPDATE → booked if mine" },
                    { from: "db", to: "api", label: "rowCount 2 → COMMIT", type: "reply" },
                    { from: "api", to: "redis", label: "publish A5, A6 booked", type: "async" },
                    { from: "api", to: "user", label: "booking confirmed", type: "reply" },
                  ],
                },
                {
                  when: "payment failed",
                  items: [
                    { from: "pay", to: "api", label: "webhook: failed", type: "async" },
                    { from: "api", to: "db", label: "UPDATE → available" },
                    { from: "api", to: "redis", label: "publish A5, A6 available", type: "async" },
                    { from: "api", to: "user", label: "payment failed, seats freed", type: "reply" },
                  ],
                },
                {
                  when: "payment after expiry",
                  items: [
                    { note: "Hold expired; Bob now holds A5", over: ["api", "db"] },
                    { from: "pay", to: "api", label: "webhook: succeeded (late)", type: "async" },
                    { from: "api", to: "db", label: "INSERT booking + UPDATE" },
                    { from: "db", to: "api", label: "1 of 2 rows → ROLLBACK", type: "reply" },
                    { from: "api", to: "pay", label: "refund, key = paymentId" },
                    { from: "api", to: "user", label: "hold expired: refunded", type: "reply" },
                  ],
                },
              ],
            },
          ],
        },
        {
          when: "a seat taken",
          items: [
            { from: "db", to: "api", label: "1 of 2 rows → ROLLBACK", type: "reply" },
            { from: "api", to: "user", label: "409 seats just taken", type: "reply" },
            { note: "The seat map already shows A5 held (SSE)", over: ["user", "db"] },
          ],
        },
      ],
    },
  ],
};
