import { doorObservers } from "../../lld/foundations/04-state-observer/diagrams";
import type { Story } from "../types";

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "Flags that rot",
      line: "Two booleans can describe a door that cannot exist.",
      scene: {
        kind: "versus",
        left: { title: "Two flags", points: ["Describe 4 doors, only 3 exist", "open() then lock(): both true"] },
        right: { title: "One state", points: ["A single variable", "Holds only listed values"] },
      },
    },
    {
      tag: "sum",
      head: "Count every state and event pair",
      line: "Write the table first. Each pair gets one outcome.",
      scene: {
        kind: "sum",
        rows: [
          { label: "States", value: "3" },
          { label: "Events", value: "4" },
        ],
        result: { label: "Pairs", value: "12" },
        verdict: { text: "4 legal, 8 rejected: nothing changes", tone: "info" },
      },
      predict: { q: "How many of the 12 pairs are legal?", options: ["4", "8", "12"], answer: 0, why: "Only the table's 4 rows are legal. The other 8 change nothing." },
    },
    {
      tag: "idea",
      head: "Announce, do not call",
      line: "Door hands an Emitter one event per legal change. It no longer knows who listens.",
      scene: { kind: "classes", spec: doorObservers, stage: 1 },
    },
    {
      tag: "idea",
      head: "Listeners plug in",
      line: "A listener is just a function of the event. Log and alarm both fit.",
      scene: { kind: "classes", spec: doorObservers, stage: 2 },
    },
    {
      tag: "idea",
      head: "A third, with no edits",
      line: "The display subscribes at startup. Door, Emitter and the others are unchanged.",
      scene: { kind: "classes", spec: doorObservers, stage: 3 },
    },
    {
      tag: "catch",
      head: "Where Observer bites",
      line: "Each failure has a one-line guard. Raise them before you are asked.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Remove mid-loop", tone: "bad", why: "Skips entries. Loop over a copy" },
          { label: "A listener throws", tone: "bad", why: "Catch per listener" },
          { label: "Listener leak", tone: "bad", why: "Leaks. Call the unsubscribe" },
          { label: "Push the event", tone: "good", why: "Listener needs no door" },
        ],
      },
      predict: { q: "One listener throws. Do later listeners still run?", options: ["No, the loop stops", "Yes, errors are caught each"], answer: 1, why: "The emitter catches per listener, so one bad listener stops nobody." },
    },
    {
      tag: "skip",
      head: "Just call it when you can",
      line: "If one thing always reacts, a plain call is simpler.",
      scene: {
        kind: "versus",
        left: { title: "Just call it", points: ["One thing always reacts", "No listeners come and go"] },
        right: { title: "Use Observer", points: ["Listeners come and go", "Door must not know them"] },
      },
    },
  ],
};
