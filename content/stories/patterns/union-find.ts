import { pathCompression, unionByRank } from "../../dsa/patterns/16-union-find/viz";
import type { Story } from "../types";

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "Searching again after every link",
      line: "Each new link means a fresh search to ask if two people are connected. That adds up fast.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Links arriving", value: "100,000" },
          { label: "People per search", value: "up to 100,000" },
        ],
        result: { label: "Work in the worst case", value: "10 billion" },
        verdict: { text: "Too slow", tone: "bad" },
      },
    },
    {
      tag: "idea",
      head: "Each group is a tree",
      line: "The root names the group. Same root means connected. Merging hangs one root under the other.",
      scene: { kind: "trace", trace: unionByRank, preset: "An isolated node" },
      predict: { q: "Roots 3 and 0 differ. Does edge 4-0 merge or reject?", options: ["Merge the groups", "Reject the edge"], answer: 0, why: "Different roots mean different groups. Only a shared root marks a cycle." },
    },
    {
      tag: "idea",
      head: "Climbing flattens the tree",
      line: "Point every node you passed straight at the root. The next find from them is one hop.",
      scene: { kind: "trace", trace: pathCompression, preset: "A chain of five" },
    },
    {
      tag: "sum",
      head: "Steps per find, 100,000 nodes",
      line: "Without the tricks, trees become chains. One trick gives O(log n). Both give almost O(1).",
      scene: {
        kind: "bars",
        bars: [
          { label: "Neither trick", value: 100, shown: "100,000 hops", tone: "bad" },
          { label: "One trick", value: 8, shown: "about 17", tone: "warn" },
          { label: "Both tricks", value: 2, shown: "almost 1", tone: "good" },
        ],
      },
    },
    {
      tag: "choose",
      head: "Spot it in the problem",
      line: "Groups, links arriving one at a time, or a cycle in an undirected graph.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Count the groups", tone: "good", why: "Count drops per merge" },
          { label: "Undirected cycle", tone: "good", why: "Union returns false" },
          { label: "Links arrive later", tone: "good", why: "Each answer is near-instant" },
          { label: "Directed cycle", tone: "bad", why: "Needs topological sort" },
        ],
      },
      predict: { q: "Directed graph: does this edge close a cycle? Union-find?", options: ["Yes", "No, use topological sort"], answer: 1, why: "Union-find handles undirected cycles. Directed cycles need topological sort." },
    },
    {
      tag: "catch",
      head: "Union the roots, not items",
      line: "These slips break the trees or the count.",
      scene: {
        kind: "versus",
        left: { title: "Common slips", points: ["Linking items, not roots", "Lowering count on false", "Labels from 1, n slots"] },
        right: { title: "The fix", points: ["Union find(a), find(b)", "Lower it only on true", "Allocate n + 1 slots"] },
      },
    },
  ],
};
