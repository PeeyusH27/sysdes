import type { FlowSpec, SequenceSpec } from "@/components/diagram/types";

export const architecture: FlowSpec = {
  id: "payment-system-architecture",
  title: "Payment system architecture",
  description:
    "The Payments API claims an idempotency key and writes the payment in Postgres before it calls the PSP. Signed webhooks settle unknown outcomes, an outbox relay announces payments to the rest of the company, and a daily job reconciles the ledger with the PSP's settlement report.",
  nodes: [
    { id: "client", label: "Checkout app", kind: "client", col: 0, row: 1, note: "The PSP's SDK turns the card into a token in the browser, so card numbers never reach our servers." },
    { id: "api", label: "Payments API", kind: "service", col: 1, row: 1, sub: "stateless ×N" },
    { id: "psp", label: "PSP", kind: "external", col: 2, row: 0, sub: "Stripe / Adyen", note: "Takes our idempotency key, charges the card, and sends signed webhooks for every state change." },
    { id: "recon", label: "Reconciliation", kind: "worker", col: 2, row: 1, sub: "daily" },
    { id: "pg", label: "Payments DB", kind: "database", col: 2, row: 2, sub: "Postgres primary", note: "Idempotency keys, payments, the ledger, webhook events and the outbox, so one transaction covers them all." },
    { id: "hook", label: "Webhook handler", kind: "service", col: 3, row: 1, sub: "verify, dedupe" },
    { id: "relay", label: "Outbox relay", kind: "worker", col: 3, row: 2 },
    { id: "bus", label: "Event bus", kind: "queue", col: 4, row: 2, sub: "payment.succeeded" },
    { id: "orders", label: "Order service", kind: "service", col: 4, row: 1 },
  ],
  edges: [
    { from: "client", to: "api", label: "pay" },
    { from: "api", to: "pg", label: "claim key" },
    { from: "api", to: "psp", label: "charge" },
    { from: "psp", to: "hook", label: "webhooks" },
    { from: "hook", to: "pg", label: "post once" },
    { from: "pg", to: "relay", label: "outbox" },
    { from: "relay", to: "bus", label: "publish", style: "async" },
    { from: "bus", to: "orders", label: "order paid", style: "async" },
    { from: "recon", to: "psp", label: "report" },
    { from: "recon", to: "pg", label: "compare" },
  ],
  scenarios: [
    {
      id: "happy",
      name: "Happy path",
      steps: [
        { edge: "client>api", caption: "Alice taps Pay. The app sends POST /payments with Idempotency-Key k1 and a card token from the PSP's SDK: no card number touches our servers." },
        {
          edge: "api>pg",
          caption: "One transaction claims k1 (INSERT … ON CONFLICT DO NOTHING) and inserts pay_1 as processing. It commits before anything leaves the building.",
          mark: [{ node: "pg", state: "ok" }],
        },
        { edge: "api>psp", caption: "Charge $50.00, passing our own idempotency key to the PSP. No database transaction stays open during the call.", mark: [{ node: "pg", state: null }] },
        { edge: "api>psp", reverse: true, tone: "ok", caption: "The PSP answers: succeeded.", mark: [{ node: "psp", state: "ok" }] },
        {
          edge: "api>pg",
          caption: "A second transaction moves pay_1 to succeeded, posts four balanced ledger entries, writes an outbox row, and stores the 201 response under k1.",
        },
        { edge: "client>api", reverse: true, tone: "ok", caption: "Alice sees the order confirmed." },
        { edge: "psp>hook", caption: "Seconds later the PSP's signed webhook evt_9 arrives: payment succeeded.", mark: [{ node: "psp", state: null }] },
        {
          edge: "hook>pg",
          caption: "The handler records evt_9 in webhook_events (new), finds pay_1 already succeeded, and does nothing else. It answers 200.",
        },
        { edge: "pg>relay", caption: "The outbox relay picks up the payment.succeeded row…" },
        { edge: "relay>bus", caption: "…and publishes it. If the relay crashes after publishing, it publishes again: consumers dedupe by event id." },
        { edge: "bus>orders", tone: "ok", caption: "The order service marks the order paid and starts fulfilment.", mark: [{ node: "orders", state: "ok" }] },
      ],
    },
    {
      id: "timeout",
      name: "PSP timeout",
      steps: [
        { edge: "client>api", caption: "Bob pays with key k2." },
        { edge: "api>pg", caption: "Claim k2 and insert pay_2 as processing." },
        { edge: "api>psp", caption: "Charge $50.00 with our key for pay_2." },
        {
          edge: "api>psp",
          reverse: true,
          tone: "error",
          caption: "No answer within 10 s. The PSP may have charged Bob, or may never have seen the request. The outcome is unknown, not failed.",
          mark: [{ node: "psp", state: "busy" }],
        },
        { edge: "api>pg", tone: "miss", caption: "pay_2 becomes unknown, and k2 stores a 202 'processing' response, so a retry gets the same answer instead of a new charge." },
        { edge: "client>api", reverse: true, tone: "miss", caption: "Bob's app shows 'Processing…' and polls GET /payments/pay_2." },
        { edge: "psp>hook", caption: "The PSP's webhook evt_12 arrives: the charge succeeded.", mark: [{ node: "psp", state: null }] },
        {
          edge: "hook>pg",
          tone: "ok",
          caption: "evt_12 is new, and unknown → succeeded is a legal move: the ledger entries and the outbox row are written in the same transaction.",
          mark: [{ node: "pg", state: "ok" }],
        },
        {
          edge: "client>api",
          reverse: true,
          tone: "ok",
          caption: "Bob's next poll returns succeeded. One charge, despite the timeout. Had the webhook never come, the recovery job would have asked the PSP.",
          mark: [{ node: "pg", state: null }],
        },
      ],
    },
    {
      id: "retry",
      name: "Double tap",
      steps: [
        {
          edge: "client>api",
          caption: "Carol double-taps Pay: two POST /payments with the same key k3 land on two API servers within milliseconds.",
          with: [{ edge: "client>api", caption: "" }],
        },
        {
          edge: "api>pg",
          caption: "Both run INSERT … ON CONFLICT DO NOTHING on (customer, k3). The unique key lets exactly one insert win; the other waits for its commit, then inserts nothing.",
          with: [{ edge: "api>pg", caption: "" }],
          mark: [{ node: "pg", state: "busy" }],
        },
        { edge: "api>pg", reverse: true, tone: "miss", caption: "The loser reads the row: same request hash, status started. It answers 409 Conflict instead of charging." },
        { edge: "api>psp", caption: "Only the winner calls the PSP.", mark: [{ node: "pg", state: null }] },
        { edge: "api>psp", reverse: true, tone: "ok", caption: "Charged once." },
        {
          edge: "client>api",
          reverse: true,
          tone: "ok",
          caption: "The app retries the 409 a second later and gets the stored 201 replayed: same payment id, same body.",
        },
      ],
    },
    {
      id: "duplicate-webhook",
      name: "Duplicate webhook",
      steps: [
        { edge: "psp>hook", caption: "The PSP delivers evt_9. Our handler commits, but its 200 is lost to a network blip." },
        { edge: "psp>hook", caption: "So the PSP delivers evt_9 again a minute later: webhooks are at-least-once.", mark: [{ node: "hook", state: "busy" }] },
        {
          edge: "hook>pg",
          caption: "INSERT INTO webhook_events (evt_9) … ON CONFLICT DO NOTHING inserts 0 rows: already processed, so nothing else runs.",
        },
        { edge: "psp>hook", reverse: true, tone: "ok", caption: "Answer 200 anyway, so the PSP stops retrying. The ledger was posted once.", mark: [{ node: "hook", state: null }] },
        { edge: "psp>hook", caption: "Later an old 'succeeded' event arrives after the payment was refunded: delivery order is not guaranteed." },
        {
          edge: "hook>pg",
          tone: "ok",
          caption: "refunded → succeeded is not a legal move, so the event is recorded and ignored. Moves only go forward.",
        },
        {
          edge: "recon>psp",
          caption: "At night, reconciliation downloads the PSP's settlement report: every charge, refund and fee.",
        },
        {
          edge: "recon>pg",
          tone: "ok",
          caption: "It matches each line to the ledger by PSP id and amount. Everything matches; any mismatch would go to a queue for a human.",
          mark: [{ node: "recon", state: "ok" }],
        },
      ],
    },
  ],
};

export const paymentSequence: SequenceSpec = {
  id: "payment-system-sequence",
  title: "Charge a card, whatever the PSP says",
  description:
    "The payment is claimed and committed before the PSP call, and the outcome is written in a second transaction. Switch branches: succeeded, declined, or a timeout that leaves the outcome unknown until a webhook or a status query settles it.",
  actors: [
    { id: "app", label: "Checkout app", kind: "client" },
    { id: "api", label: "Payments API", kind: "service" },
    { id: "db", label: "Payments DB", kind: "database" },
    { id: "psp", label: "PSP", kind: "external" },
    { id: "hook", label: "Webhook handler", kind: "service" },
  ],
  items: [
    { from: "app", to: "api", label: "POST /payments, key k1" },
    { from: "api", to: "db", label: "claim k1, pay_1 processing" },
    { from: "api", to: "psp", label: "charge $50, our key" },
    {
      alt: [
        {
          when: "succeeded",
          items: [
            { from: "psp", to: "api", label: "200 succeeded", type: "reply" },
            { from: "api", to: "db", label: "succeeded + ledger + outbox" },
            { from: "api", to: "app", label: "201 succeeded (stored)", type: "reply" },
            { from: "psp", to: "hook", label: "webhook evt_9", type: "async" },
            { from: "hook", to: "db", label: "evt_9 new; already succeeded" },
          ],
        },
        {
          when: "declined",
          items: [
            { from: "psp", to: "api", label: "402 card declined", type: "reply" },
            { from: "api", to: "db", label: "failed; store the 402" },
            { from: "api", to: "app", label: "402 declined", type: "reply" },
            { note: "A retry with k1 replays the decline. A new attempt needs a new key.", over: ["app", "api"] },
          ],
        },
        {
          when: "timeout",
          items: [
            { note: "No reply in 10 s: the outcome is unknown", over: ["api", "psp"] },
            { from: "api", to: "db", label: "pay_1 unknown; store 202" },
            { from: "api", to: "app", label: "202 processing", type: "reply" },
            {
              alt: [
                {
                  when: "webhook arrives",
                  items: [
                    { from: "psp", to: "hook", label: "webhook evt_9: succeeded", type: "async" },
                    { from: "hook", to: "db", label: "unknown → succeeded + ledger" },
                    { from: "app", to: "api", label: "GET /payments/pay_1" },
                    { from: "api", to: "app", label: "succeeded", type: "reply" },
                  ],
                },
                {
                  when: "webhook is late",
                  items: [
                    { note: "Recovery job, after 1 minute", over: ["api", "db"] },
                    { from: "api", to: "psp", label: "look up pay_1 at the PSP" },
                    { from: "psp", to: "api", label: "succeeded", type: "reply" },
                    { from: "api", to: "db", label: "unknown → succeeded + ledger" },
                    { from: "psp", to: "hook", label: "late webhook evt_9", type: "async" },
                    { from: "hook", to: "db", label: "no-op: already succeeded" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};
