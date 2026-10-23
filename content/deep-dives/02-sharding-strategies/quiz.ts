import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "Going from 4 to 5 nodes with hash % N moves about…",
    options: ["20% of keys", "50% of keys", "80% of keys"],
    answer: 2,
    explain:
      "A key stays put only when hash mod 4 equals hash mod 5, true for 1 in 5 keys. So N/(N+1) = 4/5 = 80% move. Consistent hashing moves only 1/(N+1) = 20%.",
  },
  {
    q: "Virtual nodes exist to…",
    options: ["Add capacity", "Even out load across physical nodes", "Replicate data"],
    answer: 1,
    explain:
      "With one point per node, the arcs on the ring vary wildly. 100+ points per node even them out, and a leaving node's load spreads over many neighbours.",
  },
  {
    q: "Snowflake ids need…",
    options: ["A central counter", "A unique worker id per generator", "A database sequence per shard"],
    answer: 1,
    explain:
      "The worker id bits stop two generators making the same id, so no coordination per id is needed. You assign worker ids once, at startup.",
  },
];
