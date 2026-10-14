import type { FlowSpec, SequenceSpec } from "@/components/diagram/types";

export const queueWithDlq: FlowSpec = {
  id: "queue-with-dlq",
  title: "Queue with workers and a dead letter queue",
  description:
    "The API publishes jobs to a queue and returns at once. Two workers consume them and write to the database; messages that keep failing are parked in a dead letter queue.",
  nodes: [
    { id: "api", label: "API", kind: "service", col: 0, row: 1, sub: "returns 202" },
    { id: "queue", label: "Queue / Kafka", kind: "queue", col: 2, row: 1 },
    { id: "w1", label: "Worker 1", kind: "worker", col: 3, row: 0 },
    { id: "w2", label: "Worker 2", kind: "worker", col: 3, row: 2 },
    { id: "dlq", label: "Dead letter queue", kind: "queue", col: 2, row: 2, note: "Messages that failed every retry wait here for a human or a redrive." },
    { id: "db", label: "Database", kind: "database", col: 4, row: 1 },
  ],
  edges: [
    { from: "api", to: "queue", label: "publish", style: "async" },
    { from: "queue", to: "w1", label: "consume", style: "async" },
    { from: "queue", to: "w2", label: "consume", style: "async" },
    { from: "queue", to: "dlq", label: "after retries", style: "async" },
    { from: "w1", to: "db" },
    { from: "w2", to: "db" },
  ],
  scenarios: [
    {
      id: "normal",
      name: "Normal consumption",
      steps: [
        { edge: "api>queue", caption: "A user signs up. The API publishes a send-welcome-email job and answers 202 Accepted straight away." },
        { edge: "queue>w1", caption: "Worker 1 pulls the message. The broker hides it from other workers while it is in flight." },
        { edge: "w1>db", caption: "Worker 1 does the slow part (calls the email provider) and records the result." },
        { edge: "queue>w1", reverse: true, tone: "ok", caption: "Worker 1 acks the message only after the work succeeded, so the broker deletes it." },
        {
          edge: "api>queue",
          caption: "More signups arrive while that was happening.",
          with: [{ edge: "api>queue", caption: "" }],
        },
        {
          edge: "queue>w1",
          caption: "The two workers take messages in parallel. Adding workers adds throughput.",
          with: [{ edge: "queue>w2", caption: "" }],
        },
        {
          edge: "w1>db",
          tone: "ok",
          caption: "Both jobs finish and are acked. The user never waited for any of this.",
          with: [{ edge: "w2>db", tone: "ok", caption: "" }],
        },
      ],
    },
    {
      id: "retry",
      name: "Failure → retry with backoff",
      steps: [
        { edge: "api>queue", caption: "A job is published as usual." },
        { edge: "queue>w1", caption: "Worker 1 takes it." },
        { edge: "w1>db", tone: "error", caption: "The database times out. The worker does not ack and does not mark the job done.", mark: [{ node: "db", state: "down" }] },
        { edge: "queue>w1", reverse: true, tone: "error", caption: "The job goes back to the queue with a delay: retry in 1 s.", ms: 1400 },
        { edge: "queue>w2", tone: "error", caption: "Attempt 2 lands on Worker 2 and fails too: retry in 2 s.", ms: 1400 },
        { edge: "queue>w1", tone: "error", caption: "Attempt 3 fails: retry in 4 s. Backing off 1 s → 2 s → 4 s gives the database room to recover.", ms: 1600 },
        { edge: "queue>w2", caption: "Attempt 4, four seconds later. The database is healthy again.", mark: [{ node: "db", state: null }] },
        { edge: "w2>db", tone: "ok", caption: "The write succeeds, the job is marked done, and the message is acked. Nothing was lost." },
      ],
    },
    {
      id: "poison",
      name: "Poison message → DLQ",
      steps: [
        { edge: "api>queue", caption: "A message arrives with a payload the workers can't parse (a bug in a new producer)." },
        { edge: "queue>w1", tone: "error", caption: "Worker 1 throws. This is a poison message: retrying won't fix it." },
        { edge: "queue>w2", tone: "error", caption: "Attempts 2 to 5 fail the same way, each after a longer backoff." },
        {
          edge: "queue>dlq",
          tone: "error",
          caption: "After the maximum attempts it moves to the dead letter queue, where it stops burning worker time and blocking healthy messages.",
          mark: [{ node: "dlq", state: "busy" }],
        },
        {
          edge: "queue>w1",
          tone: "ok",
          caption: "Healthy messages keep flowing. An alert on DLQ depth pages someone, who fixes the bug and redrives the message.",
          with: [{ edge: "queue>w2", tone: "ok", caption: "" }],
        },
      ],
    },
    {
      id: "burst",
      name: "Burst absorbed",
      steps: [
        {
          edge: "api>queue",
          caption: "Flash sale: five times the normal traffic hits the API, which publishes every job and still answers fast.",
          with: [{ edge: "api>queue", caption: "" }, { edge: "api>queue", caption: "" }],
          mark: [{ node: "queue", state: "busy" }],
        },
        {
          edge: "api>queue",
          caption: "The queue absorbs the burst. Its depth grows, but nothing is dropped.",
          with: [{ edge: "api>queue", caption: "" }, { edge: "api>queue", caption: "" }],
        },
        {
          edge: "queue>w1",
          caption: "Workers keep consuming at their steady rate. The oldest message waits a little longer.",
          with: [{ edge: "queue>w2", caption: "" }],
        },
        {
          edge: "w1>db",
          caption: "The database sees a constant, safe write rate instead of the spike.",
          with: [{ edge: "w2>db", caption: "" }],
        },
        {
          edge: "queue>w1",
          caption: "Autoscaling on queue depth adds capacity, and the backlog drains.",
          with: [{ edge: "queue>w2", caption: "" }, { edge: "queue>w1", caption: "" }, { edge: "queue>w2", caption: "" }],
        },
        { edge: "w1>db", tone: "ok", caption: "The queue is empty again. The burst cost some delay, not errors.", mark: [{ node: "queue", state: null }] },
      ],
    },
  ],
};

export const outboxSequence: SequenceSpec = {
  id: "outbox-sequence",
  title: "Transactional outbox",
  description:
    "The order and its event commit in one local transaction. A relay publishes unpublished outbox rows to Kafka, and consumers dedupe by event id.",
  actors: [
    { id: "api", label: "Orders API", kind: "service" },
    { id: "db", label: "Postgres", kind: "database" },
    { id: "relay", label: "Outbox relay", kind: "worker" },
    { id: "kafka", label: "Kafka", kind: "queue" },
    { id: "consumers", label: "Consumers", kind: "service" },
  ],
  items: [
    { from: "api", to: "db", label: "BEGIN; INSERT order", type: "call" },
    { from: "api", to: "db", label: "INSERT outbox row; COMMIT", type: "call" },
    { note: "One transaction: both rows or neither", over: ["api", "db"] },
    { from: "db", to: "api", label: "committed", type: "reply" },
    {
      alt: [
        {
          when: "commit ok",
          items: [
            { from: "relay", to: "db", label: "SELECT … SKIP LOCKED", type: "call" },
            { from: "db", to: "relay", label: "event rows", type: "reply" },
            { from: "relay", to: "kafka", label: "publish order.created (id)", type: "async" },
            { from: "relay", to: "db", label: "SET published_at = now()", type: "call" },
            { from: "kafka", to: "consumers", label: "deliver (at least once)", type: "async" },
            { note: "Dedupe by event id", over: ["consumers"] },
          ],
        },
        {
          when: "crash before publish",
          items: [
            { from: "relay", to: "db", label: "SELECT … SKIP LOCKED", type: "call" },
            { from: "db", to: "relay", label: "event rows", type: "reply" },
            { note: "Relay crashes before publishing", over: ["db", "relay"] },
            { note: "Its transaction rolls back: rows stay pending", over: ["db", "relay"] },
            { from: "relay", to: "db", label: "restart: SELECT again", type: "call" },
            { from: "db", to: "relay", label: "the same rows again", type: "reply" },
            { from: "relay", to: "kafka", label: "publish (late, not lost)", type: "async" },
            { from: "relay", to: "db", label: "SET published_at = now()", type: "call" },
            { from: "kafka", to: "consumers", label: "deliver", type: "async" },
          ],
        },
      ],
    },
  ],
};

/** Used by the DiagramQuiz: the queue is hidden and the reader puts it back. */
export const signupEmail: FlowSpec = {
  id: "signup-email",
  title: "Signup with a welcome email",
  description: "The signup API saves the user, hands the email to something, and answers. A worker talks to the email provider.",
  nodes: [
    { id: "client", label: "Browser", kind: "client", col: 0, row: 1 },
    { id: "api", label: "Signup API", kind: "service", col: 1, row: 1 },
    { id: "users", label: "Users DB", kind: "database", col: 2, row: 0 },
    { id: "queue", label: "Email queue", kind: "queue", col: 2, row: 2 },
    { id: "worker", label: "Email worker", kind: "worker", col: 3, row: 2 },
    { id: "provider", label: "Email provider", kind: "external", col: 4, row: 2, sub: "SES, SendGrid" },
  ],
  edges: [
    { from: "client", to: "api" },
    { from: "api", to: "users", label: "INSERT" },
    { from: "api", to: "queue", label: "publish", style: "async" },
    { from: "queue", to: "worker", style: "async" },
    { from: "worker", to: "provider" },
  ],
  scenarios: [
    {
      id: "signup",
      name: "Signup",
      steps: [
        { edge: "client>api", caption: "POST /signup reaches the API." },
        { edge: "api>users", caption: "The user row is written (a few ms)." },
        { edge: "api>queue", caption: "The welcome email is published as a job instead of being sent inline." },
        { edge: "client>api", reverse: true, tone: "ok", caption: "201 Created goes back immediately. The user is in." },
        { edge: "queue>worker", caption: "The worker picks up the job." },
        { edge: "worker>provider", tone: "ok", caption: "The email is sent, then the job is acked." },
      ],
    },
    {
      id: "outage",
      name: "Provider outage",
      steps: [
        { edge: "client>api", caption: "Another signup arrives while the email provider is down.", mark: [{ node: "provider", state: "down" }] },
        { edge: "api>queue", caption: "The API still only publishes a job." },
        { edge: "client>api", reverse: true, tone: "ok", caption: "Signup succeeds: the outage doesn't reach the user." },
        { edge: "queue>worker", caption: "The worker takes the job and calls the provider." },
        { edge: "worker>provider", tone: "error", caption: "The worker's send fails, so the job is retried with backoff." },
        { edge: "worker>provider", tone: "ok", caption: "The provider recovers and the retry delivers the email.", mark: [{ node: "provider", state: null }] },
      ],
    },
  ],
};
