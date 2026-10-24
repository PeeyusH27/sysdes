import type { FlowSpec, SequenceSpec, DecisionSpec } from "@/components/diagram/types";

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

/* ------------------------------------------------------------------ */
/* Decision trees                                                      */
/* ------------------------------------------------------------------ */

export const shardOrNot: DecisionSpec = {
  id: "shard-or-not",
  title: "Do you need to shard yet?",
  start: "cheap",
  nodes: {
    cheap: {
      q: "Have you tried indexes, a bigger machine, a cache, read replicas and archiving cold rows?",
      yes: "limit",
      no: "first",
    },
    first: {
      result: "Do those first",
      why: "Each is cheaper to run than a sharded system. Most slow databases are missing an index, not short of machines.",
    },
    limit: {
      q: "Do writes (tens of thousands a second) or data (many terabytes) still exceed one primary?",
      yes: "shard",
      no: "wait",
    },
    wait: {
      result: "Not yet",
      why: "One tuned primary with replicas and a cache copes. Write down the number at which you would revisit.",
    },
    shard: {
      result: "Shard",
      why: "Pick the shard key from your main query, hash it, and keep a plan for hot keys and for adding shards.",
    },
  },
};

export const keyTest: DecisionSpec = {
  id: "shard-key-test",
  title: "Is this a good shard key?",
  start: "query",
  nodes: {
    query: {
      q: "Does your most common query filter on this column?",
      yes: "many",
      no: "wrongKey",
    },
    wrongKey: {
      result: "Wrong key",
      why: "Your main query would ask every shard. Pick the column it filters on, or store the data twice.",
    },
    many: {
      q: "Does it have far more distinct values than you will have shards (thousands or more)?",
      yes: "giant",
      no: "tooFew",
    },
    tooFew: {
      result: "Too few values",
      why: "A column with 2 values (is_premium) gives 2 shards, ever. With 200 (country) you cap at 200, and they are uneven.",
    },
    giant: {
      q: "Can one value carry a huge share of the traffic (a celebrity, a tenant with 40% of rows)?",
      yes: "hot",
      no: "order",
    },
    hot: {
      result: "Good key, plan for hot values",
      why: "Keep the key and add a way out: salt a hot key into sub-keys, or give a giant tenant its own shard through a directory.",
    },
    order: {
      q: "Do new rows always get larger values (a timestamp, an auto-increment id)?",
      yes: "hashIt",
      no: "good",
    },
    hashIt: {
      result: "Hash it, do not range it",
      why: "Range sharding on an increasing value sends every new write to the newest shard. Hash the key and sort by time inside the shard.",
    },
    good: {
      result: "A good shard key",
      why: "It matches the main query, has many values, spreads evenly and does not grow in one direction. user_id usually passes.",
    },
  },
};

/* ------------------------------------------------------------------ */
/* Skew arithmetic                                                      */
/* ------------------------------------------------------------------ */

/** Share of all writes that land on the busiest of 4 shards. Hypothetical workloads, stated on the page. */
export const hottestShardShare: { label: string; value: number; display: string }[] = [
  { label: "user_id, hashed", value: 25, display: "25%" },
  { label: "tenant, one at 40%", value: 40, display: "40%" },
  { label: "country, one at 60%", value: 60, display: "60%" },
  { label: "created_at ranges", value: 100, display: "100%" },
];

/** Scatter-gather: chance that at least one of n shards is in its slow 1% when the query fans out. */
export const shardCounts: number[] = [1, 2, 4, 8, 16, 32, 64, 128];
export const slowQueryPct: number[] = shardCounts.map((n) => Math.round((1 - Math.pow(0.99, n)) * 1000) / 10);

/* ------------------------------------------------------------------ */
/* Store the data twice                                                 */
/* ------------------------------------------------------------------ */

export const storeTwice: FlowSpec = {
  id: "store-twice",
  title: "One table, two shard keys",
  description:
    "Orders are written once by the app and copied by an event to a second store sharded by seller, so buyer queries and seller queries each touch one shard.",
  nodes: [
    { id: "app", label: "Order service", kind: "service", col: 0, row: 1 },
    { id: "byBuyer", label: "Orders by buyer", kind: "database", col: 2, row: 0, sub: "shard key buyer_id" },
    { id: "events", label: "Event stream", kind: "queue", col: 2, row: 1, sub: "order created" },
    { id: "bySeller", label: "Orders by seller", kind: "database", col: 2, row: 2, sub: "shard key seller_id" },
  ],
  edges: [
    { from: "app", to: "byBuyer", label: "write" },
    { from: "app", to: "events", label: "publish", style: "async" },
    { from: "events", to: "bySeller", label: "copy", style: "async" },
    { from: "app", to: "bySeller", label: "read" },
  ],
  scenarios: [
    {
      id: "write",
      name: "One write, two copies",
      steps: [
        { edge: "app>byBuyer", caption: "A buyer places an order. It is written to the store sharded by buyer_id, the source of truth." },
        { edge: "app>events", caption: "The service publishes an order-created event." },
        {
          edge: "events>bySeller",
          caption: "A consumer inserts the same order into the store sharded by seller_id, a few milliseconds to seconds later.",
          mark: [{ node: "bySeller", state: "ok" }],
        },
      ],
    },
    {
      id: "read",
      name: "Two queries, one shard each",
      steps: [
        { edge: "app>byBuyer", caption: "My orders: filter by buyer_id, so exactly one shard answers." },
        { edge: "app>byBuyer", reverse: true, tone: "ok", caption: "The buyer sees their list." },
        {
          edge: "app>bySeller",
          caption: "Seller dashboard: filter by seller_id on the second copy, again one shard. The price is double the storage and a short lag.",
          mark: [{ node: "bySeller", state: "hit" }],
        },
      ],
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Strategies, one picture each                                         */
/* ------------------------------------------------------------------ */

export const rangeShards: FlowSpec = {
  id: "range-shards",
  title: "Range sharding",
  description:
    "The router holds a table of key ranges. Shard 0 owns ids 0 to 10M, shard 1 owns 10M to 20M, shard 2 owns 20M and up.",
  nodes: [
    { id: "app", label: "App", kind: "service", col: 0, row: 1 },
    { id: "router", label: "Range router", kind: "gateway", col: 1, row: 1, sub: "ranges table" },
    { id: "s0", label: "Shard 0", kind: "database", col: 3, row: 0, sub: "ids 0 to 10M" },
    { id: "s1", label: "Shard 1", kind: "database", col: 3, row: 1, sub: "ids 10M to 20M" },
    { id: "s2", label: "Shard 2", kind: "database", col: 3, row: 2, sub: "ids 20M and up" },
  ],
  edges: [
    { from: "app", to: "router" },
    { from: "router", to: "s0" },
    { from: "router", to: "s1" },
    { from: "router", to: "s2" },
  ],
  scenarios: [
    {
      id: "scan",
      name: "Range scan",
      steps: [
        { edge: "app>router", caption: "Report: all users with id from 12M to 18M." },
        {
          edge: "router>s1",
          caption: "That whole interval sits inside shard 1, so one shard answers with one index scan.",
          mark: [{ node: "s1", state: "ok" }],
        },
        { edge: "router>s1", reverse: true, tone: "ok", caption: "Neighbouring keys are stored next to each other. This is what ranges are for.", mark: [{ node: "s1", state: null }] },
      ],
    },
    {
      id: "hot",
      name: "Hot last shard",
      steps: [
        { edge: "app>router", caption: "Signups arrive. Ids come from an auto-increment counter, so each new id is larger than the last." },
        {
          edge: "router>s2",
          caption: "Every insert has the largest id yet, so every insert lands on shard 2.",
          with: [{ edge: "router>s2", caption: "" }, { edge: "router>s2", caption: "" }],
          mark: [{ node: "s2", state: "busy" }],
        },
        {
          edge: "router>s0",
          tone: "error",
          caption: "Shards 0 and 1 sit nearly idle, holding old data. Splitting shard 2 does not help, because the newest range is always the top one.",
        },
        {
          edge: "router>s1",
          tone: "ok",
          caption: "The fix: hash the id (or prefix it with a hash) before ranging, so new rows scatter. You give up cheap scans over time.",
          with: [{ edge: "router>s0", tone: "ok", caption: "" }, { edge: "router>s2", tone: "ok", caption: "" }],
          mark: [{ node: "s2", state: null }],
        },
      ],
    },
  ],
};

export const hashShards: FlowSpec = {
  id: "hash-shards",
  title: "Hash sharding",
  description:
    "The router computes hash(key) mod N and sends the row to that shard. Shard 3 is empty until the shard count goes from 3 to 4.",
  nodes: [
    { id: "app", label: "App", kind: "service", col: 0, row: 1.5 },
    { id: "router", label: "Hash router", kind: "gateway", col: 1, row: 1.5, sub: "hash mod N" },
    { id: "s0", label: "Shard 0", kind: "database", col: 3, row: 0 },
    { id: "s1", label: "Shard 1", kind: "database", col: 3, row: 1 },
    { id: "s2", label: "Shard 2", kind: "database", col: 3, row: 2 },
    { id: "s3", label: "Shard 3 (new)", kind: "database", col: 3, row: 3, sub: "N goes 3 to 4" },
  ],
  edges: [
    { from: "app", to: "router" },
    { from: "router", to: "s0" },
    { from: "router", to: "s1" },
    { from: "router", to: "s2" },
    { from: "router", to: "s3" },
  ],
  scenarios: [
    {
      id: "point",
      name: "Point lookup",
      steps: [
        { edge: "app>router", caption: "Fetch user 42. Say hash(42) is 7,000,013." },
        {
          edge: "router>s2",
          caption: "7,000,013 mod 3 is 2, so the router asks shard 2 and nobody else.",
          mark: [{ node: "s2", state: "ok" }],
        },
        { edge: "router>s2", reverse: true, tone: "ok", caption: "One shard, one lookup. Even load is the strength of hashing.", mark: [{ node: "s2", state: null }] },
      ],
    },
    {
      id: "scan",
      name: "Range scan",
      steps: [
        { edge: "app>router", caption: "Fetch users 40 to 49. Their hashes are unrelated, so neighbours do not share a shard." },
        {
          edge: "router>s0",
          caption: "The router must ask every shard and merge. Hashing buys even spread and pays for it with range scans.",
          with: [{ edge: "router>s1", caption: "" }, { edge: "router>s2", caption: "" }],
          mark: [{ node: "s0", state: "busy" }, { node: "s1", state: "busy" }, { node: "s2", state: "busy" }],
        },
        {
          edge: "router>s0",
          reverse: true,
          caption: "Three answers, merged. Over 64 shards this becomes 64 calls.",
          with: [{ edge: "router>s1", reverse: true, caption: "" }, { edge: "router>s2", reverse: true, caption: "" }],
          mark: [{ node: "s0", state: null }, { node: "s1", state: null }, { node: "s2", state: null }],
        },
      ],
    },
    {
      id: "grow",
      name: "Add a shard",
      steps: [
        { edge: "app>router", caption: "Capacity is short, so N goes from 3 to 4. The same user 42 arrives again." },
        {
          edge: "router>s1",
          tone: "error",
          caption: "7,000,013 mod 4 is 1, not 2. The row sits on shard 2, but the router now looks on shard 1 and finds nothing.",
          mark: [{ node: "s1", state: "miss" }, { node: "s3", state: "busy" }],
        },
        {
          edge: "router>s3",
          caption: "Going from N to N+1 changes the home of N/(N+1) of all keys: 75% going from 3 to 4. They all have to be copied, which is why plain mod is only safe for a fixed shard count.",
          mark: [{ node: "s1", state: null }, { node: "s3", state: null }],
        },
      ],
    },
  ],
};

export const directoryLookup: SequenceSpec = {
  id: "directory-lookup",
  title: "Directory (lookup) sharding",
  description:
    "A small directory maps each tenant to a shard. The app asks a cache first, then the directory; a tenant can be moved by editing one row.",
  actors: [
    { id: "app", label: "App", kind: "service" },
    { id: "cache", label: "Lookup cache", kind: "cache" },
    { id: "dir", label: "Directory", kind: "database" },
    { id: "shardA", label: "Shard A", kind: "database" },
    { id: "shardB", label: "Shard B", kind: "database" },
  ],
  items: [
    { from: "app", to: "cache", label: "shard of tenant 9?" },
    {
      alt: [
        {
          when: "cache hit",
          items: [
            { from: "cache", to: "app", label: "Shard A (about 1 ms)", type: "reply" },
            { from: "app", to: "shardA", label: "SELECT ... tenant 9" },
            { from: "shardA", to: "app", label: "rows", type: "reply" },
          ],
        },
        {
          when: "cache miss",
          items: [
            { from: "cache", to: "dir", label: "tenant 9?" },
            { from: "dir", to: "cache", label: "Shard A", type: "reply" },
            { from: "cache", to: "app", label: "Shard A, now cached", type: "reply" },
            { from: "app", to: "shardA", label: "SELECT ... tenant 9" },
          ],
        },
        {
          when: "tenant moved",
          items: [
            { note: "Tenant 9 was copied to shard B, the directory row changed, but this cache entry is still old", over: ["cache", "dir"] },
            { from: "app", to: "shardA", label: "SELECT ... tenant 9" },
            { from: "shardA", to: "app", label: "moved: not mine", type: "reply" },
            { from: "app", to: "dir", label: "drop cache, ask again" },
            { from: "dir", to: "app", label: "Shard B", type: "reply" },
            { from: "app", to: "shardB", label: "SELECT ... tenant 9" },
          ],
        },
      ],
    },
  ],
};

export const geoShards: FlowSpec = {
  id: "geo-shards",
  title: "Geo sharding",
  description:
    "Each user has a home region chosen at signup. The geo router sends their requests to the shard in that region.",
  nodes: [
    { id: "berlin", label: "User (Berlin)", kind: "client", col: 0, row: 0 },
    { id: "mumbai", label: "User (Mumbai)", kind: "client", col: 0, row: 2 },
    { id: "router", label: "Geo router", kind: "gateway", col: 1, row: 1, sub: "home region" },
    { id: "eu", label: "EU shard", kind: "database", col: 3, row: 0, sub: "Frankfurt" },
    { id: "us", label: "US shard", kind: "database", col: 3, row: 1, sub: "Virginia" },
    { id: "ap", label: "APAC shard", kind: "database", col: 3, row: 2, sub: "Mumbai" },
  ],
  edges: [
    { from: "berlin", to: "router" },
    { from: "mumbai", to: "router" },
    { from: "router", to: "eu" },
    { from: "router", to: "us" },
    { from: "router", to: "ap" },
  ],
  scenarios: [
    {
      id: "local",
      name: "Local read",
      steps: [
        { edge: "berlin>router", caption: "A user whose home region is the EU opens the app in Berlin." },
        {
          edge: "router>eu",
          caption: "Their rows live in Frankfurt, a short hop. The data also never leaves the EU, which is what residency rules ask for.",
          mark: [{ node: "eu", state: "ok" }],
        },
        { edge: "router>eu", reverse: true, tone: "ok", caption: "Fast and compliant. This is why geo is chosen for latency and law, not for balance.", mark: [{ node: "eu", state: null }] },
      ],
    },
    {
      id: "traveller",
      name: "A traveller",
      steps: [
        { edge: "mumbai>router", caption: "An EU user is on holiday in Mumbai. Their home region is still the EU." },
        {
          edge: "router>eu",
          tone: "miss",
          caption: "The request crosses continents, over 100 ms each way. Move home regions only on a deliberate change, never on a trip.",
          mark: [{ node: "eu", state: "miss" }],
        },
        { edge: "router>eu", reverse: true, caption: "The answer is correct, just slower. The user is not wrong; the placement is a choice.", mark: [{ node: "eu", state: null }] },
      ],
    },
    {
      id: "global",
      name: "Global query",
      steps: [
        { edge: "berlin>router", caption: "A global leaderboard needs every region's scores." },
        {
          edge: "router>eu",
          caption: "No single region has the answer, so the query fans out to all three, across oceans.",
          with: [{ edge: "router>us", caption: "" }, { edge: "router>ap", caption: "" }],
          mark: [{ node: "eu", state: "busy" }, { node: "us", state: "busy" }, { node: "ap", state: "busy" }],
        },
        {
          edge: "router>us",
          reverse: true,
          tone: "error",
          caption: "The farthest region sets the latency. Keep a separate, precomputed global view for queries like this.",
          mark: [{ node: "eu", state: null }, { node: "us", state: null }, { node: "ap", state: null }],
        },
      ],
    },
  ],
};

export const fixedSlots: FlowSpec = {
  id: "fixed-slots",
  title: "Fixed slots (Redis Cluster)",
  description:
    "Keys hash into 16,384 fixed slots. Machines own slot ranges, so adding a node moves whole slots and no key is rehashed.",
  nodes: [
    { id: "client", label: "Client", kind: "client", col: 0, row: 1.5 },
    { id: "slot", label: "Slot = CRC16", kind: "gateway", col: 1, row: 1.5, sub: "mod 16,384" },
    { id: "a", label: "Node A", kind: "cache", col: 3, row: 0, sub: "slots 0 to 5460" },
    { id: "b", label: "Node B", kind: "cache", col: 3, row: 1, sub: "5461 to 10922" },
    { id: "c", label: "Node C", kind: "cache", col: 3, row: 2, sub: "10923 to 16383" },
    { id: "d", label: "Node D", kind: "cache", col: 3, row: 3, sub: "new, empty" },
  ],
  edges: [
    { from: "client", to: "slot" },
    { from: "slot", to: "a" },
    { from: "slot", to: "b" },
    { from: "slot", to: "c" },
    { from: "slot", to: "d" },
    { from: "c", to: "d", label: "move", style: "async" },
  ],
  scenarios: [
    {
      id: "route",
      name: "Key to slot to node",
      steps: [
        { edge: "client>slot", caption: "SET user:42. The key is hashed into one of 16,384 slots, say slot 7000." },
        {
          edge: "slot>b",
          caption: "Slot 7000 falls in 5461 to 10922, so node B owns it. The key to slot step never changes.",
          mark: [{ node: "b", state: "ok" }],
        },
        { edge: "slot>b", reverse: true, tone: "ok", caption: "Done.", mark: [{ node: "b", state: null }] },
      ],
    },
    {
      id: "grow",
      name: "Add node D",
      steps: [
        { edge: "slot>d", caption: "Node D joins empty. The operator hands it about a quarter of the slots, roughly 1,365 from each of A, B and C.", mark: [{ node: "d", state: "busy" }] },
        { edge: "c>d", caption: "Slot by slot, the keys inside a slot are copied across. Only those slots move; no key is rehashed.", ms: 1500 },
        {
          edge: "slot>d",
          tone: "ok",
          caption: "Key to slot is unchanged; only the slot to node table changed. About 25% of the data moved, not 75%.",
          mark: [{ node: "d", state: "ok" }],
        },
      ],
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Cross-shard queries and transactions                                 */
/* ------------------------------------------------------------------ */

export const scatterTail: FlowSpec = {
  id: "scatter-tail",
  title: "Scatter-gather and its slow shard",
  description:
    "A coordinator fans one query out to every shard and merges the answers. A summary table avoids the fan-out for hot paths.",
  nodes: [
    { id: "app", label: "App", kind: "service", col: 0, row: 1 },
    { id: "coord", label: "Coordinator", kind: "gateway", col: 1, row: 1, sub: "merge" },
    { id: "s0", label: "Shard 0", kind: "database", col: 3, row: 0 },
    { id: "s1", label: "Shard 1", kind: "database", col: 3, row: 1 },
    { id: "s2", label: "Shard 2", kind: "database", col: 3, row: 2, sub: "slow today" },
    { id: "sum", label: "Top-10 table", kind: "cache", col: 3, row: 3, sub: "precomputed" },
  ],
  edges: [
    { from: "app", to: "coord" },
    { from: "coord", to: "s0" },
    { from: "coord", to: "s1" },
    { from: "coord", to: "s2" },
    { from: "coord", to: "sum", label: "read" },
  ],
  scenarios: [
    {
      id: "fan",
      name: "Fan out",
      steps: [
        { edge: "app>coord", caption: "Top 10 products by sales. No shard key in the query, so every shard may hold part of the answer." },
        {
          edge: "coord>s0",
          caption: "The coordinator asks each shard for its own top 10, in parallel.",
          with: [{ edge: "coord>s1", caption: "" }, { edge: "coord>s2", caption: "" }],
          mark: [{ node: "s0", state: "busy" }, { node: "s1", state: "busy" }, { node: "s2", state: "busy" }],
        },
        {
          edge: "coord>s0",
          reverse: true,
          tone: "ok",
          caption: "Three lists of 10 come back. It merges 30 rows and keeps the best 10.",
          with: [{ edge: "coord>s1", reverse: true, tone: "ok", caption: "" }, { edge: "coord>s2", reverse: true, tone: "ok", caption: "" }],
          mark: [{ node: "s0", state: null }, { node: "s1", state: null }, { node: "s2", state: null }],
        },
      ],
    },
    {
      id: "slow",
      name: "One slow shard",
      steps: [
        {
          edge: "coord>s0",
          caption: "Same query. Shard 2 is in a slow moment: a vacuum, a cold cache, a noisy neighbour.",
          with: [{ edge: "coord>s1", caption: "" }, { edge: "coord>s2", caption: "" }],
          mark: [{ node: "s2", state: "down" }],
        },
        {
          edge: "coord>s0",
          reverse: true,
          caption: "Shards 0 and 1 answer in 10 ms.",
          with: [{ edge: "coord>s1", reverse: true, caption: "" }],
        },
        {
          edge: "coord>s2",
          reverse: true,
          tone: "error",
          caption: "Shard 2 answers after 800 ms, and the whole query waits for it. The slowest shard sets the latency.",
          ms: 1800,
          mark: [{ node: "s2", state: null }],
        },
      ],
    },
    {
      id: "summary",
      name: "Precomputed fix",
      steps: [
        { edge: "app>coord", caption: "For a hot path, do not fan out. A background job keeps the top 10 in a small table, updated from events." },
        {
          edge: "coord>sum",
          caption: "One read from one place: no fan-out, no slowest-shard problem. The answer may be a few seconds old.",
          mark: [{ node: "sum", state: "hit" }],
        },
        { edge: "app>coord", reverse: true, tone: "ok", caption: "Fast and stable.", mark: [{ node: "sum", state: null }] },
      ],
    },
  ],
};

export const globalIndex: SequenceSpec = {
  id: "global-index",
  title: "A global secondary index",
  description:
    "Login by email has no user_id, so a small index sharded by email says which user shard to ask. Writes must keep the index in step.",
  actors: [
    { id: "app", label: "App", kind: "service" },
    { id: "idx", label: "Email index", kind: "database" },
    { id: "shard", label: "User shard", kind: "database" },
  ],
  items: [
    {
      alt: [
        {
          when: "login by email",
          items: [
            { from: "app", to: "idx", label: "email ana@x.com?" },
            { from: "idx", to: "app", label: "user_id 42", type: "reply" },
            { note: "hash(42) picks the shard: one lookup, not 64", over: ["app", "shard"] },
            { from: "app", to: "shard", label: "SELECT user 42" },
            { from: "shard", to: "app", label: "row", type: "reply" },
          ],
        },
        {
          when: "signup write",
          items: [
            { from: "app", to: "shard", label: "INSERT user 42" },
            { from: "app", to: "idx", label: "PUT email to 42", type: "async" },
            { note: "Two stores, no shared transaction: the index can lag, or miss if the app crashes between the writes", over: ["idx", "shard"] },
          ],
        },
        {
          when: "index lagging",
          items: [
            { from: "app", to: "idx", label: "email new@x.com?" },
            { from: "idx", to: "app", label: "not found (yet)", type: "reply" },
            { note: "Fix: write through an outbox so the index always catches up, and retry the lookup once", over: ["app", "idx"] },
          ],
        },
      ],
    },
  ],
};

export const sagaOrder: SequenceSpec = {
  id: "saga-order",
  title: "A saga across shards",
  description:
    "Each step is a local transaction on one shard. If a later step fails, the earlier steps are undone by compensating actions.",
  actors: [
    { id: "orch", label: "Orchestrator", kind: "service" },
    { id: "stock", label: "Stock shard", kind: "database" },
    { id: "pay", label: "Payments shard", kind: "database" },
    { id: "orders", label: "Orders shard", kind: "database" },
  ],
  items: [
    { from: "orch", to: "stock", label: "reserve 1 item" },
    { from: "stock", to: "orch", label: "reserved", type: "reply" },
    {
      alt: [
        {
          when: "all steps work",
          items: [
            { from: "orch", to: "pay", label: "charge 20 dollars" },
            { from: "pay", to: "orch", label: "charged", type: "reply" },
            { from: "orch", to: "orders", label: "create order" },
            { from: "orders", to: "orch", label: "created", type: "reply" },
          ],
        },
        {
          when: "payment fails",
          items: [
            { from: "orch", to: "pay", label: "charge 20 dollars" },
            { from: "pay", to: "orch", label: "card declined", type: "reply" },
            { note: "No rollback exists across shards, so undo by hand", over: ["orch", "stock"] },
            { from: "orch", to: "stock", label: "release the item" },
            { from: "stock", to: "orch", label: "released", type: "reply" },
          ],
        },
      ],
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Hot spots                                                            */
/* ------------------------------------------------------------------ */

export const hotKeySalt: FlowSpec = {
  id: "hot-key-salt",
  title: "Salting a hot key",
  description:
    "One celebrity counter takes every like on a single node. Salting writes to a random one of N sub-keys and sums them when reading.",
  nodes: [
    { id: "fans", label: "Fans", kind: "client", col: 0, row: 1.5 },
    { id: "app", label: "App", kind: "service", col: 1, row: 1.5 },
    { id: "hot", label: "likes:42", kind: "cache", col: 3, row: 0, sub: "one key, one node" },
    { id: "k0", label: "likes:42:0", kind: "cache", col: 3, row: 1, sub: "node 1" },
    { id: "k1", label: "likes:42:1", kind: "cache", col: 3, row: 2, sub: "node 2" },
    { id: "k2", label: "likes:42:15", kind: "cache", col: 3, row: 3, sub: "node 3" },
  ],
  edges: [
    { from: "fans", to: "app" },
    { from: "app", to: "hot", label: "all" },
    { from: "app", to: "k0" },
    { from: "app", to: "k1" },
    { from: "app", to: "k2" },
  ],
  scenarios: [
    {
      id: "problem",
      name: "The problem",
      steps: [
        { edge: "fans>app", caption: "A celebrity posts. 160,000 likes a second arrive for one post.", with: [{ edge: "fans>app", caption: "" }] },
        {
          edge: "app>hot",
          tone: "error",
          caption: "All of them increment the same key, so the same node. If one node tops out near 100,000 operations a second, it melts while the cluster idles.",
          with: [{ edge: "app>hot", tone: "error", caption: "" }, { edge: "app>hot", tone: "error", caption: "" }],
          mark: [{ node: "hot", state: "down" }],
        },
      ],
    },
    {
      id: "fix",
      name: "Salted writes",
      steps: [
        { edge: "fans>app", caption: "Same burst. The app adds a random suffix from 0 to 15 to the key." },
        {
          edge: "app>k0",
          tone: "ok",
          caption: "Each like goes to a random one of 16 sub-keys, which hash to different nodes. About 10,000 a second each.",
          with: [{ edge: "app>k1", tone: "ok", caption: "" }, { edge: "app>k2", tone: "ok", caption: "" }],
          mark: [{ node: "hot", state: null }, { node: "k0", state: "ok" }, { node: "k1", state: "ok" }, { node: "k2", state: "ok" }],
        },
      ],
    },
    {
      id: "read",
      name: "Summed reads",
      steps: [
        { edge: "fans>app", caption: "Someone opens the post and needs the like count." },
        {
          edge: "app>k0",
          caption: "The app reads all 16 sub-keys and adds them up. A read now costs 16 times more.",
          with: [{ edge: "app>k1", caption: "" }, { edge: "app>k2", caption: "" }],
        },
        {
          edge: "fans>app",
          reverse: true,
          caption: "So salt only keys you have measured as hot, and cache the summed count for a second.",
          mark: [{ node: "k0", state: null }, { node: "k1", state: null }, { node: "k2", state: null }],
        },
      ],
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Resharding                                                           */
/* ------------------------------------------------------------------ */

export const logicalShards: FlowSpec = {
  id: "logical-shards",
  title: "Logical shards on few machines",
  description:
    "Keys hash into 256 logical shards that never change. Machines own logical shards, so growing moves a few of them and rehashes nothing.",
  nodes: [
    { id: "key", label: "Key", kind: "client", col: 0, row: 1.5 },
    { id: "logical", label: "Logical shard", kind: "gateway", col: 1, row: 1.5, sub: "hash mod 256" },
    { id: "a", label: "Machine A", kind: "database", col: 3, row: 0, sub: "0 to 84" },
    { id: "b", label: "Machine B", kind: "database", col: 3, row: 1, sub: "85 to 170" },
    { id: "c", label: "Machine C", kind: "database", col: 3, row: 2, sub: "171 to 255" },
    { id: "d", label: "Machine D", kind: "database", col: 3, row: 3, sub: "new, empty" },
  ],
  edges: [
    { from: "key", to: "logical" },
    { from: "logical", to: "a" },
    { from: "logical", to: "b" },
    { from: "logical", to: "c" },
    { from: "logical", to: "d" },
    { from: "c", to: "d", label: "move", style: "async" },
  ],
  scenarios: [
    {
      id: "route",
      name: "Route a key",
      steps: [
        { edge: "key>logical", caption: "hash(42) mod 256 is 106, so user 42 is in logical shard 106. That number never changes for this user." },
        {
          edge: "logical>b",
          caption: "A table says logical shards 85 to 170 live on machine B, so that is where the row is.",
          mark: [{ node: "b", state: "ok" }],
        },
        { edge: "logical>b", reverse: true, tone: "ok", caption: "Done.", mark: [{ node: "b", state: null }] },
      ],
    },
    {
      id: "grow",
      name: "Add machine D",
      steps: [
        { edge: "logical>d", caption: "Machine D joins. A quarter of 256 is 64 logical shards, so it takes about 21 from each of A, B and C.", mark: [{ node: "d", state: "busy" }] },
        { edge: "c>d", caption: "Whole logical shards are copied over with the dual-write and backfill steps. Each is a small, separate job.", ms: 1500 },
        {
          edge: "logical>d",
          tone: "ok",
          caption: "Flip the table entry for each finished shard. Hash mod 256 is untouched, and 25% of the data moved, not 75%.",
          mark: [{ node: "d", state: "ok" }],
        },
      ],
    },
  ],
};

export const backfillRace: SequenceSpec = {
  id: "backfill-race",
  title: "Backfill versus dual-write",
  description:
    "A backfill job copies old rows while live writes go to both shards. A naive copy can overwrite a newer value with an older one.",
  actors: [
    { id: "app", label: "App", kind: "service" },
    { id: "job", label: "Backfill job", kind: "worker" },
    { id: "old", label: "Old shard", kind: "database" },
    { id: "new", label: "New shard", kind: "database" },
  ],
  items: [
    { from: "job", to: "old", label: "read row 42 (v1)" },
    { from: "app", to: "old", label: "write row 42 (v2)" },
    { from: "app", to: "new", label: "dual-write row 42 (v2)" },
    {
      alt: [
        {
          when: "naive copy",
          items: [
            { from: "job", to: "new", label: "INSERT row 42 (v1)" },
            { note: "The old v1 lands after v2 and wins: the new shard silently holds stale data", over: ["job", "new"] },
          ],
        },
        {
          when: "versioned upsert",
          items: [
            { from: "job", to: "new", label: "UPSERT row 42 (v1) if newer" },
            { from: "new", to: "job", label: "ignored: has v2", type: "reply" },
            { note: "Safe to replay any time, so a crashed job just restarts. Verify with checksums before flipping", over: ["job", "new"] },
          ],
        },
      ],
    },
  ],
};
