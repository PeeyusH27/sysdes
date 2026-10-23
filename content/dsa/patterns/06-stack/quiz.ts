import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "Why does checking \"([)]\" need a stack rather than one counter per bracket type?",
    options: [
      "Counters can't handle more than one bracket type at a time",
      "A closer must match the most recently opened bracket, and counters forget the order in which brackets were opened",
      "Counters would use O(n) memory",
    ],
    answer: 1,
    explain: "Each counter ends at zero for \"([)]\", yet the pairs cross. Only the order of the open brackets shows that ) arrives while [ is newest, and a stack keeps that order.",
  },
  {
    q: "In a monotonic decreasing stack for \"next greater element\", index j is popped while processing index i. What has just been resolved?",
    options: [
      "nums[i] is the largest value in the whole array",
      "i is the first index after j whose value is greater than nums[j]",
      "j is the previous greater element of i",
    ],
    answer: 1,
    explain: "j waited on the stack until a bigger value arrived. A bigger value between j and i would have popped it earlier, so i is j's next greater element.",
  },
  {
    q: "A while loop that pops is nested inside the for loop. What is the total running time of the monotonic stack?",
    options: [
      "O(n): every index is pushed once and popped at most once",
      "O(n log n): the stack stays sorted like a heap",
      "O(n²): the while loop can run n times for each i",
    ],
    answer: 0,
    explain: "One iteration may pop many items, but there are only n pushes, so at most n pops in total. That is O(n) amortised.",
  },
];
