import type { DecisionSpec, FlowSpec, SequenceSpec } from "@/components/diagram/types";

export const storeChooser: DecisionSpec = {
  id: "store-chooser",
  title: "Which store fits this data?",
  start: "relations",
  nodes: {
    relations: { q: "Needs relations, constraints or multi-row transactions?", yes: "postgres", no: "files" },
    postgres: {
      result: "PostgreSQL (relational)",
      why: "ACID transactions, foreign keys and joins keep money, orders and users correct. Scale reads with replicas before you think about sharding.",
      href: "/learn/databases-scaling",
    },
    files: { q: "Large files: images, video, documents?", yes: "s3", no: "keyLookups" },
    s3: {
      result: "S3 + CDN",
      why: "Object storage is cheap, durable and effectively unlimited, and a CDN serves it close to users. Keep only the key and metadata in your database.",
      href: "/learn/caching",
    },
    keyLookups: { q: "Only lookups by key, at huge scale or very low latency?", yes: "kv", no: "documents" },
    kv: {
      result: "Redis or DynamoDB",
      why: "Single-key reads and writes in about a millisecond. Redis for sessions, carts, counters and caches; DynamoDB when the data must be durable at any scale.",
      href: "/deep-dives/caching-techniques",
    },
    documents: { q: "Flexible entities that are read as a whole?", yes: "mongo", no: "timeOrdered" },
    mongo: {
      result: "MongoDB (document)",
      why: "One document per entity with its bounded children embedded, so a catalog item and its varying attributes come back in one read.",
      href: "/learn/databases-scaling",
    },
    timeOrdered: { q: "Write-heavy and read by key in time order?", yes: "cassandra", no: "search" },
    cassandra: {
      result: "Cassandra (wide-column)",
      why: "Partition by entity, sort by time: cheap appends at a huge write rate, like chat messages or sensor readings.",
      href: "/questions/chat",
    },
    search: { q: "Full-text search or relevance ranking?", yes: "elastic", no: "analytics" },
    elastic: {
      result: "Elasticsearch",
      why: "Inverted indexes give fuzzy matching, relevance and facets. Feed it from the source of truth with CDC or the outbox; never write to it first.",
      href: "/learn/async-messaging",
    },
    analytics: { q: "Aggregations over billions of events?", yes: "clickhouse", no: "pgDefault" },
    clickhouse: {
      result: "ClickHouse (columnar)",
      why: "Column storage scans and aggregates billions of rows per second. It keeps dashboards off your transactional database.",
      href: "/learn/case-url-shortener",
    },
    pgDefault: {
      result: "PostgreSQL (the default)",
      why: "Nothing about this data is unusual, so pick the boring, well-understood option. JSONB columns cover the occasional flexible field.",
      href: "/learn/databases-scaling",
    },
  },
};

export const polyglotShop: FlowSpec = {
  id: "polyglot-shop",
  title: "Polyglot e-commerce: where each fact lives",
  description:
    "Postgres owns orders, payments, prices and stock; MongoDB the catalog; Redis sessions and carts; S3 behind a CDN the images. CDC streams changes through Kafka into Elasticsearch for search and ClickHouse for analytics.",
  nodes: [
    { id: "client", label: "Client", kind: "client", col: 0, row: 1 },
    { id: "app", label: "App", kind: "service", col: 1, row: 1, sub: "API" },
    { id: "redis", label: "Redis", kind: "cache", col: 2, row: 0, sub: "sessions, carts" },
    { id: "postgres", label: "Postgres", kind: "database", col: 2, row: 1, sub: "orders, prices", note: "Source of truth for money: orders, payments, prices and stock." },
    { id: "mongo", label: "MongoDB", kind: "database", col: 2, row: 2, sub: "catalog", note: "Product descriptions and attributes, which vary by category." },
    { id: "cdn", label: "CDN", kind: "cdn", col: 0, row: 3, sub: "images" },
    { id: "s3", label: "S3", kind: "storage", col: 1, row: 3, sub: "originals" },
    { id: "cdc", label: "CDC (Debezium)", kind: "worker", col: 3, row: 1, sub: "reads the logs", note: "Tails the Postgres WAL and MongoDB change streams and publishes every committed change." },
    { id: "kafka", label: "Kafka", kind: "queue", col: 4, row: 1, sub: "change events" },
    { id: "es", label: "Elasticsearch", kind: "search", col: 5, row: 0, sub: "product search" },
    { id: "clickhouse", label: "ClickHouse", kind: "database", col: 5, row: 2, sub: "analytics" },
  ],
  edges: [
    { from: "client", to: "app" },
    { from: "app", to: "redis" },
    { from: "app", to: "postgres" },
    { from: "app", to: "mongo" },
    { from: "client", to: "cdn", label: "images" },
    { from: "cdn", to: "s3", label: "on miss" },
    { from: "postgres", to: "cdc", label: "WAL", style: "async" },
    { from: "mongo", to: "cdc", style: "async" },
    { from: "cdc", to: "kafka", style: "async" },
    { from: "kafka", to: "es", label: "indexer", style: "async" },
    { from: "kafka", to: "clickhouse", label: "sink", style: "async" },
  ],
  scenarios: [
    {
      id: "view",
      name: "Viewing a product",
      steps: [
        { edge: "client>app", caption: "A shopper opens the page for SKU a1." },
        { edge: "app>redis", caption: "The session and cart come from Redis in about a millisecond." },
        { edge: "app>redis", reverse: true, tone: "ok", caption: "Session found.", mark: [{ node: "redis", state: "hit" }] },
        { edge: "app>mongo", caption: "The product document (title, description, attributes) comes from MongoDB in one read." },
        { edge: "app>postgres", caption: "Price and stock come from Postgres, the source of truth for anything that touches money." },
        { edge: "client>app", reverse: true, caption: "The page comes back with image URLs pointing at the CDN.", mark: [{ node: "redis", state: null }] },
        { edge: "client>cdn", caption: "The browser loads the images from the nearest CDN edge." },
        { edge: "cdn>s3", tone: "miss", caption: "On a CDN miss, the edge fetches the original from S3 once and caches it for everyone after.", mark: [{ node: "cdn", state: "miss" }] },
        { edge: "client>cdn", reverse: true, tone: "ok", caption: "Image delivered. Your servers never handled a single byte of it.", mark: [{ node: "cdn", state: null }] },
      ],
    },
    {
      id: "price-change",
      name: "A price change propagates",
      steps: [
        { edge: "client>app", caption: "An admin lowers the price of SKU a1 from 499 to 449." },
        { edge: "app>postgres", caption: "The app updates the price in Postgres, and only there: it is the one source of truth for prices." },
        {
          edge: "app>redis",
          caption: "It deletes the cached product key, so the next page view loads the new price.",
          mark: [{ node: "redis", state: "miss" }],
        },
        { edge: "postgres>cdc", caption: "Debezium reads the committed change from Postgres's write-ahead log. The app never writes to search or analytics itself." },
        { edge: "cdc>kafka", caption: "The change is published to the product-changes topic in Kafka." },
        {
          edge: "kafka>es",
          caption: "An indexer updates the product's search document; a sink appends a price-change event to ClickHouse.",
          with: [{ edge: "kafka>clickhouse", caption: "" }],
          mark: [{ node: "es", state: "ok" }],
        },
        {
          edge: "client>app",
          reverse: true,
          tone: "ok",
          caption: "Within a second or two, search shows 449. Elasticsearch and ClickHouse can always be rebuilt from Postgres and Kafka.",
          mark: [{ node: "redis", state: null }, { node: "es", state: null }],
        },
      ],
    },
    {
      id: "checkout",
      name: "Checkout",
      steps: [
        { edge: "client>app", caption: "The shopper checks out." },
        { edge: "app>redis", caption: "The app reads the cart from Redis." },
        {
          edge: "app>postgres",
          caption: "One transaction decrements stock (checking the row count) and inserts the order. Stock and money need ACID.",
          mark: [{ node: "postgres", state: "busy" }],
        },
        { edge: "app>postgres", reverse: true, tone: "ok", caption: "Committed.", mark: [{ node: "postgres", state: null }] },
        { edge: "app>redis", caption: "The cart key is deleted." },
        { edge: "postgres>cdc", caption: "The committed order flows out through CDC…" },
        { edge: "cdc>kafka", caption: "…into Kafka, where any number of consumers can read it." },
        {
          edge: "kafka>clickhouse",
          caption: "ClickHouse appends it to the orders table, so sales dashboards update without a single query on Postgres.",
          mark: [{ node: "clickhouse", state: "ok" }],
        },
        { edge: "client>app", reverse: true, tone: "ok", caption: "Order confirmed.", mark: [{ node: "clickhouse", state: null }] },
      ],
    },
  ],
};

/* ---------- One diagram per store family ---------- */

export const relationalAcid: FlowSpec = {
  id: "relational-acid",
  title: "Relational: one transaction, many readers",
  description:
    "The app changes stock and the order in one transaction on the primary. Reads that can tolerate a few milliseconds of lag go to a replica.",
  nodes: [
    { id: "client", label: "Client", kind: "client", col: 0, row: 1 },
    { id: "app", label: "App", kind: "service", col: 1, row: 1 },
    { id: "primary", label: "Postgres", kind: "database", col: 2, row: 0, sub: "primary", note: "Takes every write. One machine, so write scale is vertical." },
    { id: "replica", label: "Replica", kind: "database", col: 2, row: 2, sub: "reads", note: "A copy fed by the write-ahead log. It adds read capacity, not write capacity." },
  ],
  edges: [
    { from: "client", to: "app" },
    { from: "app", to: "primary", label: "write" },
    { from: "primary", to: "replica", label: "WAL", style: "replication" },
    { from: "app", to: "replica", label: "read" },
  ],
  scenarios: [
    {
      id: "commit",
      name: "Checkout commits",
      steps: [
        { edge: "client>app", caption: "A shopper buys 2 units of SKU a1 for 998." },
        { edge: "app>primary", caption: "BEGIN. Decrement stock where qty is at least 2, then insert the order.", mark: [{ node: "primary", state: "busy" }] },
        { edge: "app>primary", reverse: true, tone: "ok", caption: "COMMIT. Stock and order land together, or neither does.", mark: [{ node: "primary", state: null }] },
        { edge: "primary>replica", caption: "The log streams to the replica, usually within milliseconds." },
        { edge: "client>app", reverse: true, tone: "ok", caption: "Order confirmed." },
      ],
    },
    {
      id: "sold-out",
      name: "Out of stock",
      steps: [
        { edge: "client>app", caption: "A shopper buys the last unit, one second after someone else did." },
        { edge: "app>primary", caption: "The stock update says: qty minus 2 where qty is at least 2. No row matches.", mark: [{ node: "primary", state: "busy" }] },
        {
          edge: "app>primary",
          reverse: true,
          tone: "error",
          caption: "Zero rows changed, so the app rolls back. No order exists and stock is untouched.",
          mark: [{ node: "primary", state: null }],
        },
        { edge: "client>app", reverse: true, tone: "error", caption: "Sold out. No oversell, and no cleanup job to write." },
      ],
    },
    {
      id: "replica-read",
      name: "Scale reads",
      steps: [
        { edge: "client>app", caption: "A shopper opens their order history." },
        { edge: "app>replica", caption: "History is read from the replica, so the primary keeps its capacity for writes." },
        { edge: "app>replica", reverse: true, tone: "ok", caption: "Rows come back. Right after a write, a replica can be a few milliseconds behind, so read your own writes from the primary." },
      ],
    },
  ],
};

export const documentModel: FlowSpec = {
  id: "document-model",
  title: "Document: embed what is read together",
  description:
    "An order and its line items are one document, read in one lookup. Reviews are unbounded, so they live in their own collection.",
  nodes: [
    { id: "client", label: "Client", kind: "client", col: 0, row: 1 },
    { id: "app", label: "App", kind: "service", col: 1, row: 1 },
    { id: "orders", label: "orders", kind: "database", col: 2, row: 0, sub: "items embedded", note: "One document per order, with its few line items inside." },
    { id: "reviews", label: "reviews", kind: "database", col: 2, row: 2, sub: "referenced", note: "One document per review, with a productId. A popular product can collect millions." },
  ],
  edges: [
    { from: "client", to: "app" },
    { from: "app", to: "orders" },
    { from: "app", to: "reviews" },
  ],
  scenarios: [
    {
      id: "one-read",
      name: "One read",
      steps: [
        { edge: "client>app", caption: "Show order 8841 with its items." },
        { edge: "app>orders", caption: "One lookup by id." },
        { edge: "app>orders", reverse: true, tone: "ok", caption: "The status, the total and every line item arrive together. No join, no second query.", mark: [{ node: "orders", state: "hit" }] },
        { edge: "client>app", reverse: true, caption: "Page rendered from one read.", mark: [{ node: "orders", state: null }] },
      ],
    },
    {
      id: "unbounded",
      name: "Unbounded children",
      steps: [
        { edge: "client>app", caption: "Show the latest reviews for a laptop." },
        { edge: "app>reviews", caption: "Reviews are separate documents with an index on productId and createdAt, because a document is capped at 16 MB." },
        { edge: "app>reviews", reverse: true, tone: "ok", caption: "The 20 newest come back from the index, not from a growing array inside the product." },
      ],
    },
  ],
};

export const keyValueLookups: FlowSpec = {
  id: "key-value-lookups",
  title: "Key-value: the key is the query",
  description:
    "Redis answers session and counter lookups from memory in about a millisecond. DynamoDB answers the queries its keys were designed for, and nothing else cheaply.",
  nodes: [
    { id: "client", label: "Client", kind: "client", col: 0, row: 1 },
    { id: "app", label: "App", kind: "service", col: 1, row: 1 },
    { id: "redis", label: "Redis", kind: "cache", col: 2, row: 0, sub: "~1 ms" },
    { id: "dynamo", label: "DynamoDB", kind: "database", col: 2, row: 2, sub: "any scale" },
  ],
  edges: [
    { from: "client", to: "app" },
    { from: "app", to: "redis", label: "GET" },
    { from: "app", to: "dynamo", label: "query" },
  ],
  scenarios: [
    {
      id: "session",
      name: "Session lookup",
      steps: [
        { edge: "client>app", caption: "A request arrives with the cookie sid=ab12." },
        { edge: "app>redis", caption: "GET session:ab12. The key is the whole question." },
        { edge: "app>redis", reverse: true, tone: "ok", caption: "The session comes back from memory in about 1 ms. It expires after 30 idle minutes.", mark: [{ node: "redis", state: "hit" }] },
      ],
    },
    {
      id: "latest-orders",
      name: "Latest orders",
      steps: [
        { edge: "client>app", caption: "Show this user's 20 latest orders." },
        { edge: "app>dynamo", caption: "Query partition USER#7 for sort keys starting ORDER#, newest first, limit 20." },
        { edge: "app>dynamo", reverse: true, tone: "ok", caption: "Twenty items from one partition, in single-digit milliseconds, whether the table holds a million items or a billion." },
      ],
    },
    {
      id: "no-key",
      name: "No key for it",
      steps: [
        { edge: "client>app", caption: "Finance asks for revenue by category last month." },
        { edge: "app>dynamo", tone: "error", caption: "No key was designed for that, so the only option is a Scan of every item in the table." },
        { edge: "app>dynamo", reverse: true, tone: "error", caption: "It works, slowly and at the price of reading every item. Export the data to a columnar store for this question instead.", mark: [{ node: "dynamo", state: "busy" }] },
      ],
    },
  ],
};

export const wideColumnRing: FlowSpec = {
  id: "wide-column-ring",
  title: "Wide-column: partition by chat, sort by time",
  description:
    "Each chat-and-day partition lives on three nodes. Writes are appends, one chat read is one sequential read, and a query without the partition key must ask every node.",
  nodes: [
    { id: "client", label: "Client", kind: "client", col: 0, row: 1 },
    { id: "app", label: "Chat service", kind: "service", col: 1, row: 1 },
    { id: "a", label: "Node A", kind: "database", col: 2, row: 0, sub: "replica" },
    { id: "b", label: "Node B", kind: "database", col: 2, row: 1, sub: "replica" },
    { id: "c", label: "Node C", kind: "database", col: 2, row: 2, sub: "replica" },
  ],
  edges: [
    { from: "client", to: "app" },
    { from: "app", to: "a" },
    { from: "app", to: "b" },
    { from: "app", to: "c" },
  ],
  scenarios: [
    {
      id: "write",
      name: "Write a message",
      steps: [
        { edge: "client>app", caption: "Ana sends a message to chat 55." },
        {
          edge: "app>a",
          caption: "The partition key (chat 55, today) maps to nodes A, B and C. Each write is an append to a log and an in-memory table.",
          with: [{ edge: "app>b", caption: "" }, { edge: "app>c", caption: "" }],
        },
        {
          edge: "app>a",
          reverse: true,
          tone: "ok",
          caption: "Two of three acknowledge (a quorum), so the write succeeds even if node C is slow.",
          with: [{ edge: "app>b", reverse: true, tone: "ok", caption: "" }],
        },
      ],
    },
    {
      id: "read",
      name: "Read a chat",
      steps: [
        { edge: "client>app", caption: "Open chat 55." },
        { edge: "app>b", caption: "The latest 50 messages sit in one partition, already sorted newest first: one sequential read on one node." },
        { edge: "app>b", reverse: true, tone: "ok", caption: "Fifty rows come back from a single node.", mark: [{ node: "b", state: "hit" }] },
      ],
    },
    {
      id: "no-partition-key",
      name: "No partition key",
      steps: [
        { edge: "client>app", caption: "Find every message sent by ana, across all chats." },
        {
          edge: "app>a",
          tone: "error",
          caption: "The sender is not in the partition key, so every node must be asked.",
          with: [{ edge: "app>b", tone: "error", caption: "" }, { edge: "app>c", tone: "error", caption: "" }],
        },
        {
          edge: "app>a",
          reverse: true,
          tone: "error",
          caption: "The slowest node sets the latency. Keep a second table keyed by sender, written alongside the first.",
          with: [{ edge: "app>b", reverse: true, tone: "error", caption: "" }, { edge: "app>c", reverse: true, tone: "error", caption: "" }],
        },
      ],
    },
  ],
};

export const columnarEvents: FlowSpec = {
  id: "columnar-events",
  title: "Columnar: append in batches, scan few columns",
  description:
    "Events flow through Kafka and are inserted in large batches. A dashboard reads only the columns it needs. A single-row update is the one thing it dislikes.",
  nodes: [
    { id: "apps", label: "Apps", kind: "service", col: 0, row: 1, sub: "~2,300 events/s" },
    { id: "kafka", label: "Kafka", kind: "queue", col: 1, row: 1 },
    { id: "ch", label: "ClickHouse", kind: "database", col: 2, row: 1, sub: "columnar" },
    { id: "dash", label: "Dashboard", kind: "client", col: 3, row: 1 },
  ],
  edges: [
    { from: "apps", to: "kafka", label: "events", style: "async" },
    { from: "kafka", to: "ch", label: "batch", style: "async" },
    { from: "dash", to: "ch", label: "query" },
  ],
  scenarios: [
    {
      id: "ingest",
      name: "Batched ingest",
      steps: [
        { edge: "apps>kafka", caption: "200 million events a day is about 2,300 a second on average. Producers publish each one to Kafka." },
        { edge: "kafka>ch", caption: "A sink inserts thousands of rows per insert, never one row at a time, so each insert writes a few big sorted parts.", mark: [{ node: "ch", state: "ok" }] },
      ],
    },
    {
      id: "dashboard",
      name: "Hourly dashboard",
      steps: [
        { edge: "dash>ch", caption: "Orders per hour over the last day." },
        { edge: "dash>ch", reverse: true, tone: "ok", caption: "Only the type and ts columns of one day are read. The other six columns are never touched.", mark: [{ node: "ch", state: "hit" }] },
      ],
    },
    {
      id: "point-update",
      name: "Point update",
      steps: [
        { edge: "dash>ch", tone: "error", caption: "Someone runs an UPDATE to fix one row." },
        { edge: "dash>ch", reverse: true, tone: "error", caption: "Stored parts are immutable, so the engine rewrites whole parts in the background. Append a correcting event instead.", mark: [{ node: "ch", state: "busy" }] },
      ],
    },
  ],
};

export const graphHops: SequenceSpec = {
  id: "graph-hops",
  title: "Graph: hops are pointers, not joins",
  description:
    "Two hops are fine as a join in Postgres. At four hops the join fan-out explodes, and a graph store follows links node to node instead.",
  actors: [
    { id: "app", label: "App", kind: "service" },
    { id: "pg", label: "Postgres", kind: "database" },
    { id: "graph", label: "Graph store", kind: "database" },
  ],
  items: [
    { from: "app", to: "pg", label: "who do my friends follow?" },
    {
      alt: [
        {
          when: "2 hops, Postgres",
          items: [
            { note: "With 200 friends each, 2 hops is 200 x 200 = 40,000 paths. Fine.", over: ["app", "pg"] },
            { from: "pg", to: "app", label: "edges joined twice, ms", type: "reply" },
          ],
        },
        {
          when: "4 hops, Postgres",
          items: [
            { note: "200 to the 4th power is 1.6 billion candidate paths, before dedupe.", over: ["app", "pg"] },
            { from: "pg", to: "app", label: "edge table joined 4 times, too slow", type: "reply" },
          ],
        },
        {
          when: "4 hops, graph store",
          items: [
            { from: "app", to: "graph", label: "MATCH 4 hops from me" },
            { note: "Each hop follows stored links from a node, not a join over the whole edge table.", over: ["graph"] },
            { from: "graph", to: "app", label: "paths found", type: "reply" },
          ],
        },
      ],
    },
  ],
};

export const searchPipeline: FlowSpec = {
  id: "search-pipeline",
  title: "Search: a derived index with a delay",
  description:
    "Queries go to Elasticsearch for ranking, then the app loads full rows from Postgres. Changes reach the index through an indexer, about a second late.",
  nodes: [
    { id: "client", label: "Client", kind: "client", col: 0, row: 1 },
    { id: "app", label: "App", kind: "service", col: 1, row: 1 },
    { id: "es", label: "Elasticsearch", kind: "search", col: 2, row: 0, sub: "inverted index" },
    { id: "pg", label: "Postgres", kind: "database", col: 2, row: 2, sub: "source of truth" },
    { id: "indexer", label: "Indexer", kind: "worker", col: 3, row: 1, sub: "CDC consumer" },
  ],
  edges: [
    { from: "client", to: "app" },
    { from: "app", to: "es", label: "search" },
    { from: "app", to: "pg", label: "load" },
    { from: "pg", to: "indexer", label: "CDC", style: "async" },
    { from: "indexer", to: "es", label: "upsert", style: "async" },
  ],
  scenarios: [
    {
      id: "query",
      name: "A typo search",
      steps: [
        { edge: "client>app", caption: "A shopper types runnin shoos." },
        { edge: "app>es", caption: "Words are split, matched with typo tolerance and scored by relevance." },
        { edge: "app>es", reverse: true, tone: "ok", caption: "Ranked ids come back, with facet counts (brand, size) in the same call.", mark: [{ node: "es", state: "hit" }] },
        { edge: "app>pg", caption: "The app loads the live price and stock for those ids from Postgres, so the page never shows a stale price." },
        { edge: "client>app", reverse: true, caption: "Results rendered.", mark: [{ node: "es", state: null }] },
      ],
    },
    {
      id: "sync",
      name: "A price change",
      steps: [
        { edge: "pg>indexer", caption: "The price of SKU a1 changed in Postgres. CDC publishes the committed change.", mark: [{ node: "es", state: "miss" }] },
        { edge: "indexer>es", caption: "The indexer upserts the document with the row version, so replays and out-of-order events are harmless." },
        { edge: "indexer>es", reverse: true, tone: "ok", caption: "Visible to search after the next refresh, about a second later. Eventually consistent by design.", mark: [{ node: "es", state: "ok" }] },
      ],
    },
    {
      id: "rebuild",
      name: "Rebuild",
      steps: [
        { edge: "pg>indexer", caption: "The index is corrupted, or the mapping must change. Nothing is lost, because Postgres still has everything." },
        { edge: "indexer>es", caption: "Reindex from the source of truth into a fresh index, then switch an alias to it.", mark: [{ node: "es", state: "ok" }] },
      ],
    },
  ],
};

export const objectUpload: FlowSpec = {
  id: "object-upload",
  title: "Object storage: bytes in S3, key in Postgres",
  description:
    "The browser uploads straight to S3 with a short-lived signed URL. Postgres stores only the key. A CDN serves the file back.",
  nodes: [
    { id: "client", label: "Browser", kind: "client", col: 0, row: 1 },
    { id: "app", label: "App", kind: "service", col: 1, row: 0 },
    { id: "pg", label: "Postgres", kind: "database", col: 2, row: 0, sub: "key + metadata" },
    { id: "cdn", label: "CDN", kind: "cdn", col: 1, row: 2 },
    { id: "s3", label: "S3", kind: "storage", col: 2, row: 1, sub: "the bytes" },
  ],
  edges: [
    { from: "client", to: "app", label: "sign" },
    { from: "app", to: "pg", label: "key" },
    { from: "client", to: "cdn", label: "GET" },
    { from: "cdn", to: "s3", label: "miss" },
    { from: "client", to: "s3", label: "PUT" },
  ],
  scenarios: [
    {
      id: "upload",
      name: "Upload a photo",
      steps: [
        { edge: "client>app", caption: "The browser asks to upload a 3 MB JPEG. The app checks the type and picks the key u/7/abc." },
        { edge: "client>app", reverse: true, caption: "It returns a signed URL valid for 5 minutes. The app never touches the file." },
        { edge: "client>s3", caption: "The browser PUTs the 3 MB directly to S3.", mark: [{ node: "s3", state: "busy" }] },
        { edge: "client>s3", reverse: true, tone: "ok", caption: "Stored. S3 is designed for 99.999999999% durability.", mark: [{ node: "s3", state: "ok" }] },
        { edge: "app>pg", caption: "The app saves the key and metadata in Postgres: a few hundred bytes, not 3 MB.", mark: [{ node: "s3", state: null }] },
      ],
    },
    {
      id: "view",
      name: "View it later",
      steps: [
        { edge: "client>cdn", caption: "The page asks the CDN for the image." },
        { edge: "cdn>s3", tone: "miss", caption: "First request in a region: the edge fetches the original from S3.", mark: [{ node: "cdn", state: "miss" }] },
        { edge: "client>cdn", reverse: true, tone: "ok", caption: "Every later viewer is served from the edge. S3 and your servers see almost none of it.", mark: [{ node: "cdn", state: "hit" }] },
      ],
    },
  ],
};

/* ---------- What goes wrong ---------- */

export const oneStoreForAll: FlowSpec = {
  id: "one-store-for-all",
  title: "One database for everything: the Monday report",
  description:
    "An analyst's scan and a shopper's checkout fight over the same Postgres. Streaming changes to a columnar copy separates them.",
  nodes: [
    { id: "shopper", label: "Shopper", kind: "client", col: 0, row: 0 },
    { id: "app", label: "App", kind: "service", col: 1, row: 0 },
    { id: "pg", label: "Postgres", kind: "database", col: 2, row: 0, sub: "orders" },
    { id: "analyst", label: "Analyst", kind: "client", col: 0, row: 2 },
    { id: "ch", label: "ClickHouse", kind: "database", col: 2, row: 2, sub: "copy for scans" },
  ],
  edges: [
    { from: "shopper", to: "app" },
    { from: "app", to: "pg", label: "pay" },
    { from: "analyst", to: "pg", label: "report" },
    { from: "pg", to: "ch", label: "CDC", style: "async" },
    { from: "analyst", to: "ch", label: "report" },
  ],
  scenarios: [
    {
      id: "monday",
      name: "Monday 9 am",
      steps: [
        { edge: "analyst>pg", caption: "At 9:00 an analyst runs a revenue report over 100 million rows, with no limit.", mark: [{ node: "pg", state: "busy" }] },
        { edge: "shopper>app", caption: "A shopper taps Pay." },
        { edge: "app>pg", tone: "error", caption: "The checkout transaction waits behind the scan for disk and CPU.", mark: [{ node: "pg", state: "down" }] },
        { edge: "shopper>app", reverse: true, tone: "error", caption: "Checkout times out. The report and the lost sales happen in the same minute." },
      ],
    },
    {
      id: "fix",
      name: "The fix",
      steps: [
        { edge: "pg>ch", caption: "CDC streams every committed order into ClickHouse, a copy built for scans.", mark: [{ node: "pg", state: null }, { node: "ch", state: "ok" }] },
        { edge: "analyst>ch", caption: "The same report now runs on ClickHouse." },
        { edge: "analyst>ch", reverse: true, tone: "ok", caption: "Done, and Postgres never noticed." },
        { edge: "app>pg", tone: "ok", caption: "Checkout keeps its own machine, so its latency does not depend on who is reporting." },
      ],
    },
  ],
};

export const dualWrite: FlowSpec = {
  id: "dual-write",
  title: "Dual write vs outbox",
  description:
    "Writing the database and the search index in one request lets them drift apart. An outbox row in the same transaction lets a relay retry until the index catches up.",
  nodes: [
    { id: "app", label: "App", kind: "service", col: 0, row: 1 },
    { id: "pg", label: "Postgres", kind: "database", col: 1, row: 0, sub: "orders + outbox" },
    { id: "relay", label: "Relay", kind: "worker", col: 2, row: 0, sub: "retries" },
    { id: "es", label: "Elasticsearch", kind: "search", col: 3, row: 1 },
  ],
  edges: [
    { from: "app", to: "pg", label: "commit" },
    { from: "app", to: "es", label: "also index" },
    { from: "pg", to: "relay", label: "outbox", style: "async" },
    { from: "relay", to: "es", label: "upsert", style: "async" },
  ],
  scenarios: [
    {
      id: "dual",
      name: "Dual write",
      steps: [
        { edge: "app>pg", caption: "The app inserts order 9001 and commits." },
        { edge: "app>pg", reverse: true, tone: "ok", caption: "Committed. The order exists." },
        { edge: "app>es", tone: "error", caption: "Then it calls Elasticsearch to index the order. The call times out.", mark: [{ node: "es", state: "down" }] },
        { edge: "app>es", reverse: true, tone: "error", caption: "Nothing retries and nobody is told. The order exists but search will never show it." },
      ],
    },
    {
      id: "outbox",
      name: "Outbox",
      steps: [
        { edge: "app>pg", caption: "One transaction inserts the order and an outbox row. Both commit or neither does.", mark: [{ node: "es", state: null }] },
        { edge: "pg>relay", caption: "After the commit, a relay reads the new outbox rows." },
        { edge: "relay>es", tone: "error", caption: "The first index call fails.", mark: [{ node: "es", state: "down" }] },
        { edge: "relay>es", caption: "The relay retries until it succeeds. The upsert is idempotent, so a repeat is harmless.", mark: [{ node: "es", state: "ok" }] },
        { edge: "relay>es", reverse: true, tone: "ok", caption: "Search is a second or two late, never missing.", mark: [{ node: "es", state: null }] },
      ],
    },
  ],
};

export const hypePick: SequenceSpec = {
  id: "hype-pick",
  title: "Picking by hype: the first report",
  description:
    "A key-value store chosen for scale has no answer for the first question that is not a key lookup. Postgres answers it with one query.",
  actors: [
    { id: "pm", label: "Analyst", kind: "client" },
    { id: "svc", label: "Report job", kind: "service" },
    { id: "store", label: "The store", kind: "database" },
  ],
  items: [
    { from: "pm", to: "svc", label: "revenue by category, last month" },
    {
      alt: [
        {
          when: "DynamoDB, chosen for scale",
          items: [
            { from: "svc", to: "store", label: "Scan every item" },
            { note: "10M orders at 1 KB is 10 GB. A Scan returns 1 MB a page: about 10,000 sequential requests.", over: ["svc", "store"] },
            { from: "store", to: "svc", label: "all items, very slowly", type: "reply" },
            { from: "svc", to: "pm", label: "too slow, build a pipeline", type: "reply" },
          ],
        },
        {
          when: "Postgres, chosen by access pattern",
          items: [
            { from: "svc", to: "store", label: "SELECT ... GROUP BY category" },
            { note: "Joins and aggregates are what a relational engine is for.", over: ["store"] },
            { from: "store", to: "svc", label: "result", type: "reply" },
            { from: "svc", to: "pm", label: "the report", type: "reply" },
          ],
        },
      ],
    },
  ],
};

export const hotPartition: FlowSpec = {
  id: "hot-partition",
  title: "Hot partition: the wrong key",
  description:
    "A partition key that is the same for everyone sends every write to one partition. A key that varies spreads the load.",
  nodes: [
    { id: "client", label: "Clients", kind: "client", col: 0, row: 1, sub: "5,000 writes/s" },
    { id: "app", label: "App", kind: "service", col: 1, row: 1 },
    { id: "p1", label: "Partition 1", kind: "database", col: 2, row: 0 },
    { id: "p2", label: "Partition 2", kind: "database", col: 2, row: 1 },
    { id: "p3", label: "Partition 3", kind: "database", col: 2, row: 2 },
  ],
  edges: [
    { from: "client", to: "app" },
    { from: "app", to: "p1" },
    { from: "app", to: "p2" },
    { from: "app", to: "p3" },
  ],
  scenarios: [
    {
      id: "date-key",
      name: "Date as the key",
      steps: [
        { edge: "client>app", caption: "The table's partition key is today's date, so every order written today shares one key." },
        {
          edge: "app>p1",
          tone: "error",
          caption: "All 5,000 writes a second land on one partition. A partition accepts about 1,000 writes a second, so most are throttled.",
          with: [{ edge: "app>p1", tone: "error", caption: "" }, { edge: "app>p1", tone: "error", caption: "" }],
          mark: [{ node: "p1", state: "down" }],
        },
        { edge: "client>app", reverse: true, tone: "error", caption: "Errors and retries, while partitions 2 and 3 sit idle." },
      ],
    },
    {
      id: "user-key",
      name: "User id as the key",
      steps: [
        { edge: "client>app", caption: "The partition key is the user id, which varies on every request.", mark: [{ node: "p1", state: null }] },
        {
          edge: "app>p1",
          tone: "ok",
          caption: "Writes spread evenly: about 1,700 a second per partition across three, and more partitions as the table grows.",
          with: [{ edge: "app>p2", tone: "ok", caption: "" }, { edge: "app>p3", tone: "ok", caption: "" }],
          mark: [{ node: "p1", state: "ok" }, { node: "p2", state: "ok" }, { node: "p3", state: "ok" }],
        },
      ],
    },
  ],
};

export const postgresEnough: DecisionSpec = {
  id: "postgres-enough",
  title: "Is Postgres still enough?",
  start: "writes",
  nodes: {
    writes: { q: "More than about 10,000 sustained writes a second?", yes: "writeHeavy", no: "scans" },
    writeHeavy: {
      result: "Shard, or a write-first store",
      why: "One primary stops being the right tool. Shard Postgres (Citus, Vitess) if you need transactions, or use Cassandra or DynamoDB if access is by key.",
    },
    scans: { q: "Scans over 100M rows next to live traffic?", yes: "columnar", no: "text" },
    columnar: {
      result: "Replica, then ClickHouse",
      why: "Move reporting off the transactional machine. A replica is the first step; a columnar copy fed by CDC is the lasting one.",
    },
    text: { q: "Typo-tolerant search or facets over 1M+ documents?", yes: "searchStore", no: "files" },
    searchStore: {
      result: "Add Elasticsearch",
      why: "Postgres full-text search is enough for a small corpus. Typo tolerance, relevance and facets at scale are what a search engine is built for, fed from Postgres, which stays the truth.",
    },
    files: { q: "Files over about 1 MB?", yes: "s3", no: "stay" },
    s3: {
      result: "Add S3, key in Postgres",
      why: "Blobs bloat the database and its backups. Store the object in S3 and only its key in a row.",
    },
    stay: {
      result: "Stay on Postgres",
      why: "No number has crossed a line. One database is one backup, one on-call story and one set of transactions.",
    },
  },
};
