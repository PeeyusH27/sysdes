import type { Short } from "./types";

// Standalone shorts on the building blocks interviewers expect you to know by name. They don't summarise a lesson,
// so `source` is the closest related section when one exists. Grouped: data structures and storage, then
// distributed systems, then networking, APIs, security, data processing and operations.
export const shorts: Short[] = [
  {
    id: "bloom-filter",
    track: "Building blocks",
    topic: "Bloom filter",
    title: "A Bloom filter answers \"definitely not\" in a few bytes per item",
    hook: "Checking whether a key exists is expensive when the answer lives on disk or across the network. Most of the time the answer is no.",
    points: [
      "A **bit array** of m bits plus k hash functions. Adding a key sets the k bits its hashes point to.",
      "To check a key, read its k bits. Any bit is 0: **definitely not present**. All are 1: **maybe present**.",
      "No false negatives, ever. False positives happen when other keys happened to set all k bits.",
      "About **9.6 bits per item** gives a 1% false-positive rate, whatever the size of the keys.",
    ],
    more: [
      {
        title: "Where it's used",
        points: [
          "**Cache penetration**: keep a filter of real ids so lookups for ids that don't exist never reach the database.",
          "**LSM-tree stores** (Cassandra, RocksDB, HBase) keep one per file to skip disk reads for keys it can't contain.",
          "**CDNs** use one to skip caching one-hit wonders: an object is cached only on its second request.",
        ],
      },
      {
        title: "Watch out",
        points: [
          "You **can't delete** from a plain Bloom filter: clearing a bit may remove other keys. A counting Bloom filter can.",
          "It doesn't grow. Size it for the final item count, or the false-positive rate climbs as it fills.",
          "1% at 1M items is about **1.2 MB** with 7 hashes; 0.1% needs about 14.4 bits per item and 10 hashes.",
        ],
      },
    ],
    code: `// m bits and k hash functions for n items at false-positive rate p
function bloomSize(n, p) {
  const m = Math.ceil((-n * Math.log(p)) / Math.LN2 ** 2);
  const k = Math.round((m / n) * Math.LN2);
  return { m, k };
}

bloomSize(1e6, 0.01); // { m: 9585059, k: 7 }, about 1.2 MB`,
    say: "I'd put a Bloom filter of real ids in front of the cache: a miss in the filter means the id definitely doesn't exist, so the request never reaches the database. About 10 bits per id gives 1% false positives.",
    source: "/deep-dives/caching-techniques#bloom-filter-against-penetration",
  },
  {
    id: "hyperloglog",
    track: "Building blocks",
    topic: "HyperLogLog",
    title: "Count a billion unique visitors in 12 KB of memory",
    hook: "An exact distinct count has to remember every id it has seen. A dashboard only needs to be within a percent or so.",
    points: [
      "Hash every item. About 1 in 2^k hashes starts with k zero bits, so the **longest run of leading zeros** hints at how many items you've seen.",
      "One run is noisy, so the first bits of each hash pick one of **m registers**. Each keeps its longest run, and a harmonic mean combines them.",
      "A repeat hashes to the same value and changes nothing, so it counts **distinct** items, not events.",
      "In Redis, `PFADD` adds items and `PFCOUNT` estimates. A key takes at most **12 KB**, with a standard error of about **0.81%**.",
      "Registers merge by taking the max, so daily counts roll up into a weekly one: `PFMERGE`, or `PFCOUNT` on several keys.",
    ],
    more: [
      {
        title: "Why not a Set",
        points: [
          "An exact Set of 100M 16-byte ids is at least **1.6 GB** before any overhead, and you'd need one per page per day.",
          "A HyperLogLog stays at 12 KB however many items you add, and Redis stores small ones in a sparse, smaller encoding.",
        ],
      },
      {
        title: "Numbers to know",
        points: [
          "Standard error is **1.04 / √m**, so 4× the registers halves the error.",
          "At 1M uniques, 0.81% is a typical error of about ±8,000; at 1B, about ±8 million. Fine for a dashboard, not for billing.",
        ],
      },
      {
        title: "Watch out",
        points: [
          "It can't list members or tell you whether one user was counted. Use a Set or a Bloom filter for that.",
          "You **can't remove** an item, and intersections worked out by inclusion-exclusion are badly off when the overlap is small.",
        ],
      },
    ],
    code: `// Redis HyperLogLog: 2^14 registers of 6 bits each
const m = 2 ** 14;                    // 16384 registers
const bytes = (m * 6) / 8;            // 12288 bytes = 12 KB
const stdError = 1.04 / Math.sqrt(m); // 0.008125, about 0.81%`,
    say: "For unique visitors I'd keep a HyperLogLog per page per day: PFADD on each view, PFCOUNT to read. It's 12 KB per key with about 0.8% error, and PFMERGE rolls days up into weeks.",
    source: "/dsa/patterns/hashing#interview-questions",
  },
  {
    id: "count-min-sketch",
    track: "Building blocks",
    topic: "Count-min sketch",
    title: "Find trending hashtags without a counter for every hashtag",
    hook: "A firehose of events has too many distinct keys to count each one exactly, and you only care about the biggest ones.",
    points: [
      "Keep a grid of **d rows × w counters**, each row with its own hash function. Adding a key bumps one counter in every row.",
      "To estimate a key's count, read its d counters and take the **minimum**: the row where it collided least.",
      "Collisions only ever add, so it **never underestimates**. It can overestimate, by a small share of the whole stream.",
      "Memory is fixed by d and w, however many distinct keys show up.",
      "For **top-k**, pair it with a size-k **min-heap**: when a key's new estimate beats the heap's smallest, it takes that place.",
    ],
    more: [
      {
        title: "Sizing",
        points: [
          "With w = ⌈e/ε⌉ and d = ⌈ln(1/δ)⌉, an estimate is at most **εN** too high (N = all events) with probability 1 − δ.",
          "ε = 0.1% and δ = 1% gives 5 rows × 2,719 counters: about **54 KB** of 32-bit counters, for any number of keys.",
          "The error is a share of N, so **heavy hitters** come out accurate and rare keys are mostly noise.",
        ],
      },
      {
        title: "In practice",
        points: [
          "Trending means recent: keep one sketch per minute and sum the last few, or old hits drown out new ones.",
          "Sketches with the same shape and hashes **add cell by cell**, so per-server or per-minute sketches merge.",
          "A key already in the heap just gets its count updated: keep a map from key to heap entry to find it.",
          "**Conservative update** cuts overcounting: raise each of the key's counters only up to its new estimate, not all by one.",
          "It's for ranking and spotting hot keys. Never use it where an overcount costs someone money.",
        ],
      },
    ],
    code: `const d = 5, w = 2719; // ε = 0.1%, δ = 1%: about 54 KB
const rows = Array.from({ length: d }, () => new Uint32Array(w));
function slot(key, row) { // FNV-1a, seeded differently per row
  let h = 2166136261 ^ row;
  for (const c of key) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0) % w;
}
const add = (key) => rows.forEach((r, i) => r[slot(key, i)]++);
const estimate = (key) =>
  Math.min(...rows.map((r, i) => r[slot(key, i)]));`,
    say: "For trending hashtags I'd feed events into a count-min sketch per minute and keep a min-heap of the top k estimates. It never undercounts, and its error is a small share of all traffic, so the top tags come out accurate.",
    source: "/dsa/patterns/heaps#template-2-top-k-with-a-heap-of-size-k",
  },
  {
    id: "skip-list",
    track: "Building blocks",
    topic: "Skip list",
    title: "Coin flips give a skip list O(log n) search with no rebalancing",
    hook: "Redis sorted sets, behind leaderboards and delay queues, use a skip list instead of a balanced tree, and the reasons are worth knowing.",
    points: [
      "A sorted linked list plus **express lanes**: each level up links roughly half the nodes of the level below.",
      "Search starts in the top lane: move right while the next key is smaller, otherwise **drop down** a level.",
      "A new node's height is random: flip a coin until tails, one level per heads. That keeps search and insert at **expected O(log n)**.",
      "Insert only rewires the pointers next to the new node: no rotations, unlike a red-black or AVL tree.",
      "**Range queries** are cheap: find the start in O(log n), then walk the bottom level for the next k items.",
    ],
    more: [
      {
        title: "Why Redis uses one",
        points: [
          "A sorted set pairs a **hash map** (member to score, O(1) `ZSCORE`) with a skip list ordered by score.",
          "Each link records how many nodes it skips, so `ZRANK` and ranges by rank are O(log n) too.",
          "Small sorted sets (by default up to 128 short members) use a compact flat list instead; bigger ones switch to the skip list.",
          "Its author's reasons: simpler code than a balanced tree, cheap range walks, and fewer pointers per node.",
        ],
      },
      {
        title: "Numbers to know",
        points: [
          "Promoting with p = 1/2 means **2 pointers** per node on average. Redis uses p = 1/4: about 1.33, with similar search cost.",
          "The bounds are **expected**, not worst case. A long run of unlucky flips could slow it, but that's vanishingly unlikely.",
        ],
      },
      {
        title: "Where else",
        points: [
          "**LevelDB and RocksDB** use a skip list for the in-memory memtable of their LSM trees.",
          "Skip lists are easier to make lock-free than balanced trees: Java's `ConcurrentSkipListMap` is one.",
        ],
      },
    ],
    code: `// Start in the top lane: go right while the next key is smaller,
// otherwise drop down a level. Level 0 holds every node.
function find(head, key) {
  let x = head;
  for (let lvl = head.next.length - 1; lvl >= 0; lvl--)
    while (x.next[lvl] && x.next[lvl].key < key) x = x.next[lvl];
  x = x.next[0];
  return x && x.key === key ? x : null;
}`,
    say: "For a leaderboard I'd use a Redis sorted set: a hash map for member lookups plus a skip list ordered by score. ZADD and ZRANK are O(log n), and reading the top 10 is O(log n + 10).",
  },
  {
    id: "lsm-tree-vs-b-tree",
    track: "Building blocks",
    topic: "LSM tree",
    title: "LSM trees buy fast writes with slower reads; B-trees do the reverse",
    hook: "The storage engine decides whether a database shines at ingest or at lookups. It's the real question behind \"Cassandra or Postgres?\"",
    points: [
      "**B-tree**: sorted fixed-size pages, updated in place. A read walks 3–4 levels, even for billions of rows.",
      "**LSM tree**: a write goes to the WAL and an in-memory **memtable**. When that fills, it's flushed as a sorted, immutable SSTable.",
      "Background **compaction** merges SSTables, dropping overwritten values and deleted keys.",
      "A read checks the memtable, then SSTables from newest to oldest. A **Bloom filter** per file skips most that can't hold the key.",
      "LSM suits write-heavy ingest (events, messages, time series); a B-tree suits read-heavy and mixed workloads.",
    ],
    more: [
      {
        title: "Amplification",
        points: [
          "**Write**: a B-tree rewrites a whole page for a small change; an LSM rewrites the same data again at each compaction.",
          "**Read**: an LSM may check several files per lookup; a B-tree follows one path down the tree.",
          "**Space**: an LSM keeps stale versions until compaction; a B-tree leaves pages partly empty after splits.",
          "Levelled compaction favours reads and space; size-tiered favours writes. No engine minimises all three.",
        ],
      },
      {
        title: "Who uses which",
        points: [
          "**B-tree**: Postgres, MySQL InnoDB, SQL Server. **LSM**: Cassandra, RocksDB, ScyllaDB, HBase, LevelDB.",
        ],
      },
      {
        title: "Watch out",
        points: [
          "A delete in an LSM is a write: a **tombstone** hides the key until compaction drops it. Mass deletes slow reads.",
          "Compaction competes with live traffic for disk I/O. When it falls behind, files pile up and reads slow down.",
        ],
      },
    ],
    say: "For a write-heavy event store I'd pick an LSM engine like Cassandra: writes are sequential appends and compaction runs in the background. For read-heavy transactional data, Postgres's B-tree gives predictable reads.",
    source: "/learn/databases-scaling#how-storage-engines-work",
  },
  {
    id: "write-ahead-log",
    track: "Building blocks",
    topic: "Write-ahead log",
    title: "Log the change before touching the data, and a crash can't lose it",
    hook: "Updating data pages in place is slow and random, and a crash halfway through would leave them half-written. Logging first fixes both.",
    points: [
      "Every change is **appended** to a sequential log and flushed with `fsync` before the commit is acknowledged.",
      "The data pages change in memory and reach disk later, in the background. A **checkpoint** marks how far they've caught up.",
      "After a crash, the database **replays** the log from the last checkpoint to redo the changes the pages missed.",
      "Appends are sequential, so one log flush costs far less than writing every changed page at commit time.",
      "**Group commit**: one `fsync` covers many concurrent transactions, so throughput isn't capped by fsync latency.",
    ],
    more: [
      {
        title: "One log, many uses",
        points: [
          "**Replication**: Postgres replicas replay the primary's WAL as it streams in.",
          "**CDC**: Debezium reads the log (Postgres WAL, MySQL binlog) and publishes every committed change.",
          "**Point-in-time recovery**: a base backup plus the archived WAL restores the database to any moment.",
          "The same idea runs LSM stores, Kafka partitions and Raft: an ordered, append-only log that can be replayed.",
        ],
      },
      {
        title: "Watch out",
        points: [
          "Postgres `synchronous_commit = off` acknowledges before the flush: faster, but a crash can lose the last few commits.",
          "Records carry **checksums**, so recovery stops cleanly at a record the crash only half wrote.",
          "Checkpoints let old log segments be recycled or archived. Without them the log grows and recovery takes longer.",
        ],
      },
    ],
    code: `import fs from "node:fs";
const fd = fs.openSync("wal.log", "a");
function commit(change) {
  fs.writeSync(fd, JSON.stringify(change) + "\\n");
  fs.fsyncSync(fd); // on disk now: safe to acknowledge
  apply(change);    // update the table in memory; pages flush later
}
// After a crash, rebuild the state by replaying the log in order
const recover = () => fs.readFileSync("wal.log", "utf8").split("\\n")
  .filter(Boolean).forEach((line) => apply(JSON.parse(line)));`,
    say: "Durability comes from the write-ahead log: a commit is acknowledged only once its log record is fsynced. Pages are written lazily, recovery replays the log, and the same log feeds replicas and CDC.",
    source: "/learn/databases-scaling#backups-and-point-in-time-recovery",
  },
  {
    id: "mvcc-snapshot-isolation",
    track: "Building blocks",
    topic: "MVCC",
    title: "Readers don't block writers when every row keeps its old versions",
    hook: "With one copy of each row, a long report would either lock out writers or read half-finished changes. Keeping versions avoids both.",
    points: [
      "An update writes a **new version** of the row and ends the old one. Each version records the transactions that created and ended it.",
      "Each transaction reads a **snapshot**: only the versions committed when it started, whatever commits later.",
      "So reads never block writes and writes never block reads. Only two writers to the **same row** wait for each other.",
      "Old versions pile up. Postgres's **VACUUM** removes the ones no running transaction can still see.",
      "This is **snapshot isolation**: no dirty or non-repeatable reads, but it still allows **write skew**.",
    ],
    more: [
      {
        title: "Write skew",
        points: [
          "Two transactions read the same snapshot, each changes a **different** row, and neither sees the other's write. Both commit.",
          "Two doctors each see someone else on call and both go off call. No row conflicted, so nothing stopped it.",
          "Fix it with **SERIALIZABLE** (Postgres detects the pattern and aborts one), `SELECT … FOR UPDATE`, or a constraint.",
        ],
      },
      {
        title: "How databases do it",
        points: [
          "Postgres's **repeatable read** is snapshot isolation. At read committed, it takes a fresh snapshot for each statement.",
          "Postgres keeps old versions in the table itself; MySQL InnoDB and Oracle rebuild them from **undo logs**.",
        ],
      },
      {
        title: "Watch out",
        points: [
          "A long-running transaction pins its snapshot, so VACUUM can't clean up behind it and tables **bloat**.",
          "Two writers to the same row still conflict: at repeatable read, Postgres aborts the second with a serialization error.",
        ],
      },
    ],
    code: `// Simplified: your snapshot is the set of transactions committed
// when you started. Txn 12 updated the row: v1 ended, v2 began.
const v1 = { balance: 100, createdBy: 10, deletedBy: 12 };
const v2 = { balance: 50, createdBy: 12, deletedBy: null };
const visible = (v, snap) => snap.has(v.createdBy) &&
  !(v.deletedBy !== null && snap.has(v.deletedBy));

[v1, v2].filter((v) => visible(v, new Set([10]))); // [v1]: 100
[v1, v2].filter((v) => visible(v, new Set([10, 12]))); // [v2]: 50`,
    say: "Postgres uses MVCC, so readers see a snapshot and never block writers. Its repeatable read is snapshot isolation, which still allows write skew, so for invariants across rows I'd use SERIALIZABLE or SELECT … FOR UPDATE.",
    source: "/learn/databases-scaling#transactions-and-isolation-levels",
  },
  {
    id: "inverted-index",
    track: "Building blocks",
    topic: "Inverted index",
    title: "Full-text search is a map from each word to the documents with it",
    hook: "Scanning every document for a word grows with the size of the corpus. An inverted index reads a few short lists instead.",
    points: [
      "For each **term**, keep a **postings list**: the sorted ids of the documents that contain it, often with counts and positions.",
      "Text is **analysed** first: split into tokens, lowercased, often stemmed (\"running\" → \"run\"). Queries go through the same steps.",
      "An AND query **intersects** the postings lists, walking them in step; OR merges them. Start from the shortest list.",
      "Positions make phrase queries work: \"new york\" needs \"york\" one position after \"new\" in the same document.",
      "Hits are ranked by relevance. **BM25** scores a term higher when it's frequent in the document and rare across the corpus.",
    ],
    more: [
      {
        title: "Inside Elasticsearch",
        points: [
          "Elasticsearch, OpenSearch and Solr are built on **Lucene**. Each shard is a Lucene index made of immutable segments.",
          "New documents go into a new segment, and segments merge in the background, much like LSM compaction.",
          "Postings are stored as **gaps** between ids and bit-packed, so long lists compress well.",
          "A delete only marks the document; it's dropped for good when its segment is merged.",
        ],
      },
      {
        title: "Watch out",
        points: [
          "New documents become searchable after a **refresh**, about once a second by default: search is near real time.",
          "Leading wildcards (`*phone`) can't use the sorted term dictionary and have to scan it. Index n-grams instead.",
          "It's a derived store: feed it from the source of truth with CDC or the outbox, never as a second write.",
        ],
      },
      {
        title: "Also in Postgres",
        points: [
          "A **GIN** index on a `tsvector` column is an inverted index too: often enough for search inside one database.",
        ],
      },
    ],
    code: `function intersect(a, b) { // both sorted by document id
  const out = [];
  for (let i = 0, j = 0; i < a.length && j < b.length; ) {
    if (a[i] < b[j]) i++;
    else if (a[i] > b[j]) j++;
    else { out.push(a[i]); i++; j++; }
  }
  return out;
}
intersect([1, 4, 7, 9], [2, 4, 9, 12]); // [4, 9]: has both words`,
    say: "I'd put product search in Elasticsearch, fed from Postgres by CDC. It's an inverted index: each term maps to a sorted list of document ids, AND queries intersect those lists, and BM25 ranks the hits.",
    source: "/deep-dives/choosing-a-data-store#search-and-time-series",
  },
  {
    id: "geohash-quadtree",
    track: "Building blocks",
    topic: "Geohash",
    title: "Nearby drivers: match a geohash prefix, then check the 8 neighbours",
    hook: "A normal index can range over latitude or longitude, but not both at once. Mapping positions to cells turns \"near me\" into a key lookup.",
    points: [
      "A **geohash** halves the world again and again, alternating longitude and latitude, and writes the cell as a base-32 string.",
      "Each extra character shrinks the cell, so a **shared prefix** means the same cell. Six characters is about 1.2 × 0.6 km.",
      "Two points on either side of a cell edge can have very different prefixes, so always search your cell plus its **8 neighbours**.",
      "Then compute real distances on that short list and keep the ones inside the radius.",
      "A **quadtree** splits a square into 4 only where it holds too many points: small cells downtown, one big cell over the desert.",
    ],
    more: [
      {
        title: "Numbers to know",
        points: [
          "At the equator, 5 characters is about 4.9 × 4.9 km, 6 about 1.2 × 0.6 km, and 7 about 153 × 153 m.",
          "Cells get narrower towards the poles, because lines of longitude converge.",
          "Pick the precision whose cell's shorter side is at least the radius, so your cell and its 8 neighbours cover the circle.",
        ],
      },
      {
        title: "Geohash or quadtree",
        points: [
          "Geohashes are plain strings, so any database or cache can index them. Redis's GEO commands keep points in a sorted set scored by geohash.",
          "A quadtree adapts to density, but it's a structure you keep in memory and update as points move.",
          "Google's **S2** maps the sphere onto a cube's faces; Uber's **H3** uses hexagons, whose 6 neighbours are all about equally far.",
        ],
      },
      {
        title: "Watch out",
        points: [
          "Drivers report a position every few seconds: keep live locations in memory (Redis or a quadtree), not in a disk-based table.",
        ],
      },
    ],
    say: "I'd keep live driver positions in Redis GEO, which is geohash-based: a query reads the rider's cell and its 8 neighbours, then filters by exact distance. For very uneven density I'd consider a quadtree or H3.",
  },
  {
    id: "merkle-tree",
    track: "Building blocks",
    topic: "Merkle tree",
    title: "Two replicas find their differences by swapping hashes, not data",
    hook: "Comparing two copies of a huge dataset row by row costs as much as copying it. A hash tree pins down the differences with a few hashes.",
    points: [
      "Hash each block of data (or range of keys). Each parent stores the **hash of its children's hashes**, up to a single root.",
      "Change any block and every hash on its path to the root changes, so the root is a **fingerprint** of everything below it.",
      "Equal roots mean equal data. Different roots: compare the children and **descend only where hashes differ**.",
      "One changed block among a billion takes about 30 levels of comparisons, not a billion.",
    ],
    more: [
      {
        title: "Where it's used",
        points: [
          "**Anti-entropy** in Dynamo-style stores: Cassandra's repair builds trees per token range and streams only the ranges that differ.",
          "**Git** names every commit, directory and file by its hash, so diffs and fetches skip anything whose hash already matches.",
          "**Block sync**: compare chunk hashes top-down and send only the blocks that changed.",
          "**Proofs**: Bitcoin and Certificate Transparency logs prove an item is included with about log₂ n hashes.",
        ],
      },
      {
        title: "Watch out",
        points: [
          "Building the tree means reading all the data. Cassandra builds it during repair, which costs disk I/O and CPU.",
          "Leaves usually cover **ranges** of keys: a smaller tree, but one mismatched key streams its whole range.",
        ],
      },
    ],
    say: "For replicas that drift apart I'd run background anti-entropy with Merkle trees, as Cassandra's repair does: compare roots per key range and stream only the ranges whose hashes differ.",
    source: "/learn/consistency-cap#quorums",
  },
  {
    id: "columnar-storage",
    track: "Building blocks",
    topic: "Columnar storage",
    title: "Store data by column when queries scan a few fields of every row",
    hook: "A row store reads every column of every row it scans. For \"revenue per day\" over a billion rows, most of that I/O is wasted.",
    points: [
      "A **row store** keeps each record together, so one read fetches a whole order. Ideal for OLTP: lookups and updates by key.",
      "A **column store** keeps each column together, so `SUM(total) … GROUP BY day` reads those two columns and skips the rest.",
      "A column holds one type with many repeats, so it **compresses** well: dictionary, run-length and delta encoding.",
      "Engines scan a column in batches with **vectorised** (SIMD) loops instead of one row at a time.",
      "Most formats keep min and max values per block, so a filter skips whole blocks that can't match.",
    ],
    more: [
      {
        title: "Worked example",
        points: [
          "1B rows × 50 columns of 8 bytes: summing one column scans **400 GB** in a row store and 8 GB in a column store, before compression.",
        ],
      },
      {
        title: "Where it's used",
        points: [
          "**Warehouses**: BigQuery, Redshift, Snowflake. **Real-time analytics**: ClickHouse, Apache Druid, Apache Pinot.",
          "**Parquet** and ORC are columnar file formats for data lakes, read by Spark, Trino and DuckDB.",
        ],
      },
      {
        title: "Watch out",
        points: [
          "Fetching one whole record reads from every column. Keep OLTP in a row store and stream changes across with CDC.",
          "Updates and deletes are expensive. Column stores want **append-only** data, inserted in batches of thousands of rows.",
        ],
      },
    ],
    say: "I'd keep analytics off the primary: stream changes by CDC into a columnar store like ClickHouse or BigQuery. Queries read only the columns they need, compressed and scanned in batches, so dashboards never slow checkout.",
    source: "/deep-dives/choosing-a-data-store#search-and-time-series",
  },
  {
    id: "id-generation",
    track: "Building blocks",
    topic: "ID generation",
    title: "Choose ids by how they sort, not only by how unique they are",
    hook: "Ids look trivial until you shard. Then you need ids that are unique without coordination and that don't wreck your index.",
    points: [
      "**Auto-increment** is compact and ordered, but one database hands it out. It breaks with several primaries and reveals your volume.",
      "**UUIDv4** is 122 random bits, unique with no coordination. But random keys land all over a B-tree, splitting pages and missing the cache.",
      "**Time-ordered ids** put the timestamp first, so new keys append at the right edge of the index and sort roughly by creation time.",
      "**UUIDv7**: a 48-bit millisecond timestamp, then random bits, in 128 bits. A standard UUID that indexes like a sequence.",
      "**Snowflake**: 41 bits of milliseconds, 10 of machine id and 12 of sequence in a 64-bit integer: 4,096 ids per ms per machine.",
    ],
    more: [
      {
        title: "Watch out",
        points: [
          "**Clock skew**: if a machine's clock jumps back, a Snowflake generator must wait or refuse, or it can repeat ids.",
          "Machine ids must be unique. Assign them in config, or claim one from a coordinator (ZooKeeper, etcd) at startup.",
          "Time-ordered ids reveal when a row was made, and sequential ones are guessable: never use either as a secret.",
          "64-bit ids exceed JavaScript's safe integers (2^53): send them to browsers as strings.",
        ],
      },
      {
        title: "Trade-offs",
        points: [
          "Across machines, time-ordered ids sort only **roughly**: clocks drift apart, and ids made in the same millisecond tie on time.",
          "Range-sharding on a time-ordered key sends every new write to one shard. Hash the id to pick the shard.",
          "Need short numeric ids? **Range allocation**: each server reserves 1,000 with one `INCRBY` and hands them out locally.",
        ],
      },
    ],
    code: `import { randomBytes } from "node:crypto";
// UUIDv7: a 48-bit Unix time in ms first, then random bits
function uuidv7() {
  const b = randomBytes(16);
  b.writeUIntBE(Date.now(), 0, 6); // timestamp, big-endian
  b[6] = (b[6] & 0x0f) | 0x70;     // version 7
  b[8] = (b[8] & 0x3f) | 0x80;     // variant bits 10
  const h = b.toString("hex");
  return h.replace(/(.{8})(.{4})(.{4})(.{4})/, "$1-$2-$3-$4-");
}`,
    say: "I'd use Snowflake-style 64-bit ids, or UUIDv7 for a standard format: generated on each server without coordination, and time-ordered so inserts stay at the end of the index. Random UUIDv4 keys fragment a B-tree.",
    source: "/deep-dives/sharding-strategies#ids-across-shards",
  },
];
