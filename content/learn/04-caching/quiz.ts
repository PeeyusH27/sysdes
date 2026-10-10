import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "With a 90% hit ratio, a 1 ms cache and a 50 ms database, the average read latency is about…",
    options: ["1 ms", "6 ms", "25 ms"],
    answer: 1,
    explain: "0.9 × 1 + 0.1 × (1 + 50) = 6.0 ms. A miss pays for the cache check and the database.",
  },
  {
    q: "Which fix targets cache penetration (lookups for keys that never exist)?",
    options: ["TTL jitter", "Negative caching or a Bloom filter", "A bigger cache"],
    answer: 1,
    explain: "Cache the 'not found' result briefly, or reject ids a Bloom filter says definitely don't exist.",
  },
  {
    q: "Why add jitter to TTLs?",
    options: ["It saves memory", "It stops many keys expiring at the same moment", "It raises the hit ratio"],
    answer: 1,
    explain: "Keys written together would otherwise expire together and send a wave of misses to the database (an avalanche).",
  },
];
