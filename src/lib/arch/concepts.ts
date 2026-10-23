import type { ArchNodeId } from "./design";
import type { Concept } from "./concept-types";

// The explainer card for each box in the architecture lab. Limits (words per field, three trade-offs, real links) are
// enforced by tests/arch.test.ts. Claims should agree with the stages and request scenarios in design.ts.
type Written = "db2" | "db3" | "db4" | "region2";
const BASE: Record<Exclude<ArchNodeId, Written>, Concept> = {
  users: {
    id: "users",
    name: "Users (clients)",
    what: "The browsers and mobile apps that send requests. They are the source of all load: how many there are, how often they ask, and what share of requests only read decides everything else.",
    why: "Every design choice starts here. 100 users at 1,000 requests per second and 100,000 users at 100,000 need different systems, and a 92% read share points to caching while a write-heavy one does not.",
    whenNot:
      "Do not design for a million users on day one. Estimate the real load first, then build the cheapest system that carries it with headroom. Over-building costs money and makes everything harder to change.",
    tradeoffs: [
      "Thick vs thin client: logic on the device feels fast and works offline, but you cannot trust it, and updates must reach every copy.",
      "Pull vs push: clients that ask are simple and stateless, but clients that hold a live connection get updates instantly and cost the server memory.",
      "Retry vs give up: retrying hides brief failures from users, but thousands of clients retrying together can finish off a struggling server.",
    ],
    say: "I'd start by estimating requests per second and the read to write ratio, because that tells me which of the components I actually need.",
    followUp: "How did you get from daily active users to requests per second?",
    examples: ["Web browsers", "iOS and Android apps", "Partner API clients"],
    learn: [
      { href: "/learn/requirements-estimation", label: "Requirements and estimation" },
      { href: "/learn/api-load-balancing", label: "Client, API and load balancing" },
    ],
  },

  dns: {
    id: "dns",
    name: "DNS",
    what: "The internet's phone book. It turns a name like shop.example.com into an IP address, and can hand different users different addresses, such as the nearest edge server.",
    why: "Once users are worldwide (stage 5), one address is not enough. DNS can steer each user to the nearest CDN edge, and it lets you move servers without telling anyone a new address.",
    whenNot:
      "You never skip DNS, but you rarely tune it yourself. Use your cloud's managed DNS and leave geo-routing and failover records until you actually have users in more than one region.",
    tradeoffs: [
      "Long vs short TTL: long means fewer lookups and rides out outages, but a change or failover takes minutes to hours to reach everyone.",
      "DNS routing vs anycast: DNS guesses a place from the resolver, while anycast lets the network find the closest one but is harder to run.",
      "Managed DNS vs self-hosted: managed is fast and redundant by default, but you depend on a provider for a single point everything needs.",
    ],
    say: "I'd use DNS to send users to the nearest edge, keep TTLs short enough to fail over, and remember it is cached so changes are never instant.",
    followUp: "You change a DNS record during an outage. Why do some users still hit the old server?",
    examples: ["Amazon Route 53", "Cloudflare DNS", "Google Cloud DNS"],
    learn: [
      { href: "/learn/api-load-balancing", label: "The request path" },
      { href: "/deep-dives/request-flows", label: "Request flows end to end" },
    ],
  },

  cdn: {
    id: "cdn",
    name: "CDN",
    what: "A network of servers around the world that keep copies of cacheable responses, such as images, scripts and public pages, and answer from near the user. It asks your origin only on a miss.",
    why: "At 100,000 users (stage 5), most bytes are images and pages that never change, and users are far away. A hit costs about 20 ms instead of a long trip to your servers.",
    whenNot:
      "If your users are in one region and your traffic is small, a CDN adds little. Skip it for fully personalised responses, which it cannot share between users, and for anything you cannot invalidate quickly.",
    tradeoffs: [
      "Long vs short cache time: long means a high hit rate and cheap origin, but changed files stay stale until they expire.",
      "Versioned names vs purging: names like app.4f2a.js never need purging but need a build step. Purging is simple, slow and easy to forget.",
      "CDN vs bigger origin: a CDN cuts latency and load, but adds a vendor, a bill per gigabyte and one more place for stale data.",
    ],
    say: "I'd put static and public content on a CDN, control freshness with Cache-Control headers and versioned file names, and keep personalised responses off it.",
    followUp: "You deployed a fix to a script but users still run the old one. What happened?",
    examples: ["Cloudflare", "Amazon CloudFront", "Fastly", "Akamai"],
    learn: [
      { href: "/learn/caching", label: "Caching, including HTTP headers" },
      { href: "/deep-dives/caching-techniques", label: "Caching techniques" },
    ],
    doodle: "cdn",
  },

  storage: {
    id: "storage",
    name: "Object storage",
    what: "A service for storing files (images, videos, backups) by key, cheaply and at huge scale. You write and read whole objects over HTTP. It is not a file system and not a database.",
    why: "Files do not belong on app servers: they fill the disks, they are lost when a server is replaced, and each server would hold different ones. Object storage is the shared, durable source the CDN reads from.",
    whenNot:
      "Do not keep small structured data here, or anything you query or update in place. Objects are replaced whole and there is no query language. Keep that in the database; store only the file's key.",
    tradeoffs: [
      "Storage vs database blobs: files stay cheap and out of your replicas, but you must keep the database's key in sync with a file elsewhere.",
      "Via server vs direct upload: signed URLs send files straight to storage and save your bandwidth, but you cannot inspect them until later.",
      "Standard vs cold tiers: cold costs much less per gigabyte, but reads are slower or charged extra. Fine for backups, bad for hot images.",
    ],
    say: "I'd store files in object storage and keep only the key and metadata in the database, with uploads going direct via signed URLs and reads through the CDN.",
    followUp: "A user uploads a 2 GB video. How does it get from their phone to storage?",
    examples: ["Amazon S3", "Google Cloud Storage", "Azure Blob Storage", "Cloudflare R2"],
    learn: [
      { href: "/deep-dives/choosing-a-data-store", label: "Choosing the right store" },
      { href: "/learn/databases-scaling", label: "Databases and scaling" },
    ],
  },

  lb: {
    id: "lb",
    name: "Load balancer",
    what: "A front door that accepts every request and spreads it across a pool of identical servers, skipping any that fail their health checks. Users see one address; behind it are many machines.",
    why: "At 5,000 users (stage 2), one app server tops out, and if it dies the site is down. A balancer lets you add capacity by adding servers, and lose one without users noticing.",
    whenNot:
      "With one server and modest traffic it is just another hop to run. Note that a balancer only helps if your servers are stateless. Sessions kept in server memory break it.",
    tradeoffs: [
      "Layer 4 vs layer 7: layer 4 is faster and simpler, but only layer 7 can route by URL or header, at more cost.",
      "Round robin vs least connections: round robin is simple and fair for equal requests, but uneven costs overload some servers.",
      "One balancer vs a pair: a single one is a new single point of failure, so you run two, which adds failover to think about.",
    ],
    say: "I'd keep the app tier stateless, put a load balancer in front with health checks, and add servers behind it as load grows.",
    followUp: "The balancer itself is a single point of failure. How do you fix that?",
    examples: ["NGINX", "HAProxy", "AWS Application Load Balancer", "Envoy"],
    learn: [
      { href: "/learn/api-load-balancing", label: "Client, API and load balancing" },
      { href: "/deep-dives/connections-pooling", label: "Connections, pooling and limits" },
    ],
    doodle: "load-balancer",
  },

  gw: {
    id: "gw",
    name: "API gateway",
    what: "A single entry point in front of your services that handles the chores every request needs: checking the login, enforcing rate limits, routing to the right service and logging. It does not hold business logic.",
    why: "Once abuse and many services appear (stage 8), each service would have to check logins and limit callers on its own. Doing it once at the door keeps services simple and the rules the same everywhere.",
    whenNot:
      "A single app behind a balancer rarely needs one: a library or the framework's middleware covers auth and limits. Skip it until several services or outside clients make the shared rules worth a shared component.",
    tradeoffs: [
      "Central vs per-service checks: one place to change rules and audit, but every request passes through it, so it must be fast and available.",
      "Rich gateway vs thin gateway: transforming requests there saves client work, but business logic creeping in makes it a bottleneck every team must change.",
      "Gateway rate limit vs app-level limit: the gateway stops abuse before it costs you, but only the app knows per-user or per-feature rules.",
    ],
    say: "I'd put a gateway at the edge for auth, rate limiting and routing, run several copies of it, and keep business rules in the services.",
    followUp: "Where does the rate limiter keep its counters, and what happens if that store is down?",
    examples: ["Kong", "AWS API Gateway", "Envoy", "Apigee"],
    learn: [
      { href: "/learn/api-load-balancing", label: "API gateway and BFF" },
      { href: "/questions/rate-limiter", label: "Design a rate limiter" },
    ],
    doodle: "api-gateway",
  },

  api: {
    id: "api",
    name: "App servers",
    what: "The machines that run your code: they validate requests, apply business rules and talk to the cache, database and queue. Kept stateless, so any server can answer any request, they are interchangeable.",
    why: "This is where the work happens, and it is the first tier that runs out. Stateless servers let you scale horizontally, from 1 server on day one to 12 at 100,000 users, and replace failures freely.",
    whenNot:
      "Do not split into many microservices before you need to. One well-organised app is easier to build, test and debug, and you can carve out services when teams or scaling needs truly differ.",
    tradeoffs: [
      "Stateless vs sticky sessions: stateless scales and recovers easily, but state must live in a shared store or a token, costing a lookup.",
      "Scale out vs scale up: many small servers give fault tolerance and gradual growth, but one bigger machine is simpler and lasts longer.",
      "Monolith vs microservices: one deployable is simple, while services scale and release independently but add network calls, partial failure and operational weight.",
    ],
    say: "I'd keep the app servers stateless behind a load balancer, put session state in a shared store, and scale them out on CPU or request rate.",
    followUp: "Where does a logged-in user's session live if any server can handle any request?",
    examples: ["Node.js services", "Spring Boot", "Django", "Go services on Kubernetes"],
    learn: [
      { href: "/learn/api-load-balancing", label: "Stateless services" },
      { href: "/deep-dives/connections-pooling", label: "Connections, pooling and limits" },
    ],
    doodle: "microservices",
  },

  cache: {
    id: "cache",
    name: "Redis cache",
    what: "A fast in-memory store beside the database that keeps answers you have already worked out. In cache-aside, the app checks it first and, on a miss, reads the database and stores the result.",
    why: "At 20,000 users (stage 3), nine in ten requests are reads, and many repeat. With an 85% hit ratio, the database sees roughly a seventh of the read load, and most reads answer in about a millisecond.",
    whenNot:
      "If your data is small, or queries are fast and rarely repeat, a cache just adds staleness and another system. Fix slow queries and indexes first, then cache what is still hot.",
    tradeoffs: [
      "Fast vs fresh: memory is quick, but copies go stale until they expire or are invalidated. A short TTL helps but lowers hits.",
      "Cache-aside vs write-through: cache-aside is simple and only holds what is read, but a miss is slow. Write-through keeps it warm but slows every write.",
      "Cache vs cold start: if the cache dies, every read falls through to the database at once, so the database must survive that.",
    ],
    say: "I'd use cache-aside with a TTL for hot reads, size for the hit ratio, and protect the database from stampedes when a popular key expires.",
    followUp: "A very popular key expires and a thousand requests miss at once. What do you do?",
    examples: ["Redis", "Memcached", "Amazon ElastiCache", "Valkey"],
    learn: [
      { href: "/learn/caching", label: "Caching" },
      { href: "/deep-dives/caching-techniques", label: "Caching techniques" },
    ],
    doodle: "cache",
  },

  db: {
    id: "db",
    name: "Database",
    what: "The source of truth: it stores your data durably and answers queries. One primary takes all writes; read replicas are copies of it that serve reads, kept up to date by replication.",
    why: "Every request ends here, and even behind a cache the misses add up (stage 4). Replicas spread reads across copies while the primary keeps writes. They scale reads, not writes.",
    whenNot:
      "Do not add replicas or shard until you have indexed your queries and cached the hot reads. Most databases are slow because of a missing index, not because they are too small.",
    tradeoffs: [
      "Replicas vs consistency: reads scale out, but a replica lags the primary, so a user may not see their own write if read from one.",
      "Replicas vs sharding: replicas are easy and fix read load, but writes still hit one primary. Sharding scales writes at the price of cross-shard queries.",
      "SQL vs NoSQL: SQL gives joins, transactions and flexible queries, while many NoSQL stores scale writes more easily but you design around the access pattern.",
    ],
    say: "I'd keep writes on the primary, send read traffic to replicas and accept a little lag, and read from the primary where a user must see their own write.",
    followUp: "A user posts a comment and refreshes, but it is missing. What happened, and how do you fix it?",
    examples: ["PostgreSQL", "MySQL", "Amazon Aurora", "MongoDB"],
    learn: [
      { href: "/learn/databases-scaling", label: "Databases and scaling" },
      { href: "/deep-dives/sharding-strategies", label: "Sharding strategies" },
      { href: "/deep-dives/choosing-a-data-store", label: "Choosing the right store" },
    ],
    doodle: "replica",
  },

  search: {
    id: "search",
    name: "Search index",
    what: "A store built for finding text: it breaks documents into words and keeps an inverted index from each word to the documents containing it, then ranks matches. It is fed copies of data from the database.",
    why: "At stage 7, LIKE queries on the database are slow because a leading wildcard cannot use an ordinary index, and they compete with real traffic. An index answers text queries fast, with ranking and typo tolerance.",
    whenNot:
      "For exact lookups or filters on a few columns, a normal database index is enough. Add a search engine only when you need relevance ranking, fuzzy matching or full text over a lot of data.",
    tradeoffs: [
      "Search index vs database queries: faster and richer for text, but it is an eventually consistent second copy, not the source of truth.",
      "Update per change vs batch: per-change keeps the index current but couples writes to it. Batches are looser, with staler results.",
      "Dedicated engine vs database full-text: built-in search is one less system to run, but a dedicated engine ranks and scales better.",
    ],
    say: "I'd keep a search index beside the primary store, fed by change events or a queue, and never run text search on the database.",
    followUp: "A product is updated but search still shows the old name. Why, and is that acceptable?",
    examples: ["Elasticsearch", "OpenSearch", "Apache Solr", "Typesense"],
    learn: [
      { href: "/deep-dives/choosing-a-data-store", label: "Choosing the right store" },
      { href: "/questions/typeahead", label: "Build an autocomplete" },
    ],
    doodle: "index",
  },

  queue: {
    id: "queue",
    name: "Message queue",
    what: "A buffer between a producer and its consumers. The app drops a message on it and returns at once; workers take messages off at their own pace, and a message stays until it is acknowledged.",
    why: "At stage 6, sending an email or resizing an image inside the request makes users wait, and a slow provider slows everyone. A queue takes the work off the request path and absorbs spikes.",
    whenNot:
      "If the user needs the result in the same response, or the work is a few milliseconds, keep it synchronous. A queue adds delay, a new thing to monitor, and retries you must make safe.",
    tradeoffs: [
      "Async vs sync: the user gets a fast answer and spikes are smoothed, but work finishes later, and failures show up after the response.",
      "At-least-once vs exactly-once: most queues redeliver after failures, so consumers must be idempotent. True exactly-once is hard and costly.",
      "Queue vs log: a queue drops messages once handled, good for tasks. A log such as Kafka keeps them for replay, but is heavier.",
    ],
    say: "Anything the user does not wait for goes on a queue, with idempotent consumers, retries with backoff and a dead letter queue for messages that keep failing.",
    followUp: "The same message is delivered twice and a customer gets two emails. How do you prevent that?",
    examples: ["Amazon SQS", "RabbitMQ", "Apache Kafka", "Google Cloud Pub/Sub"],
    learn: [
      { href: "/learn/async-messaging", label: "Async processing and messaging" },
      { href: "/learn/case-notification-system", label: "Case study: notification system" },
    ],
    doodle: "queue",
  },

  worker: {
    id: "worker",
    name: "Workers",
    what: "Background processes that pull jobs from the queue and do the slow work outside the request: sending emails, resizing images, calling other services. You scale them by adding more consumers.",
    why: "Slow and flaky work should not tie up the servers that answer users. Workers do it at their own pace, retry when something fails, and can be scaled to the length of the queue.",
    whenNot:
      "Do not push every small task to a worker. If it is fast and the user needs the outcome, do it in the request. A worker fleet means more deploys and more failure modes.",
    tradeoffs: [
      "More workers vs a downstream limit: more consumers drain the queue sooner, but can overwhelm the database or provider they call. Cap the concurrency.",
      "Retry fast vs slow: quick retries recover from blips, but hammering a dead provider makes it worse. Use backoff with jitter.",
      "Same codebase vs separate: sharing code with the app is easy, but a heavy job then competes with request code if you deploy them together.",
    ],
    say: "I'd run workers as idempotent consumers that scale on queue depth, retry with backoff and jitter, and send poison messages to a dead letter queue.",
    followUp: "A job fails halfway through. How do you make sure retrying it is safe?",
    examples: ["Celery", "Sidekiq", "AWS Lambda with SQS", "BullMQ"],
    learn: [
      { href: "/learn/async-messaging", label: "Retries and dead letter queues" },
      { href: "/learn/reliability-observability", label: "Reliability and observability" },
    ],
    doodle: "backoff",
  },

  email: {
    id: "email",
    name: "Email provider",
    what: "Any outside service you depend on but do not run, like an email, SMS or payment provider. It has its own limits, its own outages, and no promise to match your speed.",
    why: "You will not build mail delivery yourself. But a slow or failing provider can drag your whole request down if you call it inline. Calling it from workers keeps its problems away from users.",
    whenNot:
      "Do not add layers of failover and abstraction for a provider that rarely matters. One provider with timeouts, retries and an alert is fine until its downtime really costs you. Then add a second.",
    tradeoffs: [
      "Build vs buy: a provider gets you running fast and handles deliverability, but you accept its price, rate limits and outages.",
      "Single provider vs fallback: a second provider survives an outage, but you must keep two integrations working and cope with different behaviour.",
      "Polling vs webhook: polling for status is simple, but providers usually report delivery by webhook, which you must secure and handle twice.",
    ],
    say: "I'd treat every external provider as unreliable: call it from workers with a timeout, retries and a circuit breaker, and make the call idempotent.",
    followUp: "The provider is down for an hour. What happens to the messages waiting to be sent?",
    examples: ["Amazon SES", "SendGrid", "Twilio", "Stripe"],
    learn: [
      { href: "/learn/case-notification-system", label: "Case study: notification system" },
      { href: "/learn/reliability-observability", label: "Timeouts, retries and circuit breakers" },
    ],
    doodle: "circuit-breaker",
  },

  obs: {
    id: "obs",
    name: "Monitoring",
    what: "The metrics, logs and traces that every component emits, collected in one place with dashboards and alerts, so you can see how the system behaves and find out where a slow request spent its time.",
    why: "At this size something is always degraded, and when users say it is slow, nobody knows where. You cannot fix what you cannot see, and alerts should fire on what users feel.",
    whenNot:
      "Do not begin with hundreds of dashboards. Start with request rate, errors, latency and saturation, plus searchable logs. Add tracing once many services make it hard to see where time goes.",
    tradeoffs: [
      "Detail vs cost: logging and tracing everything helps debugging, but storage and the overhead add up, so sample traces and keep high-cardinality labels in check.",
      "Symptom alerts vs cause alerts: alerting on errors and latency pages you for real user pain, while CPU alerts are noisy and often mean nothing.",
      "Hosted vs self-run: hosted starts quickly but costs more as volume grows. Self-run is cheaper per event, but you now operate a critical system.",
    ],
    say: "I'd emit metrics, logs and traces from every component, and alert on user-facing symptoms such as error rate and latency, with SLOs to decide what matters.",
    followUp: "Latency doubled at 3 a.m. How do you find out which component is responsible?",
    examples: ["Prometheus and Grafana", "Datadog", "OpenTelemetry", "AWS CloudWatch"],
    learn: [
      { href: "/learn/reliability-observability", label: "Reliability and observability" },
      { href: "/deep-dives/request-flows", label: "Request flows and tracing" },
    ],
    doodle: "monitoring",
  },
};

/** One card for every shard: they are copies of the same idea. */
const shard = (id: "db2" | "db3" | "db4"): Concept => ({
  id,
  name: "Database shard",
  what: "One of several databases, each holding a slice of the data chosen by a shard key such as the user id. Each shard has its own primary and replicas, and takes only its share of the traffic.",
  why: "One primary has a ceiling on writes, and replicas do not raise it. Splitting the data lets each shard take a quarter of the writes, so capacity grows by adding shards.",
  whenNot: "Not while one primary and replicas still fit, which is true for most products much longer than expected. Sharding makes joins, transactions and schema changes harder, so use the simpler fixes first.",
  tradeoffs: [
    "Hash vs range sharding: hashing spreads load evenly but range queries touch every shard; ranges keep neighbours together but can create hot spots.",
    "Many small shards vs a few: more shards are easier to rebalance, but each cross-shard query touches more of them.",
    "Sharded vs one database: you gain write capacity and give up easy joins, transactions and simple schema changes.",
  ],
  say: "I'd shard by a key that spreads load and keeps a request on one shard, such as the user id, and plan how to reshard before I need to.",
  followUp: "How do you pick a shard key, and what happens when one key is hot?",
  examples: ["Vitess", "Citus", "MongoDB sharding", "DynamoDB"],
  learn: [
    { href: "/deep-dives/sharding-strategies", label: "Sharding strategies" },
    { href: "/learn/databases-scaling", label: "Databases and scaling" },
  ],
  doodle: "shard",
});

const region: Concept = {
  id: "region2",
  name: "Second region",
  what: "A full copy of the stack in another geographic region. Users are routed to the nearest one, and each region serves its share of the traffic and can carry on alone if the other fails.",
  why: "A single data centre is a single point of failure, and users far from it pay for the distance on every request. A second region fixes both at once.",
  whenNot: "Not until an outage in one region would cost more than running two. It roughly doubles infrastructure cost and forces hard choices about replicating data between regions.",
  tradeoffs: [
    "Active-active vs active-passive: both serve users but writes can conflict; a standby is simpler but sits idle.",
    "Latency vs consistency: serving users locally is faster, but keeping two regions' data identical costs round trips.",
    "Two regions vs one: you survive a regional outage and cut distance, and you pay double and handle replication.",
  ],
  say: "I'd run two regions, route users to the nearest, and decide up front how data replicates and what we do when the regions disagree.",
  followUp: "How do you keep data consistent across regions, and what happens in a network split?",
  examples: ["AWS multi-region", "Route 53 latency routing", "Cloudflare load balancing"],
  learn: [
    { href: "/learn/consistency-cap", label: "Consistency and CAP" },
    { href: "/learn/reliability-observability", label: "Reliability and observability" },
  ],
  doodle: "cdn",
};

export const CONCEPTS: Record<ArchNodeId, Concept> = { ...BASE, db2: shard("db2"), db3: shard("db3"), db4: shard("db4"), region2: region };
