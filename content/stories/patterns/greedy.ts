import { activitySelection, assignCookies, greedyCoins } from "../../dsa/patterns/19-greedy/viz";
import type { Story } from "../types";

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "Trying every subset never ends",
      line: "Keep or drop each of 100,000 activities. The number of subsets is hopeless.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Activities", value: "100,000" },
          { label: "Choices for each", value: "keep or drop" },
        ],
        result: { label: "Subsets to try", value: "2^100,000" },
        verdict: { text: "Never finishes", tone: "bad" },
      },
    },
    {
      tag: "idea",
      head: "Smallest cookie, least greedy child",
      line: "Sort both lists, then match the smallest cookie that works. A bigger one may be needed later.",
      scene: { kind: "trace", trace: assignCookies, preset: "Small cookies wasted" },
      predict: { q: "Cookie 1 is below every waiting child's greed. Keep it?", options: ["Keep it for later", "Throw it away"], answer: 1, why: "It is too small for the least greedy child, so nobody left can use it." },
    },
    {
      tag: "idea",
      head: "Earliest end first",
      line: "Keep the activity that ends first among those that fit. Overlaps get skipped.",
      scene: { kind: "trace", trace: activitySelection, preset: "Six activities" },
    },
    {
      tag: "choose",
      head: "Which rule survives?",
      line: "Only a rule you can prove is safe.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Most activities", tone: "good", why: "Earliest end first" },
          { label: "Reach the end?", tone: "good", why: "Track the furthest reach" },
          { label: "Earliest start", tone: "bad", why: "Fails on small examples" },
          { label: "Fewest coins", tone: "warn", why: "Try a small counterexample first" },
        ],
      },
    },
    {
      tag: "catch",
      head: "A choice you regret",
      line: "Coins 4, 3, 1 and amount 6. Taking the biggest coin first looked best.",
      scene: { kind: "trace", trace: greedyCoins, preset: "Coins 4, 3, 1 (fails)" },
      predict: { q: "Does largest-coin-first use the fewest coins for 6?", options: ["Yes", "No"], answer: 1, why: "It pays 4 + 1 + 1. But 3 + 3 uses only two coins." },
    },
    {
      tag: "skip",
      head: "Greedy or DP?",
      line: "A small counterexample settles it.",
      scene: {
        kind: "versus",
        left: { title: "Greedy fits", points: ["A proof: exchange or stays ahead", "No small counterexample", "Sort plus one pass"] },
        right: { title: "Use DP when", points: ["A tiny case breaks the rule", "Coins 4, 3, 1 at 6"] },
      },
    },
  ],
};
