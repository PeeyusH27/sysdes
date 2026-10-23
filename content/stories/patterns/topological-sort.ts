import { dfsColors, kahn } from "../../dsa/patterns/15-topological-sort/viz";
import type { Story } from "../types";

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "Trying every order explodes",
      line: "Ten courses with prerequisites have too many orderings to try one by one.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Courses", value: "10" },
          { label: "Possible orders", value: "10 × 9 × … × 1" },
        ],
        result: { label: "Orders to try", value: "3,628,800" },
        verdict: { text: "Do not try them all", tone: "bad" },
      },
    },
    {
      tag: "idea",
      head: "Start with no prerequisites",
      line: "Socks come before shoes. Place what nothing points at, cross it off, repeat.",
      scene: { kind: "doodle", name: "graph" },
    },
    {
      tag: "idea",
      head: "Count what each node waits on",
      line: "A node joins the queue when its count of missing prerequisites hits zero.",
      scene: { kind: "trace", trace: kahn, preset: "A cycle" },
      predict: { q: "The queue runs dry with nodes left. What is it?", options: ["A cycle", "A valid order"], answer: 0, why: "The leftovers wait on each other, so no order exists." },
    },
    {
      tag: "choose",
      head: "Spot it in the problem",
      line: "A must-happen-before rule on a directed graph is the clue.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Prerequisites", tone: "good", why: "Edge b to a" },
          { label: "Alien alphabet", tone: "good", why: "Order from comparisons" },
          { label: "Parallel stages", tone: "good", why: "Kahn's, level by level" },
          { label: "Fewest grid steps", tone: "bad", why: "That is BFS, not an order" },
        ],
      },
      predict: { q: "Fewest steps in a grid. Topological sort?", options: ["Yes", "No"], answer: 1, why: "Fewest steps is a BFS question. Topological sort gives an order." },
    },
    {
      tag: "idea",
      head: "DFS finds cycles too",
      line: "Gray nodes are on the current path. An edge into a gray node is a cycle.",
      scene: { kind: "trace", trace: dfsColors, preset: "A back edge" },
    },
    {
      tag: "sum",
      head: "Each edge counted once",
      line: "Each node is queued once and each edge counted once, so the work is O(V + E).",
      scene: {
        kind: "sum",
        rows: [
          { label: "Nodes (V)", value: "100,000" },
          { label: "Edges (E)", value: "200,000" },
        ],
        result: { label: "Steps, V + E", value: "300,000" },
        verdict: { text: "Linear and fast", tone: "good" },
      },
    },
    {
      tag: "catch",
      head: "The usual slips",
      line: "Mistakes show up when a cycle exists or labels start at 1.",
      scene: {
        kind: "versus",
        left: { title: "Common slips", points: ["Returning a partial order", "Not reversing DFS finishing order", "1-based labels, size n arrays"] },
        right: { title: "The fix", points: ["Check order.length equals n", "Reverse the finishing order", "Size n + 1, or subtract 1"] },
      },
    },
  ],
};
