import { popcountKernighan, subsetMasks, xorAccumulate } from "../../dsa/patterns/22-bit-manipulation/viz";
import type { Story } from "../types";

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "Every value twice, except one",
      line: "A map of counts finds it, but its space grows with the input.",
      scene: {
        kind: "versus",
        left: { title: "A map of counts", points: ["One entry per value", "Space grows with n"] },
        right: { title: "XOR", points: ["One number, no growth", "O(n) time, O(1) space"] },
      },
    },
    {
      tag: "idea",
      head: "Equal pairs cancel",
      line: "XOR flips bits wherever the value has a 1. A repeat flips them back.",
      scene: { kind: "trace", trace: xorAccumulate, preset: "Single number" },
      predict: { q: "acc is 3 and the second 3 arrives. What is acc?", options: ["0", "6"], answer: 0, why: "x ^ x is 0: the repeat flips back exactly the bits the first one flipped." },
    },
    {
      tag: "idea",
      head: "Drop the lowest 1 each loop",
      line: "n & (n - 1) clears the lowest set bit, so the loop runs once per set bit.",
      scene: { kind: "trace", trace: popcountKernighan, preset: "n = 44 (101100)" },
    },
    {
      tag: "idea",
      head: "Counting lists every subset",
      line: "Each number from 0 to 7 is one mask. Each set bit means that item is in.",
      scene: { kind: "trace", trace: subsetMasks, preset: "Three items" },
    },
    {
      tag: "sum",
      head: "How many items can masks take?",
      line: "Every extra item doubles the masks. Drag to see where it stops being practical.",
      scene: {
        kind: "meter",
        label: "Items in the set",
        unit: "items",
        min: 1,
        max: 40,
        start: 10,
        stops: [
          { upTo: 20, verdict: "Up to a million masks: fine", tone: "good" },
          { upTo: 30, verdict: "Up to a billion masks: the limit", tone: "warn" },
          { upTo: 40, verdict: "Too many masks, and 32 bits run out", tone: "bad" },
        ],
      },
      predict: { q: "Do 40 items fit the bitmask approach?", options: ["Yes", "No"], answer: 1, why: "2^40 masks is far too many, and JavaScript bitwise operators use 32 bits." },
    },
    {
      tag: "choose",
      head: "Spot it in the problem",
      line: "Pairs that cancel, set bits, or small subsets.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Twice except one", tone: "good", why: "XOR everything" },
          { label: "Count set bits", tone: "good", why: "n & (n - 1) loop" },
          { label: "Power of two?", tone: "good", why: "Exactly one set bit" },
          { label: "Three times each", tone: "warn", why: "Count columns mod 3 instead" },
        ],
      },
    },
    {
      tag: "catch",
      head: "Silent bit bugs",
      line: "Bit bugs give wrong numbers, not errors.",
      scene: {
        kind: "versus",
        left: { title: "Common slips", points: ["Bit 31 set, no >>> 0", "n & 1 === 0, no brackets", "Using ~ as NOT"] },
        right: { title: "The fix", points: ["Add >>> 0 for unsigned", "Write (n & 1) === 0", "~0 is -1, truthy"] },
      },
    },
  ],
};
