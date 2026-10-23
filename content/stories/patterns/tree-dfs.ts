import { carryDown, subtreeHeight } from "../../dsa/patterns/10-tree-dfs/viz";
import type { Story } from "../types";

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "Recomputing heights is huge",
      line: "On a chain of 100,000 nodes, measuring height again at every node repeats the same walk.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Nodes in a chain", value: "100,000" },
          { label: "Walk per node", value: "up to 100,000" },
        ],
        result: { label: "Total steps", value: "~5 billion" },
        verdict: { text: "Far too slow", tone: "bad" },
      },
    },
    {
      tag: "idea",
      head: "Ask the children, then combine",
      line: "Each node waits for both subtrees to answer, then adds its own part.",
      scene: { kind: "trace", trace: subtreeHeight, preset: "Skewed tree" },
      predict: { q: "A node has no left child. What does height(null) return?", options: ["0", "-1"], answer: 0, why: "An empty tree has height 0. That is the base case." },
    },
    {
      tag: "idea",
      head: "Trust the recursive call",
      line: "Assume both subtrees already work. Write only the base case and the combine step.",
      scene: { kind: "doodle", name: "stack" },
    },
    {
      tag: "choose",
      head: "Spot it in the problem",
      line: "Answers built from whole subtrees, or from the path above, are the clue.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Height or size", tone: "good", why: "Return a value up" },
          { label: "Path sum", tone: "good", why: "Carry the sum down" },
          { label: "Longest bent path", tone: "warn", why: "It may bend: keep a global best" },
          { label: "Values per level", tone: "bad", why: "Breadth-first fits better" },
        ],
      },
      predict: { q: "Is the longest path always through the root?", options: ["Yes", "No"], answer: 1, why: "It may bend deep inside one subtree." },
    },
    {
      tag: "idea",
      head: "Or pass state down",
      line: "Each parent hands the biggest value so far to its children as a parameter.",
      scene: { kind: "trace", trace: carryDown, preset: "Mixed values" },
    },
    {
      tag: "sum",
      head: "Deep trees overflow the stack",
      line: "One call waits per level. JavaScript allows roughly 10,000 nested calls. Drag the chain length.",
      scene: {
        kind: "meter",
        label: "Nodes in a chain",
        unit: "nodes",
        min: 100,
        max: 100000,
        start: 1000,
        log: true,
        stops: [
          { upTo: 3000, verdict: "Recursion is fine.", tone: "good" },
          { upTo: 10000, verdict: "Close to the rough limit.", tone: "warn" },
          { upTo: 100000, verdict: "Overflows. Use an explicit stack.", tone: "bad" },
        ],
      },
    },
    {
      tag: "catch",
      head: "The usual slips",
      line: "Tree bugs hide in leaves, starting values and shared lists.",
      scene: {
        kind: "versus",
        left: { title: "Common slips", points: ["Treating a one-child node as a leaf", "Starting a maximum at 0", "Storing the shared path array"] },
        right: { title: "The fix", points: ["A leaf has both children null", "Start at -Infinity", "Store a copy"] },
      },
    },
  ],
};
