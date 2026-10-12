import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "You need the fewest moves from the top-left to the bottom-right of a maze where every move costs the same. Which search guarantees the right answer?",
    options: ["DFS, returning the first path it finds", "BFS from the start, returning the distance when the goal is first reached", "Either one, as long as cells are marked visited"],
    answer: 1,
    explain: "BFS discovers cells in order of distance, so the first time it reaches the goal is along a shortest path. DFS finds some path, often a long winding one, and marking cells visited makes it skip the shorter routes for good.",
  },
  {
    q: "Rot spreads from three rotten oranges at the same time. How do you find when the last fresh orange rots?",
    options: [
      "Run a BFS from each rotten orange and take the largest distance any of them finds",
      "Put all three rotten oranges in one queue at minute 0 and run a single BFS, level by level",
      "Run a DFS from each rotten orange and keep the deepest recursion",
    ],
    answer: 1,
    explain: "Each fresh orange rots at its distance from the nearest rotten one. Seeding every source at distance 0 (multi-source BFS) computes exactly that in one O(m·n) pass; separate searches time oranges from the wrong source and cost a full BFS each.",
  },
  {
    q: "A BFS marks a node as visited when it is dequeued instead of when it is enqueued. What goes wrong?",
    options: [
      "Nothing: it is only a matter of style",
      "A node can be enqueued several times before it is processed, so the queue grows and work is repeated",
      "The search turns into a depth-first search",
    ],
    answer: 1,
    explain: "Between being enqueued and dequeued, a node can be discovered by other neighbours and enqueued again. Marking on enqueue guarantees one queue entry per node, keeping the search O(V + E).",
  },
];
