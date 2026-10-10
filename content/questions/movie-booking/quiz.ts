import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "Alice and Bob run the hold UPDATE for seat A5 at the same instant. Why can't both succeed?",
    options: [
      "A Redis lock serialises them",
      "The row lock makes Bob wait, then Postgres re-checks his WHERE clause against Alice's committed row",
      "Postgres rejects the second transaction with a serialization error",
    ],
    answer: 1,
    explain: "Under READ COMMITTED, the second UPDATE waits for the row lock, then re-evaluates its condition on the new row version. The seat is now held, so Bob's UPDATE matches 0 rows and he rolls back.",
  },
  {
    q: "The payment provider delivers the same success webhook three times. What keeps that safe?",
    options: ["A longer webhook timeout", "UNIQUE (payment_id) plus INSERT … ON CONFLICT DO NOTHING", "Checking the seat status before inserting"],
    answer: 1,
    explain: "The first delivery inserts the booking; the retries hit the unique constraint, insert nothing, and return early as duplicates. A check-then-insert would race between concurrent deliveries.",
  },
  {
    q: "What absorbs a launch-day spike before it reaches the database?",
    options: ["A bigger database instance", "A waiting room that admits users at a fixed rate with admission tokens", "Longer seat holds"],
    answer: 1,
    explain: "The waiting room turns 500K simultaneous arrivals into a steady flow (for example 200 per second) that the booking path can handle, while the CDN serves the seat map. A bigger database only moves the cliff.",
  },
];
