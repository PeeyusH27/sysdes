import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "50M DAU × 20 actions/day is roughly what average QPS?",
    options: ["1.2K", "11.6K", "116K"],
    answer: 1,
    explain: "50M × 20 = 1B actions a day, and 1B ÷ 86,400 ≈ 11,600 per second. Shortcut: 10⁹ ÷ 10⁵ = 10K, then nudge up.",
  },
  {
    q: "Which requirement decides between a strongly consistent SQL primary and an eventually consistent store?",
    options: ["Latency", "Consistency", "Cost"],
    answer: 1,
    explain: "Can a stale read be accepted? That is a consistency question. Payments need strong consistency; likes can be eventually consistent.",
  },
  {
    q: "1M writes/day × 2 KB × 3 replicas for 1 year is roughly:",
    options: ["730 GB", "2.2 TB", "22 TB"],
    answer: 1,
    explain: "1M × 2 KB = 2 GB a day, × 365 = 730 GB a year, × 3 replicas ≈ 2.2 TB. 730 GB is what you get if you forget replication.",
  },
];
