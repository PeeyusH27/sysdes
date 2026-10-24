import type { DecisionSpec, FlowSpec, SequenceSpec, TimelineSpec } from "@/components/diagram/types";

export const interviewFlow: FlowSpec = {
  id: "interview-flow",
  title: "Interview flow",
  description: "Six stages, each feeding the next: requirements, estimates, APIs, a data model, the architecture, then a deep dive.",
  nodes: [
    { id: "req", label: "Requirements", kind: "client", col: 0, row: 0, sub: "~5 min", note: "Features, targets, out of scope" },
    { id: "est", label: "Estimate scale", kind: "service", col: 1, row: 0, sub: "~3 min", note: "QPS, peak, storage, bandwidth" },
    { id: "api", label: "APIs", kind: "gateway", col: 2, row: 0, sub: "~2 min", note: "3 to 5 endpoints" },
    { id: "model", label: "Data model", kind: "database", col: 3, row: 0, note: "Entities, keys, access patterns" },
    { id: "arch", label: "Architecture", kind: "service", col: 4, row: 0, sub: "~15 min", note: "Read path and write path" },
    { id: "deep", label: "Deep dive", kind: "cache", col: 4, row: 1, sub: "~15 min", note: "1 or 2 hard parts, trade-offs" },
  ],
  edges: [
    { from: "req", to: "est" },
    { from: "est", to: "api" },
    { from: "api", to: "model" },
    { from: "model", to: "arch" },
    { from: "arch", to: "deep", label: "trade-offs" },
  ],
  scenarios: [
    {
      id: "walkthrough",
      name: "Walkthrough",
      steps: [
        {
          edge: "req>est",
          ms: 2200,
          caption: "Requirements (about 5 min): agree on 3 to 5 core features, targets for latency, availability and consistency, and what is out of scope. Write them where the interviewer can see.",
          mark: [{ node: "req", state: "ok" }],
        },
        {
          edge: "est>api",
          ms: 2200,
          caption: "Estimate (about 3 min): average and peak QPS, the read:write ratio, 5-year storage with replicas, egress bandwidth. Round hard and say which number matters most.",
          mark: [{ node: "est", state: "ok" }],
        },
        {
          edge: "api>model",
          ms: 2200,
          caption: "APIs (about 2 min): 3 to 5 endpoints with method, path, key parameters and response, such as POST /tweets and GET /timeline?cursor=…",
          mark: [{ node: "api", state: "ok" }],
        },
        {
          edge: "model>arch",
          ms: 2200,
          caption: "Data model: the main entities, their primary keys and how each is read. The access pattern decides SQL or NoSQL, the indexes and the shard key.",
          mark: [{ node: "model", state: "ok" }],
        },
        {
          edge: "arch>deep",
          ms: 2200,
          caption: "Architecture (about 15 min): boxes and arrows for the main write and read paths, sized by your estimates. Walk one request through end to end.",
          mark: [{ node: "arch", state: "ok" }],
        },
        {
          edge: "arch>deep",
          reverse: true,
          ms: 2400,
          caption: "Deep dive (about 15 min): pick the 1 or 2 hardest parts (hot path, failure mode, scaling limit), compare options, update the design. Keep the last 5 minutes for trade-offs.",
          mark: [{ node: "deep", state: "ok" }],
        },
      ],
    },
    {
      id: "numbers",
      name: "Numbers drive the design",
      steps: [
        {
          edge: "est>api",
          ms: 2000,
          caption: "Instagram-lite: 100M daily users × 10 feed views is about 11.6K reads/s on average and 35K/s at peak, against only about 230 uploads/s.",
          mark: [{ node: "est", state: "busy" }],
        },
        {
          edge: "api>model",
          ms: 2000,
          caption: "Reads outnumber writes 50 to 1, so the feed API is a cheap, cursor-paginated GET /feed; uploads can be slower and asynchronous.",
        },
        {
          edge: "model>arch",
          ms: 2000,
          caption: "10 TB of new photos a day can't live in a database: metadata goes in SQL, image bytes in object storage.",
        },
        {
          edge: "arch>deep",
          ms: 2000,
          caption: "About 46 Gbps of thumbnail egress makes a CDN mandatory; 35K feed reads/s calls for a cache and precomputed feeds.",
          mark: [{ node: "arch", state: "ok" }],
        },
        {
          edge: "arch>deep",
          reverse: true,
          ms: 2200,
          caption: "So the deep dive goes to the feed cache, which carries most of the load. If a number changes, update the design out loud.",
          mark: [{ node: "deep", state: "hit" }, { node: "est", state: null }],
        },
      ],
    },
  ],
};

export const interviewTimeline: TimelineSpec = {
  id: "interview-timeline",
  title: "A 45-minute system design interview",
  description: "5 minutes of requirements, 5 of estimation and APIs, 15 of high-level design, 15 of deep dive, 5 to wrap up. Start drawing by minute 10.",
  unit: "min",
  lanes: [
    { id: "req", label: "Requirements" },
    { id: "est", label: "Estimate + APIs" },
    { id: "hld", label: "High-level design" },
    { id: "deep", label: "Deep dive" },
    { id: "wrap", label: "Wrap-up" },
  ],
  spans: [
    { lane: "req", start: 0, end: 5, label: "Scope", tone: 1 },
    { lane: "est", start: 5, end: 10, label: "Estimate", tone: 2 },
    { lane: "hld", start: 10, end: 25, label: "Data model + main paths", tone: 3 },
    { lane: "deep", start: 25, end: 40, label: "Bottlenecks + failures", tone: 1 },
    { lane: "wrap", start: 40, end: 45, label: "Recap", tone: 2 },
  ],
  markers: [
    { at: 10, label: "Start drawing" },
    { at: 25, label: "Pick 1–2 deep dives" },
    { at: 40, label: "Summarize" },
  ],
};

export const clarifyDialog: SequenceSpec = {
  id: "clarify-dialog",
  title: "Three questions that narrow the prompt",
  description: "Who are the users, which three actions matter, and what can be cut. Click a tab to see how the interviewer might answer.",
  actors: [
    { id: "you", label: "You", kind: "client" },
    { id: "int", label: "Interviewer", kind: "service" },
  ],
  items: [
    { from: "you", to: "int", label: "Who are the users?", type: "call" },
    { from: "int", to: "you", label: "Readers and writers", type: "reply" },
    { from: "you", to: "int", label: "Core: post, follow, timeline?", type: "call" },
    {
      alt: [
        {
          when: "Interviewer agrees",
          items: [
            { from: "int", to: "you", label: "Yes, that is the core", type: "reply" },
            { note: "Write the 3 actions on the board", over: ["you", "int"] },
          ],
        },
        {
          when: "Interviewer adds one",
          items: [
            { from: "int", to: "you", label: "Add image upload", type: "reply" },
            { note: "Say: that changes the storage estimate", over: ["you", "int"] },
          ],
        },
      ],
    },
    { from: "you", to: "int", label: "I will skip DMs and ads", type: "call" },
    { from: "int", to: "you", label: "Fine, skip them", type: "reply" },
  ],
};

export const scopeFunnel: FlowSpec = {
  id: "scope-funnel",
  title: "From a vague prompt to a written scope",
  description: "A prompt turns into many ideas, a few core actions and a parked list. A late request goes back through the same door.",
  nodes: [
    { id: "prompt", label: "Design Twitter", kind: "client", col: 0, row: 1, note: "The prompt is vague on purpose" },
    { id: "ideas", label: "Feature ideas", kind: "service", col: 1, row: 1, sub: "10 to 15", note: "Everything the product could do" },
    { id: "core", label: "Core actions", kind: "gateway", col: 2, row: 0, sub: "3 to 5", note: "What you design and estimate" },
    { id: "cut", label: "Out of scope", kind: "external", col: 2, row: 2, note: "Said out loud, written down" },
    { id: "late", label: "Late request", kind: "client", col: 3, row: 0, sub: "minute 30", note: "And it should support video" },
  ],
  edges: [
    { from: "prompt", to: "ideas", label: "list" },
    { from: "ideas", to: "core", label: "keep" },
    { from: "ideas", to: "cut", label: "park" },
    { from: "late", to: "core", label: "video" },
  ],
  scenarios: [
    {
      id: "narrow",
      name: "Narrow it",
      steps: [
        { edge: "prompt>ideas", caption: "Twitter could mean posts, follows, timelines, search, trends, DMs, ads and more. List them quickly." },
        { edge: "ideas>core", tone: "ok", caption: "Keep the three that define the product: post a tweet, follow a user, read the home timeline.", mark: [{ node: "core", state: "ok" }] },
        { edge: "ideas>cut", caption: "Park the rest and say so: I'll skip DMs, search and ads unless you want them. Cutting shows judgement.", mark: [{ node: "cut", state: "ok" }] },
      ],
    },
    {
      id: "late",
      name: "A late request",
      steps: [
        { edge: "late>core", ms: 1800, caption: "At minute 30 the interviewer says: and it should support video.", mark: [{ node: "late", state: "busy" }] },
        { edge: "late>core", ms: 2600, caption: "Re-run the storage line out loud. Text is 400M tweets a day at 1 KB, about 400 GB. If 1% carry a 10 MB clip, that is 4M clips, about 40 TB a day: 100 times more.", mark: [{ node: "core", state: "busy" }] },
        { edge: "late>core", reverse: true, tone: "ok", ms: 2200, caption: "The design now needs object storage and a CDN for video. Because the scope was written down, you can say what changed and why.", mark: [{ node: "core", state: "ok" }, { node: "late", state: null }] },
      ],
    },
  ],
};

export const nfrTree: DecisionSpec = {
  id: "which-nfr",
  title: "Which requirement does this sentence become?",
  start: "money",
  nodes: {
    money: { q: "Would a wrong or lost answer cost money or trust (payments, orders, follows)?", yes: "strong", no: "slow" },
    strong: {
      result: "Consistency and durability",
      why: "Write strong consistency for this feature and never lose an acknowledged write: replicas in other zones, acknowledge after the write is on at least two disks.",
    },
    slow: { q: "Does a slow response make users leave (feeds, search, checkout pages)?", yes: "latency", no: "down" },
    latency: {
      result: "A latency target",
      why: "Write a percentile with a number, such as p99 under 200 ms. It forces caches, a CDN and fewer calls per page.",
    },
    down: { q: "Does an outage stop revenue or block other teams (login, API gateway)?", yes: "avail", no: "eventual" },
    avail: {
      result: "An availability target",
      why: "Write the nines: 99.9% allows about 8.8 hours of downtime a year, 99.99% about 53 minutes. It forces redundancy and no single point of failure.",
    },
    eventual: {
      result: "Eventual consistency is fine",
      why: "Likes, view counts and recommendations can be a few seconds behind. Say so out loud, because it lets you use caches and replicas freely.",
    },
  },
};

export const consistencyFlow: FlowSpec = {
  id: "consistency-read",
  title: "Strong read or eventual read",
  description: "Reading from the primary is always fresh. Reading from a replica is fast and scalable but can be a moment behind.",
  nodes: [
    { id: "client", label: "Client", kind: "client", col: 0, row: 1 },
    { id: "app", label: "App", kind: "service", col: 1, row: 1 },
    { id: "primary", label: "Primary", kind: "database", col: 2, row: 0, sub: "takes writes" },
    { id: "replica", label: "Replica", kind: "database", col: 2, row: 2, sub: "async copy" },
  ],
  edges: [
    { from: "client", to: "app" },
    { from: "app", to: "primary", label: "write" },
    { from: "primary", to: "replica", label: "copy", style: "replication" },
    { from: "app", to: "replica", label: "read" },
  ],
  scenarios: [
    {
      id: "strong",
      name: "Strong read",
      steps: [
        { edge: "client>app", caption: "A user changes their display name to Asha." },
        { edge: "app>primary", caption: "The write commits on the primary." },
        { edge: "app>primary", reverse: true, tone: "ok", caption: "Reading from the primary right away returns Asha. Always fresh, but every read lands on one machine.", mark: [{ node: "primary", state: "hit" }] },
      ],
    },
    {
      id: "eventual",
      name: "Eventual read",
      steps: [
        { edge: "app>primary", caption: "The same write commits on the primary." },
        { edge: "app>replica", caption: "The next read is sent to a replica, which keeps the read load off the primary." },
        { edge: "app>replica", reverse: true, tone: "miss", caption: "The replica has not received the change yet and returns the old name. Fine for a timeline, wrong for a balance.", mark: [{ node: "replica", state: "miss" }] },
        { edge: "primary>replica", ms: 1600, caption: "Usually well under a second later the copy lands. The next read is fresh.", mark: [{ node: "replica", state: "ok" }] },
      ],
    },
  ],
};

export const estimatePipeline: FlowSpec = {
  id: "estimate-pipeline",
  title: "From daily users to servers, storage and bandwidth",
  description: "Each box is one line on the board. Example: 10M daily users, 10 actions each, 1 write in 11 requests.",
  nodes: [
    { id: "dau", label: "Daily users", kind: "client", col: 0, row: 0, sub: "10M" },
    { id: "avg", label: "Average QPS", kind: "service", col: 1, row: 0, sub: "~1,160/s" },
    { id: "peak", label: "Peak QPS", kind: "lb", col: 2, row: 0, sub: "~3,500/s" },
    { id: "servers", label: "App servers", kind: "worker", col: 3, row: 0, sub: "6 to 9" },
    { id: "store", label: "Storage", kind: "storage", col: 2, row: 1, sub: "~50 TB" },
    { id: "net", label: "Bandwidth", kind: "gateway", col: 3, row: 1, sub: "bytes x 8" },
  ],
  edges: [
    { from: "dau", to: "avg", label: "x 10" },
    { from: "avg", to: "peak", label: "x 3" },
    { from: "peak", to: "servers", label: "÷ 600" },
    { from: "avg", to: "store", label: "writes" },
    { from: "peak", to: "net", label: "bytes" },
  ],
  scenarios: [
    {
      id: "qps",
      name: "QPS to servers",
      steps: [
        { edge: "dau>avg", ms: 2400, caption: "10M users x 10 actions = 100M actions a day. Divide by 86,400, which is about 10 to the 5th: about 1,160 requests per second.", mark: [{ node: "avg", state: "ok" }] },
        { edge: "avg>peak", ms: 2200, caption: "Traffic is not flat. Peak is about 3 times the average, so about 3,500 per second. Size for this number, not the average.", mark: [{ node: "peak", state: "busy" }] },
        { edge: "peak>servers", ms: 2600, caption: "One server does about 1,000 req/s, but run it 60% busy for headroom: 600 usable. 3,500 / 600 = 5.8, so 6.", mark: [{ node: "servers", state: "ok" }] },
        { edge: "peak>servers", ms: 2400, caption: "Run 9 across three zones so losing a whole zone still leaves 6. The extra three are for failure, not load.", mark: [{ node: "peak", state: null }] },
      ],
    },
    {
      id: "storage",
      name: "Storage",
      steps: [
        { edge: "avg>store", ms: 2400, caption: "Only 1 request in 11 is a write: about 105 writes per second. At 1 KB each and 86,400 seconds that is about 9 GB a day.", mark: [{ node: "store", state: "busy" }] },
        { edge: "avg>store", ms: 2600, caption: "9 GB x 365 x 5 years = about 17 TB. Keep 3 copies and it is 49.8 TB. Forgetting the copies is the classic storage mistake.", mark: [{ node: "store", state: "ok" }] },
      ],
    },
    {
      id: "bandwidth",
      name: "Bandwidth",
      steps: [
        { edge: "peak>net", ms: 2400, caption: "Reads are about 1,050 per second. At 2 KB each that is 2 MB/s, about 17 Mbps. Small, so bandwidth is no problem for text.", mark: [{ node: "net", state: "ok" }] },
        { edge: "peak>net", ms: 2600, caption: "Make each response a 500 KB photo: 1,050 x 500 KB = 526 MB/s, about 4.2 Gbps. Bytes x 8 = bits. Media is what makes bandwidth matter.", tone: "error", mark: [{ node: "net", state: "busy" }] },
      ],
    },
  ],
};

export const scaleTree: DecisionSpec = {
  id: "scale-tree",
  title: "What does this peak QPS call for?",
  start: "tiny",
  nodes: {
    tiny: { q: "Is peak under about 1,000 requests per second?", yes: "one", no: "mid" },
    one: {
      result: "One server and one database",
      why: "A single app server and a Postgres primary cope. A second server is for failover, not load. Do not shard or add a cache yet.",
    },
    mid: { q: "Is peak under about 10,000 requests per second?", yes: "few", no: "reads" },
    few: {
      result: "A balancer, a handful of servers, a cache",
      why: "Put a load balancer in front of 6 to 15 servers and a cache in front of the database. One primary is usually still enough.",
    },
    reads: { q: "Are most of those requests reads (10 to 1 or more)?", yes: "replicas", no: "shard" },
    replicas: {
      result: "Cache, read replicas, precomputed results",
      why: "Reads scale out cheaply: a cache with a 99% hit ratio, replicas, and a CDN for media. The primary still takes all the writes.",
    },
    shard: {
      result: "Partition the writes",
      why: "One primary cannot take the writes. Shard by a key such as user or conversation id, and put queues in front for bursts.",
    },
  },
};

export const readHeavy: FlowSpec = {
  id: "read-heavy",
  title: "Read-heavy path",
  description: "A cache absorbs almost every read, so the database sees a small fraction of the traffic.",
  nodes: [
    { id: "users", label: "Users", kind: "client", col: 0, row: 1 },
    { id: "cache", label: "Feed cache", kind: "cache", col: 1, row: 1, sub: "99% hits" },
    { id: "replica", label: "Read replica", kind: "database", col: 2, row: 0 },
    { id: "primary", label: "Primary", kind: "database", col: 2, row: 2, sub: "writes only" },
  ],
  edges: [
    { from: "users", to: "cache", label: "read" },
    { from: "cache", to: "replica", label: "miss" },
    { from: "users", to: "primary", label: "write" },
    { from: "primary", to: "replica", label: "copy", style: "replication" },
  ],
  scenarios: [
    {
      id: "reads",
      name: "35K reads per second",
      steps: [
        { edge: "users>cache", ms: 1800, caption: "Instagram-lite at peak: 35,000 feed reads per second against 700 uploads per second, 50 to 1.", mark: [{ node: "cache", state: "busy" }] },
        { edge: "users>cache", reverse: true, tone: "ok", ms: 2000, caption: "A 99% hit ratio answers 34,650 of them from memory.", mark: [{ node: "cache", state: "hit" }] },
        { edge: "cache>replica", tone: "miss", ms: 2200, caption: "Only 1% miss: 350 reads per second reach a replica. One replica copes easily.", mark: [{ node: "replica", state: "ok" }] },
      ],
    },
    {
      id: "writes",
      name: "700 writes per second",
      steps: [
        { edge: "users>primary", ms: 2000, caption: "Writes skip the cache and go to the primary: about 700 per second at peak, well within one machine." },
        { edge: "primary>replica", ms: 1800, caption: "The primary copies each change to the replicas, which is why a feed may be a second behind." },
      ],
    },
  ],
};

export const chatPartition: FlowSpec = {
  id: "chat-partition",
  title: "Balanced reads and writes: chat",
  description: "Every message is one write and at least one read, so the write path is the hot path and must be partitioned.",
  nodes: [
    { id: "sender", label: "Sender", kind: "client", col: 0, row: 1 },
    { id: "chat", label: "Chat service", kind: "service", col: 1, row: 1 },
    { id: "log", label: "Log by chat id", kind: "database", col: 2, row: 0, sub: "64 partitions" },
    { id: "recv", label: "Receiver", kind: "client", col: 2, row: 2 },
  ],
  edges: [
    { from: "sender", to: "chat", label: "send" },
    { from: "chat", to: "log", label: "append" },
    { from: "chat", to: "recv", label: "push" },
  ],
  scenarios: [
    {
      id: "message",
      name: "One message",
      steps: [
        { edge: "sender>chat", ms: 2400, caption: "50M daily users x 80 actions = 4B a day, about 46K per second. With reads and writes about 1 to 1, that is about 23K writes per second.", mark: [{ node: "chat", state: "busy" }] },
        { edge: "chat>log", ms: 2600, caption: "Append the message to the log of its conversation. Peak is about 70K writes per second, so one primary is not enough: split by chat id into 64 partitions, about 1,100 each.", mark: [{ node: "log", state: "ok" }] },
        { edge: "chat>recv", ms: 2000, caption: "Push it to the receiver over a connection. A read is cheap here; the write is the work.", tone: "ok", mark: [{ node: "chat", state: null }] },
      ],
    },
  ],
};

export const writeHeavy: FlowSpec = {
  id: "write-heavy",
  title: "Write-heavy path",
  description: "A queue absorbs the burst and a worker writes in batches, so the store sees a few big writes, not millions of tiny ones.",
  nodes: [
    { id: "devices", label: "Sensors", kind: "client", col: 0, row: 1, sub: "millions" },
    { id: "queue", label: "Event queue", kind: "queue", col: 1, row: 1 },
    { id: "batcher", label: "Batch worker", kind: "worker", col: 2, row: 1 },
    { id: "store", label: "LSM store", kind: "database", col: 3, row: 1, sub: "append-friendly" },
  ],
  edges: [
    { from: "devices", to: "queue", label: "send" },
    { from: "queue", to: "batcher", label: "pull", style: "async" },
    { from: "batcher", to: "store", label: "batch" },
  ],
  scenarios: [
    {
      id: "burst",
      name: "A burst",
      steps: [
        { edge: "devices>queue", ms: 2200, caption: "A burst sends 50,000 events per second for 10 seconds: 500,000 events. The database could not take that directly.", tone: "error", mark: [{ node: "queue", state: "busy" }] },
        { edge: "queue>batcher", ms: 2000, caption: "The queue holds the burst. Workers pull at a steady pace, 1,000 events at a time.", mark: [{ node: "batcher", state: "ok" }] },
        { edge: "batcher>store", ms: 2400, caption: "1,000 events become one batched write: 50 writes per second instead of 50,000. Append-friendly stores such as Cassandra take this well.", tone: "ok", mark: [{ node: "store", state: "ok" }, { node: "queue", state: null }] },
      ],
    },
  ],
};

export const estimateMistakes: FlowSpec = {
  id: "estimate-mistakes",
  title: "Where an estimate fails the real system",
  description: "Three common slips: sizing for the average, forgetting replicas, and mixing bits with bytes.",
  nodes: [
    { id: "board", label: "Your estimate", kind: "service", col: 0, row: 0, sub: "on the board" },
    { id: "users", label: "Real users", kind: "client", col: 0, row: 1 },
    { id: "sys", label: "The system", kind: "service", col: 1, row: 1 },
    { id: "disk", label: "Disks", kind: "storage", col: 2, row: 0 },
    { id: "link", label: "Network link", kind: "gateway", col: 2, row: 1 },
  ],
  edges: [
    { from: "board", to: "sys", label: "sized" },
    { from: "users", to: "sys", label: "load" },
    { from: "sys", to: "disk", label: "data" },
    { from: "sys", to: "link", label: "bytes" },
  ],
  scenarios: [
    {
      id: "peak",
      name: "Forgot the peak",
      steps: [
        { edge: "board>sys", caption: "You sized for the average, 1,160 requests per second, and 2 servers looked comfortable.", mark: [{ node: "sys", state: "ok" }] },
        { edge: "users>sys", tone: "error", ms: 2400, caption: "At 20:00 everyone opens the app at once: 3,500 per second. Two servers at 1,000 each are overrun and latency climbs.", mark: [{ node: "sys", state: "down" }] },
        { edge: "board>sys", tone: "ok", ms: 2200, caption: "Fix: size for peak at 60% busy. 3,500 / 600 rounds up to 6 servers.", mark: [{ node: "sys", state: "ok" }] },
      ],
    },
    {
      id: "replicas",
      name: "Forgot the copies",
      steps: [
        { edge: "board>sys", caption: "You wrote 17 TB for five years of data and ordered disks for 17 TB." },
        { edge: "sys>disk", tone: "error", ms: 2600, caption: "Production keeps 3 copies of every byte. The real need is 49.8 TB, and the disks fill in less than two years.", mark: [{ node: "disk", state: "down" }] },
        { edge: "sys>disk", tone: "ok", ms: 2200, caption: "Fix: multiply by the replica count in the same line as the years. 17 TB x 3 = 49.8 TB.", mark: [{ node: "disk", state: "ok" }] },
      ],
    },
    {
      id: "bits",
      name: "Bits and bytes",
      steps: [
        { edge: "sys>link", ms: 2200, caption: "Photo traffic comes to 5.8 GB per second. You ask for a 10 Gbps link because 5.8 is less than 10.", mark: [{ node: "link", state: "busy" }] },
        { edge: "sys>link", tone: "error", ms: 2600, caption: "Links are rated in bits. 5.8 GB/s x 8 = 46 Gbps, so the 10 Gbps link carries about a fifth of the load.", mark: [{ node: "link", state: "down" }] },
        { edge: "sys>link", tone: "ok", ms: 2400, caption: "Fix: write the unit on every line, and multiply bytes by 8 once. A CDN then takes most of the 46 Gbps off your origin.", mark: [{ node: "link", state: "ok" }] },
      ],
    },
  ],
};
