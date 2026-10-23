import { classicSearch, lowerBound, searchOnAnswer } from "../../dsa/patterns/05-binary-search/viz";
import type { Story } from "../types";

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "Scanning ignores the order",
      line: "The numbers are sorted, but a left-to-right scan looks at them one by one anyway.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Sorted numbers", value: "1,000,000" },
          { label: "Scan from the left", value: "~1,000,000" },
        ],
        result: { label: "Looks for one number", value: "~1,000,000" },
        verdict: { text: "Wastes the sorted order", tone: "bad" },
      },
    },
    {
      tag: "idea",
      head: "Check the middle, drop half",
      line: "The answer must be inside lo to hi. One check proves one half cannot hold it.",
      scene: { kind: "trace", trace: classicSearch, preset: "Target present" },
      predict: { q: "Middle is 17, target is 44. Which side goes?", options: ["Left side", "Right side"], answer: 0, why: "Sorted: 17 and everything left of it is smaller than 44." },
    },
    {
      tag: "sum",
      head: "Halving is the speed",
      line: "Each check halves the range. Drag the number of candidates.",
      scene: {
        kind: "meter",
        label: "Candidates",
        unit: "numbers",
        min: 100,
        max: 1000000000,
        start: 1000000,
        log: true,
        stops: [
          { upTo: 1000, verdict: "Up to 10 checks", tone: "good" },
          { upTo: 1000000, verdict: "Up to 20 checks", tone: "good" },
          { upTo: 1000000000, verdict: "Up to 30 checks", tone: "good" },
        ],
      },
      predict: { q: "A billion sorted numbers. How many checks?", options: ["About 30", "About 1,000", "About 500 million"], answer: 0, why: "Thirty halvings take a billion candidates down to one." },
    },
    {
      tag: "idea",
      head: "Find the first yes",
      line: "Ask a yes or no question. Keep mid when it might be the first yes.",
      scene: { kind: "trace", trace: lowerBound, preset: "Duplicates" },
    },
    {
      tag: "idea",
      head: "Search the answer itself",
      line: "No array here. The candidates are capacities 4 to 12, and each check halves them.",
      scene: { kind: "trace", trace: searchOnAnswer, preset: "One day" },
    },
    {
      tag: "choose",
      head: "Spot it in the problem",
      line: "Sorted, or a yes-then-no question that flips once.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "First or last", tone: "good", why: "The first-true template" },
          { label: "Min speed or size", tone: "good", why: "Search the answer, not the array" },
          { label: "Rotated sorted", tone: "good", why: "One half is still sorted" },
          { label: "Unsorted input", tone: "bad", why: "Halving needs sorted or monotonic" },
        ],
      },
    },
    {
      tag: "catch",
      head: "The usual slips",
      line: "Most bugs are about where hi starts and how it moves.",
      scene: {
        kind: "versus",
        left: { title: "Common slips", points: ["hi = n - 1 for insert", "lo = mid, rounding down", "Trusting the position found"] },
        right: { title: "The fix", points: ["Start hi at n", "lo = mid + 1", "Check nums[i] === target"] },
      },
    },
  ],
};
