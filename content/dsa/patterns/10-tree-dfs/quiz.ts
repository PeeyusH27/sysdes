import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "For the diameter of a tree, the helper returns the subtree height, yet the answer at a node is leftHeight + rightHeight. Why not return leftHeight + rightHeight from the helper?",
    options: [
      "Returning a sum would overflow for deep trees",
      "A parent can extend only one arm of a path; a path that bends at this node can't continue upward, so it goes into a global best instead",
      "Heights are cheaper to compute than path lengths",
    ],
    answer: 1,
    explain: "A path can bend at most once. The bent path through a node is a candidate answer, but the parent can only continue a straight arm, so the helper returns the longer arm and the outer variable keeps the best bend.",
  },
  {
    q: "In the tree [5, 4, 6, null, null, 3, 7], every node is correctly ordered relative to its own children. Is it a valid BST?",
    options: [
      "Yes: 4 < 5 < 6 and 3 < 6 < 7",
      "No: 3 is in the right subtree of 5, so it must be greater than 5",
      "Only if duplicates are allowed",
    ],
    answer: 1,
    explain: "Each node must lie inside the range set by ALL its ancestors, not just its parent. Going right from 5 sets low = 5, so 3 is out of range. Carry (low, high) down to catch it.",
  },
  {
    q: "A recursive DFS visits every node of a tree with n nodes and height h once. What is its extra space?",
    options: ["O(1), since no data structure is allocated", "O(h) for the call stack: O(log n) when balanced, O(n) when skewed", "O(n) always"],
    answer: 1,
    explain: "Each pending call holds a stack frame, and at most one call per level is pending. A skewed tree has h = n, which is also when recursion can overflow and an explicit stack helps.",
  },
];
