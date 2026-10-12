import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "In one-pass Two Sum, why do you look up target - nums[i] before storing nums[i] in the map?",
    options: [
      "Because Map.set is slower than Map.has",
      "So an element can't be paired with itself, while every pair is still found when its second element is reached",
      "So that the map stays sorted by index",
    ],
    answer: 1,
    explain: "With target 6 and nums[i] = 3, storing first would let the 3 find itself. Looking up first means the map only holds earlier indices, and a pair (i, j) is still found at j because nums[i] was stored at step i.",
  },
  {
    q: "Which key correctly groups anagrams together?",
    options: ["The sum of the character codes", "The set of distinct letters", "The letters sorted alphabetically"],
    answer: 2,
    explain: "Two words are anagrams exactly when their sorted letters match. A sum collides (\"ac\" and \"bb\" both sum to 196), and a set forgets counts (\"aab\" and \"abb\" both give a, b).",
  },
  {
    q: "Longest Consecutive Sequence puts every value in a Set and only starts counting at x when x - 1 is missing. What is the running time?",
    options: ["O(n): each value is stepped over by at most one run walk", "O(n log n): like sorting", "O(n²): every start can walk up to n steps"],
    answer: 0,
    explain: "A walk only starts at the smallest value of a run, and each run is walked once. Summed over all runs, the walks touch each value once, so the total is O(n) on top of the O(n) set build.",
  },
];
