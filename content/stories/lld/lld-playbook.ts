import type { FlowSpec } from "@/components/diagram/types";
import type { Story } from "../types";

// A small inline picture of check-then-act: two callers, one room. Two scenarios: the race, and the claim-first fix.
const raceFlow: FlowSpec = {
  id: "playbook-race",
  title: "Two people book one room",
  description: "Two callers check whether a room is free and then book it. Apart, the check and the booking let both through. Joined into one step, only one wins.",
  nodes: [
    { id: "a", label: "Caller A", kind: "client", col: 0, row: 0 },
    { id: "b", label: "Caller B", kind: "client", col: 0, row: 2 },
    { id: "room", label: "Room 4", kind: "database", col: 1, row: 1 },
  ],
  edges: [
    { from: "a", to: "room" },
    { from: "b", to: "room" },
  ],
  scenarios: [
    {
      id: "race",
      name: "Check, then act",
      steps: [
        { edge: "a>room", caption: "A asks: is the room free?" },
        { edge: "a>room", reverse: true, tone: "ok", caption: "Yes.", mark: [{ node: "room", state: "ok" }] },
        { edge: "b>room", caption: "B asks before A has booked." },
        { edge: "b>room", reverse: true, tone: "ok", caption: "Yes, still free." },
        { edge: "a>room", caption: "A books it." },
        { edge: "b>room", tone: "error", caption: "B books it too. Both got the room.", mark: [{ node: "room", state: "down" }] },
      ],
    },
    {
      id: "claim",
      name: "Claim first",
      steps: [
        { edge: "a>room", caption: "A checks and claims in one step." },
        { edge: "a>room", reverse: true, tone: "ok", caption: "Claimed.", mark: [{ node: "room", state: "ok" }] },
        { edge: "b>room", caption: "B tries the same step." },
        { edge: "b>room", reverse: true, tone: "miss", caption: "Taken. B is told no.", mark: [{ node: "room", state: "busy" }] },
      ],
    },
  ],
};

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "Coding from sentence one",
      line: "The rubric is about how you work, not whether you know patterns.",
      scene: {
        kind: "versus",
        left: { title: "Start coding", points: ["No questions asked", "Half of everything, nothing runs", "A pattern per class"] },
        right: { title: "Run the playbook", points: ["Clarify, then use cases", "One use case end to end", "A pattern only for pain"] },
      },
    },
    {
      tag: "sum",
      head: "The 45-minute split",
      line: "The longest block is code, because only working code proves anything.",
      scene: {
        kind: "bars",
        bars: [
          { label: "Clarify", value: 5, shown: "5 min", tone: "info" },
          { label: "Model", value: 12, shown: "12 min", tone: "info" },
          { label: "Code the core", value: 16, shown: "16 min", tone: "good" },
          { label: "Stress the design", value: 12, shown: "12 min", tone: "info" },
        ],
      },
      predict: { q: "Which block gets the most time?", options: ["Clarify", "Model", "Code the core"], answer: 2, why: "Code is the longest block, 16 minutes, because only working code proves anything." },
    },
    {
      tag: "choose",
      head: "Let the wording pick the pattern",
      line: "Start from the requirement, not from the pattern list.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Undo or queue it", tone: "good", why: "Command" },
          { label: "Others must react", tone: "good", why: "Observer" },
          { label: "Differs by phase", tone: "good", why: "State" },
          { label: "Swap a rule", tone: "good", why: "Strategy, or Decorator if rules stack" },
          { label: "Nothing hurts", tone: "info", why: "Plain classes, no pattern" },
        ],
      },
      predict: { q: "Other objects must react to a change. Which pattern?", options: ["Observer", "Command", "State"], answer: 0, why: "The subject publishes events and listeners subscribe, so new listeners need no edit." },
    },
    {
      tag: "idea",
      head: "Test your own design",
      line: "If they add a new X, how many existing classes do you edit?",
      scene: {
        kind: "versus",
        left: { title: "A missing seam", points: ["A new if in four files", "Edit old code to add"] },
        right: { title: "A seam exists", points: ["One new class", "One registration line"] },
      },
    },
    {
      tag: "catch",
      head: "Check then act is a race",
      line: "Any gap between the check and the act lets two callers through.",
      scene: { kind: "flow", spec: raceFlow, scenario: "race" },
      predict: { q: "Two people book the last room at once. What happens?", options: ["One wins, one is told no", "Both can succeed"], answer: 1, why: "Each check sees a free room before either booking lands." },
    },
    {
      tag: "fix",
      head: "Make the pair one step",
      line: "Claim the room in the same step as the check. Across servers, the database decides.",
      scene: { kind: "flow", spec: raceFlow, scenario: "claim" },
    },
    {
      tag: "skip",
      head: "Pain first, pattern second",
      line: "A pattern with no pain behind it costs points.",
      scene: {
        kind: "versus",
        left: { title: "Pattern first", points: ["A class per noun", "A pattern per class", "Cannot say why"] },
        right: { title: "Pain first", points: ["Name the change that varies", "Plain classes otherwise"] },
      },
    },
  ],
};
