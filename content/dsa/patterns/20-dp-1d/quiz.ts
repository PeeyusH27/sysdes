import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "Plain recursion for min-cost stairs makes about 2^n calls, but the memoized version makes about 2n. Where does the saving come from?",
    options: [
      "The memo makes each call cheaper to execute",
      "There are only n + 1 different subproblems; the memo solves each once and turns every repeat into an O(1) lookup",
      "The memo lets the recursion skip the base cases",
    ],
    answer: 1,
    explain:
      "best(i) depends only on i, so there are n + 1 distinct calls. Plain recursion rebuilds the same subtrees over and over; with a memo each subproblem is computed once and every later call returns at once. Time is always (number of states) × (work per state).",
  },
  {
    q: "In Longest Increasing Subsequence, dp[i] is the length of the longest increasing subsequence that ends at index i. What is the answer?",
    options: ["dp[n - 1]", "The largest value anywhere in dp", "dp[0] + dp[n - 1]"],
    answer: 1,
    explain:
      "An \"ending at i\" state only describes subsequences whose last element is nums[i]. The best one can end at any index, so the answer is the maximum over all cells. dp[n - 1] is only right when the best subsequence happens to end at the last element.",
  },
  {
    q: "dp[i] for House Robber reads only dp[i - 1] and dp[i - 2]. What does that let you do?",
    options: [
      "Replace the array with two variables, for O(1) extra space",
      "Fill the table from right to left instead",
      "Skip the base cases",
    ],
    answer: 0,
    explain:
      "When a cell reads only a fixed number of earlier cells, you only need to keep those. Two rolling variables (twoBack, oneBack) replace the n-cell array. You lose the full table, so keep it if you must reconstruct which houses were chosen.",
  },
];
