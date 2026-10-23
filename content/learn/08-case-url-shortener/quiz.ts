import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "How many codes do 7 base62 characters give?",
    options: ["3.5 billion", "3.5 trillion", "62 million"],
    answer: 1,
    explain: "62^7 is about 3.5 trillion. Six billion links in five years use well under 1% of that.",
  },
  {
    q: "If you need per-click analytics, the redirect should return…",
    options: ["301", "302", "200 with JavaScript"],
    answer: 1,
    explain: "Browsers and CDNs remember a 301, so repeat clicks never reach you. A 302 comes back every time, so you can count it.",
  },
  {
    q: "4,000 redirects/s with a 95% cache hit ratio. How many reads per second reach the database?",
    options: ["4,000/s", "200/s", "20/s"],
    answer: 1,
    explain: "Only misses reach the database: 4,000 × (1 − 0.95) = 200 reads/s. Easy for one Postgres.",
  },
];
