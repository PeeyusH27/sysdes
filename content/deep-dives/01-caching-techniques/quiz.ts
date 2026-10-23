import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "Which pattern can lose acknowledged writes?",
    options: ["Write-through", "Write-behind", "Cache-aside"],
    answer: 1,
    explain:
      "Write-behind says 'done' once the write is in the cache. If it crashes before the next flush, the database never gets it.",
  },
  {
    q: "What's the safety net for in-process (L1) caches?",
    options: ["A bigger L1", "Short TTLs alongside pub/sub invalidation", "Updating L1 on every write"],
    answer: 1,
    explain:
      "An instance can miss a pub/sub message. A TTL of a few seconds limits how long its copy stays stale.",
  },
  {
    q: "A Bloom filter answers 'might contain' for an id. What do you know?",
    options: [
      "The id definitely exists",
      "The id probably exists, so check the cache and the database",
      "The id definitely doesn't exist",
    ],
    answer: 1,
    explain:
      "A Bloom filter can say 'maybe' wrongly, but never 'no' wrongly. 'No' means skip the lookup; 'maybe' means look it up as usual.",
  },
];
