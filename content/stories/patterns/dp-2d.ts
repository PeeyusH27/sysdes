import { knapsackRow, knapsackTable, lcsTable } from "../../dsa/patterns/21-dp-2d/viz";
import type { Story } from "../types";

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "One index cannot describe it",
      line: "Two strings of 1,000 letters have a huge number of subsequences. A table of prefix pairs does not.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Letters in each string", value: "1,000" },
          { label: "Subsequences of one", value: "2^1,000" },
        ],
        result: { label: "Table cells instead", value: "~1 million" },
        verdict: { text: "A table beats listing", tone: "good" },
      },
    },
    {
      tag: "idea",
      head: "A cell per pair of prefixes",
      line: "Row 0 and column 0 are empty prefixes. Each cell compares the last two letters.",
      scene: { kind: "trace", trace: lcsTable, preset: "Nothing in common" },
      predict: { q: "ABC and XY share no letters. What is the final cell?", options: ["0", "1", "2"], answer: 0, why: "No last letters ever match, so every cell keeps the larger of above and left." },
    },
    {
      tag: "idea",
      head: "Skip it or take it",
      line: "Rows are items, columns are capacity. A cell copies the one above, or takes the item.",
      scene: { kind: "trace", trace: knapsackTable, preset: "Ratio greedy fails" },
    },
    {
      tag: "sum",
      head: "Best ratio loses to the table",
      line: "Capacity 4. The best value per weight reaches 5. The table takes two light items for 6.",
      scene: {
        kind: "bars",
        bars: [
          { label: "Best ratio first", value: 5, shown: "5", tone: "bad" },
          { label: "The table", value: 6, shown: "6", tone: "good" },
        ],
      },
    },
    {
      tag: "idea",
      head: "Sweep direction decides it",
      line: "One row, capacity high to low: each item counts once. Low to high would reuse it.",
      scene: { kind: "trace", trace: knapsackRow, preset: "0/1: high to low" },
      predict: { q: "Sweep low to high instead. Can an item be used twice?", options: ["No, never", "Yes, it is reused"], answer: 1, why: "Cells to the left would already include the item: that is unbounded knapsack." },
    },
    {
      tag: "choose",
      head: "Spot it in the problem",
      line: "Two strings, a grid, or items under a budget.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Two strings", tone: "good", why: "dp[i][j] over prefixes" },
          { label: "Right-down grid", tone: "good", why: "Add above and left" },
          { label: "Items in a budget", tone: "good", why: "Knapsack: skip or take" },
          { label: "One index enough", tone: "bad", why: "Use 1D DP" },
        ],
      },
    },
    {
      tag: "catch",
      head: "Off-by-one table slips",
      line: "Tables fail silently, so check the size and the letter index.",
      scene: {
        kind: "versus",
        left: { title: "Common slips", points: ["No extra row and column", "Row i letter is a[i]", "fill(array) shares one row"] },
        right: { title: "The fix", points: ["Size it m+1 by n+1", "Use a[i - 1]", "Array.from, a row each"] },
      },
    },
  ],
};
