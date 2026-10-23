import type { FlowSpec, SequenceSpec } from "@/components/diagram/types";

export const architecture: FlowSpec = {
  id: "distributed-cache-architecture",
  title: "Distributed cache architecture",
  description:
    "App servers use a cache client library. It first checks a tiny local cache for very hot keys, then picks the cache node for the key by rendezvous hashing and talks to it directly. On a miss the app loads from the database, with a single-flight guard so many identical misses become one read, then fills the cache with a jittered TTL.",
  nodes: [
    { id: "app", label: "App servers", kind: "service", col: 0, row: 1, sub: "cache client lib" },
    { id: "l1", label: "Local L1", kind: "cache", col: 1, row: 0, sub: "hot keys, 1 s", note: "A small in-process cache for keys that are being requested more than about 1,000 times a second. It keeps one hot key from overloading a single cache node." },
    { id: "cfg", label: "Node list", kind: "service", col: 1, row: 2, sub: "health + membership", note: "A small service (or etcd) that tells clients which cache nodes exist and which are healthy. Clients refresh it every few seconds." },
    { id: "a", label: "Cache node A", kind: "cache", col: 2, row: 0, sub: "32 GB, LRU" },
    { id: "b", label: "Cache node B", kind: "cache", col: 2, row: 1, sub: "32 GB, LRU" },
    { id: "c", label: "Cache node C", kind: "cache", col: 2, row: 2, sub: "32 GB, LRU" },
    { id: "db", label: "Database", kind: "database", col: 3, row: 1, sub: "~20K reads/s limit", note: "The source of truth. It can only handle about 20K reads a second, so the cache must absorb 98% of 1M reads a second." },
  ],
  edges: [
    { from: "app", to: "l1", label: "hot key?" },
    { from: "app", to: "a", label: "get / set" },
    { from: "app", to: "b", label: "get / set" },
    { from: "app", to: "c", label: "get / set" },
    { from: "app", to: "db", label: "on miss" },
    { from: "cfg", to: "app", label: "node list", style: "async" },
  ],
  scenarios: [
    {
      id: "hit",
      name: "Cache hit",
      steps: [
        { edge: "app>l1", caption: "A request for user:42. The client first checks its local cache: not a hot key, nothing there." },
        { edge: "app>b", caption: "Rendezvous hashing scores each node for 'user:42'. Node B scores highest, so the client asks B directly. There is no proxy hop." },
        { edge: "app>b", reverse: true, tone: "ok", caption: "Hit. The value comes back in under a millisecond; the database never hears about it.", mark: [{ node: "b", state: "hit" }] },
      ],
    },
    {
      id: "miss",
      name: "Miss and fill",
      steps: [
        { edge: "app>c", caption: "A request for product:9. Node C is the owner." },
        { edge: "app>c", reverse: true, tone: "miss", caption: "Miss: the key was never cached, or was evicted or expired.", mark: [{ node: "c", state: "miss" }] },
        { edge: "app>db", caption: "The app loads the row from the database." },
        { edge: "app>db", reverse: true, caption: "The row comes back after a few milliseconds." },
        { edge: "app>c", tone: "ok", caption: "The app stores it on node C with a one hour TTL, jittered by up to 10% so many keys do not expire together.", mark: [{ node: "c", state: "hit" }] },
      ],
    },
    {
      id: "stampede",
      name: "Thundering herd",
      steps: [
        { edge: "app>a", caption: "The key for the home page expires. In the next 10 ms, 1,000 requests for it arrive on this app server." },
        { edge: "app>a", reverse: true, tone: "miss", caption: "All 1,000 miss on node A.", mark: [{ node: "a", state: "miss" }] },
        { edge: "app>db", caption: "Single flight: the first miss starts one database read. The other 999 wait on that same read instead of starting their own.", mark: [{ node: "db", state: "busy" }] },
        { edge: "app>db", reverse: true, caption: "One row comes back. Without the guard, 1,000 identical queries would have hit a database that handles 20K a second in total.", mark: [{ node: "db", state: null }] },
        { edge: "app>a", tone: "ok", caption: "The value is cached once, and all 1,000 waiting requests are answered from it.", mark: [{ node: "a", state: "hit" }] },
      ],
    },
    {
      id: "node-down",
      name: "A cache node dies",
      steps: [
        { edge: "app>b", tone: "error", caption: "Node B crashes. Its 1/12th of the keys (about 8%) vanish from the cache.", mark: [{ node: "b", state: "down" }] },
        { edge: "cfg>app", caption: "Within seconds the node list marks B unhealthy. Clients stop choosing it." },
        { edge: "app>a", caption: "Rendezvous hashing sends B's keys to their second-choice nodes, spread over the survivors. Nobody else's keys move." },
        { edge: "app>db", tone: "miss", caption: "Those keys miss at first, so the database sees a burst: 8% of 1M reads is 80K extra a second if nothing guards it.", mark: [{ node: "db", state: "busy" }] },
        { edge: "app>a", tone: "ok", caption: "Single flight and a rate limit on the database path smooth the burst. Within minutes the survivors have refilled.", mark: [{ node: "db", state: null }, { node: "a", state: "ok" }] },
      ],
    },
  ],
};

export const staleSequence: SequenceSpec = {
  id: "distributed-cache-stale-sequence",
  title: "The stale-fill race",
  description:
    "A reader misses and loads an old row; a writer updates the database and deletes the cache key; then the reader fills the cache with the old value. The key now holds stale data until its TTL ends. A short TTL bounds the damage; a delayed second delete or versioned values removes it.",
  actors: [
    { id: "reader", label: "Reader", kind: "service" },
    { id: "cache", label: "Cache", kind: "cache" },
    { id: "db", label: "Database", kind: "database" },
    { id: "writer", label: "Writer", kind: "service" },
  ],
  items: [
    { from: "reader", to: "cache", label: "get price:7" },
    { from: "cache", to: "reader", label: "miss", type: "reply" },
    { from: "reader", to: "db", label: "SELECT price" },
    { from: "db", to: "reader", label: "price = 10 (old)", type: "reply" },
    { from: "writer", to: "db", label: "UPDATE price = 12" },
    { from: "writer", to: "cache", label: "DELETE price:7" },
    {
      alt: [
        {
          when: "race",
          items: [
            { from: "reader", to: "cache", label: "SET price:7 = 10 (old)" },
            { note: "Rare but real: the cache now holds the old price until the TTL ends", over: ["reader", "cache"] },
          ],
        },
        {
          when: "fix: delay-delete",
          items: [
            { from: "reader", to: "cache", label: "SET price:7 = 10 (old)" },
            { note: "The writer schedules a second delete a second later, longer than any in-flight read", over: ["writer", "cache"] },
            { from: "writer", to: "cache", label: "DELETE price:7 (again)", type: "async" },
            { note: "The next read reloads price = 12. The stale window is about 1 second", over: ["cache", "db"] },
          ],
        },
        {
          when: "fix: versions",
          items: [
            { from: "reader", to: "cache", label: "SET price:7 = 10 if version < 41" },
            { from: "cache", to: "reader", label: "rejected: key is at version 42", type: "reply" },
            { note: "Each value carries its row version, and an older fill is refused", over: ["reader", "cache"] },
          ],
        },
      ],
    },
  ],
};
