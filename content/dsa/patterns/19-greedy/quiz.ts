import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "With coins [1, 3, 4] and amount 6, 'largest coin first' picks 4 + 1 + 1. What should you conclude?",
    options: [
      "Coin change can never be solved greedily",
      "The greedy choice isn't safe for this coin system, so you need dynamic programming (3 + 3 uses 2 coins)",
      "Sort the coins in ascending order and take the smallest first instead",
    ],
    answer: 1,
    explain: "One counterexample is enough to sink a greedy rule. 'Largest first' happens to be safe for systems like 25, 10, 5, 1, but not for arbitrary coins. DP tries every last coin for every amount and is always correct.",
  },
  {
    q: "In Jump Game, why is it enough to track only the furthest index you can reach?",
    options: [
      "Because the longest jump from each index is always the best one",
      "Because the reachable indices always form a prefix: if you can reach index j, a shorter jump reaches everything before it",
      "Because the values in nums are sorted",
    ],
    answer: 1,
    explain: "Jumps can be shorter than the maximum, so reachability never has holes. The frontier 'reach' describes the whole reachable set, and the scan only fails when it arrives at an index beyond it.",
  },
  {
    q: "In Gas Station, starting at s, the tank first goes negative leaving station i. Why can every start between s and i be skipped?",
    options: [
      "Because those stations hold less gas than station s",
      "Because each of them was reached from s with a tank of at least zero, so starting there empty is no better, and it would also run dry at i",
      "Because the problem promises the answer is unique",
    ],
    answer: 1,
    explain: "Arriving at a station with some fuel is never worse than arriving empty. Since the run from s already failed at i, a run from any station in between, which starts with less, fails there too. That rules out the whole stretch in one step.",
  },
];
