import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "In the first-true template (while (lo < hi)), ok(mid) is true. Why do we set hi = mid rather than hi = mid - 1?",
    options: [
      "Because mid - 1 could be negative",
      "Because mid itself might be the first true, and the invariant says the answer stays inside [lo, hi]",
      "Because it makes the loop run fewer times",
    ],
    answer: 1,
    explain: "We only know mid passes, not that it is the first to pass. hi = mid - 1 could throw the answer away. Rounding mid down guarantees mid < hi, so hi = mid still shrinks the range.",
  },
  {
    q: "Why can Koko Eating Bananas be solved with binary search even though no array is sorted?",
    options: [
      "Because the piles can be sorted first",
      "Because if a speed finishes in time, every faster speed does too, so 'is k fast enough?' flips from no to yes exactly once",
      "Because the number of hours is always a power of two",
    ],
    answer: 1,
    explain: "Binary search needs a yes/no question that flips once, not a sorted array. Speeds are ordered and a faster speed never hurts, so first true finds the slowest speed that works.",
  },
  {
    q: "You binary search a capacity between 1 and 10^9, and each feasibility check scans n packages. What is the total time?",
    options: ["O(log n)", "O(n log 10^9), about 30 passes over the input", "O(n · 10^9)"],
    answer: 1,
    explain: "Each step halves the range of candidate answers, so there are about log2(10^9) ≈ 30 steps, and each one costs an O(n) check. Trying every capacity would be O(n · 10^9).",
  },
];
