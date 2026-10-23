// Page extras for the second batch of high-level design questions (see questions.ts for the first batch and
// docs/AUTHORING-EXTRAS.md for the rules). Merged into the questions extras in index.ts.
import type { PageExtras } from "./types";

export const extras: Record<string, PageExtras> = {
  "web-crawler": {
    detail: [
      "capacity-estimate",
      "api",
      "data-model",
      "politeness-robots-and-traps",
      "how-to-approach-it",
      "step-by-step-answer",
      "implementation",
      "failure-modes",
    ],
    doodle: "bloom-filter",
    sayIt: {
      answer:
        "I'd run a loop: a frontier hands out one ready URL, a fetcher downloads it, a parser extracts links, and only unseen links go back. The frontier keeps one queue per host so we stay polite, and a Bloom filter remembers billions of URLs in about 6 GB. Hosts are partitioned across nodes so politeness needs no locks.",
      numbers: [
        { value: "~386 pages/s", label: "for 1 billion pages a month" },
        { value: "~6 GB", label: "Bloom filter for 5B URLs at 1%" },
        { value: "3,860 hosts", label: "in play at a 10 second gap" },
      ],
      tradeoffs: [
        "Bloom filter vs exact set: about 6 GB instead of 40 GB, but roughly 1% of new URLs are wrongly skipped.",
        "Partition by host vs by URL: politeness and state stay on one node, but one huge host cannot be split.",
        "Simhash vs exact hash: near-duplicates are caught and stored once, but thresholds need tuning and templates can match.",
      ],
      mention:
        "Spider traps: a calendar with endless next links defeats both the URL filter and fingerprints, so cap URLs per host, depth and URL length.",
    },
    explain: {
      steps: [
        {
          id: "clarify",
          prompt: "Ask why we crawl, how many pages and how fresh, which content types, and whether JavaScript must be rendered.",
          hint: "A search index and a price tracker need very different scale and freshness; robots.txt is non-negotiable.",
        },
        {
          id: "estimate",
          prompt: "Work out pages per second, bandwidth, fetches in flight, and the memory needed to remember every URL seen.",
          hint: "1B pages a month is about 386 a second; 5B URLs need about 6 GB as a Bloom filter at 1%, 40 GB exact.",
        },
        {
          id: "interface",
          prompt: "Describe the frontier calls that workers use, and the small admin API an operator would need.",
          hint: "add(url, priority), next(now), done(url, delay); seeds, stats and a blocklist for admins.",
        },
        {
          id: "design",
          prompt: "Draw the loop from frontier to fetcher, store, parser and filter, and say how the frontier stays polite.",
          hint: "Priority front queues, one back queue per host, a heap of ready-at times, and one fetch in flight per host.",
        },
        {
          id: "deepdive",
          prompt: "Explain how you avoid crawling the same URL or page twice, and how you survive a spider trap.",
          hint: "Normalize URLs, Bloom filter, exact hash plus simhash for content, and per-host budgets with depth caps.",
        },
      ],
      checklist: [
        "Estimates about 400 pages a second and shows the arithmetic",
        "Keeps one queue per host with a delay, so sites are not hammered",
        "Explains why 10 second gaps still allow high throughput across hosts",
        "Normalizes URLs before checking whether they were seen",
        "Sizes a Bloom filter and names its false-positive cost",
        "Dedupes page content with an exact hash and a simhash",
        "Handles robots.txt, 429 responses and spider traps",
        "Partitions hosts across crawler nodes with consistent hashing",
      ],
    },
  },
  "video-streaming": {
    detail: [
      "capacity-estimate",
      "api",
      "data-model",
      "how-to-approach-it",
      "step-by-step-answer",
      "implementation",
      "failure-modes",
    ],
    doodle: "cdn",
    sayIt: {
      answer:
        "I'd split it in two. Uploads are resumable 8 MiB chunks straight to object storage, then a job fans out into 750 idempotent encode tasks: 4-second segments at five qualities. Playback is HLS: the player picks a quality per segment from measured throughput, and a CDN serves about 95% of the 12.5 Tbps peak.",
      numbers: [
        { value: "12.5 Tbps", label: "peak egress for 5M streams" },
        { value: "750 tasks", label: "to encode a 10 minute video" },
        { value: "~95%", label: "CDN hit rate keeps origin near 0.6 Tbps" },
      ],
      tradeoffs: [
        "Pre-encode all qualities vs on demand: instant playback, but storage and CPU spent on videos nobody watches.",
        "Short vs long segments: 2 second segments adapt faster to a bad network, but cost more requests and overhead.",
        "Client-side bitrate choice vs server-side: the player sees its own network, but needs a conservative safety margin to avoid stalls.",
      ],
      mention:
        "A dead transcoder: tasks are idempotent with deterministic output paths and expiring leases, so another worker simply runs the task again.",
    },
    explain: {
      steps: [
        {
          id: "clarify",
          prompt: "Ask about scale, devices, video length, and whether playback is on demand or live, before drawing anything.",
          hint: "Uploads a day, peak concurrent streams, phones on weak networks, and on demand versus live change the design.",
        },
        {
          id: "estimate",
          prompt: "Estimate storage per day, peak egress, and encoding CPU, then say which one forces the CDN.",
          hint: "500K uploads at 500 MB is 250 TB a day; 5M streams at 2.5 Mbps is 12.5 Tbps; about 8,700 encoding cores.",
        },
        {
          id: "interface",
          prompt: "List the upload calls that allow resuming, and the playback calls that return a playlist and segments.",
          hint: "POST /videos, chunked PUT with Content-Range, HEAD for the resume point, then a master playlist and segments from the CDN.",
        },
        {
          id: "design",
          prompt: "Draw upload, queue, transcoders and storage, then the playback path through metadata and a CDN.",
          hint: "Chunks go straight to object storage; an event queues a job; viewers fetch the playlist, then segments from the edge.",
        },
        {
          id: "deepdive",
          prompt: "Explain how the transcoding job survives a dead worker, and how the player chooses a quality.",
          hint: "750 idempotent tasks with leases; the player takes the best quality under 80% of smoothed throughput and steps up slowly.",
        },
      ],
      checklist: [
        "Splits the design into upload and processing versus playback",
        "Uploads directly to object storage in resumable chunks",
        "Breaks transcoding into many small idempotent segment tasks",
        "Explains adaptive bitrate with segments, a ladder and a safety margin",
        "Does the egress arithmetic and concludes a CDN is required",
        "Caches immutable segments for long and playlists briefly",
        "Handles a crashed worker, a corrupt source and a cold hot video",
        "Counts views asynchronously, off the playback path",
      ],
    },
  },
  "file-storage": {
    detail: [
      "capacity-estimate",
      "api",
      "data-model",
      "telling-other-devices",
      "how-to-approach-it",
      "step-by-step-answer",
      "implementation",
      "failure-modes",
    ],
    doodle: "replica",
    sayIt: {
      answer:
        "I'd keep bytes and metadata apart. Files are cut into 4 MiB chunks named by SHA-256 and stored once in object storage; the client asks which hashes are new and uploads only those. A sharded SQL service stores each file as a revision plus chunk list, commits against a base revision, and appends to a per-user journal that devices read with a cursor.",
      numbers: [
        { value: "0.4%", label: "of a 1 GiB file uploaded for one edit" },
        { value: "~47.7B chunks", label: "for 200 PB at 4 MiB" },
        { value: "~5,800/s", label: "file changes from 50M daily users" },
      ],
      tradeoffs: [
        "Fixed vs content-defined chunks: fixed is trivial, but one inserted byte shifts every chunk; content-defined keeps most hashes at a CPU cost.",
        "Conflicted copies vs last write wins: nobody loses work, but the user must merge by hand.",
        "Cross-user dedupe vs privacy: large storage savings, but it can reveal that someone else holds the same file.",
      ],
      mention:
        "Garbage collection racing a commit: use reference counts and a grace period so a chunk an in-flight commit needs is never deleted.",
    },
    explain: {
      steps: [
        {
          id: "clarify",
          prompt: "Ask about scale, file sizes, how conflicts should behave, version history, and sharing, before drawing.",
          hint: "Two people editing one file decides the conflict story; version history and sharing change the metadata model.",
        },
        {
          id: "estimate",
          prompt: "Work out total storage, the number of chunks, change rate, and the upload cost of a small edit.",
          hint: "200 PB at 4 MiB is about 47.7 billion chunks; one edit in a 1 GiB file is 1 of 256 chunks, 0.4%.",
        },
        {
          id: "interface",
          prompt: "List the calls to check unknown chunks, upload a chunk, commit a file, and fetch changes since a cursor.",
          hint: "POST /chunks/unknown, PUT /chunks/:hash, POST /files/commit with baseRev, GET /changes?cursor=.",
        },
        {
          id: "design",
          prompt: "Separate bytes from metadata, and say how a change reaches a user's other devices.",
          hint: "Block store by hash, sharded SQL by user, a journal, and a notifier that sends a poke while devices pull.",
        },
        {
          id: "deepdive",
          prompt: "Explain chunking and dedupe, then what happens when two offline devices edit the same file.",
          hint: "Content-defined chunks keep hashes after an insert; a stale base revision is refused and saved as a conflicted copy.",
        },
      ],
      checklist: [
        "Separates large immutable bytes from small transactional metadata",
        "Names chunks by content hash and uploads only unknown ones",
        "Explains why content-defined chunking beats fixed chunks on inserts",
        "Commits with a base revision and handles the conflict",
        "Uses a per-user journal and cursor instead of timestamps",
        "Notifies devices with a small poke, then has them pull",
        "Covers garbage collection with reference counts and a grace period",
        "Does the storage and chunk-count arithmetic",
      ],
    },
  },
  "key-value-store": {
    detail: [
      "capacity-estimate",
      "api",
      "data-model",
      "how-to-approach-it",
      "step-by-step-answer",
      "implementation",
      "failure-modes",
    ],
    doodle: "consistent-hash",
    sayIt: {
      answer:
        "I'd build it Dynamo-style. Keys and nodes are hashed onto a ring with 128 virtual nodes each, and every key lives on the next three distinct nodes. Any node coordinates: a write waits for W = 2 acks, a read asks R = 2, so R + W above N gives read-your-latest. Vector clocks keep conflicting writes as siblings, and hinted handoff, read repair and Merkle trees repair drift.",
      numbers: [
        { value: "~44K ops/s", label: "per node across 50 nodes" },
        { value: "~2%", label: "of keys move when a 51st node joins" },
        { value: "R + W > N", label: "quorum rule: 2 + 2 > 3" },
      ],
      tradeoffs: [
        "Leaderless vs leader per shard: always writable with no failover, but concurrent writes create conflicts to resolve.",
        "Vector clocks vs last-write-wins: no lost updates, but clients must merge siblings; LWW is simple but clock skew drops writes.",
        "Sloppy quorum vs strict: higher availability during failures, but a read can miss a very recent write.",
      ],
      mention:
        "Tombstones: a delete must replicate as a record and be kept past the repair interval, or anti-entropy resurrects the deleted value.",
    },
    explain: {
      steps: [
        {
          id: "clarify",
          prompt: "Ask whether the store should favour consistency or availability, how big values and data are, and how conflicts are handled.",
          hint: "If a node is down, must a read fail or may it be a little stale? That choice picks the whole design.",
        },
        {
          id: "estimate",
          prompt: "Size the cluster from data volume and replication, then compute operations per node at peak.",
          hint: "100 TB with 3 copies is 300 TB; at 6 TB per node that is 50 nodes, about 44K replica operations per node.",
        },
        {
          id: "interface",
          prompt: "Define put, get and delete, and say what the context returned by get is for.",
          hint: "The context is the vector clock: sending it back on put says which versions you have seen.",
        },
        {
          id: "design",
          prompt: "Explain how a key finds its replicas and how a node knows the ring without a leader.",
          hint: "Consistent hashing with virtual nodes, a preference list of three distinct nodes, and gossip for membership.",
        },
        {
          id: "deepdive",
          prompt: "Choose N, W and R, and explain how the store handles a partition that lets both sides accept writes.",
          hint: "R + W above N for overlap; vector clocks detect concurrent writes and return siblings to merge.",
        },
      ],
      checklist: [
        "Uses consistent hashing with virtual nodes and explains why",
        "States N, W and R and the R + W greater than N rule",
        "Explains how any node can coordinate without a leader",
        "Detects concurrent writes with vector clocks and explains siblings",
        "Names read repair, hinted handoff and Merkle-tree anti-entropy",
        "Uses gossip for membership and failure detection",
        "Covers tombstones and the cost of last-write-wins",
        "Does the node-count and per-node load arithmetic",
      ],
    },
  },
  "unique-id-generator": {
    detail: [
      "capacity-estimate",
      "api",
      "data-model",
      "how-to-approach-it",
      "step-by-step-answer",
      "implementation",
      "failure-modes",
    ],
    doodle: "index",
    sayIt: {
      answer:
        "I'd use Snowflake-style 64-bit ids: 41 bits of milliseconds since a custom epoch, 10 bits of worker id and 12 bits of sequence. Each server makes ids locally, 4,096 per millisecond, so ids are unique and roughly time-ordered with no network call. Worker ids are leased with a TTL, and the generator refuses to issue ids if the clock steps back.",
      numbers: [
        { value: "69.7 years", label: "of time in 41 bits" },
        { value: "4,096 / ms", label: "ids per worker from 12 bits" },
        { value: "1,024", label: "workers from 10 bits" },
      ],
      tradeoffs: [
        "Snowflake vs UUID v4: 64 bits, local and time-ordered, but needs worker ids and sane clocks; UUID needs neither and is 128 random bits.",
        "Ticket server vs Snowflake: strictly ordered and simple, but a shared database and a round trip, or a block with gaps.",
        "Wait vs refuse on clock skew: small backward steps are waited out, but a large step must fail loudly to avoid duplicates.",
      ],
      mention:
        "Clock going backwards: refuse to issue ids on a big step and fail over, because a duplicate primary key is worse than a short error.",
    },
    explain: {
      steps: [
        {
          id: "clarify",
          prompt: "Ask about id size, whether ids must sort by time, how many per second, and how strict uniqueness must be.",
          hint: "64 bits and time order decide between Snowflake and UUID; strictness separates ids from gapless invoice numbers.",
        },
        {
          id: "estimate",
          prompt: "Compare the demand per server with one worker's capacity, and work out how long 41 bits of time lasts.",
          hint: "5K ids a second against 4.096M; 2^41 milliseconds is 69.7 years from the epoch.",
        },
        {
          id: "interface",
          prompt: "Say how services get ids, and what format they cross JSON in, and why.",
          hint: "A library call nextId(), or POST /v1/ids; ids are strings because JavaScript numbers lose precision above 2^53.",
        },
        {
          id: "design",
          prompt: "Lay out the 64 bits and say where worker ids come from.",
          hint: "1 sign, 41 time, 10 worker, 12 sequence; worker ids are leased from etcd or ZooKeeper with a TTL.",
        },
        {
          id: "deepdive",
          prompt: "Explain what happens when the clock moves backwards and when the sequence overflows.",
          hint: "Wait out small backward steps, refuse and alert on big ones; at 4,096 ids in a millisecond, wait for the next one.",
        },
      ],
      checklist: [
        "Gives the bit layout with the capacity of each field",
        "Generates ids locally without a network call",
        "Explains clock skew and chooses wait versus refuse",
        "Assigns worker ids with leases and a stop margin",
        "Notes ids are only roughly ordered across servers",
        "Compares UUID v4, UUID v7, ticket servers and Snowflake",
        "Mentions index locality as a reason for time-ordered keys",
        "Returns ids as strings to protect JavaScript clients",
      ],
    },
  },
  "collaborative-editor": {
    detail: [
      "capacity-estimate",
      "api",
      "data-model",
      "presence-and-cursors",
      "storage-and-history",
      "how-to-approach-it",
      "step-by-step-answer",
      "implementation",
      "failure-modes",
    ],
    doodle: "websocket",
    sayIt: {
      answer:
        "I'd show each edit locally at once and send it, with the revision it was based on, to a session server that owns the document. The server transforms it past edits the sender missed (operational transformation), appends it to an operation log, assigns the next revision and broadcasts it. Snapshots every few hundred edits make recovery fast. A CRDT is the alternative for offline-first.",
      numbers: [
        { value: "2M ops/s", label: "from 1M concurrent editors" },
        { value: "~100-200 ms", label: "for others to see an edit" },
        { value: "~500 ops", label: "worst-case replay after a crash" },
      ],
      tradeoffs: [
        "OT vs CRDT: OT is compact with a central server but subtle to get right; CRDTs work offline and peer-to-peer but carry ids and tombstones.",
        "Local echo vs wait for ack: typing feels instant, but edits must be transformed and reconciled when the server answers.",
        "One server per document vs sharing a document: a single order is simple, but one hot document is bounded by one machine.",
      ],
      mention:
        "Unacknowledged edits after a crash: clients resend by operation id, and the server ignores repeats, so nothing is lost or applied twice.",
    },
    explain: {
      steps: [
        {
          id: "clarify",
          prompt: "Ask how many people edit one document, whether text is rich, whether offline work matters, and if a central server is acceptable.",
          hint: "Editors per document, rich text, offline, and whether a server may order edits all steer OT versus CRDT.",
        },
        {
          id: "estimate",
          prompt: "Estimate edits per second, active documents, session servers, and daily operation log size.",
          hint: "1M editors at 2 ops/s is 2M ops/s; about 333K active documents; roughly 67 session servers; about 3.6 TB of log a day.",
        },
        {
          id: "interface",
          prompt: "List the WebSocket messages for joining, sending an edit, acknowledging it, and receiving others' edits.",
          hint: "join with lastRev, op with opId and baseRev, ack with rev, remote with rev and op; cursors are not stored.",
        },
        {
          id: "design",
          prompt: "Explain why one server owns a document, and where edits, snapshots and cursors are stored.",
          hint: "A router hashes the document id; the session server orders edits, appends to a log, snapshots, and sends cursors over a light channel.",
        },
        {
          id: "deepdive",
          prompt: "Walk through two people editing 'cat' at once, using OT, then contrast it with a CRDT.",
          hint: "Transform the later edit past the earlier one; a CRDT gives characters ids so edits merge, at the cost of tombstones.",
        },
      ],
      checklist: [
        "Applies edits locally first and reconciles afterwards",
        "Routes each document to one session server for a single order",
        "Tags edits with a base revision and transforms them on the server",
        "Explains the concurrent-edit example concretely",
        "Compares OT and CRDT with real trade-offs",
        "Treats the operation log as truth, with snapshots",
        "Recovers from a crash and dedupes retries by operation id",
        "Keeps presence and cursors out of durable storage",
      ],
    },
  },
  "proximity-service": {
    detail: [
      "capacity-estimate",
      "api",
      "data-model",
      "how-to-approach-it",
      "step-by-step-answer",
      "implementation",
      "failure-modes",
    ],
    doodle: "tree",
    sayIt: {
      answer:
        "Places barely move and reads dominate, so I'd build a geo index and replicate it. A geohash column makes near-me an indexed prefix query: pick the longest hash whose cells are at least the radius, scan the at most 9 cells covering the circle, then filter by exact distance. For uneven density I'd use an in-memory quadtree, about 2 GB, a full copy per search server.",
      numbers: [
        { value: "~17K/s", label: "peak searches from 100M daily users" },
        { value: "≤ 9 cells", label: "cover any circle at the right precision" },
        { value: "~1.9 GB", label: "quadtree for 200M businesses" },
      ],
      tradeoffs: [
        "Geohash vs quadtree: geohash is one simple SQL column but cells are uneven; a quadtree adapts to density but needs a service.",
        "Replicate vs shard the index: full copies keep servers independent and easy to recover, but cost memory each; sharding adds routing.",
        "Change feed vs nightly rebuild: a feed shows new listings in minutes, but nightly rebuilds alone are simpler and a day stale.",
      ],
      mention:
        "Cell edges: a place just across a boundary can be nearer than most in your own cell, so always read the covering cells, not just yours.",
    },
    explain: {
      steps: [
        {
          id: "clarify",
          prompt: "Ask whether places move, the range of radii, how fresh edits must be, and how results are ordered.",
          hint: "Static businesses allow precomputed indexes; moving objects need the ride-sharing design instead.",
        },
        {
          id: "estimate",
          prompt: "Compute search QPS, the size of the businesses table, and the memory of the geo index.",
          hint: "100M users at 5 searches is about 5.8K/s, 17K at peak; a quadtree for 200M places is about 2 GB.",
        },
        {
          id: "interface",
          prompt: "Define the nearby search call with its paging, and the business details and owner calls.",
          hint: "GET /search/nearby with lat, lon, radius and a cursor; GET /businesses/:id; owners POST, PUT and DELETE.",
        },
        {
          id: "design",
          prompt: "Separate the read path from the write path, and say where the geo index and details live.",
          hint: "Stateless search servers with an in-memory index plus a details cache; writes go to a database and a change feed.",
        },
        {
          id: "deepdive",
          prompt: "Explain how geohash picks cells for a radius, and why you might switch to a quadtree.",
          hint: "Longest hash whose cells are at least the radius gives 9 cells; uneven density makes fixed cells hold thousands.",
        },
      ],
      checklist: [
        "Recognises the workload is read heavy and the data mostly static",
        "Explains geohash prefixes and picks precision from the radius",
        "Covers the circle with at most 9 cells, then checks exact distance",
        "Explains the density problem and how a quadtree splits",
        "Does the index memory arithmetic and replicates instead of sharding",
        "Separates search, details cache and the database",
        "Updates the index through a change feed plus nightly rebuilds",
        "Pages results with a cursor rather than an offset",
      ],
    },
  },
  "distributed-cache": {
    detail: [
      "capacity-estimate",
      "api",
      "data-model",
      "how-to-approach-it",
      "step-by-step-answer",
      "implementation",
      "failure-modes",
    ],
    doodle: "cache",
    sayIt: {
      answer:
        "Traffic is 1M reads a second against a database that does 20K, so the cache must hit 98%. I'd shard about 12 in-memory nodes with rendezvous hashing in the client library, so a lost node moves only its 8% of keys. Each node is an LRU with jittered TTLs. I'd guard the database with single flight, serve hot keys from a local copy, and delete on write.",
      numbers: [
        { value: "98%", label: "required hit ratio: 1M reads, 20K database" },
        { value: "12 nodes", label: "throughput-bound at about 83K ops/s each" },
        { value: "~8%", label: "of keys miss when one node dies" },
      ],
      tradeoffs: [
        "Client-side vs proxy routing: one hop and nothing central, but every client needs the node list; a proxy keeps clients thin but adds a hop.",
        "Cache-aside vs write-through: aside is simple and losing the cache is harmless; write-through keeps data fresh but slows writes.",
        "Replicating cache nodes vs not: replicas survive a loss, but double memory; usually protect the database instead.",
      ],
      mention:
        "A node loss sends about 80K extra reads a second to a database that handles 20K, so protect the load path with single flight and a rate limit.",
    },
    explain: {
      steps: [
        {
          id: "clarify",
          prompt: "Ask what the cache protects, how stale data may be, whether there are hot keys, and whether anything is only in the cache.",
          hint: "The database's read limit sets the hit ratio you need; data that cannot be rebuilt does not belong in a plain cache.",
        },
        {
          id: "estimate",
          prompt: "Work out the required hit ratio, working-set memory, node count by memory and by throughput, and the effect of losing a node.",
          hint: "98% hit ratio; 130 GB; 6 nodes by memory but 12 by throughput; one node lost is 8.3% of keys.",
        },
        {
          id: "interface",
          prompt: "Describe the client library calls, including a read-through helper that loads on a miss.",
          hint: "get, set with TTL, delete, getOrLoad, and mget for batches.",
        },
        {
          id: "design",
          prompt: "Say how a key finds its node, how nodes learn who is healthy, and what happens on a miss.",
          hint: "Rendezvous hashing in the client, a node-list service, and a cache-aside load with a database fallback.",
        },
        {
          id: "deepdive",
          prompt: "Explain stampedes, hot keys and stale fills, and a fix for each.",
          hint: "Single flight and jittered TTLs; local copies of hot keys; delete on write plus a delayed second delete or versions.",
        },
      ],
      checklist: [
        "Derives the 98 percent hit ratio from database capacity",
        "Chooses hashing that survives adding or losing nodes",
        "Explains LRU eviction counted in bytes and TTL with jitter",
        "Uses single flight to stop stampedes on expiry",
        "Handles hot keys with short-lived local copies",
        "Describes the stale-fill race and a fix",
        "Protects the database when a cache node dies",
        "Does the node count by memory and by throughput",
      ],
    },
  },
  "metrics-monitoring": {
    detail: [
      "capacity-estimate",
      "api",
      "data-model",
      "how-to-approach-it",
      "step-by-step-answer",
      "implementation",
      "failure-modes",
    ],
    doodle: "monitoring",
    sayIt: {
      answer:
        "100K hosts times 100 metrics is 10M series, so 1M samples a second. Agents batch and push through Kafka, which absorbs bursts, into a time-series database with an in-memory head and a write-ahead log, flushed to compressed blocks: about 1.4 bytes a sample against 16. Rollups keep min, max, sum and count for long retention, and alerts are state machines with a for-duration.",
      numbers: [
        { value: "1M samples/s", label: "from 10M series every 10 seconds" },
        { value: "~118 GB/day", label: "compressed, against 1.38 TB raw" },
        { value: "~10.6 TB", label: "for 15 days raw plus two years of rollups" },
      ],
      tradeoffs: [
        "Push vs pull: push suits short-lived jobs and NAT, but the backend must protect itself; pull gives control but needs service discovery.",
        "Rollups vs raw: years of history for a fraction of the space, but raw detail is lost and percentiles need histograms.",
        "Long vs short for-duration: fewer false pages, but slower detection of real problems.",
      ],
      mention:
        "Label cardinality: a label like user_id multiplies series by millions, so enforce per-team series quotas and reject unbounded label values.",
    },
    explain: {
      steps: [
        {
          id: "clarify",
          prompt: "Ask about push versus pull, resolution and retention, the number of distinct label combinations, and who must be paged how fast.",
          hint: "Cardinality sets the cost; resolution and retention set storage; alert speed sets the for-durations.",
        },
        {
          id: "estimate",
          prompt: "Compute series, samples per second, raw and compressed storage per day, and storage for the retention tiers.",
          hint: "10M series is 1M samples a second; 1.38 TB a day raw, about 118 GB compressed; about 10.6 TB with rollups.",
        },
        {
          id: "interface",
          prompt: "Describe the write call, the range query, and how an alert rule is defined.",
          hint: "POST /v1/write batches, GET /v1/query_range with step, PUT /v1/rules with query, threshold and for-duration.",
        },
        {
          id: "design",
          prompt: "Walk from agent to dashboard: the ingest path, storage layout, rollups and where alerts run.",
          hint: "Agents, gateway, Kafka, writers, head with a write-ahead log, compressed blocks, a rollup job and an evaluator.",
        },
        {
          id: "deepdive",
          prompt: "Explain why time-series data compresses, how percentiles survive rollups, and how alerts avoid noise.",
          hint: "Delta-of-delta timestamps and XOR values; histograms add exactly; a pending state with a for-duration and grouped pages.",
        },
      ],
      checklist: [
        "Derives series and samples per second from hosts and metrics",
        "Uses a queue between ingestion and storage to absorb bursts",
        "Explains head block, write-ahead log and immutable compressed blocks",
        "Explains delta-of-delta and XOR compression",
        "Keeps min, max, sum and count in rollups, and histograms for percentiles",
        "Controls label cardinality with quotas",
        "Models alerts as pending then firing with a for-duration, grouping and silences",
        "Monitors the monitor with a canary and separate infrastructure",
      ],
    },
  },
  // @@next@@
};
