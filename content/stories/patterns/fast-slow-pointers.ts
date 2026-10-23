import { findMiddle, floydCycle } from "../../dsa/patterns/08-fast-slow-pointers/viz";
import type { Story } from "../types";

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "Counting or remembering nodes",
      line: "The plain ways either walk the list twice or keep a note of every node.",
      scene: {
        kind: "versus",
        left: { title: "Without runners", points: ["Count the nodes first", "Or remember every node", "Memory grows with the list"] },
        right: { title: "Two runners", points: ["Slow +1, fast +2", "One pass, no counting", "O(1) extra space"] },
      },
    },
    {
      tag: "idea",
      head: "Fast covers twice the ground",
      line: "When fast runs out of list, slow has walked half of it.",
      scene: { kind: "trace", trace: findMiddle, preset: "Odd length" },
      predict: { q: "Fast has reached the end of 7 nodes. Where is slow?", options: ["Node 2", "Node 4, the middle", "The end"], answer: 1, why: "Fast covered twice the ground, so slow covered half." },
    },
    {
      tag: "idea",
      head: "In a loop, fast laps slow",
      line: "Both circle the loop, and the fast one gains one node per step.",
      scene: { kind: "trace", trace: floydCycle, preset: "Cycle" },
      predict: { q: "Inside a loop, can fast jump over slow?", options: ["Yes", "No, the gap shrinks by 1"], answer: 1, why: "A gap that shrinks by one cannot skip zero, so they meet." },
    },
    {
      tag: "sum",
      head: "Same time, far less memory",
      line: "Both are O(n) time. The runners need O(1) extra space.",
      scene: {
        kind: "bars",
        bars: [
          { label: "Visited Set", value: 100, shown: "10 million", tone: "bad" },
          { label: "Two runners", value: 3, shown: "2 pointers", tone: "good" },
        ],
      },
    },
    {
      tag: "choose",
      head: "Spot it in the problem",
      line: "A list or a repeating rule, and O(1) space.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Middle of a list", tone: "good", why: "Slow ends on the middle" },
          { label: "Does it loop?", tone: "good", why: "Fast laps slow" },
          { label: "Digit-square rule", tone: "good", why: "Same two phases, f(x) for next" },
          { label: "Space is not tight", tone: "warn", why: "A visited Set is simpler" },
        ],
      },
    },
    {
      tag: "catch",
      head: "The usual slips",
      line: "Null checks and what the meeting point means.",
      scene: {
        kind: "versus",
        left: { title: "Common slips", points: ["Checking only fast.next", "Comparing values, not nodes", "Meeting point as the entry"] },
        right: { title: "The fix", points: ["Test fast, then fast.next", "Compare nodes with ===", "Restart one at the head"] },
      },
    },
  ],
};
