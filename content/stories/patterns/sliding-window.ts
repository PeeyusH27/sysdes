import { fixedWindow, longestWindow } from "../../dsa/patterns/03-sliding-window/viz";
import type { Story } from "../types";

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "Adding every window again",
      line: "Neighbouring windows share almost all their numbers, yet the plain way adds them all again.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Numbers", value: "100,000" },
          { label: "Window size k", value: "1,000" },
          { label: "Adds per window", value: "1,000" },
        ],
        result: { label: "Adds in total", value: "~100 million" },
        verdict: { text: "Repeats the same work", tone: "bad" },
      },
    },
    {
      tag: "idea",
      head: "Slide: one in, one out",
      line: "Keep the running sum. Add the entering number, subtract the leaving one.",
      scene: { kind: "trace", trace: fixedWindow, preset: "Typical" },
      predict: { q: "Window sums to 8. Then 1 enters and 2 leaves. New sum?", options: ["6", "7", "9"], answer: 1, why: "8 + 1 - 2 = 7. Two operations, not a fresh addition." },
    },
    {
      tag: "sum",
      head: "Each number enters once",
      line: "Each number enters once and leaves once, so the whole pass is O(n).",
      scene: {
        kind: "bars",
        bars: [
          { label: "Re-add each window", value: 100, shown: "100 million", tone: "bad" },
          { label: "Slide the window", value: 3, shown: "100,000", tone: "good" },
        ],
      },
    },
    {
      tag: "idea",
      head: "Grow right, shrink left",
      line: "Right always grows. When the rule breaks, left moves until it holds again.",
      scene: { kind: "trace", trace: longestWindow, preset: "k = 1" },
      predict: { q: "Window 'aab' may hold one distinct letter. What moves?", options: ["Right pointer", "Left pointer"], answer: 1, why: "The window is invalid, so left moves on until it is valid. Neither pointer goes back." },
    },
    {
      tag: "choose",
      head: "Spot it in the problem",
      line: "A contiguous range, a bound or a fixed size, and no negatives.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Longest, no repeat", tone: "good", why: "Grow right, shrink left" },
          { label: "Best block of k", tone: "good", why: "One in, one out" },
          { label: "Max of each window", tone: "warn", why: "Add a deque of candidates" },
          { label: "Negative numbers", tone: "bad", why: "Use prefix sums and a map" },
        ],
      },
    },
    {
      tag: "catch",
      head: "The usual slips",
      line: "Most bugs are in the length and the shrink loop.",
      scene: {
        kind: "versus",
        left: { title: "Common slips", points: ["Length as right - left", "Shrinking with if", "Negative values in the window"] },
        right: { title: "The fix", points: ["right - left + 1", "Shrink with while", "Prefix sums and a map"] },
      },
    },
  ],
};
