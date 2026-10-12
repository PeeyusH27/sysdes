import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "In the level-size loop, why read size = queue.length - head before the inner loop instead of looping while i < queue.length - head?",
    options: [
      "Reading the length once is faster",
      "Children are appended while the level is processed, so the live length grows; the snapshot is exactly the current level",
      "The queue might shrink to zero in the middle of a level",
    ],
    answer: 1,
    explain: "At the start of a level the queue holds that level and nothing else. Every push during the loop adds a node of the next level, so only the snapshot tells you where this level ends.",
  },
  {
    q: "Why can BFS return the minimum depth as soon as it dequeues the first leaf?",
    options: [
      "Because leaves are always on the left side of the tree",
      "Because BFS dequeues every node at depth d before any node at depth d + 1, so no shallower leaf can appear later",
      "Because the queue is sorted by node value",
    ],
    answer: 1,
    explain: "A FIFO queue hands out nodes in non-decreasing depth. When the first leaf comes out, every shallower node has already been checked and was not a leaf. DFS has no such guarantee and must explore everything.",
  },
  {
    q: "A BFS over a tree with 10^5 nodes dequeues with queue.shift(). What is the risk?",
    options: [
      "None: shift() is O(1) like pop()",
      "shift() moves every remaining element down one slot, so the BFS can degrade to O(n²); a head index makes dequeue O(1)",
      "shift() changes the order of the remaining nodes",
    ],
    answer: 1,
    explain: "Engines optimise shift() on small arrays, but once the queue holds tens of thousands of items each call copies them. Reading queue[head++] never moves anything.",
  },
];
