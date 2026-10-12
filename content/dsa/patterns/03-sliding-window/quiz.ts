import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "In the longest-valid-window template, when do you record right - left + 1 as a candidate answer?",
    options: [
      "Right after adding s[right], before the shrink loop",
      "After the shrink loop, once the window is valid again",
      "Inside the shrink loop, before each left++",
    ],
    answer: 1,
    explain: "Before shrinking, the window may be invalid. After the loop it is the longest valid window ending at right, which is exactly the candidate. Recording inside the loop is the shortest-window template.",
  },
  {
    q: "The variable window has a while loop inside a for loop. Why is it still O(n)?",
    options: [
      "The while loop runs at most once per step",
      "left only moves forward, so across the whole run it advances at most n times in total",
      "Hash map operations are O(1)",
    ],
    answer: 1,
    explain: "Count the work by pointer moves, not by loop nesting: right moves n times and left moves at most n times, never backwards. Every element enters the window once and leaves at most once.",
  },
  {
    q: "Which problem can NOT be solved with a plain grow-right, shrink-left window?",
    options: [
      "Shortest subarray of positive numbers with sum at least k",
      "Longest substring with at most 2 distinct characters",
      "Number of subarrays with sum exactly k when the array contains negative numbers",
    ],
    answer: 2,
    explain: "With negatives, adding an element can lower the sum and removing one can raise it, so a window that is too big or too small gives no safe direction to move. Use prefix sums with a hash map instead.",
  },
];
