import type { DecisionSpec, FlowSpec } from "@/components/diagram/types";

export const architecture: FlowSpec = {
  id: "proximity-service-architecture",
  title: "Proximity service architecture",
  description:
    "Searches go to a location service that asks an in-memory geo index (replicated on several servers) for the closest business ids, then fetches their details from a cache. Business writes go to a database and a change feed, which an index builder applies to the geo index. Reads vastly outnumber writes, so the two paths are separate.",
  nodes: [
    { id: "app", label: "Mobile app", kind: "client", col: 0, row: 1, sub: "lat, lon, radius" },
    { id: "gw", label: "API gateway", kind: "gateway", col: 1, row: 1 },
    { id: "loc", label: "Location service", kind: "service", col: 2, row: 0, sub: "search, read-only", note: "Stateless. Takes a point and a radius, asks the geo index for candidate ids, and returns the nearest 20 with their details." },
    { id: "biz", label: "Business service", kind: "service", col: 2, row: 2, sub: "CRUD, details" },
    { id: "geo", label: "Geo index", kind: "cache", col: 3, row: 0, sub: "quadtree, 6 copies", note: "The whole index is about 2 GB, so every search server keeps a full copy in memory. Six copies across two zones give 17K queries a second plenty of headroom and survive a zone loss." },
    { id: "cache", label: "Business cache", kind: "cache", col: 3, row: 1, sub: "details by id" },
    { id: "db", label: "Business DB", kind: "database", col: 3, row: 2, sub: "primary + replicas" },
    { id: "feed", label: "Change feed", kind: "queue", col: 4, row: 1, sub: "adds, edits, deletes" },
    { id: "builder", label: "Index builder", kind: "worker", col: 4, row: 0, sub: "applies changes" },
  ],
  edges: [
    { from: "app", to: "gw", label: "HTTPS" },
    { from: "gw", to: "loc", label: "GET /search" },
    { from: "gw", to: "biz", label: "GET /businesses/:id" },
    { from: "loc", to: "geo", label: "nearest ids" },
    { from: "loc", to: "cache", label: "details (multi-get)" },
    { from: "biz", to: "cache", label: "read, invalidate" },
    { from: "biz", to: "db", label: "read, write" },
    { from: "cache", to: "db", label: "miss" },
    { from: "biz", to: "feed", label: "changed", style: "async" },
    { from: "feed", to: "builder", style: "async" },
    { from: "builder", to: "geo", label: "update leaves", style: "async" },
  ],
  scenarios: [
    {
      id: "search",
      name: "Search nearby",
      steps: [
        { edge: "app>gw", caption: "The user opens the app in San Francisco and asks for restaurants within 1 km." },
        { edge: "gw>loc", caption: "The gateway sends GET /search?lat=37.77&lon=-122.42&radius=1000 to any location server." },
        { edge: "loc>geo", caption: "The location server asks its in-memory quadtree: find the leaves that touch a 1 km circle, check exact distances, keep the closest 20." },
        { edge: "loc>geo", reverse: true, caption: "A few hundred businesses were examined out of 200 million. 20 ids come back, nearest first, with distances.", mark: [{ node: "geo", state: "hit" }] },
        { edge: "loc>cache", caption: "One multi-get fetches the name, photo, rating and hours of those 20 businesses." },
        { edge: "loc>cache", reverse: true, tone: "ok", caption: "All 20 are cached: the whole search took a few milliseconds, with no database call.", mark: [{ node: "cache", state: "hit" }] },
        { edge: "app>gw", reverse: true, tone: "ok", caption: "The app draws 20 results on the map." },
      ],
    },
    {
      id: "cache-miss",
      name: "A cold business",
      steps: [
        { edge: "loc>geo", caption: "A search returns 20 ids, one of them for a business nobody has looked at in weeks." },
        { edge: "loc>cache", caption: "The multi-get finds 19 of the 20 in the cache." },
        { edge: "cache>db", tone: "miss", caption: "The cache fetches the missing business from a read replica of the database.", mark: [{ node: "cache", state: "miss" }] },
        { edge: "cache>db", reverse: true, caption: "The row comes back and is cached with a one hour expiry." },
        { edge: "loc>cache", reverse: true, tone: "ok", caption: "All 20 are returned. The slow path added a few milliseconds for one result.", mark: [{ node: "cache", state: "hit" }] },
      ],
    },
    {
      id: "add-business",
      name: "Owner adds a business",
      steps: [
        { edge: "app>gw", caption: "A cafe owner submits a new listing with an address." },
        { edge: "gw>biz", caption: "The business service validates it and geocodes the address to a latitude and longitude." },
        { edge: "biz>db", caption: "The listing is written to the primary database. It is the source of truth.", mark: [{ node: "db", state: "ok" }] },
        { edge: "biz>feed", caption: "A change event is published: business 4711 added at (37.78, -122.41)." },
        { edge: "feed>builder", caption: "The index builder consumes the event." },
        { edge: "builder>geo", tone: "ok", caption: "It inserts the business into the right leaf on each index copy. If the leaf passes 100 businesses, it splits. The cafe shows up in searches within minutes.", mark: [{ node: "geo", state: "ok" }] },
      ],
    },
    {
      id: "rebuild",
      name: "An index server restarts",
      steps: [
        { edge: "loc>geo", tone: "error", caption: "One of the six search servers restarts. Its in-memory index is gone.", mark: [{ node: "geo", state: "down" }] },
        { edge: "gw>loc", caption: "The load balancer sends searches to the other five. Users notice nothing." },
        { edge: "builder>geo", caption: "The restarted server loads the latest snapshot of the index from object storage (built nightly), about 2 GB.", mark: [{ node: "geo", state: "busy" }] },
        { edge: "builder>geo", tone: "ok", caption: "It replays the change feed from the snapshot's offset to catch up, then rejoins the pool.", mark: [{ node: "geo", state: "ok" }] },
      ],
    },
  ],
};

export const pickIndex: DecisionSpec = {
  id: "proximity-service-decision",
  title: "Which geo index?",
  start: "dense",
  nodes: {
    dense: { q: "Is density very uneven (a big city next to empty countryside)?", yes: "memory", no: "geohash" },
    memory: { q: "Does the whole index fit in memory on every search server?", yes: "quadtree", no: "s2" },
    geohash: { result: "Geohash column + B-tree", why: "One indexed string column and a LIKE query. Simple, works in any database, and good when density is even enough." },
    quadtree: { result: "In-memory quadtree", why: "Leaves split only where businesses are dense, so every leaf holds about 100. About 2 GB for 200 million businesses, rebuilt nightly." },
    s2: { result: "S2 or H3 cells, sharded", why: "Fixed hierarchical cells with ids you can shard on. More moving parts, but the index is no longer limited by one machine's memory." },
  },
};
