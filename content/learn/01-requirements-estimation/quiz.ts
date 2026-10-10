import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "50M DAU × 20 actions/day is roughly what average QPS?",
    options: ["1.2K", "11.6K", "116K"],
    answer: 1,
    explain: "50M × 20 = 1B actions a day, and 1B ÷ 86,400 ≈ 11,574 per second. Shortcut: 10⁹ ÷ 10⁵ = 10K, then nudge up because 86,400 is a bit less than 100,000.",
  },
  {
    q: "Which non-functional requirement most directly decides between a strongly consistent SQL primary and an AP store?",
    options: ["Latency", "Consistency", "Cost"],
    answer: 1,
    explain: "Whether a stale or conflicting read is acceptable is a consistency requirement. Payments and inventory need strong consistency; likes and view counts can be eventually consistent.",
  },
  {
    q: "1M writes/day × 2 KB × 3 replicas for 1 year is roughly:",
    options: ["730 GB", "2.2 TB", "22 TB"],
    answer: 1,
    explain: "1M × 2 KB = 2 GB a day, × 365 = 730 GB a year, × 3 replicas ≈ 2.2 TB. 730 GB is what you get if you forget replication.",
  },
];
