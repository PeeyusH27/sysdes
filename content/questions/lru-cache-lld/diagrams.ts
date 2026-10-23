import type { ClassSpec, SequenceSpec } from "@/components/diagram/types";

export const classes: ClassSpec = {
  id: "lru-cache-classes",
  title: "LRU cache class diagram",
  description:
    "Cache owns the entries and guards them with one lock. It never decides who to evict: it asks an EvictionPolicy, which keeps its own order (LruPolicy with a doubly linked list, FifoPolicy, or LfuPolicy). Time arrives through a Clock, and listeners hear every removal.",
  classes: [
    { id: "lock", name: "Lock", col: 0, row: 0, fields: ["one per cache or stripe"], methods: ["lock()", "unlock()"] },
    { id: "listener", name: "RemovalListener", col: 1, row: 0, stereotype: "interface", methods: ["removed(key, value, why)"] },
    { id: "lru", name: "LruPolicy", col: 2, row: 0, fields: ["nodes: Map<key, Node>", "head, tail sentinels"], methods: ["onAccess(key): to the front", "victim(): the back"] },
    { id: "node", name: "Node", col: 3, row: 0, fields: ["key", "prev, next"] },

    { id: "stats", name: "Stats", col: 0, row: 1, fields: ["hits", "misses", "evictions"] },
    {
      id: "cache",
      name: "Cache",
      col: 1,
      row: 1,
      fields: ["capacity: int", "entries: Map<key, Entry>", "ttl: ms"],
      methods: ["get(key)", "put(key, value, ttl?)", "delete(key)", "onRemove(listener)"],
    },
    { id: "policy", name: "EvictionPolicy", col: 2, row: 1, stereotype: "interface", methods: ["onInsert(key)", "onAccess(key)", "onRemove(key)", "victim(): key"] },
    { id: "fifo", name: "FifoPolicy", col: 3, row: 1, fields: ["order: insertion-ordered set"], methods: ["onAccess(key): nothing"] },

    { id: "clock", name: "Clock", col: 0, row: 2, stereotype: "interface", methods: ["now(): ms"] },
    { id: "entry", name: "Entry", col: 1, row: 2, fields: ["value", "expiresAt"] },
    { id: "lfu", name: "LfuPolicy", col: 3, row: 2, fields: ["freq: Map<key, count>", "tie: least recent"], methods: ["victim(): lowest count"] },
  ],
  relations: [
    { from: "cache", to: "entry", type: "composition", label: "0..capacity" },
    { from: "cache", to: "policy", type: "association", label: "who goes next?" },
    { from: "lru", to: "policy", type: "implements" },
    { from: "fifo", to: "policy", type: "implements" },
    { from: "lfu", to: "policy", type: "implements" },
    { from: "lru", to: "node", type: "composition", label: "1..*" },
    { from: "cache", to: "clock", type: "dependency", label: "expiry" },
    { from: "cache", to: "lock", type: "association", label: "guards" },
    { from: "cache", to: "stats", type: "composition" },
    { from: "listener", to: "cache", type: "dependency", label: "observes" },
  ],
  stages: [
    { title: "A map with a limit", note: "A cache is a map that refuses to grow past its capacity. Each entry carries its value and, later, a deadline.", add: ["cache", "entry"] },
    { title: "Order is a separate job", note: "Which key to drop is a different question from how to store a key. An EvictionPolicy keeps the order, and LruPolicy does it with a doubly linked list so every move costs O(1).", add: ["policy", "lru", "node"] },
    { title: "Swap the order", note: "FIFO and LFU answer the same question differently. The cache is not edited to add them, which is the point of making the policy a strategy.", add: ["fifo", "lfu"] },
    { title: "Time and locking come in from outside", note: "A Clock is injected so expiry tests never sleep. The lock is part of the cache because a read also reorders, so reads need it too.", add: ["clock", "lock"] },
    { title: "Observers and counters", note: "Listeners hear every removal with its reason, and Stats counts hits, misses and evictions. The cache never depends on who is listening.", add: ["listener", "stats"] },
  ],
};

export const getFlow: SequenceSpec = {
  id: "lru-cache-get",
  title: "get(key) from the caller to the policy",
  description:
    "A get takes the lock, looks the key up, and checks its deadline. A live entry is moved to the front of the order before the value is returned. An expired entry is removed on the spot, and a missing key only counts as a miss.",
  actors: [
    { id: "caller", label: "Caller", kind: "client" },
    { id: "cache", label: "Cache", kind: "service" },
    { id: "entries", label: "Entries map", kind: "database" },
    { id: "policy", label: "LruPolicy", kind: "worker" },
  ],
  items: [
    { from: "caller", to: "cache", label: "get('a')" },
    { note: "lock taken: even a read changes the order", over: ["cache", "entries"] },
    { from: "cache", to: "entries", label: "lookup('a')" },
    {
      alt: [
        {
          when: "hit",
          items: [
            { from: "entries", to: "cache", label: "value, expiresAt 5000", type: "reply" },
            { note: "now 4200 is before 5000: still alive", over: ["cache", "entries"] },
            { from: "cache", to: "policy", label: "onAccess('a'): move to front" },
            { from: "cache", to: "caller", label: "value", type: "reply" },
          ],
        },
        {
          when: "expired",
          items: [
            { from: "entries", to: "cache", label: "value, expiresAt 3000", type: "reply" },
            { note: "now 4200 is past 3000: dead", over: ["cache", "entries"] },
            { from: "cache", to: "entries", label: "remove('a')" },
            { from: "cache", to: "policy", label: "onRemove('a')" },
            { from: "cache", to: "caller", label: "miss, listeners told 'expired'", type: "reply" },
          ],
        },
        {
          when: "miss",
          items: [
            { from: "entries", to: "cache", label: "nothing", type: "reply" },
            { from: "cache", to: "caller", label: "miss (counted)", type: "reply" },
          ],
        },
      ],
    },
  ],
};

export const putFlow: SequenceSpec = {
  id: "lru-cache-put",
  title: "put(key, value) when the cache is full",
  description:
    "A put of a known key only replaces the value and refreshes the order. A put of a new key on a full cache first asks the policy for a victim, removes it, and tells the listeners, then inserts the new entry as the most recent.",
  actors: [
    { id: "caller", label: "Caller", kind: "client" },
    { id: "cache", label: "Cache", kind: "service" },
    { id: "policy", label: "LruPolicy", kind: "worker" },
    { id: "entries", label: "Entries map", kind: "database" },
    { id: "listener", label: "Listener", kind: "pubsub" },
  ],
  items: [
    { from: "caller", to: "cache", label: "put('d', 4)" },
    { note: "lock taken, capacity 3, entries a, b, c", over: ["cache", "entries"] },
    {
      alt: [
        {
          when: "new key, full",
          items: [
            { from: "cache", to: "policy", label: "victim()" },
            { from: "policy", to: "cache", label: "'b' (the back of the list)", type: "reply" },
            { from: "cache", to: "entries", label: "remove('b')" },
            { from: "cache", to: "policy", label: "onRemove('b')" },
            { from: "cache", to: "entries", label: "set('d', 4)" },
            { from: "cache", to: "policy", label: "onInsert('d'): to the front" },
            { note: "lock released", over: ["cache", "entries"] },
            { from: "cache", to: "listener", label: "removed('b', 2, evicted)", type: "async" },
          ],
        },
        {
          when: "new key, room left",
          items: [
            { from: "cache", to: "entries", label: "set('d', 4)" },
            { from: "cache", to: "policy", label: "onInsert('d')" },
          ],
        },
        {
          when: "key exists",
          items: [
            { from: "cache", to: "entries", label: "replace value and deadline" },
            { from: "cache", to: "policy", label: "onAccess('d'): to the front" },
            { note: "size unchanged, nothing evicted", over: ["cache", "entries"] },
          ],
        },
      ],
    },
  ],
};
