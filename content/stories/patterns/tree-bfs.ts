import { firstLeaf, levelLoop } from "../../dsa/patterns/11-tree-bfs/viz";
import type { Story } from "../types";

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "Nearest leaf needs the whole tree",
      line: "Depth-first dives down one path first, so it cannot know the closest leaf until the end.",
      scene: {
        kind: "versus",
        left: { title: "Depth-first", points: ["Dives down one path", "Explores the whole tree"] },
        right: { title: "Breadth-first", points: ["Reads one level at a time", "Shallow nodes come first", "Stops at the first match"] },
      },
    },
    {
      tag: "idea",
      head: "A queue keeps levels in order",
      line: "Children wait at the back, behind the whole current level.",
      scene: { kind: "trace", trace: levelLoop, preset: "Negative values" },
      predict: { q: "A level starts. How many nodes do you take out?", options: ["Until the queue is empty", "The size when the level began"], answer: 1, why: "That count is exactly this level. The rest belongs to the next one." },
    },
    {
      tag: "sum",
      head: "Never shift a big queue",
      line: "shift() moves every element down a slot, so a large queue gets slow.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Nodes", value: "100,000" },
          { label: "Cost of one shift()", value: "O(n)" },
        ],
        result: { label: "Worst case total", value: "O(n²)" },
        verdict: { text: "Use queue[head++]", tone: "warn" },
      },
    },
    {
      tag: "idea",
      head: "Stop at the first match",
      line: "Nodes come out shallowest first, so the first leaf found is a closest one.",
      scene: { kind: "trace", trace: firstLeaf, preset: "Shallow leaf on the right" },
      predict: { q: "Does BFS read every node before answering?", options: ["Yes", "No"], answer: 1, why: "It returns at the first leaf it dequeues, often far less than n." },
    },
    {
      tag: "choose",
      head: "Spot it in the problem",
      line: "Per level, one side, or nearest: breadth-first fits.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Level averages", tone: "good", why: "One level at a time" },
          { label: "Right side view", tone: "good", why: "Last node of each level" },
          { label: "Minimum depth", tone: "good", why: "Stop at the first leaf" },
          { label: "Longest bent path", tone: "bad", why: "Depth-first, with a global best" },
        ],
      },
    },
    {
      tag: "catch",
      head: "The usual slips",
      line: "Most bugs are in the level loop and the queue.",
      scene: {
        kind: "versus",
        left: { title: "Common slips", points: ["Looping on the live queue length", "Enqueuing null children", "Calling shift() on big queues"] },
        right: { title: "The fix", points: ["Loop on the saved size", "Skip missing children", "Use a head index"] },
      },
    },
  ],
};
