import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "Is N = 5, W = 3, R = 2 strongly consistent?",
    options: ["Yes", "No: 3 + 2 is not greater than 5"],
    answer: 1,
    explain: "R + W must exceed N. With 3 + 2 = 5, a read of 2 replicas can land entirely on the 2 that missed the write. R = 3 (or W = 4) fixes it.",
  },
  {
    q: "A 5-node Raft cluster tolerates how many failed nodes?",
    options: ["1", "2", "3"],
    answer: 1,
    explain: "A majority of 5 is 3, so 2 nodes can fail and the other 3 still elect a leader and commit. With 3 down, the remaining 2 can't form a majority.",
  },
  {
    q: "The main drawback of last-writer-wins is that it…",
    options: ["Is slow", "Silently drops one of two concurrent writes", "Needs consensus"],
    answer: 1,
    explain: "LWW keeps the write with the highest timestamp and throws the other away without telling anyone. With clock skew, it can even drop the write that really came last.",
  },
];
