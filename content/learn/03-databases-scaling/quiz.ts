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
];
