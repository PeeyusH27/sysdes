import type { SequenceSpec } from "@/components/diagram/types";

export const cacheAsideSequence: SequenceSpec = {
  id: "cache-aside-sequence",
  title: "Cache-aside read",
  description:
    "The app asks Redis first. On a hit it answers in about 1 ms without touching the database; on a miss it reads the database and fills the cache with a TTL.",
  actors: [
    { id: "client", label: "Client", kind: "client" },
    { id: "app", label: "App", kind: "service" },
    { id: "redis", label: "Redis", kind: "cache" },
    { id: "db", label: "Database", kind: "database" },
  ],
  items: [
    { from: "client", to: "app", label: "GET /products/42" },
    { from: "app", to: "redis", label: "GET product:42" },
    {
      alt: [
        {
          when: "cache hit",
          items: [
            { from: "redis", to: "app", label: "JSON value (~1 ms)", type: "reply" },
            { note: "The database is never touched", over: ["redis", "db"] },
            { from: "app", to: "client", label: "200 OK", type: "reply" },
          ],
        },
        {
          when: "cache miss",
          items: [
            { from: "redis", to: "app", label: "nil", type: "reply" },
            { from: "app", to: "db", label: "SELECT … WHERE id = 42" },
            { from: "db", to: "app", label: "row (~50 ms)", type: "reply" },
            { from: "app", to: "redis", label: "SET product:42 EX 317" },
            { note: "TTL = 300 s + random jitter", over: ["redis", "db"] },
            { from: "app", to: "client", label: "200 OK", type: "reply" },
          ],
        },
      ],
    },
  ],
};

export const writeInvalidate: SequenceSpec = {
  id: "write-invalidate",
  title: "Write, then invalidate",
  description:
    "The app updates the database, then deletes the cache key. The next read misses, loads the new row and refills the cache.",
  actors: [
    { id: "admin", label: "Admin", kind: "client" },
    { id: "shopper", label: "Shopper", kind: "client" },
    { id: "app", label: "App", kind: "service" },
    { id: "redis", label: "Redis", kind: "cache" },
    { id: "db", label: "Database", kind: "database" },
  ],
  items: [
    { from: "admin", to: "app", label: "PUT /products/42 price=12" },
    { from: "app", to: "db", label: "UPDATE products SET price = 12" },
    { from: "db", to: "app", label: "OK", type: "reply" },
    { from: "app", to: "redis", label: "DEL product:42" },
    { note: "Delete the key, don't update it", over: ["redis", "db"] },
    { from: "app", to: "admin", label: "200 OK", type: "reply" },
    { note: "Later: the next read", over: ["shopper", "app"] },
    { from: "shopper", to: "app", label: "GET /products/42" },
    { from: "app", to: "redis", label: "GET product:42" },
    { from: "redis", to: "app", label: "nil (miss)", type: "reply" },
    { from: "app", to: "db", label: "SELECT … WHERE id = 42" },
    { from: "db", to: "app", label: "price = 12", type: "reply" },
    { from: "app", to: "redis", label: "SET product:42 EX 300" },
    { from: "app", to: "shopper", label: "price = 12", type: "reply" },
    { note: "Fresh until the next write or the TTL", over: ["redis", "db"] },
  ],
};
