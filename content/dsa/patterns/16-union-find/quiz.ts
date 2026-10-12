import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "While adding the edges of an undirected graph, union(a, b) finds that a and b already have the same root. What does that mean?",
    options: [
      "The union-find is corrupted and must be rebuilt",
      "a and b are already connected, so the edge (a, b) closes a cycle",
      "a and b are in different components that now merge",
    ],
    answer: 1,
    explain: "Equal roots mean some path of earlier edges already joins a and b. Adding (a, b) creates a second path, which is a cycle. That is the whole test behind Redundant Connection and Graph Valid Tree.",
  },
  {
    q: "Why does union by rank hang the root of the shorter tree under the root of the taller one?",
    options: [
      "So the merged tree's height grows only when both trees were equally tall, which keeps every tree O(log n) high",
      "So the root with the smaller index always stays the root",
      "So that find never needs to follow more than one pointer",
    ],
    answer: 0,
    explain: "A tree's rank only grows when two equal ranks merge, and that at least doubles the smallest possible size of a tree with that rank. So the height is at most log₂ n. Path compression then flattens paths further, but it alone doesn't guarantee one hop.",
  },
  {
    q: "Which of these questions is a poor fit for union-find?",
    options: [
      "How many groups remain after each new friendship is added?",
      "Does adding this road create a loop in the road network?",
      "What is the fewest number of roads between city A and city B?",
    ],
    answer: 2,
    explain: "Union-find only knows whether two items share a group, not how they are connected. Shortest paths need BFS (unweighted) or Dijkstra (weighted). The other two are classic union-find problems.",
  },
];
