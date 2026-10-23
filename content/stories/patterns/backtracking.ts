import { arrangementsTree, pruningTree } from "../../dsa/patterns/18-backtracking/viz";
import type { Story } from "../types";

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "Every ordering is a lot",
      line: "Listing every order of 10 items gives millions of answers. So limits stay small.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Items", value: "10" },
          { label: "Ways to order them", value: "10 × 9 × … × 1" },
        ],
        result: { label: "Permutations", value: "3,628,800" },
        verdict: { text: "Fine only for small n", tone: "warn" },
      },
    },
    {
      tag: "idea",
      head: "Unroll the string, wind it back",
      line: "At a dead end, rewind to the fork and try the next corridor.",
      scene: { kind: "doodle", name: "backtracking" },
    },
    {
      tag: "idea",
      head: "Choose, explore, un-choose",
      line: "One shared path grows with a choice, then shrinks back so the next one starts clean.",
      scene: { kind: "trace", trace: arrangementsTree, preset: "All permutations of x, y" },
      predict: { q: "After recording [x, y], what happens to y?", options: ["It stays in the path", "It is popped and freed"], answer: 1, why: "Un-choose pops it and resets used, so other branches can use y." },
    },
    {
      tag: "idea",
      head: "Skip dead ends early",
      line: "Check before recursing. On sorted input, one number too big means every later one is too.",
      scene: { kind: "trace", trace: pruningTree, preset: "No answer: target 5 from [6, 2, 4]" },
    },
    {
      tag: "choose",
      head: "Spot it in the problem",
      line: "Listing every answer under small limits is the clue.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "List all subsets", tone: "good", why: "A start index" },
          { label: "All permutations", tone: "good", why: "used[] allows every order" },
          { label: "Place N queens", tone: "good", why: "Prune attacked squares" },
          { label: "Count the ways", tone: "warn", why: "That is DP, not listing" },
        ],
      },
      predict: { q: "Only the number of subsets is wanted. Backtrack?", options: ["Yes, list them all", "No, count with DP"], answer: 1, why: "Counting is DP: paths reach the same subproblem, so answers can be cached." },
    },
    {
      tag: "catch",
      head: "Undo every change",
      line: "Most bugs are a missing undo or a stored reference.",
      scene: {
        kind: "versus",
        left: { title: "Common slips", points: ["Forgetting to undo", "Pushing path itself", "break on unsorted input"] },
        right: { title: "The fix", points: ["Pop, reset used, restore", "Push [...path]", "Sort first"] },
      },
    },
  ],
};
