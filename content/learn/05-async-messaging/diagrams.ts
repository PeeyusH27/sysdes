import type { DecisionSpec, FlowSpec, SequenceSpec } from "@/components/diagram/types";

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

/* ------------------------------------------------------------------------------------------------
 * Sync or async
 * ---------------------------------------------------------------------------------------------- */

export const syncAsyncChooser: DecisionSpec = {
  id: "sync-async-chooser",
  title: "Sync or async?",
  start: "needAnswer",
  nodes: {
    needAnswer: { q: "Does the user need the result to carry on?", yes: "sync", no: "slow" },
    sync: {
      result: "Keep it sync",
      why: "Was the card accepted? Is the username free? The next screen depends on the answer, so give it inside the request and keep it under about 200 ms.",
    },
    slow: { q: "Is the work slow, flaky, spiky or a fan-out to many reactions?", yes: "async", no: "inline" },
    async: {
      result: "Go async",
      why: "Publish a job and answer at once. A worker does the slow part later and retries if it fails, so the user never waits for it.",
    },
    inline: {
      result: "Inline is fine",
      why: "A 5 ms insert costs less inline than a broker costs to run. Do not add a queue for fast, reliable work.",
    },
  },
};

export const requestSplit: FlowSpec = {
  id: "request-split",
  title: "Split the request in two",
  description: "The API does the short part the user waits for, publishes the long part as a job, and returns 202 with a job id the client can poll.",
  nodes: [
    { id: "client", label: "Client", kind: "client", col: 0, row: 1 },
    { id: "api", label: "Upload API", kind: "service", col: 1, row: 1 },
    { id: "db", label: "Metadata DB", kind: "database", col: 2, row: 0 },
    { id: "queue", label: "Transcode queue", kind: "queue", col: 2, row: 2 },
    { id: "worker", label: "Transcoder", kind: "worker", col: 3, row: 2, sub: "minutes" },
  ],
  edges: [
    { from: "client", to: "api", label: "POST" },
    { from: "api", to: "db", label: "insert" },
    { from: "api", to: "queue", label: "job", style: "async" },
    { from: "queue", to: "worker", style: "async" },
  ],
  scenarios: [
    {
      id: "accept",
      name: "Accept, then work",
      steps: [
        { edge: "client>api", caption: "The user uploads a video. The API stores the file and a metadata row." },
        { edge: "api>db", caption: "The row is saved with status PROCESSING (a few milliseconds)." },
        { edge: "api>queue", caption: "A transcode job is published. Transcoding takes minutes, so it cannot run inside the request." },
        { edge: "client>api", reverse: true, tone: "ok", caption: "202 Accepted with a job id comes back in well under a second. The user can leave the page." },
        { edge: "queue>worker", caption: "A worker takes the job and transcodes at its own pace." },
        { edge: "api>db", caption: "When it finishes, the status flips to READY.", mark: [{ node: "db", state: "ok" }] },
      ],
    },
    {
      id: "poll",
      name: "Client polls the job",
      steps: [
        { edge: "client>api", caption: "The client asks GET /jobs/8841 every few seconds." },
        { edge: "api>db", caption: "The API reads the status row. It never waits on the worker." },
        { edge: "client>api", reverse: true, caption: "Still PROCESSING. A cheap read, so polling every 2 s costs almost nothing." },
        { edge: "api>db", caption: "Later the poll finds READY.", mark: [{ node: "db", state: "ok" }] },
        { edge: "client>api", reverse: true, tone: "ok", caption: "The client shows the video. A push (WebSocket or email) would save the polling." },
      ],
    },
  ],
};

/* ------------------------------------------------------------------------------------------------
 * Why queues: three tools
 * ---------------------------------------------------------------------------------------------- */

export const workQueue: FlowSpec = {
  id: "work-queue",
  title: "Work queue with competing consumers",
  description: "Each message goes to one worker. A message that is not acked reappears after the visibility timeout.",
  nodes: [
    { id: "api", label: "API", kind: "service", col: 0, row: 1 },
    { id: "queue", label: "Work queue", kind: "queue", col: 1, row: 1, sub: "SQS or RabbitMQ" },
    { id: "w1", label: "Worker 1", kind: "worker", col: 2, row: 0 },
    { id: "w2", label: "Worker 2", kind: "worker", col: 2, row: 2 },
  ],
  edges: [
    { from: "api", to: "queue", label: "job", style: "async" },
    { from: "queue", to: "w1", label: "take", style: "async" },
    { from: "queue", to: "w2", label: "take", style: "async" },
  ],
  scenarios: [
    {
      id: "once",
      name: "Each job once",
      steps: [
        { edge: "api>queue", caption: "Three jobs are published.", with: [{ edge: "api>queue", caption: "" }, { edge: "api>queue", caption: "" }] },
        { edge: "queue>w1", caption: "Job 1 goes to Worker 1 and job 2 to Worker 2. A message is handed to one consumer only.", with: [{ edge: "queue>w2", caption: "" }] },
        { edge: "queue>w1", reverse: true, tone: "ok", caption: "Worker 1 acks job 1 and the broker deletes it. It is gone for good: a queue has no replay.", with: [{ edge: "queue>w2", reverse: true, tone: "ok", caption: "" }] },
        { edge: "queue>w1", caption: "Job 3 goes to whichever worker is free first. Two workers give twice the throughput of one." },
      ],
    },
    {
      id: "crash",
      name: "Worker crash",
      steps: [
        { edge: "api>queue", caption: "A job is published." },
        { edge: "queue>w1", caption: "Worker 1 takes it. The broker hides it for the visibility timeout (30 s by default in SQS)." },
        { edge: "queue>w1", tone: "error", caption: "Worker 1 dies halfway. It never acks.", mark: [{ node: "w1", state: "down" }], ms: 1400 },
        { edge: "queue>w2", caption: "After 30 s the message becomes visible again and Worker 2 takes it. Nothing was lost.", ms: 1400 },
        { edge: "queue>w2", reverse: true, tone: "ok", caption: "Worker 2 finishes and acks.", mark: [{ node: "w1", state: null }] },
      ],
    },
    {
      id: "slow",
      name: "Timeout too short",
      steps: [
        { edge: "api>queue", caption: "A job that takes 60 s is published. The visibility timeout is only 30 s." },
        { edge: "queue>w1", caption: "Worker 1 starts the job and is healthy, just slow.", ms: 1400 },
        { edge: "queue>w2", tone: "error", caption: "At 30 s the broker assumes Worker 1 died and hands the same job to Worker 2.", mark: [{ node: "queue", state: "busy" }], ms: 1400 },
        { edge: "queue>w1", reverse: true, tone: "error", caption: "Both finish. The job ran twice: a double email or a double charge. Set the timeout above the slowest job, or extend it while working.", mark: [{ node: "queue", state: null }], with: [{ edge: "queue>w2", reverse: true, tone: "error", caption: "" }] },
      ],
    },
  ],
};

export const pubSubFanout: FlowSpec = {
  id: "pubsub-fanout",
  title: "Pub/sub fan-out",
  description: "One published event is delivered to every subscriber. Each reacts independently.",
  nodes: [
    { id: "orders", label: "Orders service", kind: "service", col: 0, row: 1 },
    { id: "topic", label: "order.created", kind: "pubsub", col: 1, row: 1, sub: "topic" },
    { id: "email", label: "Email service", kind: "service", col: 2, row: 0 },
    { id: "analytics", label: "Analytics", kind: "service", col: 2, row: 1 },
    { id: "search", label: "Search indexer", kind: "service", col: 2, row: 2 },
  ],
  edges: [
    { from: "orders", to: "topic", label: "emit", style: "async" },
    { from: "topic", to: "email", style: "async" },
    { from: "topic", to: "analytics", style: "async" },
    { from: "topic", to: "search", style: "async" },
  ],
  scenarios: [
    {
      id: "fanout",
      name: "One event, three reactions",
      steps: [
        { edge: "orders>topic", caption: "The orders service publishes order.created once. It knows nothing about who listens." },
        {
          edge: "topic>email",
          caption: "The topic delivers a copy to every subscriber at the same time. Adding a fourth subscriber needs no change to the publisher.",
          with: [{ edge: "topic>analytics", caption: "" }, { edge: "topic>search", caption: "" }],
        },
      ],
    },
    {
      id: "missed",
      name: "Subscriber was down",
      steps: [
        { edge: "orders>topic", caption: "An order is placed while the analytics service is restarting.", mark: [{ node: "analytics", state: "down" }] },
        {
          edge: "topic>email",
          tone: "ok",
          caption: "Email and search receive their copies.",
          with: [{ edge: "topic>search", tone: "ok", caption: "" }, { edge: "topic>analytics", tone: "error", caption: "" }],
        },
        { edge: "topic>analytics", tone: "error", caption: "Plain pub/sub is fire-and-forget: the analytics copy is gone. Fix: put a queue between topic and each subscriber (SNS to SQS), so a copy waits until it is read.", ms: 1800 },
      ],
    },
  ],
};

export const logReplay: FlowSpec = {
  id: "log-replay",
  title: "A log read by two consumer groups",
  description: "Kafka appends messages to a log and keeps them. Each consumer group tracks its own position, so groups read independently and can rewind.",
  nodes: [
    { id: "producer", label: "Producer", kind: "service", col: 0, row: 1 },
    { id: "log", label: "Kafka topic", kind: "queue", col: 1, row: 1, sub: "7 days kept" },
    { id: "billing", label: "Billing group", kind: "worker", col: 2, row: 0 },
    { id: "analytics", label: "Analytics group", kind: "worker", col: 2, row: 2 },
  ],
  edges: [
    { from: "producer", to: "log", label: "write", style: "async" },
    { from: "log", to: "billing", label: "read", style: "async" },
    { from: "log", to: "analytics", label: "read", style: "async" },
  ],
  scenarios: [
    {
      id: "groups",
      name: "Two groups, one log",
      steps: [
        { edge: "producer>log", caption: "The producer appends an event. Reading never removes it." },
        { edge: "log>billing", caption: "The billing group reads it and commits its position (offset).", with: [{ edge: "log>analytics", caption: "" }] },
        { edge: "log>analytics", tone: "ok", caption: "The analytics group reads the same event at its own pace. A work queue would have given it to one of them only." },
      ],
    },
    {
      id: "replay",
      name: "Replay after a bug",
      steps: [
        { edge: "log>analytics", tone: "error", caption: "A bug in the analytics code has been miscounting for a day.", mark: [{ node: "analytics", state: "down" }] },
        { edge: "log>analytics", reverse: true, caption: "After the fix, the group rewinds its offset to yesterday morning.", mark: [{ node: "analytics", state: null }] },
        { edge: "log>analytics", tone: "ok", caption: "It re-reads a day of events and rebuilds correct numbers. This only works because the log kept them.", ms: 1500 },
      ],
    },
  ],
};

export const brokerChooser: DecisionSpec = {
  id: "broker-chooser",
  title: "Which messaging tool?",
  start: "many",
  nodes: {
    many: { q: "Do several services need the same events, or need to replay them?", yes: "kafka", no: "routing" },
    kafka: {
      result: "Kafka (a log)",
      why: "Every consumer group reads on its own, and a group can rewind. Use it for event streams, analytics and change feeds.",
    },
    routing: { q: "Need routing rules or priorities beyond a plain queue?", yes: "rabbit", no: "sqs" },
    rabbit: {
      result: "RabbitMQ",
      why: "Exchanges route a message by key or pattern to different queues, with priorities and per-message acks. Run it yourself or use a hosted one.",
    },
    sqs: {
      result: "SQS or a similar work queue",
      why: "The default for jobs. Managed, no servers, and the visibility timeout, dead letter queue and delay come built in.",
    },
  },
};

/* ------------------------------------------------------------------------------------------------
 * Kafka basics
 * ---------------------------------------------------------------------------------------------- */

export const consumerGroups: FlowSpec = {
  id: "consumer-groups",
  title: "Partitions and a consumer group",
  description: "A topic has three partitions. Inside a group each partition is read by one consumer; when a consumer joins, partitions are reassigned.",
  nodes: [
    { id: "producer", label: "Producer", kind: "service", col: 0, row: 1 },
    { id: "p0", label: "Partition 0", kind: "queue", col: 1, row: 0 },
    { id: "p1", label: "Partition 1", kind: "queue", col: 1, row: 1 },
    { id: "p2", label: "Partition 2", kind: "queue", col: 1, row: 2 },
    { id: "c1", label: "Consumer A", kind: "worker", col: 2, row: 0 },
    { id: "c3", label: "Consumer C", kind: "worker", col: 2, row: 1, sub: "joins later" },
    { id: "c2", label: "Consumer B", kind: "worker", col: 2, row: 2 },
  ],
  edges: [
    { from: "producer", to: "p0", label: "key a", style: "async" },
    { from: "producer", to: "p1", label: "key b", style: "async" },
    { from: "producer", to: "p2", label: "key c", style: "async" },
    { from: "p0", to: "c1", style: "async" },
    { from: "p1", to: "c1", style: "async" },
    { from: "p2", to: "c2", style: "async" },
    { from: "p1", to: "c3", style: "async" },
  ],
  scenarios: [
    {
      id: "assign",
      name: "Keys to partitions",
      steps: [
        { edge: "producer>p0", caption: "The key is hashed to pick a partition. Key a always lands in partition 0.", with: [{ edge: "producer>p1", caption: "" }, { edge: "producer>p2", caption: "" }] },
        { edge: "p0>c1", caption: "Two consumers share three partitions. Consumer A owns partitions 0 and 1.", with: [{ edge: "p1>c1", caption: "" }, { edge: "p2>c2", caption: "" }] },
        { edge: "p2>c2", tone: "ok", caption: "Consumer B owns partition 2. Within a partition, messages arrive in order." },
      ],
    },
    {
      id: "rebalance",
      name: "A consumer joins",
      steps: [
        { edge: "p1>c1", caption: "Consumer A is busy with two partitions and falls behind." },
        { edge: "p1>c3", caption: "Consumer C joins the group. Kafka pauses reads briefly and reassigns partitions (a rebalance).", mark: [{ node: "c3", state: "busy" }], ms: 1500 },
        { edge: "p1>c3", tone: "ok", caption: "Partition 1 now belongs to Consumer C. Each consumer has one partition. A fourth consumer would sit idle.", mark: [{ node: "c3", state: "ok" }] },
      ],
    },
  ],
};

/* ------------------------------------------------------------------------------------------------
 * Delivery semantics
 * ---------------------------------------------------------------------------------------------- */

export const ackTiming: FlowSpec = {
  id: "ack-timing",
  title: "When you ack decides what a crash costs",
  description: "Ack before the work and a crash loses the message. Ack after the work and a crash delivers it again.",
  nodes: [
    { id: "queue", label: "Queue", kind: "queue", col: 0, row: 1 },
    { id: "worker", label: "Worker", kind: "worker", col: 1, row: 1 },
    { id: "provider", label: "Email provider", kind: "external", col: 2, row: 1 },
  ],
  edges: [
    { from: "queue", to: "worker", label: "take", style: "async" },
    { from: "worker", to: "provider", label: "send" },
  ],
  scenarios: [
    {
      id: "ack-first",
      name: "Ack first: a crash loses it",
      steps: [
        { edge: "queue>worker", caption: "The worker receives a send-receipt job." },
        { edge: "queue>worker", reverse: true, caption: "It acks immediately, so the broker deletes the message." },
        { edge: "worker>provider", tone: "error", caption: "The worker crashes before it calls the provider.", mark: [{ node: "worker", state: "down" }] },
        { edge: "queue>worker", tone: "error", caption: "Nothing is left to redeliver. The receipt is never sent and nobody knows.", ms: 1500 },
      ],
    },
    {
      id: "ack-after",
      name: "Ack after: a crash repeats it",
      steps: [
        { edge: "queue>worker", caption: "The worker receives the same job." },
        { edge: "worker>provider", tone: "ok", caption: "It sends the email. The provider accepts it." },
        { edge: "queue>worker", reverse: true, tone: "error", caption: "The worker is killed before it can ack.", mark: [{ node: "worker", state: "down" }] },
        { edge: "queue>worker", caption: "The visibility timeout passes and the broker redelivers to a healthy worker.", mark: [{ node: "worker", state: null }], ms: 1400 },
        { edge: "worker>provider", tone: "error", caption: "The email is sent a second time. This is at-least-once: never lost, sometimes doubled.", ms: 1500 },
      ],
    },
  ],
};

export const dedupeSequence: SequenceSpec = {
  id: "dedupe-sequence",
  title: "Idempotent consumer with a dedupe table",
  description: "The message id is inserted under a unique constraint in the same transaction as the work. A redelivery inserts zero rows and is skipped.",
  actors: [
    { id: "broker", label: "Broker", kind: "queue" },
    { id: "consumer", label: "Consumer", kind: "worker" },
    { id: "db", label: "Postgres", kind: "database" },
  ],
  items: [
    { from: "broker", to: "consumer", label: "message m-42", type: "async" },
    {
      alt: [
        {
          when: "first delivery",
          items: [
            { from: "consumer", to: "db", label: "BEGIN; INSERT m-42", type: "call" },
            { from: "db", to: "consumer", label: "1 row inserted", type: "reply" },
            { from: "consumer", to: "db", label: "UPDATE balance; COMMIT", type: "call" },
            { note: "Id and effect commit together", over: ["consumer", "db"] },
            { from: "consumer", to: "broker", label: "ack", type: "reply" },
          ],
        },
        {
          when: "redelivered",
          items: [
            { from: "consumer", to: "db", label: "BEGIN; INSERT m-42", type: "call" },
            { from: "db", to: "consumer", label: "0 rows: duplicate", type: "reply" },
            { note: "Skip the work, balance untouched", over: ["consumer", "db"] },
            { from: "consumer", to: "db", label: "ROLLBACK", type: "call" },
            { from: "consumer", to: "broker", label: "ack", type: "reply" },
          ],
        },
      ],
    },
  ],
};

/* ------------------------------------------------------------------------------------------------
 * Ordering
 * ---------------------------------------------------------------------------------------------- */

export const keyOrdering: FlowSpec = {
  id: "key-ordering",
  title: "Key by entity to keep order",
  description: "With a key, every event for one user lands in one partition and is read by one consumer, in order. Without a key, events scatter.",
  nodes: [
    { id: "api", label: "Orders API", kind: "service", col: 0, row: 1 },
    { id: "p0", label: "Partition 0", kind: "queue", col: 1, row: 0, sub: "user 7" },
    { id: "p1", label: "Partition 1", kind: "queue", col: 1, row: 2, sub: "user 9" },
    { id: "ca", label: "Consumer A", kind: "worker", col: 2, row: 0 },
    { id: "cb", label: "Consumer B", kind: "worker", col: 2, row: 2 },
  ],
  edges: [
    { from: "api", to: "p0", label: "key 7", style: "async" },
    { from: "api", to: "p1", label: "key 9", style: "async" },
    { from: "p0", to: "ca", style: "async" },
    { from: "p1", to: "cb", style: "async" },
  ],
  scenarios: [
    {
      id: "keyed",
      name: "With a key",
      steps: [
        { edge: "api>p0", caption: "User 7 pays. The key is the userId, so the event goes to partition 0." },
        { edge: "api>p0", caption: "Seconds later user 7's order ships. Same key, same partition, queued behind the payment." },
        { edge: "p0>ca", tone: "ok", caption: "Consumer A reads paid, then shipped. Order is guaranteed inside a partition." },
        { edge: "api>p1", caption: "User 9's events go to partition 1 and are read in parallel by Consumer B. Different users never need to be ordered against each other.", with: [{ edge: "p1>cb", caption: "" }] },
      ],
    },
    {
      id: "unkeyed",
      name: "Without a key",
      steps: [
        { edge: "api>p0", caption: "No key is set, so messages are spread round-robin. Paid for order 7 goes to partition 0." },
        { edge: "api>p1", caption: "Shipped for order 7 goes to partition 1." },
        { edge: "p1>cb", tone: "error", caption: "Consumer B is idle and reads shipped first. Consumer A is still busy with other work.", mark: [{ node: "cb", state: "busy" }] },
        { edge: "p0>ca", tone: "error", caption: "Paid arrives second. The consumer saw shipped before paid: a bug no unit test catches.", mark: [{ node: "cb", state: null }], ms: 1500 },
      ],
    },
  ],
};

export const retryReorder: SequenceSpec = {
  id: "retry-reorder",
  title: "Retries can reorder events",
  description: "If a failed message is parked on a retry topic, the next message runs before it. Retrying in place keeps the order.",
  actors: [
    { id: "topic", label: "Orders topic", kind: "queue" },
    { id: "consumer", label: "Consumer", kind: "worker" },
    { id: "retry", label: "Retry topic", kind: "queue" },
    { id: "db", label: "Orders DB", kind: "database" },
  ],
  items: [
    { from: "topic", to: "consumer", label: "m1: order paid", type: "async" },
    { from: "consumer", to: "db", label: "mark paid: times out", type: "call" },
    {
      alt: [
        {
          when: "park on retry topic",
          items: [
            { from: "consumer", to: "retry", label: "m1, retry in 30 s", type: "async" },
            { from: "topic", to: "consumer", label: "m2: order shipped", type: "async" },
            { from: "consumer", to: "db", label: "ship an unpaid order", type: "call" },
            { note: "m2 ran first; m1 returns 30 s late", over: ["consumer", "db"] },
          ],
        },
        {
          when: "retry in place",
          items: [
            { note: "Wait 1 s; m2 waits behind m1", over: ["topic", "consumer"] },
            { from: "consumer", to: "db", label: "mark paid (retry ok)", type: "call" },
            { from: "topic", to: "consumer", label: "m2: order shipped", type: "async" },
            { from: "consumer", to: "db", label: "mark shipped", type: "call" },
          ],
        },
      ],
    },
  ],
};

/* ------------------------------------------------------------------------------------------------
 * Retries and DLQs
 * ---------------------------------------------------------------------------------------------- */

export const failureTriage: DecisionSpec = {
  id: "failure-triage",
  title: "What to do with a failed message",
  start: "heal",
  nodes: {
    heal: { q: "Could this exact message ever succeed on a retry?", yes: "overload", no: "dlq" },
    dlq: {
      result: "Dead letter queue now",
      why: "A bad payload or a logic bug fails forever. Park it after the first failure, alert, fix the code, then redrive it.",
    },
    overload: { q: "Is the downstream overloaded (429 or 503)?", yes: "slow", no: "retry" },
    slow: {
      result: "Back off and slow down",
      why: "Fast retries make an overload worse. Use exponential backoff with full jitter and lower the consumer rate until errors stop.",
    },
    retry: {
      result: "Retry with backoff",
      why: "Timeouts and deadlocks usually heal. Wait 1, 2, 4, 8 s with jitter, up to 5 attempts, then move it to the DLQ.",
    },
  },
};

/* ------------------------------------------------------------------------------------------------
 * Backpressure
 * ---------------------------------------------------------------------------------------------- */

export const backpressure: FlowSpec = {
  id: "backpressure",
  title: "Three answers to a growing backlog",
  description: "When producers outpace consumers, bound the queue and push back, add consumers on queue depth, or drop low-value work.",
  nodes: [
    { id: "client", label: "Client", kind: "client", col: 0, row: 1 },
    { id: "api", label: "API", kind: "service", col: 1, row: 1 },
    { id: "queue", label: "Queue", kind: "queue", col: 2, row: 1, sub: "limit 100K" },
    { id: "workers", label: "Workers", kind: "worker", col: 3, row: 1, sub: "×4" },
  ],
  edges: [
    { from: "client", to: "api", label: "call" },
    { from: "api", to: "queue", label: "job", style: "async" },
    { from: "queue", to: "workers", label: "take", style: "async" },
  ],
  scenarios: [
    {
      id: "bound",
      name: "Bound and push back",
      steps: [
        { edge: "api>queue", caption: "Jobs arrive faster than the workers finish them, and the queue fills to its limit.", mark: [{ node: "queue", state: "busy" }] },
        { edge: "client>api", caption: "A new request arrives. The API checks the depth before publishing." },
        { edge: "client>api", reverse: true, tone: "error", caption: "It answers 429 with Retry-After: 5. The backlog stops growing and callers wait their turn instead of the queue swallowing everything.", ms: 1600 },
      ],
    },
    {
      id: "scale",
      name: "Autoscale on depth",
      steps: [
        { edge: "api>queue", caption: "A burst arrives and the age of the oldest message passes 60 s.", mark: [{ node: "queue", state: "busy" }] },
        { edge: "queue>workers", caption: "Autoscaling reacts to queue depth, not CPU: workers waiting on a slow API look idle on CPU while the backlog grows.", ms: 1500 },
        { edge: "queue>workers", tone: "ok", caption: "Workers go from 4 to 12. The backlog drains at three times the speed.", mark: [{ node: "workers", state: "ok" }, { node: "queue", state: null }], ms: 1500 },
      ],
    },
    {
      id: "shed",
      name: "Shed low-value work",
      steps: [
        { edge: "api>queue", caption: "The queue is above 80% full. A marketing push and a password reset arrive together.", mark: [{ node: "queue", state: "busy" }] },
        { edge: "client>api", reverse: true, tone: "error", caption: "The API drops the marketing job (or delays it by an hour). Nobody is hurt by a late newsletter." },
        { edge: "api>queue", tone: "ok", caption: "The password reset is published. Critical work keeps its place; the rest waits or is dropped.", ms: 1500 },
      ],
    },
  ],
};

/* ------------------------------------------------------------------------------------------------
 * Dual write and the outbox
 * ---------------------------------------------------------------------------------------------- */

export const dualWrite: FlowSpec = {
  id: "dual-write",
  title: "The dual-write problem",
  description: "The database and the broker have no shared transaction, so a crash between the two writes leaves them disagreeing.",
  nodes: [
    { id: "api", label: "Orders API", kind: "service", col: 0, row: 1 },
    { id: "db", label: "Postgres", kind: "database", col: 1, row: 0 },
    { id: "broker", label: "Kafka", kind: "queue", col: 1, row: 2 },
    { id: "consumers", label: "Billing, shipping", kind: "service", col: 2, row: 2 },
  ],
  edges: [
    { from: "api", to: "db", label: "1 save" },
    { from: "api", to: "broker", label: "2 send", style: "async" },
    { from: "broker", to: "consumers", style: "async" },
  ],
  scenarios: [
    {
      id: "crash",
      name: "Save, then crash",
      steps: [
        { edge: "api>db", tone: "ok", caption: "The order is saved and committed.", mark: [{ node: "db", state: "ok" }] },
        { edge: "api>broker", tone: "error", caption: "The process is killed before the publish. Nothing reaches Kafka.", mark: [{ node: "api", state: "down" }], ms: 1500 },
        { edge: "broker>consumers", tone: "error", caption: "Billing and shipping never hear about the order. It exists, but nobody charges or ships it, and nothing reports an error.", ms: 1700 },
      ],
    },
    {
      id: "publish-first",
      name: "Publish, then roll back",
      steps: [
        { edge: "api>broker", caption: "Reversed order: the event is published first." },
        { edge: "broker>consumers", caption: "Billing charges the customer.", ms: 1300 },
        { edge: "api>db", tone: "error", caption: "The database insert then fails and rolls back. There is no order.", mark: [{ node: "db", state: "down" }] },
        { edge: "broker>consumers", tone: "error", caption: "Consumers acted on an order that does not exist. The customer was charged for nothing.", ms: 1700 },
      ],
    },
  ],
};

export const cdcFlow: FlowSpec = {
  id: "cdc-flow",
  title: "Change data capture instead of a polling relay",
  description: "A connector such as Debezium reads the database write-ahead log and publishes each committed outbox row to Kafka.",
  nodes: [
    { id: "api", label: "Orders API", kind: "service", col: 0, row: 1 },
    { id: "db", label: "Postgres", kind: "database", col: 1, row: 1, sub: "WAL" },
    { id: "cdc", label: "Debezium", kind: "worker", col: 2, row: 1, sub: "reads the log" },
    { id: "kafka", label: "Kafka", kind: "queue", col: 3, row: 1 },
  ],
  edges: [
    { from: "api", to: "db", label: "commit" },
    { from: "db", to: "cdc", label: "WAL", style: "replication" },
    { from: "cdc", to: "kafka", label: "send", style: "async" },
  ],
  scenarios: [
    {
      id: "tail",
      name: "Tail the log",
      steps: [
        { edge: "api>db", caption: "The API commits the order and its outbox row in one transaction." },
        { edge: "db>cdc", caption: "Every committed change is written to the write-ahead log first. The connector streams it as it appears: no polling query." },
        { edge: "cdc>kafka", tone: "ok", caption: "The event is published within milliseconds of the commit, in commit order." },
      ],
    },
    {
      id: "stuck",
      name: "Connector stops",
      steps: [
        { edge: "db>cdc", tone: "error", caption: "The connector is down for hours. Its replication slot is still registered.", mark: [{ node: "cdc", state: "down" }] },
        { edge: "api>db", caption: "The API keeps committing orders.", ms: 1300 },
        { edge: "api>db", tone: "error", caption: "Postgres must keep every WAL segment the slot has not read, so the disk fills. Alert on slot lag and drop a dead slot.", mark: [{ node: "db", state: "busy" }], ms: 1800 },
      ],
    },
  ],
};

/* ------------------------------------------------------------------------------------------------
 * Sagas
 * ---------------------------------------------------------------------------------------------- */

export const sagaChoreography: FlowSpec = {
  id: "saga-choreography",
  title: "Saga by choreography",
  description: "No coordinator: each service reacts to the previous service's event and publishes its own.",
  nodes: [
    { id: "orders", label: "Orders", kind: "service", col: 0, row: 1 },
    { id: "bus", label: "Event bus", kind: "pubsub", col: 1, row: 1 },
    { id: "inventory", label: "Inventory", kind: "service", col: 2, row: 0 },
    { id: "payments", label: "Payments", kind: "service", col: 2, row: 1 },
    { id: "shipping", label: "Shipping", kind: "service", col: 2, row: 2 },
  ],
  edges: [
    { from: "orders", to: "bus", style: "async" },
    { from: "bus", to: "inventory", style: "async" },
    { from: "bus", to: "payments", style: "async" },
    { from: "bus", to: "shipping", style: "async" },
  ],
  scenarios: [
    {
      id: "happy",
      name: "Happy path",
      steps: [
        { edge: "orders>bus", caption: "Orders saves the order as PENDING and publishes order.created." },
        { edge: "bus>inventory", caption: "Inventory reserves the stock and publishes stock.reserved." },
        { edge: "bus>payments", caption: "Payments sees stock.reserved, charges the card and publishes payment.done." },
        { edge: "bus>shipping", tone: "ok", caption: "Shipping creates the shipment. Orders hears shipment.created and marks the order CONFIRMED.", ms: 1500 },
      ],
    },
    {
      id: "fail",
      name: "Payment fails",
      steps: [
        { edge: "bus>payments", tone: "error", caption: "The card is declined. Payments publishes payment.failed.", mark: [{ node: "payments", state: "down" }] },
        { edge: "bus>inventory", caption: "Inventory listens for payment.failed and releases the reservation.", ms: 1300 },
        { edge: "orders>bus", tone: "ok", caption: "Orders also listens, and marks the order CANCELLED. No one coordinated this; every service knew its own undo.", mark: [{ node: "payments", state: null }], ms: 1600 },
      ],
    },
  ],
};

export const sagaOrchestration: FlowSpec = {
  id: "saga-orchestration",
  title: "Saga by orchestration",
  description: "A coordinator holds the whole flow, calls each service in turn and runs the compensations in reverse on failure.",
  nodes: [
    { id: "orch", label: "Orchestrator", kind: "service", col: 0, row: 1, sub: "saga state" },
    { id: "inventory", label: "Inventory", kind: "service", col: 2, row: 0 },
    { id: "payments", label: "Payments", kind: "service", col: 2, row: 1 },
    { id: "shipping", label: "Shipping", kind: "service", col: 2, row: 2 },
  ],
  edges: [
    { from: "orch", to: "inventory", label: "reserve" },
    { from: "orch", to: "payments", label: "charge" },
    { from: "orch", to: "shipping", label: "ship" },
  ],
  scenarios: [
    {
      id: "happy",
      name: "Happy path",
      steps: [
        { edge: "orch>inventory", caption: "The orchestrator tells Inventory to reserve the stock." },
        { edge: "orch>inventory", reverse: true, tone: "ok", caption: "Reserved. The orchestrator records the step." },
        { edge: "orch>payments", caption: "Next it tells Payments to charge the card." },
        { edge: "orch>payments", reverse: true, tone: "ok", caption: "Charged." },
        { edge: "orch>shipping", tone: "ok", caption: "Finally it creates the shipment and marks the order CONFIRMED.", ms: 1400 },
      ],
    },
    {
      id: "fail",
      name: "Shipping fails",
      steps: [
        { edge: "orch>shipping", tone: "error", caption: "Shipping has no courier available and fails.", mark: [{ node: "shipping", state: "down" }] },
        { edge: "orch>payments", caption: "The orchestrator runs compensations in reverse: refund the card first.", mark: [{ node: "shipping", state: null }], ms: 1300 },
        { edge: "orch>inventory", tone: "ok", caption: "Then release the stock and cancel the order. The whole flow, including the undo, is written in one place.", ms: 1500 },
      ],
    },
  ],
};

/* ------------------------------------------------------------------------------------------------
 * Delayed jobs
 * ---------------------------------------------------------------------------------------------- */

export const delayedJobs: FlowSpec = {
  id: "delayed-jobs",
  title: "A run_at table and a poller",
  description: "A job row carries the time it should run. Pollers claim due rows with SKIP LOCKED, so two pollers never take the same row.",
  nodes: [
    { id: "api", label: "Orders API", kind: "service", col: 0, row: 1 },
    { id: "jobs", label: "jobs table", kind: "database", col: 1, row: 1, sub: "run_at" },
    { id: "pa", label: "Poller A", kind: "worker", col: 2, row: 0 },
    { id: "pb", label: "Poller B", kind: "worker", col: 2, row: 2 },
    { id: "orders", label: "Orders DB", kind: "database", col: 3, row: 1 },
  ],
  edges: [
    { from: "api", to: "jobs", label: "insert" },
    { from: "jobs", to: "pa", label: "claim" },
    { from: "jobs", to: "pb", label: "claim" },
    { from: "pa", to: "orders", label: "check" },
    { from: "pb", to: "orders", label: "check" },
  ],
  scenarios: [
    {
      id: "cancel",
      name: "Cancel unpaid orders",
      steps: [
        { edge: "api>jobs", caption: "Order 17 is created. A job row is inserted with run_at set to now plus 15 minutes." },
        { edge: "jobs>pa", caption: "Fifteen minutes later Poller A claims the due row. The delay is accurate to one poll interval, about a second.", ms: 1400 },
        { edge: "pa>orders", caption: "It re-reads the order. Still PENDING, so it cancels it and releases the stock.", ms: 1300 },
        { edge: "pa>orders", reverse: true, tone: "ok", caption: "Done. The row is marked finished." },
      ],
    },
    {
      id: "paid",
      name: "Paid in time",
      steps: [
        { edge: "api>jobs", caption: "The user pays at minute 9. Nobody deletes the job." },
        { edge: "jobs>pb", caption: "At minute 15 the job still fires." },
        { edge: "pb>orders", caption: "The job checks the order first. It is PAID, so the job does nothing. Checking state is simpler and safer than hunting for the job to cancel it.", ms: 1500 },
        { edge: "pb>orders", reverse: true, tone: "ok", caption: "No-op, row marked finished." },
      ],
    },
    {
      id: "two",
      name: "Two pollers at once",
      steps: [
        { edge: "jobs>pa", caption: "Both pollers wake at the same second and run SELECT … FOR UPDATE SKIP LOCKED.", with: [{ edge: "jobs>pb", caption: "" }] },
        { edge: "jobs>pb", tone: "ok", caption: "Poller A locks rows 1 to 50. Poller B skips them and gets 51 to 100. No row runs twice and nobody waits on a lock.", ms: 1600 },
      ],
    },
  ],
};
