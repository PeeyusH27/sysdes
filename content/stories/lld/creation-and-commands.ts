import { commandDesign } from "../../lld/foundations/05-creation-and-commands/diagrams";
import type { Story } from "../types";

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "Undo has nowhere to live",
      line: "The editor changes the Doc directly. The usual patch is a full copy before every edit.",
      scene: { kind: "classes", spec: commandDesign, stage: 0 },
    },
    {
      tag: "sum",
      head: "Do the sum on copies",
      line: "A snapshot per edit multiplies fast.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Edits", value: "1,000" },
          { label: "Text size", value: "10,000 chars" },
        ],
        result: { label: "Stored", value: "10 million" },
        verdict: { text: "Heavy. Store the action instead", tone: "bad" },
      },
      predict: { q: "1,000 edits of a 10,000-character text: how much is stored?", options: ["10 thousand", "1 million", "10 million"], answer: 2, why: "A full copy per edit: 1,000 times 10,000 characters." },
    },
    {
      tag: "idea",
      head: "An action becomes an object",
      line: "Type and Erase can do and undo themselves. Erase remembers what it removed.",
      scene: { kind: "classes", spec: commandDesign, stage: 1 },
    },
    {
      tag: "idea",
      head: "History keeps two stacks",
      line: "Undo moves a command from done to undone. History never looks inside one.",
      scene: { kind: "classes", spec: commandDesign, stage: 2 },
    },
    {
      tag: "idea",
      head: "One undo for many edits",
      line: "Macro is a Command that holds others, so replace-all is one entry.",
      scene: { kind: "classes", spec: commandDesign, stage: 3 },
    },
    {
      tag: "choose",
      head: "Which creation pattern, when?",
      line: "Each pattern answers one question. If you are not asking it, skip it.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Registry", tone: "good", why: "The kind arrives as data" },
          { label: "Command", tone: "good", why: "Undo, queues, logs" },
          { label: "Builder, 3 fields", tone: "bad", why: "An options object will do" },
          { label: "Singleton", tone: "bad", why: "Pass one instance in instead" },
        ],
      },
      predict: { q: "Do you need a Builder for three fields?", options: ["Yes", "No, a constructor will do"], answer: 1, why: "A builder pays off with many optional parts or a rule across fields." },
    },
    {
      tag: "skip",
      head: "A command needs an undo",
      line: "A command nobody undoes is cost with no benefit.",
      scene: {
        kind: "versus",
        left: { title: "Worth a command", points: ["Undo or redo", "Queue, retry or log"] },
        right: { title: "Skip it", points: ["Nothing reverses it", "Sent email stays off the stack"] },
      },
    },
  ],
};
