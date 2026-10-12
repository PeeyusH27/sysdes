import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "prefix has n + 1 entries with prefix[0] = 0. Which expression is the sum of nums[left..right], both ends included?",
    options: ["prefix[right] - prefix[left]", "prefix[right + 1] - prefix[left]", "prefix[right + 1] - prefix[left - 1]"],
    answer: 1,
    explain: "prefix[right + 1] is the sum of indices 0..right, and prefix[left] is the sum of indices 0..left - 1. Their difference is exactly left..right, and left = 0 needs no special case.",
  },
  {
    q: "When counting subarrays that sum to k with a prefix-sum map, why does the map start as 0 → 1?",
    options: [
      "So that subarrays starting at index 0 are counted",
      "Because Map lookups of missing keys throw",
      "To handle k = 0 separately",
    ],
    answer: 0,
    explain: "A subarray from index 0 to j has sum P(j) - 0: it needs an \"earlier prefix\" with sum 0, the empty prefix before the array. Without that entry those subarrays are missed.",
  },
  {
    q: "You must add a value to m different ranges of an array of length n, then read the final array once. What is the cost with a difference array?",
    options: ["O(m · n)", "O(m + n)", "O(m log n)"],
    answer: 1,
    explain: "Each range update is two writes (+delta at the start, -delta just after the end), so O(m) in total, and one running-sum pass of O(n) rebuilds every value.",
  },
];
