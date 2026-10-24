import type { FlowSpec, SequenceSpec, DecisionSpec } from "@/components/diagram/types";

export const notificationPipeline: FlowSpec = {
  id: "notification-pipeline",
  title: "Notification pipeline",
  description:
    "The notification service reads preferences and publishes one message per channel onto queues split by channel and priority. Workers dedupe, then send through providers behind circuit breakers, with a backup SMS provider and a delayed queue for quiet hours.",
  nodes: [
    { id: "src", label: "Event or API", kind: "client", col: 0, row: 1, note: "Other services emit events; admins and campaigns call POST /v1/notifications." },
    { id: "delayed", label: "Delayed queue", kind: "queue", col: 1, row: 0, sub: "until notBefore", note: "Messages that must wait (quiet hours, sendAt). A scheduler moves them on when they're due." },
    { id: "notif", label: "Notif service", kind: "service", col: 1, row: 1, sub: "prefs · priority" },
    { id: "prefs", label: "Preferences DB", kind: "database", col: 1, row: 2, sub: "cached" },
    { id: "queues", label: "Channel queues", kind: "queue", col: 2, row: 1, sub: "channel × priority", note: "notif.sms.critical, notif.push.high, notif.email.low…" },
    { id: "push", label: "Push worker", kind: "worker", col: 3, row: 0 },
    { id: "email", label: "Email worker", kind: "worker", col: 3, row: 1 },
    { id: "sms", label: "SMS worker", kind: "worker", col: 3, row: 2 },
    { id: "dedupe", label: "Dedupe store", kind: "cache", col: 3, row: 3, sub: "Redis sent:id" },
    { id: "fcm", label: "Push (FCM/APNs)", kind: "external", col: 4, row: 0 },
    { id: "ses", label: "Email (SES)", kind: "external", col: 4, row: 1 },
    { id: "smsA", label: "SMS provider A", kind: "external", col: 4, row: 2, sub: "primary" },
    { id: "smsB", label: "Backup SMS", kind: "external", col: 4, row: 3, sub: "provider B" },
  ],
  edges: [
    { from: "src", to: "notif", label: "event" },
    { from: "notif", to: "prefs", label: "prefs" },
    { from: "notif", to: "queues", label: "publish", style: "async" },
    { from: "notif", to: "delayed", label: "quiet hours", style: "async" },
    { from: "delayed", to: "queues", label: "when due", style: "async" },
    { from: "queues", to: "push", style: "async" },
    { from: "queues", to: "email", style: "async" },
    { from: "queues", to: "sms", style: "async" },
    { from: "push", to: "fcm" },
    { from: "email", to: "ses" },
    { from: "sms", to: "smsA" },
    { from: "sms", to: "smsB", label: "failover" },
    { from: "sms", to: "dedupe", label: "sent?" },
  ],
  scenarios: [
    {
      id: "fanout",
      name: "Normal fan-out",
      steps: [
        { edge: "src>notif", caption: "The order service emits order_update for user 42 (event 812), with an idempotency key." },
        { edge: "notif>prefs", caption: "The notification service loads the user's preferences, which are cached in front of the database." },
        { edge: "notif>prefs", reverse: true, caption: "Push, email and SMS are all enabled for order updates. The type maps to priority high." },
        { edge: "notif>queues", caption: "It publishes one message per channel, with deterministic ids 812:push, 812:email and 812:sms, on the high-priority queues." },
        {
          edge: "queues>push",
          caption: "Three workers pick up their messages in parallel. Each channel scales and fails on its own, so a slow SMS provider can't delay push.",
          with: [{ edge: "queues>email", caption: "" }, { edge: "queues>sms", caption: "" }],
          mark: [{ node: "push", state: "busy" }, { node: "email", state: "busy" }, { node: "sms", state: "busy" }],
        },
        {
          edge: "push>fcm",
          caption: "Each worker renders the template in the user's language and calls its provider.",
          with: [{ edge: "email>ses", caption: "" }, { edge: "sms>smsA", caption: "" }],
        },
        {
          edge: "push>fcm",
          reverse: true,
          tone: "ok",
          caption: "All three providers accept. Workers record sent:<id> and a delivery row; webhooks report delivered and opened later.",
          with: [{ edge: "email>ses", reverse: true, tone: "ok", caption: "" }, { edge: "sms>smsA", reverse: true, tone: "ok", caption: "" }],
          mark: [{ node: "push", state: null }, { node: "email", state: null }, { node: "sms", state: null }],
        },
      ],
    },
    {
      id: "failover",
      name: "SMS provider down",
      steps: [
        { edge: "src>notif", caption: "A login OTP for user 42 arrives. Type otp means priority critical." },
        { edge: "notif>queues", caption: "It's published to notif.sms.critical, a queue with its own dedicated workers that no campaign can fill." },
        { edge: "queues>sms", caption: "A critical-lane SMS worker picks it up within milliseconds.", mark: [{ node: "sms", state: "busy" }] },
        {
          edge: "sms>smsA",
          tone: "error",
          caption: "Provider A times out: the fifth failure in a row. The circuit breaker opens, so for the next 30 s workers skip A instead of waiting on it.",
          mark: [{ node: "smsA", state: "down" }],
          ms: 1600,
        },
        { edge: "sms>smsB", caption: "The worker moves to the next provider in the failover order: provider B." },
        {
          edge: "sms>smsB",
          reverse: true,
          tone: "ok",
          caption: "B accepts and returns a message id. The worker stores sent:<id> and a delivery row with provider B. The OTP arrives in seconds.",
          mark: [{ node: "smsB", state: "ok" }, { node: "sms", state: null }],
        },
        {
          edge: "sms>smsA",
          caption: "After the cool-down the breaker goes half-open and lets one trial message through to A. If it succeeds, traffic moves back. Had B failed too, the message would return to the queue with backoff, then the DLQ.",
          mark: [{ node: "smsA", state: null }],
          ms: 2200,
        },
      ],
    },
    {
      id: "duplicate",
      name: "Duplicate event dropped",
      steps: [
        { edge: "src>notif", caption: "The order service timed out waiting for our reply and retried, so event 812 arrives a second time." },
        { edge: "notif>queues", caption: "The service builds the same deterministic ids, 812:push, 812:email and 812:sms, and publishes them again." },
        {
          edge: "queues>sms",
          caption: "The SMS worker picks up 812:sms. A redelivery after a worker crash looks exactly the same: queues deliver at least once.",
          mark: [{ node: "sms", state: "busy" }],
        },
        { edge: "sms>dedupe", caption: "Before calling any provider, the worker checks whether sent:812:sms exists in Redis." },
        {
          edge: "sms>dedupe",
          reverse: true,
          tone: "miss",
          caption: "It does: this exact message was sent 40 seconds ago.",
          mark: [{ node: "dedupe", state: "hit" }],
        },
        {
          edge: "queues>sms",
          reverse: true,
          tone: "ok",
          caption: "The worker acks and drops the copy. The user gets one SMS, not two, and the push and email workers do the same.",
          mark: [{ node: "sms", state: "ok" }, { node: "dedupe", state: null }],
        },
      ],
    },
    {
      id: "quiet",
      name: "Quiet hours",
      steps: [
        { edge: "src>notif", caption: "A marketing message for a user in Mumbai is created at 23:30 local time." },
        { edge: "notif>prefs", caption: "The service loads their preferences: push only for marketing, quiet hours 22:00 to 08:00, time zone Asia/Kolkata." },
        { edge: "notif>prefs", reverse: true, caption: "Marketing is low priority and it's quiet time where the user is, so the message has to wait." },
        {
          edge: "notif>delayed",
          caption: "notBefore is set to 08:00 tomorrow in Kolkata, and the message is parked in the delayed queue.",
          mark: [{ node: "delayed", state: "busy" }],
          ms: 1600,
        },
        {
          edge: "delayed>queues",
          caption: "At 08:00 local time the scheduler moves it onto notif.push.low.",
          mark: [{ node: "delayed", state: null }],
        },
        { edge: "queues>push", caption: "The push worker re-checks quiet hours and the daily cap at send time, then sends." },
        {
          edge: "push>fcm",
          tone: "ok",
          caption: "Delivered at 08:00, not at midnight. An OTP in the same minute would have skipped all of this: critical messages ignore quiet hours.",
          mark: [{ node: "fcm", state: "ok" }],
        },
      ],
    },
  ],
};

/* ---------- Fan-out: one queue, one per channel, one per channel and priority ---------- */

export const singleQueue: FlowSpec = {
  id: "single-queue",
  title: "One queue for everything",
  description: "Every service writes to one shared queue and one worker pool sends through every provider. One slow channel or one big campaign delays all the others.",
  nodes: [
    { id: "src", label: "All services", kind: "client", col: 0, row: 1 },
    { id: "q", label: "One queue", kind: "queue", col: 1, row: 1, sub: "everything" },
    { id: "w", label: "Worker pool", kind: "worker", col: 2, row: 1, sub: "any channel" },
    { id: "push", label: "Push provider", kind: "external", col: 3, row: 0 },
    { id: "sms", label: "SMS provider", kind: "external", col: 3, row: 2 },
  ],
  edges: [
    { from: "src", to: "q", label: "all", style: "async" },
    { from: "q", to: "w", style: "async" },
    { from: "w", to: "push", label: "push" },
    { from: "w", to: "sms", label: "sms" },
  ],
  scenarios: [
    {
      id: "slow-sms",
      name: "SMS slows down",
      steps: [
        { edge: "src>q", caption: "Push and SMS messages arrive mixed together in one queue." },
        { edge: "q>w", caption: "Workers take them in arrival order.", mark: [{ node: "w", state: "busy" }] },
        { edge: "w>sms", tone: "error", caption: "The SMS provider slows to 2 s per call. Every worker that picks an SMS is stuck for 2 s.", mark: [{ node: "sms", state: "down" }], ms: 1600 },
        { edge: "w>push", tone: "miss", caption: "Push messages sit behind the stuck workers. A channel that is perfectly healthy is now slow too.", mark: [{ node: "push", state: "miss" }] },
      ],
    },
    {
      id: "campaign",
      name: "Campaign ahead",
      steps: [
        { edge: "src>q", caption: "A marketing job drops 1,000,000 messages into the queue. Seconds later a login OTP arrives behind them.", mark: [{ node: "q", state: "busy" }] },
        { edge: "q>w", caption: "The queue is first in, first out, so the OTP waits for all 1M. At 2,000 a second that is about 8 minutes." },
        { edge: "w>sms", tone: "error", caption: "The OTP finally leaves after its 5-minute life is over. The user taps resend and makes the queue longer.", mark: [{ node: "w", state: "busy" }] },
      ],
    },
  ],
};

export const perChannelQueues: FlowSpec = {
  id: "per-channel-queues",
  title: "One queue per channel",
  description: "A router sends each message to the queue of its channel. Each channel has its own workers, so a slow provider only delays its own channel.",
  nodes: [
    { id: "src", label: "Notif service", kind: "service", col: 0, row: 1, sub: "router" },
    { id: "qpush", label: "push queue", kind: "queue", col: 1, row: 0 },
    { id: "qsms", label: "sms queue", kind: "queue", col: 1, row: 2 },
    { id: "wpush", label: "Push workers", kind: "worker", col: 2, row: 0 },
    { id: "wsms", label: "SMS workers", kind: "worker", col: 2, row: 2 },
  ],
  edges: [
    { from: "src", to: "qpush", label: "push", style: "async" },
    { from: "src", to: "qsms", label: "sms", style: "async" },
    { from: "qpush", to: "wpush", style: "async" },
    { from: "qsms", to: "wsms", style: "async" },
  ],
  scenarios: [
    {
      id: "isolated",
      name: "Slow SMS, push fine",
      steps: [
        { edge: "src>qsms", caption: "SMS messages go to the sms queue.", with: [{ edge: "src>qpush", caption: "" }] },
        { edge: "qsms>wsms", tone: "error", caption: "The SMS provider is slow, so the sms queue backs up.", mark: [{ node: "wsms", state: "down" }], ms: 1500 },
        { edge: "qpush>wpush", tone: "ok", caption: "Push workers have their own queue and keep draining. The fault stays inside one channel.", mark: [{ node: "wpush", state: "ok" }] },
      ],
    },
    {
      id: "same-channel",
      name: "Campaign in one channel",
      steps: [
        { edge: "src>qsms", caption: "A marketing SMS blast of 1M messages lands in the sms queue.", mark: [{ node: "qsms", state: "busy" }] },
        { edge: "src>qsms", caption: "A login OTP, also an SMS, joins the same queue behind it." },
        { edge: "qsms>wsms", tone: "miss", caption: "Channel isolation does not help here: both messages share one queue, so the OTP still waits. That is why we also split by priority.", mark: [{ node: "wsms", state: "busy" }] },
      ],
    },
  ],
};

export const channelPriorityQueues: FlowSpec = {
  id: "channel-priority-queues",
  title: "One queue per channel and priority",
  description: "Each channel has a critical lane and a low lane, with separate workers. A campaign can only fill the low lane, and the low workers are throttled so the provider keeps spare capacity for critical traffic.",
  nodes: [
    { id: "src", label: "Notif service", kind: "service", col: 0, row: 1, sub: "type to priority" },
    { id: "qcrit", label: "sms.critical", kind: "queue", col: 1, row: 0 },
    { id: "qlow", label: "sms.low", kind: "queue", col: 1, row: 2 },
    { id: "wcrit", label: "Critical workers", kind: "worker", col: 2, row: 0, sub: "x2, reserved" },
    { id: "wlow", label: "Low workers", kind: "worker", col: 2, row: 2, sub: "x8, throttled" },
    { id: "sms", label: "SMS provider", kind: "external", col: 3, row: 1 },
  ],
  edges: [
    { from: "src", to: "qcrit", label: "otp", style: "async" },
    { from: "src", to: "qlow", label: "promo", style: "async" },
    { from: "qcrit", to: "wcrit", style: "async" },
    { from: "qlow", to: "wlow", style: "async" },
    { from: "wcrit", to: "sms" },
    { from: "wlow", to: "sms", label: "capped" },
  ],
  scenarios: [
    {
      id: "campaign-and-otp",
      name: "Campaign and OTP",
      steps: [
        { edge: "src>qlow", caption: "A 1M-message promo lands in sms.low.", mark: [{ node: "qlow", state: "busy" }] },
        { edge: "qlow>wlow", caption: "Eight low workers chew through it for about 8 minutes.", mark: [{ node: "wlow", state: "busy" }] },
        { edge: "src>qcrit", caption: "A login OTP arrives in the middle of the campaign. Type otp means critical." },
        { edge: "qcrit>wcrit", caption: "The critical lane is empty and its two workers are idle, so the OTP is picked up in milliseconds.", mark: [{ node: "wcrit", state: "busy" }] },
        { edge: "wcrit>sms", tone: "ok", caption: "The OTP is sent while the campaign is still draining.", mark: [{ node: "wcrit", state: null }, { node: "sms", state: "ok" }] },
      ],
    },
    {
      id: "reserved-rate",
      name: "Reserved provider rate",
      steps: [
        { edge: "wlow>sms", caption: "The provider allows 5,000 SMS a second. The low lane is capped at 4,000." },
        { edge: "wlow>sms", tone: "miss", caption: "Without the cap, the campaign would use all 5,000 and the provider would answer 429 to the OTP too.", mark: [{ node: "sms", state: "miss" }] },
        { edge: "wcrit>sms", tone: "ok", caption: "With the cap, 1,000 a second stay free for the critical lane, which sends a few dozen at most.", mark: [{ node: "sms", state: "ok" }] },
      ],
    },
  ],
};

/* ---------- Priorities: the shortcut ---------- */

export const onePriorityQueue: FlowSpec = {
  id: "one-priority-queue",
  title: "One queue with message priority",
  description: "A broker that supports per-message priority hands out high-priority messages first from a single queue. It is simple, but a steady stream of high-priority work can starve the low messages.",
  nodes: [
    { id: "src", label: "Notif service", kind: "service", col: 0, row: 1 },
    { id: "q", label: "Priority queue", kind: "queue", col: 1, row: 1, sub: "high first" },
    { id: "w", label: "Shared workers", kind: "worker", col: 2, row: 1 },
    { id: "prov", label: "Providers", kind: "external", col: 3, row: 1 },
  ],
  edges: [
    { from: "src", to: "q", label: "prio", style: "async" },
    { from: "q", to: "w", style: "async" },
    { from: "w", to: "prov" },
  ],
  scenarios: [
    {
      id: "jump",
      name: "High jumps ahead",
      steps: [
        { edge: "src>q", caption: "500,000 low-priority messages are waiting in the queue.", mark: [{ node: "q", state: "busy" }] },
        { edge: "src>q", caption: "An OTP arrives marked high. The broker places it at the front of the line." },
        { edge: "q>w", tone: "ok", caption: "The next free worker takes the OTP first. One queue, one worker pool, no extra capacity to run." },
      ],
    },
    {
      id: "starve",
      name: "Starvation",
      steps: [
        { edge: "src>q", caption: "A busy hour: high-priority order updates arrive faster than the workers can send them.", mark: [{ node: "q", state: "busy" }] },
        { edge: "q>w", tone: "miss", caption: "Workers always find a high message first, so the low ones are never picked up. Receipts and digests wait for hours.", mark: [{ node: "w", state: "busy" }] },
        { edge: "q>w", caption: "Fixes: add dedicated workers for the low lane, or give old messages a higher priority as they age." },
      ],
    },
  ],
};

/* ---------- Scheduling: where waiting messages live ---------- */

export const delayedSortedSet: FlowSpec = {
  id: "delayed-sorted-set",
  title: "Delayed queue in a Redis sorted set",
  description: "Waiting messages are stored in a sorted set scored by their send time. A scheduler asks for everything due and claims each one by removing it, so two schedulers never enqueue the same message.",
  nodes: [
    { id: "svc", label: "Notif service", kind: "service", col: 0, row: 1 },
    { id: "zset", label: "Delayed set", kind: "cache", col: 1, row: 1, sub: "score = notBefore" },
    { id: "s1", label: "Scheduler 1", kind: "worker", col: 2, row: 0, sub: "every second" },
    { id: "s2", label: "Scheduler 2", kind: "worker", col: 2, row: 2, sub: "every second" },
    { id: "q", label: "push.low", kind: "queue", col: 3, row: 1 },
  ],
  edges: [
    { from: "svc", to: "zset", label: "add" },
    { from: "s1", to: "zset", label: "due?" },
    { from: "s2", to: "zset", label: "due?" },
    { from: "s1", to: "q", label: "enqueue", style: "async" },
    { from: "s2", to: "q", label: "enqueue", style: "async" },
  ],
  scenarios: [
    {
      id: "park-release",
      name: "Park and release",
      steps: [
        { edge: "svc>zset", caption: "At 23:30 the service adds message 812:push with the score 08:00 tomorrow, in epoch milliseconds.", mark: [{ node: "zset", state: "busy" }] },
        { edge: "s1>zset", caption: "Every second a scheduler asks for members whose score is at most now. At 23:31 the answer is empty." },
        { edge: "s1>zset", reverse: true, caption: "At 08:00 the answer contains 812:push." },
        { edge: "s1>q", tone: "ok", caption: "The scheduler enqueues it on push.low. The send-time checks run again in the worker.", mark: [{ node: "zset", state: null }] },
      ],
    },
    {
      id: "two-schedulers",
      name: "Two schedulers race",
      steps: [
        { edge: "s1>zset", caption: "Both schedulers see 812:push as due at 08:00:00.", with: [{ edge: "s2>zset", caption: "" }] },
        { edge: "s1>zset", reverse: true, caption: "Each tries to remove the member. Removal returns 1 only to the first caller, so scheduler 1 owns the message.", with: [{ edge: "s2>zset", reverse: true, tone: "miss", caption: "" }], mark: [{ node: "s2", state: "miss" }] },
        { edge: "s1>q", tone: "ok", caption: "Only the winner enqueues. Without the claim, the user would get the push twice.", mark: [{ node: "s1", state: "ok" }] },
      ],
    },
  ],
};

export const delayedDbPoll: FlowSpec = {
  id: "delayed-db-poll",
  title: "Delayed queue in a database table",
  description: "Scheduled sends are rows in a jobs table with a send time and a status. A poller claims due rows with a lock that skips rows other pollers hold, then enqueues them. Rows survive restarts and can be listed or cancelled.",
  nodes: [
    { id: "svc", label: "Notif service", kind: "service", col: 0, row: 1 },
    { id: "db", label: "Jobs table", kind: "database", col: 1, row: 1, sub: "notBefore, status" },
    { id: "poll", label: "Poller", kind: "worker", col: 2, row: 1, sub: "every second" },
    { id: "q", label: "email.low", kind: "queue", col: 3, row: 1 },
  ],
  edges: [
    { from: "svc", to: "db", label: "insert" },
    { from: "poll", to: "db", label: "claim" },
    { from: "poll", to: "q", label: "enqueue", style: "async" },
  ],
  scenarios: [
    {
      id: "claim",
      name: "Poll and claim",
      steps: [
        { edge: "svc>db", caption: "A user schedules a newsletter for Friday 09:00. The service inserts a row with status waiting." },
        { edge: "poll>db", caption: "Each second the poller selects waiting rows that are due, using an index on status and send time, and locks them with SKIP LOCKED." },
        { edge: "poll>db", reverse: true, caption: "A second poller running at the same time skips the locked rows, so no row is claimed twice.", mark: [{ node: "db", state: "hit" }] },
        { edge: "poll>q", tone: "ok", caption: "The poller enqueues each row and marks it queued in the same transaction.", mark: [{ node: "db", state: null }] },
      ],
    },
    {
      id: "restart",
      name: "Restart and cancel",
      steps: [
        { edge: "poll>db", tone: "error", caption: "The poller crashes mid-batch.", mark: [{ node: "poll", state: "down" }] },
        { edge: "poll>db", caption: "The transaction rolled back, so the rows are still waiting. A new poller picks them up a second later.", mark: [{ node: "poll", state: "ok" }] },
        { edge: "svc>db", caption: "A user cancels a scheduled send in the app: the service sets the row to cancelled, and it is never claimed. A plain queue cannot do this." },
      ],
    },
  ],
};

/* ---------- Reliability: what to do with an error ---------- */

export const errorTree: DecisionSpec = {
  id: "provider-error-tree",
  title: "What to do when a send fails",
  start: "perm",
  nodes: {
    perm: { q: "Is the error permanent (bad number, unregistered token, hard bounce)?", yes: "drop", no: "limit" },
    limit: { q: "Is it a rate limit (429) from the provider?", yes: "slow", no: "backup" },
    backup: { q: "Is there a backup provider whose breaker is closed?", yes: "failover", no: "retry" },
    drop: { result: "Never retry", why: "Mark the delivery failed, delete the token or suppress the address. Retrying a dead number only wastes quota." },
    slow: { result: "Slow the lane down", why: "Honour Retry-After, lower the worker rate, and requeue with backoff. Failing over would only move the overload to the backup." },
    failover: { result: "Try the backup now", why: "Send through provider B in the same attempt, so a critical message loses milliseconds, not a retry cycle." },
    retry: { result: "Requeue with backoff", why: "Wait longer after each failure, add jitter, and after about 5 attempts move the message to the dead-letter queue with an alert." },
  },
};

/* ---------- Dedupe: the three layers ---------- */

export const apiIdempotency: SequenceSpec = {
  id: "api-idempotency",
  title: "API idempotency key",
  description: "The first request stores its key and gets a new notification id. A retry with the same key finds the key and gets the same id back, without publishing again.",
  actors: [
    { id: "client", label: "Caller", kind: "client" },
    { id: "api", label: "Notif API", kind: "service" },
    { id: "store", label: "Key store", kind: "cache" },
    { id: "queue", label: "Queue", kind: "queue" },
  ],
  items: [
    { from: "client", to: "api", label: "POST with key k-91" },
    { from: "api", to: "store", label: "SET k-91 NX" },
    {
      alt: [
        {
          when: "first request",
          items: [
            { from: "store", to: "api", label: "stored: new", type: "reply" },
            { from: "api", to: "queue", label: "publish 812:push, 812:sms", type: "async" },
            { from: "api", to: "client", label: "202 id 812", type: "reply" },
          ],
        },
        {
          when: "retry, same key",
          items: [
            { from: "store", to: "api", label: "exists: id 812", type: "reply" },
            { note: "Nothing is published a second time", over: ["api", "queue"] },
            { from: "api", to: "client", label: "202 id 812 (same)", type: "reply" },
          ],
        },
      ],
    },
  ],
};

export const markAfterSend: SequenceSpec = {
  id: "mark-after-send",
  title: "When to write the sent marker",
  description: "Marking sent after the provider accepts can resend after a crash, but never loses a message. Marking sent before sending can lose a message if the send then fails.",
  actors: [
    { id: "queue", label: "Queue", kind: "queue" },
    { id: "worker", label: "Worker", kind: "worker" },
    { id: "redis", label: "Sent markers", kind: "cache" },
    { id: "prov", label: "Provider", kind: "external" },
  ],
  items: [
    { from: "queue", to: "worker", label: "deliver 812:sms", type: "async" },
    { from: "worker", to: "redis", label: "sent 812:sms?" },
    { from: "redis", to: "worker", label: "no", type: "reply" },
    {
      alt: [
        {
          when: "mark after (use this)",
          items: [
            { from: "worker", to: "prov", label: "send, key 812:sms" },
            { from: "prov", to: "worker", label: "accepted", type: "reply" },
            { from: "worker", to: "redis", label: "SET sent 812:sms" },
            { from: "worker", to: "queue", label: "ack", type: "reply" },
          ],
        },
        {
          when: "crash before marking",
          items: [
            { from: "worker", to: "prov", label: "send, key 812:sms" },
            { from: "prov", to: "worker", label: "accepted", type: "reply" },
            { note: "Worker crashes before SET and before ack", over: ["worker", "redis"] },
            { from: "queue", to: "worker", label: "redeliver 812:sms", type: "async" },
            { from: "worker", to: "prov", label: "send again, same key" },
            { from: "prov", to: "worker", label: "duplicate, ignored", type: "reply" },
          ],
        },
        {
          when: "mark before (wrong)",
          items: [
            { from: "worker", to: "redis", label: "SET sent 812:sms" },
            { from: "worker", to: "prov", label: "send" },
            { from: "prov", to: "worker", label: "503 error", type: "reply" },
            { from: "queue", to: "worker", label: "redeliver 812:sms", type: "async" },
            { from: "worker", to: "redis", label: "sent? yes" },
            { note: "Worker drops it: the SMS was never sent", over: ["worker", "prov"] },
          ],
        },
      ],
    },
  ],
};

/* ---------- Large campaigns ---------- */

export const campaignBatches: FlowSpec = {
  id: "campaign-batches",
  title: "A campaign as a batch job",
  description: "A campaign job reads the audience in pages, enqueues batches on the low lanes, and workers check the campaign status before each send, so a campaign can be paused or cancelled mid-way.",
  nodes: [
    { id: "job", label: "Campaign job", kind: "service", col: 0, row: 1 },
    { id: "seg", label: "Segment store", kind: "database", col: 1, row: 0, sub: "paged reads" },
    { id: "q", label: "push.low", kind: "queue", col: 1, row: 2 },
    { id: "w", label: "Low workers", kind: "worker", col: 2, row: 2, sub: "throttled" },
    { id: "status", label: "Status flag", kind: "cache", col: 2, row: 0, sub: "running or paused" },
    { id: "prov", label: "Push provider", kind: "external", col: 3, row: 2 },
  ],
  edges: [
    { from: "job", to: "seg", label: "page" },
    { from: "job", to: "q", label: "batch", style: "async" },
    { from: "q", to: "w", style: "async" },
    { from: "w", to: "status", label: "running?" },
    { from: "w", to: "prov", label: "send" },
  ],
  scenarios: [
    {
      id: "run",
      name: "Run in pages",
      steps: [
        { edge: "job>seg", caption: "The job reads 1,000 user ids at a time from the segment, never all 10M into memory." },
        { edge: "job>q", caption: "It enqueues the batch on the low lane and asks for the next page.", mark: [{ node: "q", state: "busy" }] },
        { edge: "q>w", caption: "Low workers take messages at the rate the provider allows, 5,000 a second in this example.", mark: [{ node: "w", state: "busy" }] },
        { edge: "w>prov", tone: "ok", caption: "10M messages at 5,000 a second take 2,000 s, about 33 minutes. Critical traffic uses its own lane the whole time." },
      ],
    },
    {
      id: "pause",
      name: "Pause a typo",
      steps: [
        { edge: "w>prov", caption: "Four minutes in, someone notices the campaign copy has the wrong discount code." },
        { edge: "w>status", caption: "An operator sets the campaign to paused. This is one write to one key.", mark: [{ node: "status", state: "miss" }] },
        { edge: "w>status", reverse: true, tone: "miss", caption: "Before each send, every worker reads the status and gets paused. They stop within a second or two.", mark: [{ node: "w", state: "down" }] },
        { edge: "job>q", caption: "The job stops enqueueing. After a fix the operator resumes; on cancel the leftover messages are dropped when workers see the cancelled status.", mark: [{ node: "w", state: null }] },
      ],
    },
  ],
};

/* ---------- What goes wrong ---------- */

export const silentFailure: FlowSpec = {
  id: "silent-failure",
  title: "Accepted, but not delivered",
  description: "A provider can return success for a send and still not deliver it. Delivery receipts arrive by webhook, are summed per provider, and an alert fires when a provider's delivery rate drops, so traffic can move to a backup.",
  nodes: [
    { id: "w", label: "SMS worker", kind: "worker", col: 0, row: 1 },
    { id: "pa", label: "SMS provider A", kind: "external", col: 1, row: 0 },
    { id: "pb", label: "SMS provider B", kind: "external", col: 1, row: 2 },
    { id: "hook", label: "Webhooks", kind: "service", col: 2, row: 0 },
    { id: "db", label: "Deliveries", kind: "database", col: 3, row: 0, sub: "rate per provider" },
    { id: "alert", label: "Alert", kind: "service", col: 3, row: 1 },
  ],
  edges: [
    { from: "w", to: "pa", label: "send" },
    { from: "w", to: "pb", label: "backup" },
    { from: "pa", to: "hook", label: "hook", style: "async" },
    { from: "hook", to: "db", label: "write" },
    { from: "db", to: "alert", label: "rate" },
  ],
  scenarios: [
    {
      id: "silent",
      name: "Silent drop",
      steps: [
        { edge: "w>pa", tone: "ok", caption: "Provider A returns 200 for every send, so the breaker stays closed and the error dashboard stays green." },
        { edge: "pa>hook", caption: "But the delivered receipts that normally come back are missing for most messages. A carrier is filtering the traffic.", mark: [{ node: "pa", state: "miss" }] },
        { edge: "hook>db", caption: "Nobody is looking at receipts, so nothing happens. Users wait for codes that never arrive." },
      ],
    },
    {
      id: "caught",
      name: "Caught by delivery rate",
      steps: [
        { edge: "pa>hook", caption: "Receipts arrive for only 40 percent of the messages sent to A in the last 5 minutes. Provider A normally delivers about 95 percent.", mark: [{ node: "pa", state: "miss" }] },
        { edge: "hook>db", caption: "The handler updates the delivery rows by provider message id." },
        { edge: "db>alert", tone: "error", caption: "The per-provider delivery rate falls below the threshold, so the alert fires and the on-call engineer is paged.", mark: [{ node: "alert", state: "down" }] },
        { edge: "w>pb", tone: "ok", caption: "Traffic for that route is switched to provider B by hand or by an automatic rule, and OTPs arrive again.", mark: [{ node: "pb", state: "ok" }] },
      ],
    },
  ],
};

export const poisonMessage: FlowSpec = {
  id: "poison-message",
  title: "A poison message and the dead-letter queue",
  description: "A message that fails every time is retried a few times, then moved to a dead-letter queue and an alert fires, so one bad message cannot block the queue.",
  nodes: [
    { id: "q", label: "push.high", kind: "queue", col: 0, row: 1 },
    { id: "w", label: "Push worker", kind: "worker", col: 1, row: 1 },
    { id: "dlq", label: "Dead-letter queue", kind: "queue", col: 2, row: 1, sub: "parked for people" },
    { id: "alert", label: "Alert", kind: "service", col: 3, row: 1 },
  ],
  edges: [
    { from: "q", to: "w", label: "deliver", style: "async" },
    { from: "w", to: "dlq", label: "after 5", style: "async" },
    { from: "dlq", to: "alert", label: "page" },
  ],
  scenarios: [
    {
      id: "poison",
      name: "Poison message",
      steps: [
        { edge: "q>w", caption: "A message arrives whose template variable is missing, so rendering throws an error every time.", mark: [{ node: "w", state: "busy" }] },
        { edge: "q>w", reverse: true, tone: "error", caption: "The worker fails and the message returns to the queue with a longer delay each time: 1 s, 2 s, 4 s, 8 s." },
        { edge: "w>dlq", tone: "error", caption: "After the fifth failure the message is moved to the dead-letter queue. The rest of the queue kept flowing the whole time.", mark: [{ node: "w", state: null }] },
        { edge: "dlq>alert", caption: "The queue depth of the dead-letter queue is above zero, which pages someone. A message in the DLQ without an alert is a silent loss.", mark: [{ node: "alert", state: "down" }] },
      ],
    },
    {
      id: "replay",
      name: "Fix and replay",
      steps: [
        { edge: "dlq>alert", caption: "The engineer finds the cause: one campaign was sent without a locale." },
        { edge: "w>dlq", reverse: true, caption: "After the template is fixed, the parked messages are replayed to the worker." },
        { edge: "q>w", tone: "ok", caption: "Because ids are deterministic and sent markers exist, replaying is safe: anything already sent is skipped.", mark: [{ node: "alert", state: null }] },
      ],
    },
  ],
};
