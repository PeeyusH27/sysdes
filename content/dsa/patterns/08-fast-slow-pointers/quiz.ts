import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "Inside a loop, slow moves one node per step and fast moves two. Why can't fast jump over slow without landing on it?",
    options: [
      "Because every loop has an even number of nodes",
      "Because the gap between them shrinks by exactly one node per step, so it must pass through zero",
      "Because fast checks each node it skips",
    ],
    answer: 1,
    explain: "Each step fast gains 2 - 1 = 1 node on slow. A gap that shrinks one at a time can't go from 1 to -1 without hitting 0, so they meet within one lap of slow entering the loop.",
  },
  {
    q: "After slow and fast meet inside the loop, one pointer goes back to the head and both move one step at a time. Where do they meet?",
    options: ["Back at the head", "At the node where the cycle begins", "At the node just before the first meeting point"],
    answer: 1,
    explain: "With F steps from the head to the entry and a meeting point a steps into a loop of length C, F + a is a whole number of laps. Walking F steps from the meeting point therefore ends on the entry, exactly when the pointer from the head gets there.",
  },
  {
    q: "In Find the Duplicate Number (n + 1 values, each between 1 and n), what plays the role of node.next?",
    options: ["nums[i + 1]", "nums[i]: index i points to index nums[i]", "The number of values less than or equal to i"],
    answer: 1,
    explain: "Reading i → nums[i] as an arrow turns the array into a linked list starting at index 0. Two indices hold the duplicate value, so that index has two incoming arrows, which makes it the entry of the loop that Floyd's algorithm finds.",
  },
];
