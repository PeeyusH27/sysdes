// Where a DSA pattern shows up inside a system design page, and the reverse.
// One entry per real connection: `why` must describe what that page actually does, so check the page before adding one.
// Every pattern slug and every `to` href is validated by tests/bridges.test.ts.
import { getPattern } from "./dsa/registry";

export interface Bridge {
  /** A slug from content/dsa/registry.ts. */
  pattern: string;
  /** A /learn, /deep-dives or /questions page. */
  to: string;
  /** One sentence tying the two together, written for someone who has read only one side. */
  why: string;
}

export const bridges: Bridge[] = [
  { pattern: "sliding-window", to: "/questions/rate-limiter", why: "A sliding-window limiter keeps a window over recent request timestamps: evict the old ones, count the rest." },
  { pattern: "trie", to: "/questions/typeahead", why: "Autocomplete suggestions are prefix lookups, which is exactly what a trie answers in O(length of the prefix)." },
  { pattern: "hashing", to: "/deep-dives/sharding-strategies", why: "Hash sharding is one hash and one modulo to pick a shard: the O(1) lookup idea, spread across machines." },
  { pattern: "hashing", to: "/deep-dives/caching-techniques", why: "A cache is a hash map with an eviction policy and a freshness problem." },
  { pattern: "binary-search", to: "/deep-dives/sharding-strategies", why: "A consistent-hash ring finds the next node by binary searching sorted ring positions." },
  { pattern: "bit-manipulation", to: "/deep-dives/sharding-strategies", why: "Snowflake IDs pack a timestamp, machine id and sequence number into 64 bits with shifts and masks." },
  { pattern: "bit-manipulation", to: "/deep-dives/caching-techniques", why: "A Bloom filter is a bit array plus a few hash functions: set bits on write, test bits on read." },
  { pattern: "linked-list-reversal", to: "/learn/caching", why: "The textbook LRU is a hash map plus a doubly linked list rewired on every hit; this page gets the same O(1) move-to-front from Map's insertion order." },
  { pattern: "heaps", to: "/questions/news-feed", why: "The feed merges the pushed timeline with each celebrity's timeline, newest first. The page sorts; the heap pattern's k-way merge is how you do it without re-sorting everything." },
  { pattern: "heaps", to: "/questions/ride-sharing", why: "Offering a ride to the nearest few drivers is a top-k problem over distance or ETA." },
  { pattern: "heaps", to: "/questions/leaderboard", why: "The top k of a score stream is the heap pattern; a sorted set is the same idea stored, with rank queries on top." },
  { pattern: "greedy", to: "/questions/vending-machine", why: "Dispensing the largest coin first is greedy change-making, and the page shows where greedy breaks." },
  { pattern: "dp-1d", to: "/questions/vending-machine", why: "When greedy fails on limited coin tubes, the fewest-coins answer is a bounded coin change DP." },
  { pattern: "intervals", to: "/questions/parking-lot", why: "The reservations follow-up is the meeting-rooms question: does a new time window overlap an existing one?" },
];

export interface PatternBridge extends Bridge {
  title: string;
  short: string;
}

/** Pages where a pattern shows up, for the "In real systems" block on a pattern page. */
export function systemsFor(pattern: string): Bridge[] {
  return bridges.filter((b) => b.pattern === pattern);
}

/** Patterns a system design page leans on, for the "Patterns behind this" block on that page. */
export function patternsFor(href: string): PatternBridge[] {
  return bridges
    .filter((b) => b.to === href)
    .flatMap((b) => {
      const p = getPattern(b.pattern);
      return p ? [{ ...b, title: p.title, short: p.short }] : [];
    });
}
