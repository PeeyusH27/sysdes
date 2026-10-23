import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "Which mechanism makes a committed transaction survive a crash?",
    options: ["Row locks", "The write-ahead log, flushed to disk before the commit is acknowledged", "The query planner"],
    answer: 1,
    explain: "Durability comes from writing the change to the log on stable storage first. After a crash the database replays the log, so committed work is never lost.",
  },
  {
    q: "Read committed isolation protects you from which of these?",
    options: ["Dirty reads", "Non-repeatable reads", "Write skew"],
    answer: 0,
    explain: "Each statement sees only committed data, so no dirty reads. A second read in the same transaction may see a new committed value, and write skew needs serializable.",
  },
  {
    q: "Why do readers not block writers under MVCC?",
    options: ["Writers wait until readers finish", "Readers read an older committed version while the writer creates a new one", "Reads never touch the disk"],
    answer: 1,
    explain: "A write adds a version instead of overwriting. Each reader uses the version visible at its snapshot, so neither has to wait. The cost is keeping old versions until they can be cleaned up.",
  },
  {
    q: "Under snapshot isolation, two transactions each read balance 100 and write 150. What happens to the second commit?",
    options: ["It silently overwrites the first", "It fails with a write conflict (first committer wins) and must retry", "It waits forever"],
    answer: 1,
    explain: "Both wrote the same row after the same snapshot, so the second sees a newer committed version and aborts. That prevents the lost update. Read committed with a plain write would lose it.",
  },
  {
    q: "Two on-call doctors each check that two are on call, then each leaves. Which is the best fix?",
    options: ["Use read uncommitted", "Run at serializable (and retry), or lock the rows that were read", "Add an index"],
    answer: 1,
    explain: "This is write skew: different rows, a rule across both. Serializable aborts one transaction, and FOR UPDATE on the rows read forces them to queue.",
  },
  {
    q: "A transaction runs the same range query twice and the second run returns extra rows committed by someone else. What is this?",
    options: ["A dirty read", "A phantom read", "A deadlock"],
    answer: 1,
    explain: "A phantom is a new row appearing in a range you already queried. Dirty reads involve uncommitted data, and a deadlock is a wait cycle.",
  },
  {
    q: "Two transactions update rows A and B in opposite orders and each waits for the other. What does the database do, and what should the application do?",
    options: ["Detect the cycle and abort one; the application retries", "Hang until a timeout and give up", "Merge both updates"],
    answer: 0,
    explain: "Databases detect lock cycles and abort a victim with a deadlock error. The application should retry the whole transaction, and locking rows in one fixed order avoids most deadlocks.",
  },
];
