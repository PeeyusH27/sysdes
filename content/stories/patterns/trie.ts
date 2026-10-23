import { wildcardSearch } from "../../dsa/patterns/12-trie/viz";
import type { Story } from "../types";

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "A set cannot answer prefixes",
      line: "Does any word start with ca? A set of words has to look at every one.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Words in a set", value: "100,000" },
          { label: "Question", value: "prefix ca?" },
        ],
        result: { label: "Words to scan", value: "all 100,000" },
        verdict: { text: "Slow for every question", tone: "bad" },
      },
    },
    {
      tag: "idea",
      head: "A prefix is a path",
      line: "Words that start the same share nodes. Each node stands for the letters above it.",
      scene: { kind: "doodle", name: "trie" },
    },
    {
      tag: "choose",
      head: "Spot it in the problem",
      line: "Prefixes, wildcards and stopping early are the clue.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Starts with ca?", tone: "good", why: "Walk one path" },
          { label: "Words in a grid", tone: "good", why: "Drop dead prefixes early" },
          { label: "Pattern c.t", tone: "good", why: "A dot tries every child" },
          { label: "Exact words only", tone: "warn", why: "A set is simpler" },
        ],
      },
      predict: { q: "Only exact-word lookups. Trie or set?", options: ["A trie", "A set is simpler"], answer: 1, why: "Both are O(L) for exact words. A trie wins on prefixes and wildcards." },
    },
    {
      tag: "idea",
      head: "A dot tries every child",
      line: "A letter follows one edge. A dot branches, and dead ends back up.",
      scene: { kind: "trace", trace: wildcardSearch, preset: "Match after backtracking" },
      predict: { q: "Which word matches the pattern ..t?", options: ["bad", "cat", "cod"], answer: 1, why: "Only cat ends in t. The search backs out of the others." },
    },
    {
      tag: "idea",
      head: "Stop when nothing can match",
      line: "No word ends in x, so every branch is abandoned.",
      scene: { kind: "trace", trace: wildcardSearch, preset: "No match" },
    },
    {
      tag: "catch",
      head: "The usual slips",
      line: "A path is not always a word, and a failed branch is not a failed search.",
      scene: {
        kind: "versus",
        left: { title: "Common slips", points: ["Skipping the end flag", "Returning inside the dot loop", "Not restoring a grid cell"] },
        right: { title: "The fix", points: ["car is a path in cart", "Return only on success", "Mark, then restore"] },
      },
    },
  ],
};
