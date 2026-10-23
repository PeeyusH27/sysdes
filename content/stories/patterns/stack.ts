import { bracketMatch, nextGreater } from "../../dsa/patterns/06-stack/viz";
import type { Story } from "../types";

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "Counting is not enough",
      line: "The brackets ([)] have one of each kind. Counting says fine, but the pairs cross.",
      scene: {
        kind: "versus",
        left: { title: "Counting", points: ["One of each bracket", "Says balanced", "Misses the crossing"] },
        right: { title: "A stack", points: ["Newest opener on top", "A closer checks the top", "Crossing caught at once"] },
      },
    },
    {
      tag: "idea",
      head: "The newest open closes first",
      line: "A closer never searches. It looks at the top of the pile.",
      scene: { kind: "trace", trace: bracketMatch, preset: "Crossed pairs" },
      predict: { q: "( and [ are open. Then ) arrives. Does it match?", options: ["Yes", "No, the top is ["], answer: 1, why: "A closer must match the newest open bracket, which is the top." },
    },
    {
      tag: "idea",
      head: "Pop everything it beats",
      line: "Indices wait on the stack for a bigger value. A new value pops every smaller one.",
      scene: { kind: "trace", trace: nextGreater, preset: "Mixed values" },
      predict: { q: "Stack waits on values 5, 3, 1. Then 6 arrives. What pops?", options: ["Only 1", "1, then 3, then 5", "Nothing"], answer: 1, why: "6 beats every smaller value waiting, so each finds its answer." },
    },
    {
      tag: "sum",
      head: "Each index pushed and popped once",
      line: "That is O(n) amortised, against O(n²) for scanning right from every index.",
      scene: {
        kind: "bars",
        bars: [
          { label: "Scan right each time", value: 100, shown: "~5 billion", tone: "bad" },
          { label: "Monotonic stack", value: 3, shown: "200,000 max", tone: "good" },
        ],
      },
    },
    {
      tag: "choose",
      head: "Spot it in the problem",
      line: "Things that nest, undo, or wait for a bigger or smaller value.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Brackets or tags", tone: "good", why: "Newest opener closes first" },
          { label: "Undo the latest", tone: "good", why: "Pop the last action" },
          { label: "Next greater", tone: "good", why: "Stack of waiting indices" },
          { label: "Ties in values", tone: "warn", why: "Decide < or <= first" },
        ],
      },
    },
    {
      tag: "catch",
      head: "The usual slips",
      line: "Empty stacks, values instead of indices, and ties.",
      scene: {
        kind: "versus",
        left: { title: "Common slips", points: ["Peeking at an empty stack", "Pushing values, not indices", "Wrong < or <= on ties"] },
        right: { title: "The fix", points: ["Check length first", "Push the index", "Read strictly or or equal"] },
      },
    },
  ],
};
