import type { DecisionSpec, FlowSpec } from "@/components/diagram/types";

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
