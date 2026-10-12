import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "Dijkstra pops [7, E] from the heap, but dist[E] is already 5. What should it do, and why?",
    options: [
      "Relax E's edges again with 7, in case it finds something new",
      "Skip the entry: it is stale, pushed before the shorter route to E was found, and E's edges were already relaxed with 5",
      "Stop the algorithm: a larger distance means the heap is broken",
    ],
    answer: 1,
    explain: "With lazy deletion, improving a node pushes a new entry and leaves the old one in the heap. The smaller entry came out first and settled E, so relaxing with 7 can't improve anything. Skipping keeps the work at O(E log E).",
  },
  {
    q: "A graph has one negative edge and no negative cycle. Which choice gives correct distances with a guaranteed polynomial running time?",
    options: ["Dijkstra that marks each node done when it is popped", "BFS, counting edges", "Bellman-Ford"],
    answer: 2,
    explain: "Dijkstra's guarantee that a popped node is final relies on non-negative edges: a later negative edge can still shorten it. BFS ignores weights entirely. Bellman-Ford relaxes every edge in n - 1 rounds and is correct for any weights, in O(V · E).",
  },
  {
    q: "In Cheapest Flights Within K Stops, why does each Bellman-Ford round read from a copy of the previous round's prices?",
    options: [
      "So one round can't chain two flights, which would let a route use more than k + 1 flights",
      "Because modifying an array while looping over another one throws an error in JavaScript",
      "To make each round faster",
    ],
    answer: 0,
    explain: "If a round writes into the same array it reads, a flight relaxed early in the round can feed a later flight in the same round. Then r rounds no longer means 'at most r flights', and the stop limit breaks. Without a limit, updating in place is fine (it only converges faster).",
  },
];
