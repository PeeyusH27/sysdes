import type { PageChecks } from "./types";

export const checks: Record<string, PageChecks> = {
  "two-pointers": {
    "when-to-reach-for-it": {
      q: "Which problem is a two-pointer fit?",
      options: ["Shortest path in a graph", "Pair summing to k in a sorted array", "Count subarrays with sum k, negatives allowed"],
      answer: 1,
      why: "Sorted order lets each comparison throw one end away. Negatives and counts need prefix sums instead.",
    },
    "the-core-idea-every-step-discards-something": {
      q: "Sorted array, pair sum too big. Which pointer moves?",
      options: ["The left one right", "The right one left", "Both outward"],
      answer: 1,
      why: "The right value is the largest in play. If it is too big even with the smallest partner, nothing pairs with it.",
    },
    "template-1-opposite-ends": {
      q: "What is the time cost of the opposite-ends template?",
      options: ["O(n²)", "O(n log n)", "O(n)"],
      answer: 2,
      why: "Each step moves a pointer inward and never back, so the pointers meet after n steps.",
    },
    "template-2-read-and-write-pointers": {
      q: "In read and write pointers, which one runs ahead?",
      options: ["Read", "Write", "They move together"],
      answer: 0,
      why: "Read scans every item. Write only advances when an item is kept.",
    },
    "template-3-one-pointer-per-input": {
      q: "Merging two sorted arrays: how many pointers?",
      options: ["One", "One per array", "Three"],
      answer: 1,
      why: "Each pointer marks the next unused item of its own array.",
    },
    complexity: {
      q: "Extra space for two pointers over an array?",
      options: ["O(1)", "O(n)", "O(log n)"],
      answer: 0,
      why: "Two indices are all it keeps, whatever the array size.",
    },
  },
};
