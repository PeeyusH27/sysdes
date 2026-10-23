import { fillTable, overAmount, recursionTree } from "../../dsa/patterns/20-dp-1d/viz";
import type { Story } from "../types";

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "The same question, again and again",
      line: "Plain recursion asks two more questions per call. Almost all of them repeat.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Steps", value: "50" },
          { label: "Calls without a memo", value: "up to 2^50" },
          { label: "Different questions", value: "51" },
        ],
        result: { label: "Questions worth solving", value: "51" },
        verdict: { text: "Write each answer down once", tone: "info" },
      },
    },
    {
      tag: "idea",
      head: "A sticky note per question",
      line: "The first answer is saved. A repeat returns at once instead of rebuilding its subtree.",
      scene: { kind: "trace", trace: recursionTree, preset: "With a memo" },
      predict: { q: "bestMemo(2) is asked again. Does it recompute?", options: ["Yes, from scratch", "No, a memo hit"], answer: 1, why: "It is already in the memo, so the call returns at once." },
    },
    {
      tag: "idea",
      head: "Fill cells from the base up",
      line: "Each cell reads only the two before it, so two variables would be enough.",
      scene: { kind: "trace", trace: fillTable, preset: "Seven steps" },
    },
    {
      tag: "choose",
      head: "Spot it in the problem",
      line: "Counts or best values over choices, with repeating calls.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Number of ways", tone: "good", why: "dp[i] counts them" },
          { label: "Cheapest or best", tone: "good", why: "Min or max of the last moves" },
          { label: "Repeating calls", tone: "good", why: "Same arguments, so memo" },
          { label: "List every answer", tone: "bad", why: "That is backtracking" },
        ],
      },
      predict: { q: "You must print every valid answer. Use DP?", options: ["Yes", "No, backtracking"], answer: 1, why: "Listing every solution is backtracking. DP counts or optimises." },
    },
    {
      tag: "idea",
      head: "The amount is the index",
      line: "Try each square as the last piece, then read the cell for what is left.",
      scene: { kind: "trace", trace: overAmount, preset: "n = 7" },
    },
    {
      tag: "skip",
      head: "When DP is the wrong tool",
      line: "Pick the tool by what the question asks.",
      scene: {
        kind: "versus",
        left: { title: "Try another tool", points: ["Every answer: backtracking", "A proven rule: greedy"] },
        right: { title: "Use DP when", points: ["The same question repeats", "Greedy has a counterexample"] },
      },
    },
  ],
};
