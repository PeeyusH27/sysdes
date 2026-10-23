import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "What is the write-ahead rule?",
    options: ["Write data pages first, then the log", "Append the log record to disk before the change may reach a data page", "Write only the log and never the data"],
    answer: 1,
    explain: "If the page reached disk without its log record, a crash could leave a change the database cannot explain or undo. Log first keeps recovery possible.",
  },
  {
    q: "At what point is a commit durable?",
    options: ["When the page changes in memory", "When the commit record has been flushed (fsync) to the log", "When the next checkpoint finishes"],
    answer: 1,
    explain: "After the log flush the change can be redone from the log, even if memory is lost. Data pages may not be written for a long time, and that is fine.",
  },
  {
    q: "Why not simply write the changed data pages to disk at commit?",
    options: ["Pages cannot be written", "Page writes are random I/O and larger; one small sequential log write is far cheaper", "Disks only accept logs"],
    answer: 1,
    explain: "A single row change would mean rewriting a whole 8 KiB page at a random place. The log write is a small append, so commits stay fast, and pages are batched later.",
  },
  {
    q: "What does a checkpoint buy you?",
    options: ["Faster commits", "A bound on recovery time: replay starts at the checkpoint, not at the beginning of time", "Protection against replication lag"],
    answer: 1,
    explain: "Everything before the checkpoint is already in the data files. The cost is the extra page writing, which is why checkpoints are spread out and tuned.",
  },
  {
    q: "After a crash, a transaction has records in the log but no commit record. What does recovery do with it?",
    options: ["Replays it", "Ignores or undoes it: it was never committed", "Asks the client"],
    answer: 1,
    explain: "Only transactions with a commit record are redone. The client was never told the commit succeeded, so discarding the rest is correct.",
  },
  {
    q: "A database runs with synchronous_commit off and the server loses power. What can happen?",
    options: ["The database is corrupted", "The last few milliseconds of acknowledged commits may be lost, but the data stays consistent", "Nothing, it is identical to normal mode"],
    answer: 1,
    explain: "Skipping the wait for the flush trades a small window of durability for throughput. The log is still written in order, so recovery yields a consistent earlier state.",
  },
  {
    q: "The primary fails and an asynchronous replica takes over. What is the risk?",
    options: ["Transactions committed on the primary but not yet shipped are lost", "The replica cannot read the log", "Checkpoints are skipped"],
    answer: 0,
    explain: "Asynchronous replication acknowledges before the replica has the record. A synchronous replica avoids the loss at the price of waiting for the network on every commit.",
  },
];
