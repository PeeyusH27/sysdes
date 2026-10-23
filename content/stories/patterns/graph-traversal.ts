import { bfsLevels, multiSourceBfs } from "../../dsa/patterns/14-graph-traversal/viz";
import type { Story } from "../types";

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "Grids are full of loops",
      line: "Every cell touches its neighbours, and they touch it back. Without a mark, you go round forever.",
      scene: {
        kind: "versus",
        left: { title: "No visited mark", points: ["A reaches B, B reaches A", "The same cells queue again", "The search never ends"] },
        right: { title: "Mark on push", points: ["Each cell queued once", "O(V + E) in total"] },
      },
    },
    {
      tag: "sum",
      head: "Four checks per cell",
      line: "A grid builds no graph. Each cell just checks four neighbours, so the work stays linear.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Cells (V)", value: "90,000" },
          { label: "Neighbour checks", value: "4 per cell" },
        ],
        result: { label: "Total checks", value: "360,000" },
        verdict: { text: "Linear, not a blowup", tone: "good" },
      },
    },
    {
      tag: "idea",
      head: "BFS spreads in rings",
      line: "Every node at distance d is done before distance d + 1.",
      scene: { kind: "trace", trace: bfsLevels, preset: "Unreachable nodes" },
      predict: { q: "Can BFS from node 0 reach nodes 4 and 5?", options: ["Yes, in 2 steps", "No, they stay unvisited"], answer: 1, why: "No path joins them to node 0, so they keep distance -1." },
    },
    {
      tag: "choose",
      head: "Spot it in the problem",
      line: "Pick the search by the question you are asked.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Count islands", tone: "good", why: "DFS or BFS, either" },
          { label: "Fewest steps", tone: "good", why: "BFS only" },
          { label: "Spreads from many", tone: "good", why: "Multi-source BFS" },
          { label: "Unequal step costs", tone: "bad", why: "Plain BFS is not enough" },
        ],
      },
      predict: { q: "Fewest steps in a grid: DFS or BFS?", options: ["DFS", "BFS"], answer: 1, why: "BFS finishes every distance d before d + 1." },
    },
    {
      tag: "idea",
      head: "Start from every exit at once",
      line: "Seed the queue with all the exits at distance 0. One search covers them all.",
      scene: { kind: "trace", trace: multiSourceBfs, preset: "A walled-off corner" },
    },
    {
      tag: "catch",
      head: "The usual slips",
      line: "Most bugs are about marking nodes and checking bounds.",
      scene: {
        kind: "versus",
        left: { title: "Common slips", points: ["Forgetting to mark the start", "Indexing before the bounds check", "Recursive DFS on a big grid"] },
        right: { title: "The fix", points: ["Mark sources when pushed", "Check bounds first", "Use an explicit stack"] },
      },
    },
  ],
};
