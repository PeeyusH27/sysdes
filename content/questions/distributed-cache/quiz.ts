import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "The database can serve 20K reads a second. Traffic is 1M reads a second. What hit ratio must the cache reach?",
    options: ["At least 90%", "At least 98%", "At least 50%"],
    answer: 1,
    explain:
      "Misses go to the database: 1M x (1 - hit ratio) must be at most 20K. That gives a hit ratio of 98%. At 95%, 50K reads a second would reach the database, 2.5 times what it can take.",
  },
  {
    q: "A popular key expires and 1,000 requests miss in the same instant. What stops 1,000 database queries?",
    options: [
      "A longer TTL on every key",
      "Single flight: the first miss loads, the others wait for that same load",
      "A bigger cache",
    ],
    answer: 1,
    explain:
      "Coalescing concurrent misses for one key turns 1,000 reads into 1. Jittered TTLs stop keys expiring together, but the guard is what protects the database during the miss itself.",
  },
  {
    q: "One celebrity profile gets 200K reads a second, and each cache node handles about 100K. Adding nodes does not help. Why, and what does?",
    options: [
      "The key hashes to one node, so that node is the limit; keep a short-lived copy of the hot key in each app server",
      "The cache is too small; increase memory",
      "Switch the eviction policy to LFU",
    ],
    answer: 0,
    explain:
      "Hashing puts a key on exactly one node, so more nodes cannot split its load. Detecting hot keys and caching them locally for about a second means each node sees at most one request a second per app server for that key.",
  },
];
