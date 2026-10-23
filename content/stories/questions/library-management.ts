import type { FlowSpec } from "@/components/diagram/types";
import type { Story } from "../types";
import { classes } from "../../questions/library-management/diagrams";

// Two members ask for the last copy at the same moment. "race" checks then writes, "atomic" does both in one step.
const lastCopy: FlowSpec = {
  id: "story-library",
  title: "The last copy",
  description: "Two members ask for the same copy at once.",
  nodes: [
    { id: "ann", label: "Ann", kind: "client", col: 0, row: 0 },
    { id: "bob", label: "Bob", kind: "client", col: 0, row: 2 },
    { id: "lib", label: "Library", kind: "service", col: 1, row: 1 },
    { id: "copy", label: "The last copy", kind: "database", col: 2, row: 1 },
  ],
  edges: [
    { from: "ann", to: "lib" },
    { from: "bob", to: "lib" },
    { from: "lib", to: "copy" },
  ],
  scenarios: [
    {
      id: "race",
      name: "Check, then write",
      steps: [
        { edge: "ann>lib", caption: "Ann asks for the last copy." },
        { edge: "bob>lib", caption: "Bob asks in the same instant." },
        { edge: "lib>copy", caption: "Both requests check: the copy is available." },
        { edge: "lib>copy", tone: "error", caption: "Both write LOANED. One copy, two loans.", mark: [{ node: "copy", state: "down" }] },
      ],
    },
    {
      id: "atomic",
      name: "One atomic step",
      steps: [
        { edge: "ann>lib", caption: "Ann asks first.", mark: [{ node: "copy", state: null }] },
        { edge: "bob>lib", caption: "Bob asks right behind her." },
        { edge: "lib>copy", tone: "ok", caption: "Check and loan happen in one step for Ann.", mark: [{ node: "copy", state: "ok" }] },
        { edge: "bob>lib", reverse: true, tone: "miss", caption: "Bob now sees LOANED. He gets NO_COPY and can join the queue." },
      ],
    },
  ],
};

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "Two loans, one copy",
      line: "A check, then a separate write, leaves a gap.",
      scene: { kind: "flow", spec: lastCopy, scenario: "race" },
      predict: { q: "Both check before either writes. How many loans?", options: ["One", "Two"], answer: 1, why: "Both saw AVAILABLE, so both loaned it." },
    },
    {
      tag: "idea",
      head: "Check and write as one",
      line: "A lock or a conditional update closes the gap.",
      scene: { kind: "flow", spec: lastCopy, scenario: "atomic" },
    },
    {
      tag: "fix",
      head: "A copy has a lifecycle",
      line: "Title and copy are separate. Each copy is in one state.",
      scene: { kind: "classes", spec: classes, stage: 2 },
    },
    {
      tag: "choose",
      head: "What deserves a class?",
      line: "Make a class only for what really varies.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Book and BookItem", tone: "good", why: "Title and copy differ" },
          { label: "Fine policy", tone: "good", why: "Rules change often" },
          { label: "Queue on the book", tone: "good", why: "Simple and fair" },
          { label: "Class per tier", tone: "bad", why: "Limits are just data" },
          { label: "FineFactory", tone: "bad", why: "Two policies only" },
        ],
      },
      predict: { q: "Premium members borrow more. Add a subclass?", options: ["Yes", "No, use a tier table"], answer: 1, why: "Limits are numbers. A table row beats a class." },
    },
    {
      tag: "sum",
      head: "Why holds have a deadline",
      line: "A held copy blocks the next person until claimed.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Members ahead", value: "1" },
          { label: "Hold length", value: "3 days" },
        ],
        result: { label: "Worst extra wait", value: "3 days" },
        verdict: { text: "Bounded, so fair", tone: "good" },
      },
    },
    {
      tag: "skip",
      head: "Keep it plain",
      line: "One Library entry point is enough.",
      scene: {
        kind: "versus",
        left: { title: "Over-built", points: ["LibraryManager does it all", "A factory for two fines"] },
        right: { title: "Enough", points: ["One Library", "A tier table", "Fines as functions"] },
      },
    },
  ],
};
