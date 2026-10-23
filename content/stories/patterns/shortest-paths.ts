import { bellmanFordRounds, dijkstraHeap } from "../../dsa/patterns/17-shortest-paths/viz";
import type { Story } from "../types";

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "Fewest roads is not cheapest",
      line: "Weights change the answer. The direct road from A to C costs more than the detour.",
      scene: {
        kind: "versus",
        left: { title: "Fewest roads", points: ["A to C: one road", "It costs 6"] },
        right: { title: "Cheapest route", points: ["A to B to C: two roads", "It costs 2 + 3 = 5"] },
      },
    },
    {
      tag: "idea",
      head: "Relax, then take the closest",
      line: "Lower a town's cost if a route is cheaper. Always visit the smallest cost next.",
      scene: { kind: "trace", trace: dijkstraHeap, preset: "Unreachable node" },
      predict: { q: "The heap holds [5, C] and [6, C]. Which is final?", options: ["5", "6"], answer: 0, why: "The smallest waiting entry is final. The old 6 is stale and gets skipped." },
    },
    {
      tag: "sum",
      head: "A negative edge breaks it",
      line: "Dijkstra locks B in at 4. But the route through C costs only 2.",
      scene: {
        kind: "sum",
        rows: [
          { label: "A to B directly", value: "4" },
          { label: "A to C", value: "5" },
          { label: "C to B", value: "-3" },
        ],
        result: { label: "A to C to B", value: "2" },
        verdict: { text: "Dijkstra said 4: wrong", tone: "bad" },
      },
    },
    {
      tag: "idea",
      head: "Rounds count the edges",
      line: "Each round adds at most one edge to a path. Two rounds never build a three-edge path.",
      scene: { kind: "trace", trace: bellmanFordRounds, preset: "At most 2 edges" },
      predict: { q: "A-B-C-D costs 3. Do two rounds find it?", options: ["Yes, it is cheapest", "No, it needs 3 edges"], answer: 1, why: "After r rounds you hold the best path of at most r edges." },
    },
    {
      tag: "choose",
      head: "Pick by the weights",
      line: "The edge weights choose the algorithm.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "All edges equal", tone: "good", why: "BFS with a queue" },
          { label: "Non-negative", tone: "good", why: "Dijkstra with a heap" },
          { label: "Negative edges", tone: "warn", why: "Bellman-Ford instead" },
          { label: "At most k stops", tone: "warn", why: "Bellman-Ford, k + 1 rounds" },
        ],
      },
    },
    {
      tag: "catch",
      head: "Only a pop is final",
      line: "Dijkstra needs a real heap and careful timing.",
      scene: {
        kind: "versus",
        left: { title: "Common slips", points: ["Freezing a node on push", "new Array(n).fill([])", "queue.shift() as a heap"] },
        right: { title: "The fix", points: ["Final only when popped", "A fresh list per node", "Use a min-heap"] },
      },
    },
  ],
};
