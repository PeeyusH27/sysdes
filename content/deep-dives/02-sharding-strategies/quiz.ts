import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "Going from 4 to 5 nodes with hash % N moves about…",
    options: ["20% of keys", "50% of keys", "80% of keys"],
    answer: 2,
    explain:
      "A key stays put only when hash mod 4 equals hash mod 5, which is true for 1 in 5 keys. So N/(N+1) = 4/5 = 80% move. Consistent hashing moves only 1/(N+1) = 20%.",
  },
  {
    q: "Virtual nodes exist to…",
    options: ["Add capacity", "Even out load across physical nodes", "Replicate data"],
    answer: 1,
    explain:
      "With one point per node, arc lengths on the ring vary wildly. 100+ points per node average that out, and when a node leaves, its load spreads over many neighbours instead of one.",
  },
  {
    q: "Snowflake ids need…",
    options: ["A central counter", "A unique worker id per generator", "A database sequence per shard"],
    answer: 1,
    explain:
      "The worker id bits keep two generators from ever producing the same id, so there is no coordination per id. You only assign worker ids once, at startup.",
  },
];
