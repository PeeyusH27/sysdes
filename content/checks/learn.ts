import type { PageChecks } from "./types";

export const checks: Record<string, PageChecks> = {
  caching: {
    "why-it-matters": {
      q: "A cache has a 50% hit ratio. What happens to database reads?",
      options: ["They stay the same", "They halve", "They double"],
      answer: 1,
      why: "Half the reads are answered from memory and never reach the database.",
    },
    "where-caches-live": {
      q: "Which cache hit saves the most distance?",
      options: ["Database buffer pool", "Application server memory", "Browser or CDN edge"],
      answer: 2,
      why: "The closer to the user, the fewer hops the request makes before it is answered.",
    },
    "what-to-cache-and-how-to-name-it": {
      q: "Which data is the best cache candidate?",
      options: ["Read often, changes rarely", "Written on every request", "Unique to each request"],
      answer: 0,
      why: "Reads that repeat and rarely change give a high hit ratio and few stale answers.",
    },
    "caching-patterns": {
      q: "On a miss, the app loads the data and fills the cache. Which pattern?",
      options: ["Write-through", "Cache-aside", "Write-behind"],
      answer: 1,
      why: "In cache-aside the application owns both the lookup and the fill.",
    },
    "eviction-and-ttl": {
      q: "The cache is full. What does LRU evict?",
      options: ["The oldest written entry", "The largest entry", "The least recently used entry"],
      answer: 2,
      why: "LRU assumes what you have not touched lately is the least likely to be needed next.",
    },
    "invalidation-and-the-classic-race": {
      q: "Two writers update one row. Why can the cache end up stale?",
      options: ["Cache writes land in the other order", "Redis drops one write", "TTL expires too early"],
      answer: 0,
      why: "Database order and cache order can differ, so the older value overwrites the newer one.",
    },
    "failure-modes": {
      q: "A hot key expires and thousands of requests hit the database. What is it?",
      options: ["Cache avalanche", "Cache stampede", "Cache penetration"],
      answer: 1,
      why: "A stampede is many callers rebuilding one expired key at once. An avalanche is many keys expiring together.",
    },
    "the-numbers-hit-ratio-vs-latency": {
      q: "Going from a 90% to a 99% hit ratio does what to misses?",
      options: ["Cuts them about tenfold", "Cuts them by 9%", "Nothing noticeable"],
      answer: 0,
      why: "Misses fall from 10% to 1%, so database traffic drops about tenfold.",
    },
    "http-caching-for-frontend-developers": {
      q: "Which header lets a browser reuse a response for an hour?",
      options: ["Content-Type: text/html", "Cache-Control: max-age=3600", "Accept: */*"],
      answer: 1,
      why: "max-age says how many seconds the response counts as fresh.",
    },
    "sizing-and-monitoring": {
      q: "Which number tells you a cache is earning its keep?",
      options: ["Hit ratio", "Key count", "Uptime"],
      answer: 0,
      why: "A low hit ratio means most requests still pay for the database.",
    },
    "caching-in-the-interview": {
      q: "Which data do you leave out of the cache?",
      options: ["Per-user or write-heavy data", "Product pages", "Static images"],
      answer: 0,
      why: "Copies of data that changes on every request go stale at once and keep the hit ratio low.",
    },
  },
  "requirements-estimation": {
    "where-estimates-go-wrong": {
      q: "Your link is rated 10 Gbps. Traffic is 5.8 GB/s. Enough?",
      options: ["Yes, 5.8 is below 10", "No, it needs about 46 Gbps", "Yes, with compression"],
      answer: 1,
      why: "Links are rated in bits. 5.8 GB/s times 8 is about 46 Gbps, nearly five times the link.",
    },
    "requirements-and-estimation-in-the-interview": {
      q: "How should every estimate line end?",
      options: ["With three-digit precision", "With a cache, CDN or shard decision", "With a request to skip it"],
      answer: 1,
      why: "A number matters only if it changes a box on the board. End each line in a design decision.",
    },
  },
  "databases-scaling": {
"connection-pooling": {
  q: "50 servers each open 20 connections. Postgres allows about 100. Fix?",
  options: ["Add a connection pooler", "Add more replicas", "Raise the server count"],
  answer: 0,
  why: "A pooler lends a few real connections per transaction, so 1,000 clients share about 40.",
},
"databases-and-scaling-in-the-interview": {
  q: "Reads are ten times writes. What do you add before sharding?",
  options: ["A directory service", "A cache, then read replicas", "A second primary"],
  answer: 1,
  why: "Cheap read-scaling moves come first; sharding only when writes or data size exceed one primary.",
},
  },
  "async-messaging": {
    "what-to-monitor-in-a-queue": {
      q: "Which queue metric do users feel most directly?",
      options: ["Queue depth", "Age of the oldest message", "Number of workers"],
      answer: 1,
      why: "Age is the wait a user experiences. Depth alone misleads: 10,000 waiting is fine at 5,000/s and an outage at 5/s.",
    },
    "async-messaging-in-the-interview": {
      q: "Which delivery guarantee do you state first for a job queue?",
      options: ["Exactly-once", "At-least-once with idempotent consumers", "At-most-once"],
      answer: 1,
      why: "Brokers redeliver after crashes, so you promise at-least-once and make the work safe to repeat.",
    },
  },
  "consistency-cap": {
    "failure-modes": {
      q: "Two nodes both think they lead after a partition. What is it?",
      options: ["Cache stampede", "Split brain", "Clock drift"],
      answer: 1,
      why: "Each half thinks the other is dead and promotes itself, so two leaders accept conflicting writes.",
    },
    "the-numbers-what-each-choice-costs": {
      q: "Why keep strong reads to the balance and stock check only?",
      options: ["They cost a round trip", "They need more disk", "They use more CPU"],
      answer: 0,
      why: "A far-leader read costs about 80 ms. Five of them add roughly 400 ms; local replicas cost a few ms.",
    },
    "consistency-and-cap-in-the-interview": {
      q: "What is the first question to ask about each feature?",
      options: ["Which database to use", "What does a wrong answer cost", "How many nodes to run"],
      answer: 1,
      why: "The cost of a stale or conflicting answer decides strong, read-your-writes or eventual for that feature.",
    },
  },
  "reliability-observability": {
    "how-failures-spread": {
      q: "Three layers each retry 3 times. Calls at the database?",
      options: ["9", "27", "3"],
      answer: 1,
      why: "Retries multiply across layers: 3 x 3 x 3 = 27 calls for one user request.",
    },
    "reliability-in-the-interview": {
      q: "What do you ask for before choosing resilience patterns?",
      options: ["The SLO", "The cloud provider", "The team size"],
      answer: 0,
      why: "The SLO says how much downtime is allowed, so it sets how far to spend on resilience.",
    },
  },
  "case-url-shortener": {
"failure-modes": {
  q: "After a counter restart, ids repeat. What stops overwriting old links?",
  options: ["The primary key on code", "The CDN cache", "The click queue"],
  answer: 0,
  why: "A duplicate code fails with a unique violation, so no existing row is replaced.",
},
"url-shortener-in-the-interview": {
  q: "Which comes first when answering a URL shortener question?",
  options: ["Shard the database", "Scope, then 40 and 4,000 per second", "Pick Kafka partitions"],
  answer: 1,
  why: "Numbers show reads dominate, and that justifies every later choice.",
},
  },
  "case-notification-system": {
    "failure-modes": {
      q: "Provider returns 200 but few users get SMS. What catches it?",
      options: ["The circuit breaker", "Delivery rate per provider", "A longer timeout"],
      answer: 1,
      why: "The breaker only sees errors. Receipts summed per provider reveal a provider that accepts but silently drops messages.",
    },
    "notification-system-in-the-interview": {
      q: "Which design decision do you state first in a notification interview?",
      options: ["Pick the database", "Separate urgent traffic from bulk", "Choose the SMS vendor"],
      answer: 1,
      why: "Priority isolation drives the queues, workers and provider limits, so everything else hangs off that one choice.",
    },
  },
  "interview-playbook": {
    "weak-answer-strong-answer": {
      q: "The interviewer questions your database choice. Best first move?",
      options: ["Defend it firmly", "Restate the concern, tie it to a number", "Switch to their suggestion"],
      answer: 1,
      why: "Pushback is a hint. Restating the concern and weighing it against your numbers shows reasoning, not stubbornness.",
    },
    "driving-the-conversation-and-getting-unstuck": {
      q: "You are stuck mid-answer. What is the first step?",
      options: ["Guess a technology", "Restate the requirements aloud", "Stay quiet and think"],
      answer: 1,
      why: "Going back to requirements and numbers buys time, narrows the problem, and shows your reasoning in the open.",
    },
    "raising-the-core-topics-on-cue": {
      q: "When do you raise sharding?",
      options: ["Once one primary cannot take the writes", "In the first five minutes", "Whenever data is stored"],
      answer: 0,
      why: "Sharding costs joins and easy resharding, so earn it with a number showing one primary is out of room.",
    },
  },
  "api-load-balancing": {
    "when-load-balancing-goes-wrong": {
      q: "Round robin keeps feeding one slow server. What do clients do?",
      options: ["Nothing, it self-heals", "Time out and retry, adding load", "Switch to another balancer"],
      answer: 1,
      why: "Timeouts trigger retries that land on healthy servers too, so one slow server can overload the whole fleet.",
    },
    "sizing-the-fleet": {
      q: "Why plan for about 60% utilisation at peak?",
      options: ["Latency climbs steeply near full", "Servers cost less when idle", "Balancers require it"],
      answer: 0,
      why: "Response time grows as service time divided by one minus utilisation, so 90% busy is about 10 times slower.",
    },
    "api-and-load-balancing-in-the-interview": {
      q: "What do you say first when scaling a service to many servers?",
      options: ["Shard the database", "Add a GraphQL layer", "Make the services stateless"],
      answer: 2,
      why: "Stateless instances let any server take any request, so a balancer can add capacity and survive crashes.",
    },
  },
};
