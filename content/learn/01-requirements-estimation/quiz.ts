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
  {
    q: "A photo feed needs 5.8 GB/s of egress. Roughly how many Gbps is that?",
    options: ["5.8", "46", "580"],
    answer: 1,
    explain: "Network links are rated in bits, and 1 byte is 8 bits: 5.8 GB/s × 8 ≈ 46 Gbps. Forgetting the 8 under-sizes the link by a factor of 8.",
  },
  {
    q: "Two components in series are each 99.9% available. The pair is about:",
    options: ["99.8%", "99.9%", "99.99%"],
    answer: 0,
    explain: "Availabilities multiply in series: 0.999 × 0.999 ≈ 0.998, about 17.5 hours of downtime a year. Redundant copies in parallel are what raise the number.",
  },
];
