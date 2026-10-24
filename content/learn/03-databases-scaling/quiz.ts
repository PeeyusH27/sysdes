import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "Does an index on (user_id, created_at) help WHERE created_at > … on its own?",
    options: ["Not efficiently", "Yes, fully", "Only after running ANALYZE"],
    answer: 0,
    explain: "The index is sorted by user_id first, so rows for a time range are scattered across every user's section. Without a user_id condition the database can't seek; it scans. Add an index on created_at for that query.",
  },
  {
    q: "The main risk of async replication during failover is:",
    options: ["Slower writes", "Losing the last few committed writes", "Deadlocks"],
    answer: 1,
    explain: "The primary confirms a commit before replicas have it. If it dies, the promoted replica misses those writes. Semi-sync or sync replication closes the gap but makes writes slower.",
  },
  {
    q: "Postgres's default isolation level is:",
    options: ["Read committed", "Repeatable read", "Serializable"],
    answer: 0,
    explain: "Postgres defaults to READ COMMITTED: each statement sees only data committed before it started. MySQL InnoDB defaults to REPEATABLE READ.",
  },
  {
    q: "You shard orders by created_at. What happens to writes?",
    options: ["They spread evenly", "Every new write hits the newest shard", "They need a directory"],
    answer: 1,
    explain: "Time rises, so new rows always fall in the latest range and one shard takes all the writes while the others idle. Lead with a spread-out id (customer_id) and sort by time inside it.",
  },
  {
    q: "Two requests read stock 10, subtract 1, and write 9. How do you fix the oversell?",
    options: ["Add an index on stock", "Add a read replica", "One statement: SET stock = stock - 1"],
    answer: 2,
    explain: "The database applies the subtraction under a row lock, so both decrements count and stock ends at 8. Read-modify-write in the app loses one update.",
  },
];
