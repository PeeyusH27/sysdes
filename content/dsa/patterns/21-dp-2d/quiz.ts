import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "In the LCS table, why does dp have m + 1 rows and n + 1 columns instead of m × n?",
    options: [
      "To leave room for the answer, which is stored outside the table",
      "Row 0 and column 0 stand for the empty prefix, so every recurrence has a base case to read and no index goes negative",
      "Because JavaScript arrays are 1-based",
    ],
    answer: 1,
    explain:
      "dp[i][j] describes the first i letters of a and the first j letters of b, so i and j are lengths from 0 to m and 0 to n. The extra row and column are the empty prefix (LCS 0, or i / j edits for edit distance), which is why the letters are read as a[i - 1] and b[j - 1].",
  },
  {
    q: "You compress 0/1 knapsack to one row dp[c]. In which order must the inner loop visit the capacities?",
    options: [
      "From high to low, so dp[c - w] still holds the value from before this item",
      "From low to high, so dp[c - w] is already updated",
      "Either order works",
    ],
    answer: 0,
    explain:
      "Going down, the cell you read (c - w) is to the left of everything already updated for this item, so the item is counted at most once. Going up would read a cell that already includes the item and use it again, which is the unbounded knapsack.",
  },
  {
    q: "Counting coin combinations (Coin Change II), you put the amount loop outside and the coin loop inside. What do you count?",
    options: [
      "The same combinations, just more slowly",
      "Ordered sequences: 1 + 2 and 2 + 1 are counted separately",
      "Only combinations that use every coin",
    ],
    answer: 1,
    explain:
      "With amounts outside, every amount tries every coin as the last one, so each order of the same coins is a different path: that counts permutations (Combination Sum IV). With coins outside, each coin is added in a fixed order, so every multiset is counted exactly once.",
  },
];
