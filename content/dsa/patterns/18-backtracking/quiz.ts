import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "Your subsets function returns 8 entries for [1, 2, 3], but every entry is an empty array. What is the bug?",
    options: ["The base case returns too early", "It records path itself instead of a copy like [...path]", "It recurses with i instead of i + 1"],
    answer: 1,
    explain:
      "result.push(path) stores 8 references to the same array. The search keeps pushing and popping that array, and by the time it returns every choice has been un-chosen, so all 8 entries show the same empty array.",
  },
  {
    q: "In Combination Sum a candidate may be reused. Which recursive call allows reuse but never produces both [2, 3] and [3, 2]?",
    options: ["backtrack(0, remaining - nums[i])", "backtrack(i, remaining - nums[i])", "backtrack(i + 1, remaining - nums[i])"],
    answer: 1,
    explain:
      "Starting the child at i lets it pick nums[i] again (reuse) but nothing before i, so candidates always appear in index order and each combination is built once. Starting at 0 builds every ordering; starting at i + 1 forbids reuse.",
  },
  {
    q: "Why does a permutations solution track used[] instead of passing a start index?",
    options: [
      "Order matters, so an item that comes earlier in the input may still be placed later in the path",
      "used[] makes the recursion tree shallower",
      "A start index only works when the input is sorted",
    ],
    answer: 0,
    explain:
      "A start index only ever moves forward, which would keep items in their input order and produce one permutation. Permutations need every unused item as a candidate at every position; used[] answers \"is it already placed?\" in O(1).",
  },
];
