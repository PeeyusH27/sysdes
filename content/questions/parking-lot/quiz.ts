import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "What keeps allocation fast as the lot grows?",
    options: ["Sorting all spots on each request", "A free set per spot type on each floor", "Caching the last spot handed out"],
    answer: 1,
    explain: "Each floor keeps a Map from spot type to a Set of free spots, so park() checks a few sets instead of scanning every spot: O(floors × types), not O(spots).",
  },
  {
    q: "You need a daily cap without editing HourlyPricing. Which pattern fits?",
    options: ["Singleton", "Decorator", "Factory"],
    answer: 1,
    explain: "DailyCap implements the same fee() interface and wraps another PricingStrategy, adding one rule. Rules compose without touching existing classes (open/closed).",
  },
  {
    q: "Three gate servers share one Postgres. What stops two of them taking the same spot?",
    options: ["A JavaScript Map in each server", "One UPDATE whose subquery uses FOR UPDATE SKIP LOCKED", "Checking availability, then updating in a second query"],
    answer: 1,
    explain: "The row lock makes the pick and the write one atomic step, and SKIP LOCKED lets a concurrent gate move on to the next free row instead of waiting. A Map only protects one process; check-then-update races.",
  },
];
