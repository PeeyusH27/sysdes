import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "Does an index on (user_id, created_at) help WHERE created_at > … on its own?",
    options: ["Not efficiently", "Yes, fully", "Only after running ANALYZE"],
    answer: 0,
    explain: "The index is sorted by user_id first, so rows for a time range are scattered across every user's section. Without a user_id condition the database can't seek; it scans. Add a separate index on created_at if you need that query.",
  },
  {
    q: "The main risk of async replication during failover is:",
    options: ["Slower writes", "Losing the last few committed writes", "Deadlocks"],
    answer: 1,
    explain: "The primary acknowledges a commit before replicas have it. If it dies, the promoted replica is missing those writes, so the recovery point objective (RPO) is not zero. Semi-sync or sync replication closes the gap at the cost of write latency.",
  },
  {
    q: "Postgres's default isolation level is:",
    options: ["Read committed", "Repeatable read", "Serializable"],
    answer: 0,
    explain: "Postgres defaults to READ COMMITTED: each statement sees data committed before it started. MySQL InnoDB defaults to REPEATABLE READ.",
  },
];
