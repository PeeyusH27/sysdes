import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "Which pattern can lose acknowledged writes?",
    options: ["Write-through", "Write-behind", "Cache-aside"],
    answer: 1,
    explain:
      "Write-behind acknowledges the write once it's in the cache or an in-memory buffer. If the process crashes before the next flush, those writes never reach the database.",
  },
  {
    q: "What's the safety net for in-process (L1) caches?",
    options: ["A bigger L1", "Short TTLs alongside pub/sub invalidation", "Updating L1 on every write"],
    answer: 1,
    explain:
      "Pub/sub is fire-and-forget, so an instance can miss an invalidation. A TTL of a few seconds bounds how long that stale copy can live.",
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
      "Bloom filters have false positives but no false negatives. 'No' means definitely absent (skip the lookup); 'maybe' means do the normal lookup.",
  },
];
