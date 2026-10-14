import type { FlowSpec } from "@/components/diagram/types";

export const shardRouter: FlowSpec = {
  id: "shard-router",
  title: "Routing requests to shards",
  description:
    "The app hands every query to a shard router, which picks one of three shards by shard key. Each shard is a primary with its own replica; shard 3 joins only for resharding.",
  nodes: [
    { id: "app", label: "App", kind: "service", col: 0, row: 1.5 },
    { id: "router", label: "Shard router", kind: "gateway", col: 1, row: 1.5, sub: "key → shard", note: "A client library, or a proxy such as Vitess vtgate or MongoDB mongos." },
    { id: "shard0", label: "Shard 0", kind: "database", col: 3, row: 0, sub: "primary" },
    { id: "shard1", label: "Shard 1", kind: "database", col: 3, row: 1, sub: "primary" },
    { id: "shard2", label: "Shard 2", kind: "database", col: 3, row: 2, sub: "primary" },
    { id: "shard3", label: "Shard 3 (new)", kind: "database", col: 3, row: 3, sub: "resharding only" },
    { id: "replica0", label: "Replica 0", kind: "database", col: 4, row: 0 },
    { id: "replica1", label: "Replica 1", kind: "database", col: 4, row: 1 },
    { id: "replica2", label: "Replica 2", kind: "database", col: 4, row: 2 },
  ],
  edges: [
    { from: "app", to: "router" },
    { from: "router", to: "shard0" },
    { from: "router", to: "shard1" },
    { from: "router", to: "shard2" },
    { from: "router", to: "shard3", label: "new" },
    { from: "shard0", to: "replica0", style: "replication" },
    { from: "shard1", to: "replica1", style: "replication" },
    { from: "shard2", to: "replica2", style: "replication" },
    { from: "shard2", to: "shard3", label: "backfill", style: "async" },
  ],
  scenarios: [
    {
      id: "hash-route",
      name: "Route by hash",
      steps: [
        { edge: "app>router", caption: "The app saves an order for userId 42 through the shard router." },
        {
          edge: "router>shard2",
          caption: "hash(42) mod 3 = 2, so the row goes to shard 2. Any query with the user id touches exactly one shard.",
          mark: [{ node: "shard2", state: "ok" }],
        },
        { edge: "shard2>replica2", caption: "Shard 2 replicates to its own replica: every shard is a small primary/replica cluster." },
        { edge: "router>shard2", reverse: true, tone: "ok", caption: "Shard 2 confirms the commit." },
        {
          edge: "app>router",
          reverse: true,
          caption: "Done. Later reads for user 42 run the same function and land on the same shard.",
          mark: [{ node: "shard2", state: null }],
        },
      ],
    },
    {
      id: "hot-shard",
      name: "Hot shard (range)",
      steps: [
        {
          edge: "app>router",
          caption: "Now shard by created_at ranges instead: shard 0 holds 2023, shard 1 holds 2024, shard 2 holds everything since January 2025.",
        },
        {
          edge: "router>shard2",
          caption: "Every new order has a recent timestamp, so every insert lands on shard 2.",
          with: [{ edge: "router>shard2", caption: "" }, { edge: "router>shard2", caption: "" }],
          mark: [{ node: "shard2", state: "busy" }],
        },
        {
          edge: "shard2>replica2",
          tone: "error",
          caption: "Shard 2's disk and replica fall behind while shards 0 and 1 sit nearly idle on old data.",
          mark: [{ node: "replica2", state: "busy" }],
        },
        { edge: "router>shard1", caption: "The upside of ranges: 'all orders from March 2024' is a scan on shard 1 alone." },
        {
          edge: "router>shard0",
          tone: "ok",
          caption: "The fix: hash by user_id and keep time as the sort key inside each shard, so new writes spread evenly.",
          with: [{ edge: "router>shard1", tone: "ok", caption: "" }, { edge: "router>shard2", tone: "ok", caption: "" }],
          mark: [{ node: "shard2", state: null }, { node: "replica2", state: null }],
        },
      ],
    },
    {
      id: "reshard",
      name: "Resharding",
      steps: [
        {
          edge: "router>shard2",
          caption: "Shard 2 is nearly full, so half its key range moves to new shard 3. Step 1, dual-write: every write for a moving key goes to both shards.",
          with: [{ edge: "router>shard3", caption: "" }],
          mark: [{ node: "shard3", state: "busy" }],
        },
        {
          edge: "shard2>shard3",
          caption: "Step 2, backfill: a background job copies existing rows in batches with idempotent upserts, while dual-writes carry new changes.",
          ms: 1500,
        },
        {
          edge: "shard2>shard3",
          tone: "ok",
          caption: "Step 3, verify: compare row counts and checksums per key range until both sides match.",
          mark: [{ node: "shard3", state: "ok" }],
        },
        {
          edge: "router>shard3",
          caption: "Step 4, flip reads: a feature flag sends reads for the moved range to shard 3. Flip it back if anything looks wrong.",
        },
        {
          edge: "router>shard3",
          tone: "ok",
          caption: "Step 5, stop writing those keys to shard 2, then delete the copied rows. Only this last step can't be undone.",
          mark: [{ node: "shard3", state: null }],
        },
      ],
    },
    {
      id: "scatter",
      name: "Scatter-gather",
      steps: [
        { edge: "app>router", caption: "An admin page asks for the 10 best-selling products. The query has no shard key." },
        {
          edge: "router>shard0",
          caption: "The router has to ask every shard for its own top 10, in parallel.",
          with: [{ edge: "router>shard1", caption: "" }, { edge: "router>shard2", caption: "" }],
          mark: [{ node: "shard0", state: "busy" }, { node: "shard1", state: "busy" }, { node: "shard2", state: "busy" }],
        },
        {
          edge: "router>shard0",
          reverse: true,
          caption: "Each shard answers. The slowest one sets the latency for the whole query.",
          with: [{ edge: "router>shard1", reverse: true, caption: "" }, { edge: "router>shard2", reverse: true, caption: "", ms: 1600 }],
          mark: [{ node: "shard0", state: null }, { node: "shard1", state: null }, { node: "shard2", state: null }],
        },
        {
          edge: "app>router",
          reverse: true,
          caption: "The router merges 30 rows, re-sorts and keeps 10. Fine for admin pages; a hot path needs a precomputed table.",
        },
      ],
    },
  ],
};

/* "% of keys moved going from N to N+1 nodes", passed straight to <LineChart>. */
export const nodeCounts: number[] = Array.from({ length: 19 }, (_, i) => i + 2); // 2, 3, … 20
/** hash % N: a key stays only if hash mod N equals hash mod (N+1), so N/(N+1) of keys move. */
export const moduloMovedPct: number[] = nodeCounts.map((n) => Math.round((n / (n + 1)) * 1000) / 10);
/** Consistent hashing: only the new node's share, 1/(N+1), moves. */
export const ringMovedPct: number[] = nodeCounts.map((n) => Math.round((1 / (n + 1)) * 1000) / 10);
