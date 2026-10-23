import { mergeSweep, sweepCount } from "../../dsa/patterns/07-intervals/viz";
import type { Story } from "../types";

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "Checking every pair is huge",
      line: "100,000 meetings make about 5 billion pairs to test for overlap.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Meetings", value: "100,000" },
          { label: "Pairs to check", value: "n × (n−1) ÷ 2" },
        ],
        result: { label: "Total pairs", value: "~5 billion" },
        verdict: { text: "Too slow to try", tone: "bad" },
      },
    },
    {
      tag: "idea",
      head: "Sort by start, then sweep",
      line: "After sorting, only neighbours can overlap. Stretch the open group or start a new one.",
      scene: { kind: "trace", trace: mergeSweep, preset: "Groups with gaps" },
      predict: { q: "Open group ends at 3. Next interval starts at 2. Merge?", options: ["Yes, stretch it", "No, new group"], answer: 0, why: "2 is not after 3, so they overlap and the group stretches." },
    },
    {
      tag: "sum",
      head: "Sorting is the main cost",
      line: "O(n log n) for the sort, then one pass over the intervals.",
      scene: {
        kind: "bars",
        bars: [
          { label: "Check every pair", value: 100, shown: "5 billion", tone: "bad" },
          { label: "Sort and sweep", value: 3, shown: "~1.7 million", tone: "good" },
        ],
      },
    },
    {
      tag: "idea",
      head: "Count rooms with +1 and -1",
      line: "Each start adds one, each end removes one. The highest count is the rooms needed.",
      scene: { kind: "trace", trace: sweepCount, preset: "Back to back" },
      predict: { q: "One meeting ends at 3, another starts at 3. Which first?", options: ["The start", "The end"], answer: 1, why: "Ending first frees the room, so back-to-back meetings do not clash." },
    },
    {
      tag: "choose",
      head: "Spot it in the problem",
      line: "Pairs with a start and an end, and a question about overlap.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Merge or clash", tone: "good", why: "Sort by start" },
          { label: "Minimum rooms", tone: "good", why: "Sweep events, or a min-heap" },
          { label: "Keep the most", tone: "good", why: "Sort by end instead" },
          { label: "Small whole times", tone: "warn", why: "A difference array also works" },
        ],
      },
    },
    {
      tag: "catch",
      head: "The usual slips",
      line: "Sorting and ties cause most bugs.",
      scene: {
        kind: "versus",
        left: { title: "Common slips", points: ["sort() without a comparator", "Start before end on a tie", "Sort by start to keep the most"] },
        right: { title: "The fix", points: ["Pass a comparator", "Put the end first", "Sort by end"] },
      },
    },
  ],
};
