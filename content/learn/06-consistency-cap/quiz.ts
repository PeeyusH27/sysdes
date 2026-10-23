import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "Is N = 5, W = 3, R = 2 strongly consistent?",
    options: ["Yes", "No: 3 + 2 is not greater than 5"],
    answer: 1,
    explain: "R + W must be more than N. With 3 + 2 = 5, both replicas you read can be the 2 that missed the write. R = 3 (or W = 4) fixes it.",
  },
  {
    q: "A 5-node Raft cluster tolerates how many failed nodes?",
    options: ["1", "2", "3"],
    answer: 1,
    explain: "A majority of 5 is 3. If 2 nodes fail, the other 3 still elect a leader and commit. If 3 fail, the last 2 are not a majority.",
  },
  {
    q: "The main drawback of last-writer-wins is that it…",
    options: ["Is slow", "Silently drops one of two concurrent writes", "Needs consensus"],
    answer: 1,
    explain: "LWW keeps the write with the highest timestamp and throws the other away, silently. If clocks drift, it can even drop the write that came last.",
  },
];
