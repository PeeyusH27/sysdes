import { longestSumK, prefixBuildQuery } from "../../dsa/patterns/04-prefix-sum/viz";
import type { Story } from "../types";

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "Every question re-adds the range",
      line: "Many range questions on the same data. Each one adds its numbers from scratch.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Numbers", value: "100,000" },
          { label: "Range questions", value: "100,000" },
          { label: "Adds per question", value: "up to 100,000" },
        ],
        result: { label: "Adds in total", value: "~10 billion" },
        verdict: { text: "Far too slow", tone: "bad" },
      },
    },
    {
      tag: "idea",
      head: "Keep running totals",
      line: "Build prefix once. Any range is the top step minus the bottom step.",
      scene: { kind: "trace", trace: prefixBuildQuery, preset: "Two queries" },
      predict: { q: "To sum nums[2..4], what do you subtract?", options: ["prefix[5] - prefix[2]", "prefix[4] - prefix[2]", "prefix[5] - prefix[1]"], answer: 0, why: "prefix[5] covers indices 0 to 4. Subtracting prefix[2] drops indices 0 and 1." },
    },
    {
      tag: "sum",
      head: "Build once, subtract forever",
      line: "One O(n) pass, then O(1) per query, whatever the range length.",
      scene: {
        kind: "bars",
        bars: [
          { label: "Re-add each range", value: 100, shown: "10 billion", tone: "bad" },
          { label: "Prefix sums", value: 3, shown: "200,000", tone: "good" },
        ],
      },
    },
    {
      tag: "idea",
      head: "Ask the map for a start",
      line: "A subarray sums to k when an earlier total equals sum minus k.",
      scene: { kind: "trace", trace: longestSumK, preset: "Keep the first index" },
      predict: { q: "A running sum repeats. Keep the old index or the new one?", options: ["The old one", "The new one"], answer: 0, why: "An earlier start gives a longer subarray." },
    },
    {
      tag: "choose",
      head: "Spot it in the problem",
      line: "Range sums, exact sums with negatives, or many range updates.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Many range sums", tone: "good", why: "Build once, subtract" },
          { label: "Subarray sums to k", tone: "good", why: "Prefix sums plus a map" },
          { label: "Many range updates", tone: "good", why: "A difference array" },
          { label: "Changing data", tone: "warn", why: "Each update costs O(n)" },
          { label: "Range max or min", tone: "bad", why: "You cannot subtract a max" },
        ],
      },
    },
    {
      tag: "catch",
      head: "The usual slips",
      line: "Off-by-one conventions and a lost first index.",
      scene: {
        kind: "versus",
        left: { title: "Common slips", points: ["Mixing index conventions", "Overwriting the first index", "No empty prefix"] },
        right: { title: "The fix", points: ["Use n + 1 entries", "Keep the first index only", "Seed the map with 0"] },
      },
    },
  ],
};
