import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "Kahn's algorithm stops with 7 of 10 nodes in the order. What can you conclude about the other 3?",
    options: [
      "All three lie on one cycle",
      "The graph has a cycle, and each leftover node is either on it or depends on a node that is",
      "The graph is disconnected, so they were never reached",
    ],
    answer: 1,
    explain: "Every leftover node still has an incoming edge from another leftover node, and following those edges backwards must eventually repeat a node: a cycle. A node can be left over just because it sits behind a cycle, without being on it. Disconnected nodes with no prerequisites are seeded at the start, so disconnection alone never leaves anything behind.",
  },
  {
    q: "During a DFS cycle check on a directed graph, an edge leads to a node that is already black (finished). What does that mean?",
    options: ["The graph has a cycle", "Nothing special: that node and everything after it are finished, so skip it", "The node must be reset to white and visited again"],
    answer: 1,
    explain: "Only an edge to a gray node, one still on the current path, closes a cycle. Edges into black nodes happen all the time in acyclic graphs, for example two courses that share a prerequisite. A two-state visited set can't tell these cases apart, which is why DFS needs three colours.",
  },
  {
    q: "Any number of courses can be taken in a semester once their prerequisites are done. How many semesters are needed?",
    options: [
      "The number of courses with no prerequisites",
      "The number of rounds when Kahn's algorithm takes every in-degree-0 course together, which equals the number of courses on the longest prerequisite chain",
      "The number of prerequisite pairs divided by the number of courses",
    ],
    answer: 1,
    explain: "Each course on the longest chain needs a later semester than the one before it, so you can't do better than its length. Taking every available course each round achieves exactly that, and each round of level-by-level Kahn's is one semester.",
  },
];
