import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "You must report the 10 largest values from a stream of a million numbers using little memory. What do you keep?",
    options: ["A max-heap of every value, popped 10 times at the end", "A min-heap that never holds more than 10 values", "A max-heap that never holds more than 10 values"],
    answer: 1,
    explain:
      "The min-heap's root is the weakest of the current top 10, so it is the one to evict when a bigger value arrives. That is O(n log 10) time and O(10) memory. A max-heap of size 10 would evict the largest values and keep the 10 smallest.",
  },
  {
    q: "You merge k sorted linked lists holding N nodes in total, with a min-heap of the current heads. What is the running time?",
    options: ["O(N log N)", "O(N log k)", "O(N · k)"],
    answer: 1,
    explain:
      "The heap never holds more than one node per list, so each push and pop costs O(log k), and each of the N nodes is pushed and popped once. Scanning all k heads for every node would be O(N · k).",
  },
  {
    q: "A running median uses a max-heap `low` and a min-heap `high`. Which rules must hold after every addNum?",
    options: [
      "Both heaps hold the same number of values at all times",
      "Every value in low is at most every value in high, and low has the same size as high or one more",
      "low holds the values added at even positions and high those at odd positions",
    ],
    answer: 1,
    explain:
      "The ordering rule makes the two tops the middle of the sorted order; the size rule says which top is the median. With an odd count it is low's top; with an even count it is the average of both tops.",
  },
];
