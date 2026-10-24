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
    explain: "Availabilities in a chain multiply: 0.999 × 0.999 ≈ 0.998. Each dependency you need adds its downtime to yours.",
  },
  {
    q: "A half-open circuit breaker…",
    options: ["Blocks everything", "Lets a trial request through", "Retries forever"],
    answer: 1,
    explain: "After the cooldown, one probe reaches the dependency. Success closes the breaker; failure opens it again.",
  },
  {
    q: "A gateway retries 3 times and calls a service that also retries 3 times. One request can become…",
    options: ["6 calls", "9 calls", "3 calls"],
    answer: 1,
    explain: "Retries multiply across layers: 3 × 3 = 9 calls at the bottom service. Add a third retrying layer and it is 27. Retry in one layer.",
  },
  {
    q: "Three zones share the load equally. To survive losing one zone, each should run below about…",
    options: ["50% busy", "66% busy", "90% busy"],
    answer: 1,
    explain: "Two survivors must carry 100% of the work, so each zone can use at most 2/3 of its capacity before the failure.",
  },
];
