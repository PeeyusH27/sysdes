import type { DecisionSpec, TimelineSpec } from "@/components/diagram/types";

export const lldPlan: TimelineSpec = {
  id: "lld-45-minutes",
  title: "A 45-minute LLD round",
  description:
    "5 minutes to clarify and agree use cases, 12 to settle entities, the public interface and a class diagram, 16 to code the core, then 12 to stress the design: extensibility, concurrency and tests. Each marker is a checkpoint: if you are behind, say so and cut scope.",
  unit: "min",
  lanes: [
    { id: "clarify", label: "Clarify" },
    { id: "model", label: "Model" },
    { id: "code", label: "Code" },
    { id: "extend", label: "Extend" },
    { id: "concurrency", label: "Concurrency" },
    { id: "tests", label: "Tests" },
  ],
  spans: [
    { lane: "clarify", start: 0, end: 5, label: "Questions, use cases", tone: 1 },
    { lane: "model", start: 5, end: 12, label: "Entities, interface", tone: 2 },
    { lane: "model", start: 12, end: 17, label: "Class diagram", tone: 3 },
    { lane: "code", start: 17, end: 33, label: "The core, one use case end to end", tone: 1 },
    { lane: "extend", start: 33, end: 38, label: "One new requirement", tone: 2 },
    { lane: "concurrency", start: 38, end: 42, label: "Races, locks", tone: 3 },
    { lane: "tests", start: 42, end: 45, label: "Tests, summary", tone: 1 },
  ],
  markers: [
    { at: 5, label: "Use cases agreed" },
    { at: 17, label: "Design agreed" },
    { at: 33, label: "Core works" },
    { at: 45, label: "Done" },
  ],
};

export const choosePattern: DecisionSpec = {
  id: "which-pattern",
  title: "Which pattern does this requirement call for?",
  start: "undo",
  nodes: {
    undo: { q: "Must an action be undone, queued, retried or logged as a thing?", yes: "command", no: "react" },
    command: {
      result: "Command",
      why: "Make the action an object with do and undo. A history stack gives undo and redo, and a group of commands is one step.",
      href: "/lld/foundations/creation-and-commands",
    },
    react: { q: "Must other objects react when this one changes, without it knowing them?", yes: "observer", no: "phase" },
    observer: {
      result: "Observer",
      why: "The subject publishes events and listeners subscribe, so a new listener (a display board, an audit log) needs no edit to the subject.",
      href: "/lld/foundations/state-observer",
    },
    phase: { q: "Does it behave differently depending on what phase it is in?", yes: "state", no: "varies" },
    state: {
      result: "State",
      why: "Each phase is a state that handles the same events its own way and knows which state comes next. Illegal moves become impossible.",
      href: "/lld/foundations/state-observer",
    },
    varies: { q: "Is one job done in several interchangeable ways, such as a price or a pick?", yes: "stack", no: "create" },
    stack: { q: "Do the rules layer, each one adjusting the result of the one inside it?", yes: "decorator", no: "strategy" },
    decorator: {
      result: "Decorator",
      why: "Each rule wraps another and has the same interface, so caps, discounts and grace periods stack without editing the base rule.",
      href: "/lld/foundations/strategy-decorator",
    },
    strategy: {
      result: "Strategy",
      why: "Put the rule that varies behind a one-method interface and inject the one you want. A new rule is a new class.",
      href: "/lld/foundations/strategy-decorator",
    },
    create: { q: "Does the class to create depend on a string or a type that arrives as data?", yes: "factory", no: "plain" },
    factory: {
      result: "Factory",
      why: "Decide which class to create in exactly one place, and let every caller ask it. A registry lets new kinds arrive without edits.",
      href: "/lld/foundations/creation-and-commands",
    },
    plain: {
      result: "Plain classes",
      why: "No pattern yet. Clear responsibilities and composition are enough, and a pattern with no pain behind it costs points.",
      href: "/lld/foundations/thinking-in-objects",
    },
  },
};
