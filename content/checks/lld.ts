import type { PageChecks } from "./types";

export const checks: Record<string, PageChecks> = {
  "strategy-decorator": {
    "the-ladder-that-grows": {
      q: "A pricing if/else ladder gets a new rule every month. What hurts?",
      options: ["It runs slower", "Every rule edits the same code", "It cannot compile"],
      answer: 1,
      why: "One function owns every rule, so each change risks breaking the others.",
    },
    "strategy-the-rule-behind-an-interface": {
      q: "What does Strategy let you swap?",
      options: ["One rule behind an interface", "The class hierarchy", "The constructor"],
      answer: 0,
      why: "The caller depends on the interface, so the rule behind it can change without edits.",
    },
    "decorator-wrap-do-not-branch": {
      q: "Decorator adds behaviour by doing what?",
      options: ["Subclassing the object", "Editing its source", "Wrapping it with the same interface"],
      answer: 2,
      why: "A wrapper looks like the original, so wrappers stack without the caller knowing.",
    },
    "the-order-of-wrapping-is-part-of-the-rule": {
      q: "10% off then $5 off differs from $5 off then 10%. Why?",
      options: ["Each wrapper acts on the previous result", "Discounts are random", "Floats round differently"],
      answer: 0,
      why: "The inner wrapper runs first and hands its result outward, so order changes the total.",
    },
    "strategy-decorator-or-just-a-function": {
      q: "One rule that will never change. What do you write?",
      options: ["A Strategy class", "A plain function or if", "A Decorator chain"],
      answer: 1,
      why: "A pattern earns its place only when something varies. Otherwise it is extra code to read.",
    },
    "the-over-engineering-trap": {
      q: "Two pricing rules, no new ones expected. Best design?",
      options: ["Strategy plus factory", "Decorator chain", "A simple conditional"],
      answer: 2,
      why: "Interviewers penalise structure that nothing needs yet as much as a god class.",
    },
  },
};
