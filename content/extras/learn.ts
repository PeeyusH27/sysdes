import type { PageExtras } from "./types";

export const extras: Record<string, PageExtras> = {
  "requirements-estimation": {
    detail: ["functional-requirements", "non-functional-requirements", "back-of-envelope-math", "read-vs-write-ratio", "worked-example-instagram-lite", "numbers-to-remember", "capacity-calculator", "code", "where-estimates-go-wrong"],
    sayIt: {
      answer:
        "I spend the first five minutes on what to build and how big it is: three to five core features, then targets with numbers, like p99 under 200 ms. Then I estimate on the board: average QPS is daily users times actions divided by 86,400, peak about three times that, with reads and writes split. Every number has to end in a design decision.",
      numbers: [
        { value: "86,400", label: "seconds per day, the divisor for QPS" },
        { value: "3x", label: "typical peak over average QPS" },
        { value: "~1,160/s", label: "average QPS at 10M DAU, 10 actions each" },
      ],
      tradeoffs: [
        "Precision vs speed: rounding 86,400 to 100,000 gives up exactness but gets the right order of magnitude in under five minutes.",
        "Average vs p99 targets: p99 is harder to hit, but the slowest 1% are the requests users complain about.",
        "Sizing for peak vs average: you pay for idle servers off-peak, but running at 60% busy at peak leaves room for spikes.",
      ],
      mention:
        "Forgetting replicas in the storage estimate: 10M DAU over 5 years is about 17 TB, but 49.8 TB once you keep 3 copies.",
    },
  },

  "api-load-balancing": {
    primer: "load-balancer",
    detail: ["stateless-services", "l4-vs-l7-load-balancing", "balancing-algorithms", "health-checks", "when-load-balancing-goes-wrong", "sizing-the-fleet", "rest-api-design", "pagination-and-safe-retries", "api-styles-compared", "api-gateway-and-bff", "place-the-load-balancer"],
    doodle: "load-balancer",
    sayIt: {
      answer:
        "I make the services stateless, with sessions in Redis and files in object storage, and put a load balancer in front, so adding capacity means adding a machine and a crash loses nothing. For uneven requests I use least connections or power of two choices, with health checks that need three failures to mark an instance down so a blip can't flap it.",
      numbers: [
        { value: "3 down, 2 up", label: "health-check failures and successes to flip state" },
        { value: "2 random picks", label: "power of two choices samples, takes the less loaded" },
        { value: "30 s", label: "passive ejection after 5 consecutive 5xx" },
      ],
      tradeoffs: [
        "Stateless vs sticky sessions: sticky pins warm caches and WebSockets, but deploys, crashes and autoscaling break the pin, so state goes in Redis.",
        "L4 vs L7: L4 forwards fast at very low cost, while L7 reads URLs and headers for routing and retries at more CPU per request.",
        "Round robin vs least connections: round robin is simple but keeps feeding a slow server; least connections needs an accurate count per server.",
      ],
      mention:
        "Failing readiness on an optional dependency like recommendations takes the whole fleet out at once, so only fail it for what the instance truly needs.",
    },
  },

  "databases-scaling": {
    primer: "replication",
    detail: ["how-storage-engines-work", "transactions-and-isolation-levels", "indexes", "connection-pooling", "modeling-normalize-then-denormalize", "sql-vs-nosql", "replication", "failover", "sharding", "backups-and-point-in-time-recovery"],
    doodle: "replica",
    sayIt: {
      answer:
        "I take the cheapest move first: indexes, a bigger machine, a cache, then read replicas, and I shard only when one primary can't keep up with writes or data size. Replicas scale reads but lag, so right after a write I read the user's own data from the primary. If I do shard, I pick a high-cardinality key that matches the main query, like user_id.",
      numbers: [
        { value: "Several TB", label: "data size where sharding becomes worth it" },
        { value: "~80%", label: "keys moved, 4 to 5 shards, hash % N" },
        { value: "Tens of seconds", label: "RTO with automated failover" },
      ],
      tradeoffs: [
        "Async vs sync replication: async commits fastest but can lose the last few writes; sync loses nothing but one slow replica stalls every write.",
        "Hash vs range sharding: hash spreads evenly but range scans hit every shard; range scans cleanly but sequential keys make one hot shard.",
        "Indexes vs write speed: an index makes reads fast, but every INSERT updates it and it takes memory, so index the queries you run.",
      ],
      mention:
        "Read-your-writes breaks on a lagging replica: a user saves, reads, and thinks the change was lost, so route their reads to the primary for a few seconds.",
    },
  },

  caching: {
    primer: "cache",
    detail: ["where-caches-live", "what-to-cache-and-how-to-name-it", "caching-patterns", "eviction-and-ttl", "invalidation-and-the-classic-race", "the-numbers-hit-ratio-vs-latency", "http-caching-for-frontend-developers", "code", "sizing-and-monitoring"],
    doodle: "cache",
    sayIt: {
      answer:
        "I use cache-aside: check Redis, and on a miss read the database and fill the key with a jittered TTL. On writes I update the database and delete the key rather than update it, because with concurrent writers the older value can land last. For hot keys I add a per-key lock, so a stampede rebuilds the value once.",
      numbers: [
        { value: "~50x", label: "memory vs a database round trip" },
        { value: "1 ms vs 50 ms", label: "cache hit vs cache miss latency" },
        { value: "90% to 99%", label: "hit ratio gain cuts database load 10x" },
      ],
      tradeoffs: [
        "Cache-aside vs write-through: cache-aside only gets slower if the cache dies; write-through is always fresh but writes cost double.",
        "Write-behind vs write-through: write-behind is very fast, but a crash loses unflushed data; fine for counters and metrics.",
        "Delete vs update on write: delete costs the next reader one miss, but updating can leave the older value last when two writers race.",
      ],
      mention:
        "Even delete-on-write has a race: a slow reader can write the old value back after the delete, so keep a short TTL as a safety net.",
    },
  },

  "async-messaging": {
    primer: "queue",
    detail: ["sync-or-async", "why-queues", "kafka-basics", "delivery-semantics", "ordering", "retries-and-dead-letter-queues", "backpressure-and-littles-law", "the-dual-write-problem-and-the-transactional-outbox", "sagas-transactions-across-services", "delayed-and-scheduled-jobs", "code"],
    doodle: "queue",
    sayIt: {
      answer:
        "I move slow, unreliable or spiky work off the request path onto a queue: the API records the intent and answers fast, and a worker retries until it succeeds. Delivery is at-least-once, so consumers are idempotent with a unique constraint on the message id, transient failures retry with backoff, and poison messages go to a dead letter queue.",
      numbers: [
        { value: "720K", label: "backlog after an hour at 1,000 in, 800 out" },
        { value: "1, 2, 4, 8 s", label: "exponential backoff for transient failures" },
        { value: "200 slots", label: "workers for 1,000 jobs/s at 200 ms each" },
      ],
      tradeoffs: [
        "Sync vs async: async keeps the request fast and absorbs spikes, but work happens later, maybe twice, maybe out of order.",
        "At-most-once vs at-least-once: acking first can lose a message in a crash; acking after processing can redeliver it, so dedupe.",
        "Outbox vs write then publish: the outbox adds a relay and may publish a row twice, but a crash never loses the event.",
      ],
      mention:
        "A DLQ nobody alerts on is a silent loss, so alert on depth above zero and on the age of the oldest message.",
    },
  },

  "consistency-cap": {
    primer: "cap",
    detail: ["cap-stated-precisely", "pacelc-the-trade-off-you-pay-every-day", "consistency-models-a-ladder", "quorums", "conflict-resolution", "consensus", "distributed-transactions-2pc-or-sagas", "distributed-locks-need-fencing-tokens", "failure-modes", "the-numbers-what-each-choice-costs", "code"],
    doodle: "cap",
    sayIt: {
      answer:
        "CAP is about the moment of a network partition: the minority side either refuses requests to stay consistent or answers possibly stale data to stay available. It's not pick two of three. So I choose per feature: strong for balances and checkout stock, read-your-writes for a user's own edits, eventual for likes and counters.",
      numbers: [
        { value: "R + W > N", label: "quorum rule so reads overlap the latest write" },
        { value: "N=3, W=2, R=2", label: "balanced default, survives one node down" },
        { value: "70-100 ms", label: "cross-Atlantic round trip PACELC pays" },
      ],
      tradeoffs: [
        "CP vs AP: CP refuses some requests during a split but never double-sells; AP keeps answering but writes on both sides may conflict.",
        "Latency vs consistency (PACELC): waiting on another region costs a round trip; async replication skips it but replicas may be stale.",
        "Strict vs sloppy quorum: sloppy keeps writes up through failures, but R + W > N no longer guarantees reads overlap the latest write.",
      ],
      mention:
        "A lock with a lease needs a fencing token, because a paused client can't see its lease expired and may overwrite the new owner.",
    },
  },

  "reliability-observability": {
    primer: "circuit-breaker",
    detail: ["slis-slos-slas-and-error-budgets", "how-failures-spread", "timeouts-retries-and-jitter", "circuit-breakers-and-bulkheads", "load-shedding-and-prioritisation", "graceful-degradation", "redundancy-and-failover", "safe-deploys", "observability", "incident-basics", "code"],
    doodle: "circuit-breaker",
    sayIt: {
      answer:
        "I assume something is always failing, so I contain it. Every call gets a timeout, retries happen only for idempotent calls, with jittered backoff at a single layer, and circuit breakers and bulkheads fail fast to a fallback like cached bestsellers. I set an SLO such as 99.9% and use the error budget to decide whether to ship or freeze.",
      numbers: [
        { value: "27 calls", label: "from 3 layers each retrying 3 times" },
        { value: "10,000", label: "failures allowed on 10M requests at 99.9%" },
        { value: "43.2 min", label: "downtime per 30 days at 99.9%" },
      ],
      tradeoffs: [
        "Retries vs load: retries heal transient failures, but 3 layers of 3 attempts send 27 calls at a struggling service; retry in one layer.",
        "Circuit breaker vs always calling: failing fast frees threads and gives the dependency room, but users get the fallback while it is open.",
        "Four nines vs three: each extra nine cuts downtime 10x but costs far more and demands automated detection and failover.",
      ],
      mention:
        "Two app servers sharing one database, zone or deploy are not redundant, so check what fails together before counting nines.",
    },
  },

  "case-url-shortener": {
    detail: ["estimation", "data-model", "generating-short-codes", "making-sequential-ids-unguessable", "301-vs-302", "scaling-the-reads", "click-analytics", "expiry-and-cleanup", "abuse-and-safety", "failure-modes", "code", "build-it-in-the-playground"],
    doodle: "cache",
    sayIt: {
      answer:
        "It's a read-heavy key-value lookup: about 40 writes and 4,000 redirects a second. I generate 7-character base62 codes from a counter handed out in blocks of 1,000 and scrambled so they aren't guessable, return a 302, and serve redirects from the CDN and Redis in front of Postgres. Clicks go on a queue so analytics never slow a redirect.",
      numbers: [
        { value: "40 / 4,000 per s", label: "writes and redirects, 12K/s at peak" },
        { value: "3.5 trillion", label: "7-character base62 codes available" },
        { value: "200 reads/s", label: "Postgres load at 4,000/s and 95% hits" },
      ],
      tradeoffs: [
        "301 vs 302: a 301 is fastest but clicks vanish and mistakes stay cached; a 302 reaches you every click, so you can count it.",
        "Counter vs hash codes: counters are unique and shortest but guessable unless scrambled; hashes need no coordination but collide.",
        "Range allocation vs one counter: blocks of 1,000 remove the hot spot and single point of failure, but a crash wastes a block.",
      ],
      mention:
        "A viral link at 50K redirects/s overloads one Redis node, so add a tiny few-second in-process cache on every app server.",
    },
  },

  "case-notification-system": {
    detail: ["estimation", "fan-out-with-queues", "priorities-the-otp-never-waits", "templates-and-localisation", "scheduling-and-quiet-hours", "reliability-providers-fail", "dedupe-and-idempotency", "protecting-users", "device-token-lifecycle", "delivery-tracking", "large-campaigns", "failure-modes", "code", "build-it-in-the-playground"],
    doodle: "queue",
    sayIt: {
      answer:
        "I accept the request with a 202, check preferences, and publish one message per channel onto queues split by channel and priority, so an OTP never waits behind a marketing campaign. Workers dedupe on eventId and channel, then call providers through circuit breakers with failover, and failures end in a dead letter queue with an alert.",
      numbers: [
        { value: "5.8K/s", label: "average: 500M notifications a day" },
        { value: "50K+/s", label: "campaign burst, so throttle the fan-out" },
        { value: "~8 min", label: "1M campaign draining a shared queue at 2,000/s" },
      ],
      tradeoffs: [
        "Shared queue vs priority lanes: lanes cost more queues and workers, but an OTP leaves in milliseconds instead of waiting behind the campaign.",
        "At-least-once vs exactly-once: exactly once to a phone is impossible, so dedupe on deterministic ids and aim for effectively once.",
        "Mark sent early vs after acceptance: marking after the provider accepts allows a rare resend after a crash, but failed sends can still retry.",
      ],
      mention:
        "A provider that accepts but silently doesn't deliver is worse than one that errors, so track delivery rate per provider.",
    },
  },

  "interview-playbook": {
    detail: ["the-45-minute-plan", "the-framework-as-a-checklist", "frontend-variant-radio", "practise-with-a-timer", "what-interviewers-look-for", "driving-the-conversation-and-getting-unstuck", "raising-the-core-topics-on-cue", "drawing-conventions", "common-mistakes", "practice-plan", "printable-checklist"],
    sayIt: {
      answer:
        "I use the same structure every time: requirements with numbers, an estimate, the API and data model, a high-level design, two deep dives, then trade-offs and a summary, in about 45 minutes. I say every choice as X because Y at the cost of Z, and if I'm stuck I go back to requirements and numbers.",
      numbers: [
        { value: "5/5/15/15/5 min", label: "the five phases of a 45-minute round" },
        { value: "2 deep dives", label: "on the riskiest areas, with failure modes" },
        { value: "3, 7, 21 days", label: "spaced repetition gaps for redoing questions" },
      ],
      tradeoffs: [
        "Breadth vs depth: go broad until the design works end to end, then deep where risk is highest, at the cost of skipping other areas.",
        "Simple vs scalable: the simple option is enough at 4K QPS but scales less far; name the load at which you would switch.",
        "302 vs 301: a 302 sends every click to your servers but keeps the click analytics you promised; a 301 is faster.",
      ],
      mention:
        "Ignoring failure is the common miss: every box can die and every network call can time out, so say what breaks and how you recover.",
    },
  },
};
