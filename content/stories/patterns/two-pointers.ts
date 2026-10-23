import { pairSum, removeDuplicates } from "../../dsa/patterns/02-two-pointers/viz";
import type { Story } from "../types";

export const story: Story | undefined = {
  learn: [
    {
      head: "Two fingers on a sorted list",
      body: "Two pointers means keeping two positions in a list and moving them based on what you see. It works best on sorted data, because the order tells you which way to move.",
      eg: "Spending a 12 dollar gift card",
      example: "You want two dishes that cost exactly 12 from a sorted menu. Put one finger on the cheapest and one on the dearest. Too much, move the dear finger down. Too little, move the cheap one up.",
      doodle: "two-pointers",
    },
    {
      head: "Why it beats checking every pair",
      body: "Checking every pair of n numbers takes about n squared steps. With two pointers each move rules one number out for good, so you take at most n steps.",
      eg: "Pairing hikers for boats",
      example: "Each boat takes two people up to a weight limit. Compare the lightest with the heaviest. If they fit, send both. If not, the heaviest cannot pair with anyone, so send them alone.",
    },
    {
      head: "Moving toward each other",
      body: "Start one pointer at each end. If the sum is too big, move the right pointer left to shrink it. If it is too small, move the left pointer right. Equal means you found it.",
      eg: "Tuning a radio dial",
      example: "You turn the dial one way, overshoot, and turn back a little. Each correction narrows the range until the station comes in clearly.",
    },
    {
      head: "A reader and a writer",
      body: "Sometimes both pointers walk the same way. The fast one reads every item. The slow one marks where the next kept item goes, so you clean the list in place with no extra space.",
      eg: "Tidying a bookshelf",
      example: "You scan the shelf for books to keep and slide each one left into the next free gap. At the end everything kept sits packed at the start.",
    },
    {
      head: "How to spot it",
      body: "Look for sorted input, a pair or triplet that adds to a target, a palindrome or mirror check, or a request to rewrite an array in place with no extra memory.",
      eg: "Clues in the question",
      example: "Find two numbers in a sorted array that add to 9 says two pointers. Find the pair in an unsorted list points to a hash map instead.",
    },
  ],
  steps: [
    {
      tag: "pain",
      head: "Checking every pair is huge",
      line: "100,000 numbers make about 5 billion pairs. Looking at each one is far too slow.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Numbers", value: "100,000" },
          { label: "Pairs to check", value: "n × (n−1) ÷ 2" },
        ],
        result: { label: "Total pairs", value: "~5 billion" },
        verdict: { text: "Too slow to try", tone: "bad" },
      },
    },
    {
      tag: "idea",
      head: "One finger on each end",
      line: "The array is sorted. Start at both ends, and every step rules out one number.",
      scene: { kind: "trace", trace: pairSum, preset: "Pair exists" },
      predict: { q: "The sum is 12 but the target is 10. Which pointer moves?", options: ["Left, up", "Right, down"], answer: 1, why: "Sorted order means moving the right pointer down is the only way to shrink the sum." },
    },
    {
      tag: "sum",
      head: "Steps, not pairs",
      line: "Each step drops a number, so you never take more than n steps.",
      scene: {
        kind: "bars",
        bars: [
          { label: "Every pair", value: 100, shown: "5 billion", tone: "bad" },
          { label: "Two pointers", value: 3, shown: "100,000", tone: "good" },
        ],
      },
    },
    {
      tag: "choose",
      head: "Spot it in the problem",
      line: "Sorted input and a pair or a mirror are the clues.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Sorted pair search", tone: "good", why: "The classic fit" },
          { label: "Palindrome check", tone: "good", why: "Compare both ends inward" },
          { label: "Unsorted pairs", tone: "warn", why: "Sort first, or use a hash map" },
          { label: "Needs old indexes", tone: "bad", why: "Sorting loses them. Use a hash map" },
        ],
      },
      predict: { q: "Unsorted array, and you need the original indexes. Two pointers?", options: ["Yes", "No, use a hash map"], answer: 1, why: "Sorting would shuffle the indexes you must report." },
    },
    {
      tag: "idea",
      head: "Same direction, one slow, one fast",
      line: "A read pointer scans ahead while a write pointer keeps the cleaned prefix.",
      scene: { kind: "trace", trace: removeDuplicates, preset: "Sorted with repeats" },
    },
    {
      tag: "catch",
      head: "The usual slips",
      line: "Most bugs are about when to stop and how many pointers move.",
      scene: {
        kind: "versus",
        left: { title: "Common slips", points: ["Forgetting to sort first", "Using left <= right", "Moving both pointers"] },
        right: { title: "The fix", points: ["Sort, or pick a hash map", "Stop when they meet", "Move exactly one"] },
      },
    },
  ],
};
