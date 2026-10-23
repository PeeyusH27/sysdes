import { kWayMerge, topK } from "../../dsa/patterns/13-heaps/viz";
import type { Story } from "../types";

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "Sorting for the top 10",
      line: "To find the 10 largest of a million, sorting orders everything you then throw away.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Numbers", value: "1,000,000" },
          { label: "Sort everything", value: "~20 million" },
        ],
        result: { label: "Heap of size 10", value: "~3 million" },
        verdict: { text: "Keep only the best 10", tone: "good" },
      },
    },
    {
      tag: "idea",
      head: "A small heap of the best",
      line: "Push each value. When the heap grows past k, pop the root.",
      scene: { kind: "trace", trace: topK, preset: "k = 3" },
      predict: { q: "The k largest need a min-heap. Why?", options: ["The root is the next to evict", "Smaller values sift faster"], answer: 0, why: "The root is the smallest you keep, so it is the one to drop." },
    },
    {
      tag: "idea",
      head: "Every parent beats its children",
      line: "Only the best sits on top. Peek is O(1); push and pop are O(log n).",
      scene: { kind: "doodle", name: "heap" },
    },
    {
      tag: "sum",
      head: "Few levels, few swaps",
      line: "Push and pop swap at most once per level. Drag the size.",
      scene: {
        kind: "meter",
        label: "Items in the heap",
        unit: "items",
        min: 10,
        max: 1000000,
        start: 1000,
        log: true,
        stops: [
          { upTo: 1000, verdict: "About 10 levels deep.", tone: "good" },
          { upTo: 100000, verdict: "About 17 levels deep.", tone: "good" },
          { upTo: 1000000, verdict: "About 20 levels deep.", tone: "good" },
        ],
      },
      predict: { q: "A million items. How many levels deep?", options: ["About 20", "About 1,000"], answer: 0, why: "Each level doubles the count, so a million fits in about 20 levels." },
    },
    {
      tag: "idea",
      head: "Merge sorted lists",
      line: "The heap holds one head per list. Pop the smallest, then push that list's next.",
      scene: { kind: "trace", trace: kWayMerge, preset: "Three arrays" },
    },
    {
      tag: "choose",
      head: "Spot it in the problem",
      line: "The best item, asked for again and again, is the clue.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "k largest or best", tone: "good", why: "Heap of size k" },
          { label: "Merge k lists", tone: "good", why: "One head per list" },
          { label: "Running median", tone: "good", why: "Two heaps" },
          { label: "The maximum, once", tone: "bad", why: "Just scan: O(n)" },
        ],
      },
    },
    {
      tag: "catch",
      head: "The usual slips",
      line: "Heaps break on direction and on which child to swap.",
      scene: {
        kind: "versus",
        left: { title: "Common slips", points: ["A comparator returning a boolean", "Sifting down to the first child", "A max-heap for the k largest"] },
        right: { title: "The fix", points: ["Return a number: a - b", "Swap with the better child", "A min-heap of size k"] },
      },
    },
  ],
};
