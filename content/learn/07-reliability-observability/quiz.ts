import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "99.9% monthly availability allows about…",
    options: ["4 minutes of downtime", "43 minutes of downtime", "7 hours of downtime"],
    answer: 1,
    explain: "0.1% of a 30-day month is 0.001 × 30 × 24 × 60 = 43.2 minutes. 4 minutes is 99.99%; 7 hours is 99%.",
  },
  {
    q: "A request needs two dependencies in series, each 99.9% available. Its availability is…",
    options: ["99.9%", "≈ 99.8%", "99.99%"],
    answer: 1,
    explain: "Serial availabilities multiply: 0.999 × 0.999 ≈ 0.998. Every dependency you can't do without adds its downtime to yours.",
  },
  {
    q: "A half-open circuit breaker…",
    options: ["Blocks everything", "Lets a trial request through", "Retries forever"],
    answer: 1,
    explain: "After the cooldown, a half-open breaker lets one probe reach the dependency. Success closes the breaker; failure opens it for another cooldown.",
  },
];
