import type { DecisionSpec, FlowSpec, SequenceSpec, TimelineSpec } from "@/components/diagram/types";

export const primaryReplica: FlowSpec = {
  id: "primary-replica",
  title: "Primary-replica replication",
  description: "All writes go to the primary, which streams its changes to two replicas. Reads are spread across the replicas.",
  nodes: [
    { id: "app", label: "App servers", kind: "service", col: 0, row: 1, sub: "×N" },
    { id: "r1", label: "Replica 1", kind: "database", col: 1, row: 0, sub: "reads" },
    { id: "r2", label: "Replica 2", kind: "database", col: 1, row: 2, sub: "reads" },
    { id: "primary", label: "Primary", kind: "database", col: 2, row: 1, sub: "all writes" },
  ],
  edges: [
    { from: "app", to: "primary", label: "writes" },
    { from: "app", to: "r1", label: "reads" },
    { from: "app", to: "r2", label: "reads" },
    { from: "primary", to: "r1", label: "replicate", style: "replication" },
    { from: "primary", to: "r2", label: "replicate", style: "replication" },
  ],
  scenarios: [
    {
      id: "write",
      name: "Write",
      steps: [
        { edge: "app>primary", caption: "UPDATE users SET bio = … goes to the primary, the only node that accepts writes." },
        {
          edge: "app>primary",
          reverse: true,
          tone: "ok",
          caption: "The primary appends the change to its write-ahead log, commits and acknowledges. With async replication it doesn't wait for the replicas.",
          mark: [{ node: "primary", state: "ok" }],
        },
        {
          edge: "primary>r1",
          caption: "A few milliseconds later the change streams to both replicas, which apply it in the same order.",
          with: [{ edge: "primary>r2", caption: "" }],
        },
        {
          edge: "primary>r1",
          reverse: true,
          tone: "ok",
          caption: "Both replicas have caught up. Every node now holds the same data.",
          with: [{ edge: "primary>r2", reverse: true, tone: "ok", caption: "" }],
          mark: [{ node: "r1", state: "ok" }, { node: "r2", state: "ok" }],
        },
      ],
    },
    {
      id: "read",
      name: "Read from replicas",
      steps: [
        {
          edge: "app>r1",
          caption: "SELECT queries are spread across the replicas, leaving the primary's CPU and I/O for writes.",
          with: [{ edge: "app>r2", caption: "" }],
        },
        {
          edge: "app>r1",
          reverse: true,
          tone: "ok",
          caption: "Each replica answers from its own full copy. Adding a replica adds read capacity, but no write capacity.",
          with: [{ edge: "app>r2", reverse: true, tone: "ok", caption: "" }],
          mark: [{ node: "r1", state: "hit" }, { node: "r2", state: "hit" }],
        },
      ],
    },
    {
      id: "stale-read",
      name: "Stale read + fix",
      steps: [
        { edge: "app>primary", caption: "Alice saves a new bio. The write goes to the primary." },
        { edge: "app>primary", reverse: true, tone: "ok", caption: "Committed. The app shows “Saved”." },
        { edge: "primary>r1", ms: 1800, caption: "Replica 1 is busy and 2 s behind: the change is still on its way.", mark: [{ node: "r1", state: "busy" }] },
        { edge: "app>r1", caption: "Alice reloads her profile, and the read goes to Replica 1…" },
        {
          edge: "app>r1",
          reverse: true,
          tone: "error",
          caption: "…which returns the OLD bio. To Alice it looks as if her save was lost.",
          mark: [{ node: "r1", state: "miss" }],
        },
        { edge: "app>primary", caption: "Fix (read-your-writes): for 5 s after a user writes, send that user's reads to the primary.", mark: [{ node: "r1", state: "busy" }] },
        { edge: "app>primary", reverse: true, tone: "ok", caption: "Alice sees her new bio. Everyone else keeps reading from replicas, where 2 s of staleness is harmless." },
        { edge: "primary>r1", caption: "Replica 1 catches up, and once the 5 s window ends Alice's reads go back to the replicas.", mark: [{ node: "r1", state: "ok" }] },
      ],
    },
    {
      id: "failover",
      name: "Failover",
      steps: [
        { edge: "app>primary", tone: "error", caption: "The primary's host dies. Writes start timing out.", mark: [{ node: "primary", state: "down" }] },
        {
          edge: "app>primary",
          tone: "error",
          caption: "The failover manager (Patroni, RDS, Orchestrator) sees several missed health checks in a row, so this isn't a blip.",
        },
        {
          edge: "app>r1",
          ms: 1800,
          caption: "It promotes Replica 1, the replica furthest ahead, and fences the old primary so it can never accept writes again (no split brain).",
          mark: [{ node: "r1", state: "ok" }],
        },
        { edge: "app>r1", caption: "The app's connection string (a DNS name or a proxy) now points at Replica 1. Writes resume, and Replica 2 starts following the new primary." },
        {
          edge: "app>r1",
          reverse: true,
          tone: "ok",
          ms: 1800,
          caption: "Downtime was tens of seconds. But writes the old primary acknowledged and never shipped are gone: with async replication, data loss (RPO) isn't zero.",
        },
      ],
    },
  ],
};

export const replicaQuiz: FlowSpec = {
  id: "replica-quiz",
  title: "Where does the read replica go?",
  description: "The app writes to the primary and reads from a node that receives the primary's changes.",
  nodes: [
    { id: "client", label: "Client", kind: "client", col: 0, row: 1 },
    { id: "app", label: "App servers", kind: "service", col: 1, row: 1 },
    { id: "primary", label: "Primary", kind: "database", col: 2, row: 0, sub: "writes" },
    { id: "replica", label: "Read replica", kind: "database", col: 2, row: 2, sub: "reads" },
  ],
  edges: [
    { from: "client", to: "app" },
    { from: "app", to: "primary", label: "writes" },
    { from: "app", to: "replica", label: "reads" },
    { from: "primary", to: "replica", label: "replicate", style: "replication" },
  ],
  scenarios: [
    {
      id: "write",
      name: "Write",
      steps: [
        { edge: "client>app", caption: "A user saves a change." },
        { edge: "app>primary", caption: "The write goes to the primary." },
        { edge: "primary>replica", caption: "The primary streams the change to the read replica." },
      ],
    },
    {
      id: "read",
      name: "Read",
      steps: [
        { edge: "client>app", caption: "A user loads a page." },
        { edge: "app>replica", caption: "The read goes to the replica, sparing the primary." },
        { edge: "app>replica", reverse: true, tone: "ok", caption: "Rows come back from the replica's copy." },
      ],
    },
  ],
};

/* ------------------------------------------------------------------ Why it matters */

export const scaleLadder: DecisionSpec = {
  id: "scale-ladder",
  title: "Which scaling move comes next?",
  start: "slow",
  nodes: {
    slow: { q: "Is one query slow, and does EXPLAIN show a Seq Scan on a big table?", yes: "index", no: "hw" },
    index: {
      result: "Add an index",
      why: "Cheapest and biggest win: a scan of millions of rows becomes a seek of a few pages. Build it with CREATE INDEX CONCURRENTLY.",
    },
    hw: { q: "Is the machine out of CPU, memory or disk, with room to buy more?", yes: "big", no: "reads" },
    big: {
      result: "Buy a bigger machine",
      why: "Scaling up is one click and changes no code. It runs out at the largest instance, so use it while it is cheap.",
    },
    reads: { q: "Are most queries reads of the same hot rows?", yes: "cache", no: "writes" },
    cache: {
      result: "Cache, then replicas",
      why: "A cache at a 90% hit ratio removes 90% of reads before they reach the database. Replicas then add read capacity for the rest.",
      href: "/learn/caching",
    },
    writes: { q: "Is one primary out of write capacity or disk (several TB)?", yes: "shard", no: "model" },
    shard: {
      result: "Shard",
      why: "The one-way door. Each shard owns a slice of the data, so writes and storage scale with the number of shards.",
    },
    model: {
      result: "Fix the access pattern",
      why: "Look for N+1 queries, missing batching, hot rows and long transactions before adding machines.",
    },
  },
};

/* ------------------------------------------------------------------ Storage engines */

export const btreeEngine: FlowSpec = {
  id: "btree-engine",
  title: "B-tree: update pages in place",
  description: "A write logs the change, then edits one sorted page on disk. A read walks a few pages from the root to the leaf.",
  nodes: [
    { id: "app", label: "App", kind: "service", col: 0, row: 1 },
    { id: "wal", label: "Write-ahead log", kind: "storage", col: 1, row: 0, sub: "sequential" },
    { id: "pages", label: "B-tree pages", kind: "database", col: 2, row: 1, sub: "sorted, in place" },
  ],
  edges: [
    { from: "app", to: "wal", label: "1 log" },
    { from: "app", to: "pages", label: "2 edit" },
  ],
  scenarios: [
    {
      id: "write",
      name: "Write",
      steps: [
        { edge: "app>wal", caption: "UPDATE users SET bio = ... is first appended to the write-ahead log, so a crash can replay it." },
        { edge: "app>pages", caption: "Then the engine finds the one page that holds the row and edits it in place. That is a random write, not an append." },
        { edge: "app>pages", reverse: true, tone: "ok", caption: "Committed. If the page was full it was split in two, which costs extra writes.", mark: [{ node: "pages", state: "ok" }] },
      ],
    },
    {
      id: "read",
      name: "Read",
      steps: [
        { edge: "app>pages", caption: "SELECT ... WHERE id = 42 walks root, branch, leaf: 3 or 4 pages even for hundreds of millions of rows." },
        { edge: "app>pages", reverse: true, tone: "ok", caption: "One predictable path, so read latency barely changes as the table grows. Range scans follow linked leaves in order.", mark: [{ node: "pages", state: "hit" }] },
      ],
    },
  ],
};

export const lsmEngine: FlowSpec = {
  id: "lsm-engine",
  title: "LSM tree: only append, merge later",
  description: "Writes go to a log and an in-memory table; full tables are flushed as sorted files that background compaction merges.",
  nodes: [
    { id: "app", label: "App", kind: "service", col: 0, row: 1 },
    { id: "wal", label: "Commit log", kind: "storage", col: 1, row: 0, sub: "append" },
    { id: "mem", label: "Memtable", kind: "cache", col: 1, row: 2, sub: "sorted, in RAM" },
    { id: "sst", label: "Sorted files", kind: "storage", col: 2, row: 1, sub: "immutable" },
    { id: "compact", label: "Compaction", kind: "worker", col: 3, row: 1, sub: "background" },
  ],
  edges: [
    { from: "app", to: "wal", label: "1 log" },
    { from: "app", to: "mem", label: "2 insert" },
    { from: "mem", to: "sst", label: "flush" },
    { from: "sst", to: "compact", label: "merge", style: "async" },
  ],
  scenarios: [
    {
      id: "write",
      name: "Fast write",
      steps: [
        { edge: "app>wal", caption: "The write is appended to a commit log: one sequential write, the cheapest I/O a disk does." },
        { edge: "app>mem", caption: "It is also inserted into the in-memory sorted table. No page is edited, so nothing is read first.", mark: [{ node: "mem", state: "hit" }] },
        { edge: "app>mem", reverse: true, tone: "ok", caption: "Acknowledged. Writes cost about the same however big the data is." },
        { edge: "mem>sst", caption: "When the memtable is full it is flushed to disk as one new sorted, immutable file.", mark: [{ node: "mem", state: null }] },
      ],
    },
    {
      id: "read",
      name: "Slower read",
      steps: [
        { edge: "app>mem", tone: "miss", caption: "A read checks the memtable first. The key is not there.", mark: [{ node: "mem", state: "miss" }] },
        { edge: "mem>sst", caption: "Then it checks sorted files, newest first. Each file has a Bloom filter that answers definitely not here without reading it." },
        { edge: "mem>sst", reverse: true, tone: "ok", caption: "The more files pile up, the more a read may touch. This is read amplification, and it is why reads are less predictable." },
      ],
    },
    {
      id: "compaction",
      name: "Compaction",
      steps: [
        { edge: "mem>sst", caption: "Flushes keep adding small files, so the file count and the read cost creep up.", mark: [{ node: "sst", state: "busy" }] },
        { edge: "sst>compact", caption: "Compaction merges files in the background, drops overwritten and deleted keys, and writes bigger sorted files." },
        { edge: "sst>compact", reverse: true, tone: "ok", caption: "Reads get cheaper again. The price is extra disk and CPU work, which can slow foreground traffic if it falls behind.", mark: [{ node: "sst", state: "ok" }] },
      ],
    },
  ],
};

/* ------------------------------------------------------------------ Transactions */

export const writeSkew: SequenceSpec = {
  id: "write-skew",
  title: "Write skew: two doctors go off call",
  description: "Each transaction checks the rule, sees it holds, and updates a different row. Together they break the rule.",
  actors: [
    { id: "alice", label: "Dr. Alice", kind: "client" },
    { id: "bob", label: "Dr. Bob", kind: "client" },
    { id: "db", label: "Database", kind: "database" },
  ],
  items: [
    { from: "alice", to: "db", label: "BEGIN; SELECT count(*) on call" },
    { from: "db", to: "alice", label: "2", type: "reply" },
    { from: "bob", to: "db", label: "BEGIN; SELECT count(*) on call" },
    { from: "db", to: "bob", label: "2", type: "reply" },
    {
      alt: [
        {
          when: "read committed",
          items: [
            { from: "alice", to: "db", label: "UPDATE alice SET on_call = false; COMMIT" },
            { from: "bob", to: "db", label: "UPDATE bob SET on_call = false; COMMIT" },
            { note: "Different rows, no conflict: both commit. Nobody is on call.", over: ["alice", "db"] },
          ],
        },
        {
          when: "serializable",
          items: [
            { from: "alice", to: "db", label: "UPDATE alice ...; COMMIT" },
            { from: "db", to: "alice", label: "committed", type: "reply" },
            { from: "bob", to: "db", label: "UPDATE bob ...; COMMIT" },
            { from: "db", to: "bob", label: "40001 serialization failure", type: "reply" },
            { from: "bob", to: "db", label: "retry: count is now 1, so stop", type: "call" },
          ],
        },
      ],
    },
  ],
};

export const lostUpdate: SequenceSpec = {
  id: "lost-update",
  title: "Lost update on a counter",
  description: "Two requests read 10, add one, and write 11. One increment disappears unless the database does the add.",
  actors: [
    { id: "a", label: "Request A", kind: "service" },
    { id: "b", label: "Request B", kind: "service" },
    { id: "db", label: "Database", kind: "database" },
  ],
  items: [
    {
      alt: [
        {
          when: "read, add, write",
          items: [
            { from: "a", to: "db", label: "SELECT stock (10)" },
            { from: "b", to: "db", label: "SELECT stock (10)" },
            { from: "a", to: "db", label: "UPDATE stock = 9" },
            { from: "b", to: "db", label: "UPDATE stock = 9" },
            { note: "Two sales, stock fell by one. An oversell.", over: ["a", "db"] },
          ],
        },
        {
          when: "atomic UPDATE",
          items: [
            { from: "a", to: "db", label: "UPDATE stock = stock - 1" },
            { from: "b", to: "db", label: "UPDATE stock = stock - 1" },
            { note: "The row is locked for each statement: 10 becomes 8.", over: ["a", "db"] },
          ],
        },
        {
          when: "version check",
          items: [
            { from: "a", to: "db", label: "UPDATE ... WHERE version = 3" },
            { from: "db", to: "a", label: "1 row changed", type: "reply" },
            { from: "b", to: "db", label: "UPDATE ... WHERE version = 3" },
            { from: "db", to: "b", label: "0 rows: re-read and retry", type: "reply" },
          ],
        },
      ],
    },
  ],
};

/* ------------------------------------------------------------------ Indexes */

export const queryPlan: FlowSpec = {
  id: "query-plan",
  title: "What an index changes",
  description: "Without an index the database reads every row; with one it seeks a few pages and fetches only the matching rows.",
  nodes: [
    { id: "q", label: "Query", kind: "service", col: 0, row: 1, sub: "user_id = 42" },
    { id: "idx", label: "Index", kind: "search", col: 1, row: 0, sub: "sorted keys" },
    { id: "tbl", label: "Orders table", kind: "database", col: 2, row: 1, sub: "10M rows" },
  ],
  edges: [
    { from: "q", to: "idx", label: "seek" },
    { from: "q", to: "tbl", label: "scan" },
    { from: "idx", to: "tbl", label: "fetch" },
  ],
  scenarios: [
    {
      id: "seq-scan",
      name: "No index",
      steps: [
        { edge: "q>tbl", tone: "error", caption: "There is no index on user_id, so EXPLAIN shows a Seq Scan. The engine reads all 10 million rows to find 20.", ms: 1800, mark: [{ node: "tbl", state: "busy" }] },
        { edge: "q>tbl", reverse: true, caption: "It returns the right rows, but only after reading about 500,000 times more than it needed. At 300 queries a second this is a 2 s page.", mark: [{ node: "tbl", state: "miss" }] },
      ],
    },
    {
      id: "index-scan",
      name: "With an index",
      steps: [
        { edge: "q>idx", caption: "With an index on (user_id, created_at) the engine seeks straight to user 42 in 3 or 4 page reads.", mark: [{ node: "tbl", state: null }] },
        { edge: "idx>tbl", caption: "The index lists where this user's rows live, already sorted by date. Only those 20 rows are fetched." },
        { edge: "idx>tbl", reverse: true, tone: "ok", caption: "Milliseconds instead of seconds. The price: every insert and update now also edits this index.", mark: [{ node: "tbl", state: "hit" }] },
      ],
    },
    {
      id: "ignored",
      name: "Index ignored",
      steps: [
        { edge: "q>idx", caption: "A developer writes WHERE lower(email) = ... on a column that has a plain index on email." },
        { edge: "q>tbl", tone: "error", caption: "The index stores email, not lower(email), so it cannot be used. The planner falls back to a full scan.", mark: [{ node: "idx", state: "miss" }, { node: "tbl", state: "busy" }] },
        { edge: "q>idx", caption: "Fix: an expression index on lower(email), or store emails already lowercased. Check with EXPLAIN, never by hope.", mark: [{ node: "idx", state: "ok" }, { node: "tbl", state: null }] },
      ],
    },
  ],
};

export const indexChoice: DecisionSpec = {
  id: "index-choice",
  title: "Will this index serve my query?",
  start: "lead",
  nodes: {
    lead: { q: "Does the WHERE clause test the index's first column, as is (no function, no cast)?", yes: "order", no: "no" },
    no: {
      result: "The index is not used",
      why: "Add an index that starts with the column you filter on, or an expression index for the function (lower(email)).",
    },
    order: { q: "Are the later columns the ones you also filter or sort on, in order?", yes: "cover", no: "partial" },
    partial: {
      result: "Seek, then filter",
      why: "The first column narrows the rows; the rest are checked one by one. Fine for a few hundred rows, a problem for thousands.",
    },
    cover: { q: "Are all the columns the query returns stored in the index?", yes: "only", no: "fetch" },
    only: {
      result: "Index-only scan",
      why: "A covering index (INCLUDE) answers from the index alone and never reads the table. The fastest case.",
    },
    fetch: {
      result: "Index seek plus row fetch",
      why: "The normal good case: a few index pages, then one table fetch per matching row.",
    },
  },
};

/* ------------------------------------------------------------------ Modeling */

export const denormCopy: FlowSpec = {
  id: "denorm-copy",
  title: "A denormalized counter",
  description: "A comment_count column on posts saves a COUNT query on every read, but the copy has to be updated with every comment.",
  nodes: [
    { id: "app", label: "App", kind: "service", col: 0, row: 1 },
    { id: "comments", label: "comments", kind: "database", col: 1, row: 0, sub: "the truth" },
    { id: "posts", label: "posts", kind: "database", col: 1, row: 2, sub: "comment_count copy" },
  ],
  edges: [
    { from: "app", to: "comments", label: "insert" },
    { from: "app", to: "posts", label: "count + 1" },
  ],
  scenarios: [
    {
      id: "txn",
      name: "One transaction",
      steps: [
        { edge: "app>comments", caption: "BEGIN. The new comment row is inserted." },
        { edge: "app>posts", caption: "In the same transaction, comment_count goes up by one." },
        { edge: "app>posts", reverse: true, tone: "ok", caption: "COMMIT: both changes land together or neither does. The feed reads the count with no COUNT query.", mark: [{ node: "posts", state: "ok" }] },
      ],
    },
    {
      id: "drift",
      name: "Copy drifts",
      steps: [
        { edge: "app>comments", caption: "Two separate statements, no transaction: the comment is saved." },
        { edge: "app>posts", tone: "error", caption: "The app crashes before the second statement. The count stays one too low.", mark: [{ node: "posts", state: "down" }] },
        { edge: "app>comments", caption: "Fix: one transaction for both writes, plus a nightly job that recounts and repairs any drift.", mark: [{ node: "posts", state: "ok" }] },
      ],
    },
  ],
};

export const nPlusOne: FlowSpec = {
  id: "n-plus-one",
  title: "The N+1 query",
  description: "One query for 20 posts, then one more per author. Batching the author lookups turns 21 round trips into 2.",
  nodes: [
    { id: "app", label: "App", kind: "service", col: 0, row: 1 },
    { id: "posts", label: "posts", kind: "database", col: 1, row: 0, sub: "1 query" },
    { id: "users", label: "users", kind: "database", col: 1, row: 2, sub: "N queries" },
  ],
  edges: [
    { from: "app", to: "posts", label: "list" },
    { from: "app", to: "users", label: "authors" },
  ],
  scenarios: [
    {
      id: "n1",
      name: "N+1: 21 queries",
      steps: [
        { edge: "app>posts", caption: "SELECT the 20 newest posts: 1 query." },
        { edge: "app>users", tone: "error", caption: "Then the code loops: SELECT the author for post 1, for post 2, for post 3 ...", with: [{ edge: "app>users", tone: "error", caption: "" }, { edge: "app>users", tone: "error", caption: "" }], mark: [{ node: "users", state: "busy" }] },
        { edge: "app>users", reverse: true, caption: "20 more round trips. At 2 ms each that is 42 ms of waiting for a page that needed 4 ms of work.", mark: [{ node: "users", state: "miss" }] },
      ],
    },
    {
      id: "batched",
      name: "Batched: 2 queries",
      steps: [
        { edge: "app>posts", caption: "Same first query: the 20 newest posts.", mark: [{ node: "users", state: null }] },
        { edge: "app>users", caption: "Collect the 20 author ids, then ask once: WHERE id = ANY(ids). A join or a DataLoader does the same." },
        { edge: "app>users", reverse: true, tone: "ok", caption: "2 round trips, about 4 ms. The cost does not grow with the page size.", mark: [{ node: "users", state: "hit" }] },
      ],
    },
  ],
};

/* ------------------------------------------------------------------ SQL vs NoSQL */

export const storePick: DecisionSpec = {
  id: "store-pick",
  title: "Which kind of store?",
  start: "txn",
  nodes: {
    txn: { q: "Do you need multi-row transactions, joins or ad hoc queries?", yes: "sql", no: "key" },
    sql: {
      result: "Relational (Postgres)",
      why: "The default. Constraints, transactions and joins protect orders and payments, and one Postgres primary goes a long way.",
    },
    key: { q: "Is every read a lookup by one key?", yes: "volume", no: "doc" },
    volume: { q: "Is it a huge, append-heavy stream (tens of thousands of writes a second)?", yes: "wide", no: "kv" },
    wide: {
      result: "Wide-column (Cassandra)",
      why: "Partitioned by key and sorted inside a partition, built for write-heavy feeds, messages and time series.",
    },
    kv: {
      result: "Key-value (Redis, DynamoDB)",
      why: "Sessions, carts and counters: one key in, one value out, at very high rates and low latency.",
    },
    doc: { q: "Is each record nested and almost always read or written whole?", yes: "mongo", no: "sql2" },
    sql2: {
      result: "Relational (Postgres)",
      why: "The default. Constraints, transactions and joins protect orders and payments, and one Postgres primary goes a long way.",
    },
    mongo: {
      result: "Document (MongoDB)",
      why: "A profile or a catalog item with a flexible shape is one read, not five joins. Cross-document rules are weaker.",
    },
  },
};

export const relationalTxn: FlowSpec = {
  id: "relational-txn",
  title: "Relational: a transaction across tables",
  description: "An order and its payment change together or not at all, because the database enforces it.",
  nodes: [
    { id: "app", label: "App", kind: "service", col: 0, row: 1 },
    { id: "orders", label: "orders", kind: "database", col: 1, row: 0, sub: "FK to users" },
    { id: "pay", label: "payments", kind: "database", col: 1, row: 2, sub: "UNIQUE per order" },
  ],
  edges: [
    { from: "app", to: "orders", label: "insert" },
    { from: "app", to: "pay", label: "insert" },
  ],
  scenarios: [
    {
      id: "commit",
      name: "Commit",
      steps: [
        { edge: "app>orders", caption: "BEGIN, then insert the order row." },
        { edge: "app>pay", caption: "Insert the payment row in the same transaction." },
        { edge: "app>pay", reverse: true, tone: "ok", caption: "COMMIT: both rows become visible together.", mark: [{ node: "orders", state: "ok" }, { node: "pay", state: "ok" }] },
      ],
    },
    {
      id: "rollback",
      name: "Rollback",
      steps: [
        { edge: "app>orders", caption: "The order row is inserted.", mark: [{ node: "orders", state: null }, { node: "pay", state: null }] },
        { edge: "app>pay", tone: "error", caption: "The payment insert violates a constraint (a duplicate charge for the same order).", mark: [{ node: "pay", state: "miss" }] },
        { edge: "app>orders", tone: "error", caption: "ROLLBACK: the order disappears too. No half-finished order is ever visible. A store without multi-row transactions cannot promise that.", mark: [{ node: "orders", state: "down" }] },
      ],
    },
  ],
};

export const keyValueStore: FlowSpec = {
  id: "key-value-store",
  title: "Key-value: one key, one partition",
  description: "The key is hashed to pick a partition, so a lookup by key touches one node. Anything that is not a key lookup touches all of them.",
  nodes: [
    { id: "app", label: "App", kind: "service", col: 0, row: 1 },
    { id: "p1", label: "Partition 1", kind: "database", col: 1, row: 0 },
    { id: "p2", label: "Partition 2", kind: "database", col: 1, row: 1 },
    { id: "p3", label: "Partition 3", kind: "database", col: 1, row: 2 },
  ],
  edges: [
    { from: "app", to: "p1", label: "key" },
    { from: "app", to: "p2", label: "key" },
    { from: "app", to: "p3", label: "key" },
  ],
  scenarios: [
    {
      id: "get",
      name: "Get by key",
      steps: [
        { edge: "app>p2", caption: "GET cart:42. hash(cart:42) says partition 2, so the request goes to exactly one node." },
        { edge: "app>p2", reverse: true, tone: "ok", caption: "The value comes back in a millisecond or so. Add partitions and capacity grows with them.", mark: [{ node: "p2", state: "hit" }] },
      ],
    },
    {
      id: "scan",
      name: "Not a key lookup",
      steps: [
        { edge: "app>p1", tone: "error", caption: "Which carts hold item 7? There is no key for that, so the app must ask every partition.", with: [{ edge: "app>p2", tone: "error", caption: "" }, { edge: "app>p3", tone: "error", caption: "" }], mark: [{ node: "p2", state: null }] },
        { edge: "app>p1", reverse: true, tone: "miss", caption: "A full scan of every partition. Key-value stores are the wrong tool for questions you did not design a key for.", with: [{ edge: "app>p2", reverse: true, tone: "miss", caption: "" }, { edge: "app>p3", reverse: true, tone: "miss", caption: "" }] },
      ],
    },
  ],
};

export const wideColumn: FlowSpec = {
  id: "wide-column",
  title: "Wide-column: write anywhere, replicate by key",
  description: "Any node can coordinate a write; the partition key decides which three nodes keep the data, and two acknowledgements are enough.",
  nodes: [
    { id: "app", label: "App", kind: "service", col: 0, row: 1 },
    { id: "coord", label: "Coordinator", kind: "database", col: 1, row: 1, sub: "any node" },
    { id: "n1", label: "Replica A", kind: "database", col: 2, row: 0 },
    { id: "n2", label: "Replica B", kind: "database", col: 2, row: 1 },
    { id: "n3", label: "Replica C", kind: "database", col: 2, row: 2 },
  ],
  edges: [
    { from: "app", to: "coord", label: "write" },
    { from: "coord", to: "n1", label: "copy", style: "replication" },
    { from: "coord", to: "n2", label: "copy", style: "replication" },
    { from: "coord", to: "n3", label: "copy", style: "replication" },
  ],
  scenarios: [
    {
      id: "write",
      name: "Quorum write",
      steps: [
        { edge: "app>coord", caption: "A chat message is written with partition key chat_id. Any node can take it; there is no single primary." },
        { edge: "coord>n1", caption: "The coordinator sends it to the 3 nodes that own that key (replication factor 3).", with: [{ edge: "coord>n2", caption: "" }, { edge: "coord>n3", caption: "" }] },
        { edge: "coord>n1", reverse: true, tone: "ok", caption: "Two acknowledgements are a quorum (2 of 3), so the write succeeds even if Replica C is slow or down.", with: [{ edge: "coord>n2", reverse: true, tone: "ok", caption: "" }], mark: [{ node: "n3", state: "busy" }] },
        { edge: "app>coord", reverse: true, tone: "ok", caption: "Acknowledged in a few milliseconds, with no leader election to wait for." },
      ],
    },
    {
      id: "read",
      name: "Read by partition",
      steps: [
        { edge: "app>coord", caption: "Show the last 50 messages of chat 9: the query names the partition key.", mark: [{ node: "n3", state: null }] },
        { edge: "coord>n2", caption: "One partition holds all of that chat's rows, already sorted by time (the clustering key), so this is a sequential read." },
        { edge: "coord>n2", reverse: true, tone: "ok", caption: "Fast and cheap. A query on a different column, like find all messages containing a word, is not supported without another table." },
      ],
    },
  ],
};

export const documentStore: FlowSpec = {
  id: "document-store",
  title: "Document: one read for the whole record",
  description: "A profile with nested addresses and settings is stored as one document, read in one lookup; copies of shared data are the cost.",
  nodes: [
    { id: "app", label: "App", kind: "service", col: 0, row: 1 },
    { id: "docs", label: "Document store", kind: "database", col: 1, row: 0, sub: "1 doc per user" },
    { id: "rel", label: "Relational", kind: "database", col: 1, row: 2, sub: "5 tables" },
  ],
  edges: [
    { from: "app", to: "docs", label: "1 read" },
    { from: "app", to: "rel", label: "5 joins" },
  ],
  scenarios: [
    {
      id: "read",
      name: "Read whole profile",
      steps: [
        { edge: "app>docs", caption: "Load user 42: name, addresses, preferences and devices all live inside one document." },
        { edge: "app>docs", reverse: true, tone: "ok", caption: "One lookup, one disk read, no joins.", mark: [{ node: "docs", state: "hit" }] },
        { edge: "app>rel", caption: "The relational version joins users, addresses, preferences, devices and plans." },
        { edge: "app>rel", reverse: true, caption: "Correct and flexible, but five tables to read for one screen.", mark: [{ node: "rel", state: "busy" }] },
      ],
    },
    {
      id: "stale",
      name: "Embedded copies",
      steps: [
        { edge: "app>docs", caption: "Every post document embeds its author's name. Priya renames herself.", mark: [{ node: "docs", state: null }, { node: "rel", state: null }] },
        { edge: "app>docs", tone: "error", caption: "Her name now sits inside 12,000 post documents. All of them must be rewritten, and until then readers see two names.", mark: [{ node: "docs", state: "busy" }] },
        { edge: "app>docs", reverse: true, tone: "ok", caption: "Rule of thumb: embed what is read together and changes together; store a reference to anything shared and edited.", mark: [{ node: "docs", state: "ok" }] },
      ],
    },
  ],
};

/* ------------------------------------------------------------------ Replication */

export const commitModes: FlowSpec = {
  id: "commit-modes",
  title: "What a commit waits for",
  description: "The same write under async, semi-synchronous and synchronous replication.",
  nodes: [
    { id: "app", label: "App", kind: "service", col: 0, row: 1 },
    { id: "primary", label: "Primary", kind: "database", col: 1, row: 1 },
    { id: "r1", label: "Replica 1", kind: "database", col: 2, row: 0 },
    { id: "r2", label: "Replica 2", kind: "database", col: 2, row: 2 },
  ],
  edges: [
    { from: "app", to: "primary", label: "commit" },
    { from: "primary", to: "r1", label: "ship", style: "replication" },
    { from: "primary", to: "r2", label: "ship", style: "replication" },
  ],
  scenarios: [
    {
      id: "async",
      name: "Async",
      steps: [
        { edge: "app>primary", caption: "A commit arrives at the primary." },
        { edge: "app>primary", reverse: true, tone: "ok", caption: "The primary flushes its own log and acknowledges at once. Fastest commit.", mark: [{ node: "primary", state: "ok" }] },
        { edge: "primary>r1", caption: "Shipping to the replicas happens afterwards, a few milliseconds later.", with: [{ edge: "primary>r2", caption: "" }] },
        { edge: "primary>r1", tone: "error", caption: "If the primary dies in that gap, the acknowledged write was never shipped. It is lost: RPO is not zero.", mark: [{ node: "primary", state: "down" }] },
      ],
    },
    {
      id: "semi",
      name: "Semi-sync",
      steps: [
        { edge: "app>primary", caption: "A commit arrives at the primary.", mark: [{ node: "primary", state: null }] },
        { edge: "primary>r1", caption: "The primary ships the change and waits until one replica confirms it has received it.", with: [{ edge: "primary>r2", caption: "" }] },
        { edge: "primary>r1", reverse: true, tone: "ok", caption: "Replica 1 confirms, so the commit needs one extra round trip. Replica 2 may still be behind.", mark: [{ node: "r1", state: "ok" }] },
        { edge: "app>primary", reverse: true, tone: "ok", caption: "Acknowledged. If the primary dies now, Replica 1 holds the write, so nothing acknowledged is lost." },
      ],
    },
    {
      id: "sync",
      name: "Sync",
      steps: [
        { edge: "app>primary", caption: "A commit arrives at the primary.", mark: [{ node: "r1", state: null }] },
        { edge: "primary>r1", caption: "The primary ships to every replica and waits for all of them.", with: [{ edge: "primary>r2", caption: "" }] },
        { edge: "primary>r2", reverse: true, tone: "error", caption: "Replica 2 is slow (a long query, a busy disk). Every commit now waits for it.", mark: [{ node: "r2", state: "busy" }] },
        { edge: "app>primary", reverse: true, caption: "Nothing is lost, but write latency equals the slowest replica, and a dead replica stops all writes." },
      ],
    },
  ],
};

export const monotonicReads: SequenceSpec = {
  id: "monotonic-reads",
  title: "Monotonic reads: time must not go backwards",
  description: "A user refreshes twice. If the two reads hit different replicas, the second can be older than the first.",
  actors: [
    { id: "user", label: "User", kind: "client" },
    { id: "app", label: "App", kind: "service" },
    { id: "r1", label: "Replica 1", kind: "database" },
    { id: "r2", label: "Replica 2 (lagging)", kind: "database" },
  ],
  items: [
    {
      alt: [
        {
          when: "random replica",
          items: [
            { from: "user", to: "app", label: "load comments" },
            { from: "app", to: "r1", label: "SELECT (up to date)" },
            { from: "r1", to: "user", label: "12 comments", type: "reply" },
            { from: "user", to: "app", label: "refresh" },
            { from: "app", to: "r2", label: "SELECT (2 s behind)" },
            { from: "r2", to: "user", label: "11 comments: one vanished", type: "reply" },
          ],
        },
        {
          when: "pinned to one",
          items: [
            { from: "user", to: "app", label: "load comments" },
            { from: "app", to: "r1", label: "SELECT, hash(user) picks R1" },
            { from: "r1", to: "user", label: "12 comments", type: "reply" },
            { from: "user", to: "app", label: "refresh" },
            { from: "app", to: "r1", label: "SELECT, same replica" },
            { from: "r1", to: "user", label: "12 comments", type: "reply" },
          ],
        },
      ],
    },
  ],
};

/* ------------------------------------------------------------------ Failover */

export const failoverTimeline: TimelineSpec = {
  id: "failover-timeline",
  title: "Where the failover time goes (example)",
  description: "Example numbers: a 5 s heartbeat, three misses to declare death, then promotion and repointing. Writes fail for about 30 s.",
  unit: "s",
  lanes: [
    { id: "mgr", label: "Failover manager" },
    { id: "replica", label: "Replica 1" },
    { id: "app", label: "App writes" },
  ],
  spans: [
    { lane: "mgr", start: 0, end: 15, label: "3 missed heartbeats", tone: 1 },
    { lane: "mgr", start: 15, end: 20, label: "Pick newest log", tone: 2 },
    { lane: "replica", start: 15, end: 20, label: "Promote", tone: 2 },
    { lane: "mgr", start: 20, end: 30, label: "Repoint DNS or proxy", tone: 3 },
    { lane: "app", start: 0, end: 30, label: "Writes fail or time out", tone: 3 },
  ],
  markers: [
    { at: 0, label: "Primary dies" },
    { at: 15, label: "Declared dead" },
    { at: 30, label: "Writes resume" },
  ],
};

export const splitBrain: FlowSpec = {
  id: "split-brain",
  title: "Split brain and fencing",
  description: "If the old primary comes back still believing it leads, two nodes accept writes and the data diverges. Fencing prevents it.",
  nodes: [
    { id: "app", label: "App servers", kind: "service", col: 0, row: 1, sub: "×N" },
    { id: "old", label: "Old primary", kind: "database", col: 1, row: 0 },
    { id: "new", label: "New primary", kind: "database", col: 1, row: 2 },
    { id: "mgr", label: "Manager", kind: "service", col: 2, row: 1, sub: "failover" },
  ],
  edges: [
    { from: "app", to: "old", label: "writes" },
    { from: "app", to: "new", label: "writes" },
    { from: "mgr", to: "old", label: "fence" },
    { from: "mgr", to: "new", label: "promote" },
  ],
  scenarios: [
    {
      id: "split",
      name: "Split brain",
      steps: [
        { edge: "mgr>new", caption: "A network blip hides the old primary. The manager promotes Replica 1 as the new primary.", mark: [{ node: "old", state: "busy" }, { node: "new", state: "ok" }] },
        { edge: "app>new", caption: "Most app servers learn the new address and write to it." },
        { edge: "app>old", tone: "error", caption: "The old primary was only cut off, not dead. A few app servers with cached addresses still write to it.", mark: [{ node: "old", state: "down" }] },
        { edge: "app>old", tone: "error", caption: "Two nodes now hold different data for the same keys, and no automatic merge can tell which orders are real. Someone repairs by hand." },
      ],
    },
    {
      id: "fenced",
      name: "Fenced",
      steps: [
        { edge: "mgr>new", caption: "Same blip. The manager promotes the new primary.", mark: [{ node: "old", state: null }, { node: "new", state: "ok" }] },
        { edge: "mgr>old", caption: "Before any traffic moves, it fences the old primary: power it off, revoke its storage, or make it read-only.", mark: [{ node: "old", state: "down" }] },
        { edge: "app>new", reverse: true, tone: "ok", caption: "Only one node can accept writes, so writes can never diverge. A majority vote of observers also stops a false failover." },
      ],
    },
  ],
};

/* ------------------------------------------------------------------ Sharding */

const shardNodes = (routerLabel: string, routerSub: string) => [
  { id: "app", label: "App", kind: "service" as const, col: 0, row: 1 },
  { id: "router", label: routerLabel, kind: "lb" as const, col: 1, row: 1, sub: routerSub },
  { id: "s1", label: "Shard 1", kind: "database" as const, col: 2, row: 0 },
  { id: "s2", label: "Shard 2", kind: "database" as const, col: 2, row: 1 },
  { id: "s3", label: "Shard 3", kind: "database" as const, col: 2, row: 2 },
];
const shardEdges = [
  { from: "app", to: "router" },
  { from: "router", to: "s1" },
  { from: "router", to: "s2" },
  { from: "router", to: "s3" },
];

export const hashShards: FlowSpec = {
  id: "hash-shards",
  title: "Hash sharding",
  description: "hash(key) picks the shard, so keys spread evenly; a range of keys is scattered over all shards.",
  nodes: shardNodes("Router", "hash(key) % 3"),
  edges: shardEdges,
  scenarios: [
    {
      id: "point",
      name: "Point lookup",
      steps: [
        { edge: "app>router", caption: "Load user 42. The router computes hash(42) % 3 = 1." },
        { edge: "router>s2", caption: "One shard answers. Users spread evenly, so no shard is busier than the rest.", mark: [{ node: "s2", state: "hit" }] },
        { edge: "router>s2", reverse: true, tone: "ok", caption: "One hop, one shard." },
      ],
    },
    {
      id: "range",
      name: "Range scan",
      steps: [
        { edge: "app>router", caption: "List users 100 to 200. Hashing scattered neighbouring ids across the shards.", mark: [{ node: "s2", state: null }] },
        { edge: "router>s1", tone: "error", caption: "The router must ask every shard and merge the results.", with: [{ edge: "router>s2", tone: "error", caption: "" }, { edge: "router>s3", tone: "error", caption: "" }], mark: [{ node: "s1", state: "busy" }, { node: "s2", state: "busy" }, { node: "s3", state: "busy" }] },
      ],
    },
  ],
};

export const rangeShards: FlowSpec = {
  id: "range-shards",
  title: "Range sharding",
  description: "Each shard owns a contiguous range of keys: great for scans, but a rising key sends every new write to the last shard.",
  nodes: shardNodes("Router", "key ranges"),
  edges: shardEdges,
  scenarios: [
    {
      id: "scan",
      name: "Range scan",
      steps: [
        { edge: "app>router", caption: "List orders for customers A to F. Shard 1 owns A to H, Shard 2 owns I to P, Shard 3 owns Q to Z." },
        { edge: "router>s1", caption: "One shard holds the whole range, already in order. A range query is one hop.", mark: [{ node: "s1", state: "hit" }] },
      ],
    },
    {
      id: "hot",
      name: "Rising key",
      steps: [
        { edge: "app>router", caption: "Shard by created_at. New orders always carry the newest timestamp.", mark: [{ node: "s1", state: null }] },
        { edge: "router>s3", tone: "error", caption: "Every write lands on the shard that owns the latest range, all day.", with: [{ edge: "router>s3", tone: "error", caption: "" }, { edge: "router>s3", tone: "error", caption: "" }], mark: [{ node: "s3", state: "busy" }] },
        { edge: "router>s3", tone: "error", caption: "Shards 1 and 2 sit idle while Shard 3 melts. Fix: hash a prefix (customer_id) and sort by time inside it.", mark: [{ node: "s3", state: "down" }] },
      ],
    },
  ],
};

export const directoryShards: FlowSpec = {
  id: "directory-shards",
  title: "Directory sharding",
  description: "A lookup table maps each key to its shard, so you can place and move data freely, at the price of one more dependency.",
  nodes: [
    { id: "app", label: "App", kind: "service", col: 0, row: 1 },
    { id: "dir", label: "Directory", kind: "database", col: 1, row: 0, sub: "tenant to shard" },
    { id: "s1", label: "Shard 1", kind: "database", col: 2, row: 0 },
    { id: "s2", label: "Shard 2", kind: "database", col: 2, row: 1 },
    { id: "s3", label: "Shard 3", kind: "database", col: 2, row: 2 },
  ],
  edges: [
    { from: "app", to: "dir", label: "lookup" },
    { from: "app", to: "s1" },
    { from: "app", to: "s2" },
    { from: "app", to: "s3" },
  ],
  scenarios: [
    {
      id: "lookup",
      name: "Look up, then go",
      steps: [
        { edge: "app>dir", caption: "Tenant Acme wants its data. The app asks the directory (cached in memory) which shard holds it." },
        { edge: "app>dir", reverse: true, caption: "Acme lives on Shard 2." },
        { edge: "app>s2", caption: "The app queries that shard directly.", mark: [{ node: "s2", state: "hit" }] },
      ],
    },
    {
      id: "move",
      name: "Move a big tenant",
      steps: [
        { edge: "app>s1", tone: "error", caption: "One tenant has grown to half of Shard 1.", mark: [{ node: "s1", state: "busy" }] },
        { edge: "app>s3", caption: "Copy that tenant to the empty Shard 3, then flip its row in the directory. No other tenant moves.", mark: [{ node: "s3", state: "ok" }] },
        { edge: "app>dir", tone: "error", caption: "The cost: the directory is now on every request's path. If it is down or stale, nobody finds their data, so replicate and cache it.", mark: [{ node: "dir", state: "busy" }] },
      ],
    },
  ],
};

export const shardKeyPick: DecisionSpec = {
  id: "shard-key-pick",
  title: "Pick the shard key",
  start: "main",
  nodes: {
    main: { q: "Does most traffic arrive keyed by one id, like user or tenant?", yes: "card", no: "time" },
    card: { q: "Does that id have many values (millions), spread evenly?", yes: "hashkey", no: "finer" },
    hashkey: {
      result: "Hash that id",
      why: "Even spread and one-shard queries for the main access path. Users, tenants and conversations are typical.",
      href: "/deep-dives/sharding-strategies",
    },
    finer: {
      result: "Choose a finer key",
      why: "country has about 200 values and a few dominate, so one shard fills first. Use user_id, or country plus a bucket.",
    },
    time: { q: "Is the main query a range over time?", yes: "prefix", no: "dir" },
    prefix: {
      result: "Range on (entity, time)",
      why: "Lead with an id that spreads writes, then sort by time inside it. Time alone sends every write to the newest shard.",
    },
    dir: {
      result: "Directory or rethink",
      why: "If no single key fits the main query, a lookup table gives control, or the data model needs another look.",
    },
  },
};

export const scatterGather: FlowSpec = {
  id: "scatter-gather",
  title: "Querying by something other than the shard key",
  description: "The shard key is user_id. A lookup by email must ask every shard, or use a small index table that maps email to user_id.",
  nodes: [
    { id: "app", label: "App", kind: "service", col: 0, row: 1 },
    { id: "idx", label: "Email index", kind: "database", col: 1, row: 0, sub: "email to user_id" },
    { id: "s1", label: "Shard 1", kind: "database", col: 2, row: 0 },
    { id: "s2", label: "Shard 2", kind: "database", col: 2, row: 1 },
    { id: "s3", label: "Shard 3", kind: "database", col: 2, row: 2 },
  ],
  edges: [
    { from: "app", to: "idx", label: "lookup" },
    { from: "app", to: "s1" },
    { from: "app", to: "s2" },
    { from: "app", to: "s3" },
  ],
  scenarios: [
    {
      id: "scatter",
      name: "Scatter-gather",
      steps: [
        { edge: "app>s1", caption: "Log in with an email address. The data is sharded by user_id, so the app cannot tell which shard has it.", with: [{ edge: "app>s2", caption: "" }, { edge: "app>s3", caption: "" }], mark: [{ node: "s1", state: "busy" }, { node: "s2", state: "busy" }, { node: "s3", state: "busy" }] },
        { edge: "app>s1", reverse: true, tone: "miss", caption: "Two shards say no and one says yes. The request waits for the slowest of them, and with 16 shards the odds that at least one is slow add up.", with: [{ edge: "app>s2", reverse: true, tone: "miss", caption: "" }, { edge: "app>s3", reverse: true, tone: "ok", caption: "" }] },
      ],
    },
    {
      id: "indexed",
      name: "Lookup table",
      steps: [
        { edge: "app>idx", caption: "Keep a small table keyed by email that stores the user_id (itself sharded by email).", mark: [{ node: "s1", state: null }, { node: "s2", state: null }, { node: "s3", state: null }] },
        { edge: "app>idx", reverse: true, caption: "It answers user_id 42." },
        { edge: "app>s3", caption: "Now exactly one shard is queried. The price: two writes on signup and a second copy to keep in sync.", mark: [{ node: "s3", state: "hit" }] },
      ],
    },
  ],
};

/* ------------------------------------------------------------------ Backups */

export const pitrFlow: FlowSpec = {
  id: "pitr-flow",
  title: "Replicas copy mistakes; backups let you go back",
  description: "A bad statement reaches every replica in milliseconds. A base backup plus archived WAL can rebuild the database to the second before it.",
  nodes: [
    { id: "app", label: "App", kind: "service", col: 0, row: 1 },
    { id: "primary", label: "Primary", kind: "database", col: 1, row: 1 },
    { id: "replica", label: "Replica", kind: "database", col: 2, row: 0 },
    { id: "archive", label: "Base + WAL", kind: "storage", col: 2, row: 2, sub: "other region" },
    { id: "restored", label: "Restored copy", kind: "database", col: 3, row: 2, sub: "14:31:59" },
  ],
  edges: [
    { from: "app", to: "primary", label: "write" },
    { from: "primary", to: "replica", label: "replicate", style: "replication" },
    { from: "primary", to: "archive", label: "WAL", style: "async" },
    { from: "archive", to: "restored", label: "replay" },
  ],
  scenarios: [
    {
      id: "drop",
      name: "Bad deploy",
      steps: [
        { edge: "app>primary", tone: "error", caption: "At 14:32 a bad migration runs DROP TABLE orders on the primary." },
        { edge: "primary>replica", tone: "error", caption: "The replica faithfully replays the same statement within milliseconds. Now both copies are missing the table.", mark: [{ node: "primary", state: "down" }, { node: "replica", state: "down" }] },
        { edge: "primary>archive", caption: "The archived log still holds every change up to 14:31:59, because it keeps shipping segments to another region.", mark: [{ node: "archive", state: "ok" }] },
      ],
    },
    {
      id: "restore",
      name: "Restore to 14:31:59",
      steps: [
        { edge: "archive>restored", caption: "Start from last night's base backup, then replay archived log segments up to the target time, 14:31:59.", ms: 1800 },
        { edge: "archive>restored", reverse: true, tone: "ok", caption: "A copy exists as the database was one second before the mistake. Swap it in, or copy only the dropped table back.", mark: [{ node: "restored", state: "ok" }] },
      ],
    },
  ],
};

/* ------------------------------------------------------------------ Connections */

export const connectionPool: FlowSpec = {
  id: "connection-pool",
  title: "Connection pooler in front of the database",
  description: "Many app connections share a few real database connections, so the database is never asked to hold thousands.",
  nodes: [
    { id: "app", label: "App servers", kind: "service", col: 0, row: 1, sub: "×50" },
    { id: "pool", label: "Pooler", kind: "lb", col: 1, row: 0, sub: "PgBouncer" },
    { id: "db", label: "Postgres", kind: "database", col: 2, row: 1, sub: "~100 conns" },
  ],
  edges: [
    { from: "app", to: "pool", label: "1,000" },
    { from: "pool", to: "db", label: "40" },
    { from: "app", to: "db", label: "direct" },
  ],
  scenarios: [
    {
      id: "direct",
      name: "No pooler",
      steps: [
        { edge: "app>db", tone: "error", caption: "50 app servers each open a pool of 20 connections straight to Postgres: 1,000 connections.", with: [{ edge: "app>db", tone: "error", caption: "" }, { edge: "app>db", tone: "error", caption: "" }], mark: [{ node: "db", state: "busy" }] },
        { edge: "app>db", reverse: true, tone: "error", caption: "Each connection is a separate server process with its own memory, and the default limit is 100. New connections fail with too many clients.", mark: [{ node: "db", state: "down" }] },
      ],
    },
    {
      id: "pooled",
      name: "With a pooler",
      steps: [
        { edge: "app>pool", caption: "The same 1,000 client connections now end at the pooler, which is built to hold thousands cheaply.", mark: [{ node: "db", state: null }] },
        { edge: "pool>db", caption: "It lends a real connection only for the length of one transaction, so 40 database connections serve all 1,000 clients." },
        { edge: "pool>db", reverse: true, tone: "ok", caption: "The database does its work on a few connections at full speed. Extra requests queue briefly in the pooler instead of crashing the database.", mark: [{ node: "db", state: "ok" }] },
      ],
    },
  ],
};
