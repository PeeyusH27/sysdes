import { libraryGrowth } from "../../lld/foundations/01-thinking-in-objects/diagrams";
import type { Story } from "../types";

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "One class does everything",
      line: "Students now get 7 days, not 14. The 14 lives in two places, so fee and email disagree.",
      scene: { kind: "classes", spec: libraryGrowth, stage: 0 },
    },
    {
      tag: "choose",
      head: "Which nouns earn a class?",
      line: "Data to protect or a rule that would repeat earns a class. The rest are fields.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Book", tone: "good", why: "Has data and rules" },
          { label: "Member", tone: "good", why: "Owns its limit" },
          { label: "Loan", tone: "good", why: "A link with its own data" },
          { label: "fee", tone: "bad", why: "Just a number" },
        ],
      },
      predict: { q: "Does a late fee get its own class?", options: ["Yes, give it one", "No, it is just a number"], answer: 1, why: "A fee has no data to protect. Loan computes it from the due day." },
    },
    {
      tag: "idea",
      head: "Nouns become classes",
      line: "Book and Member keep their own rules. Library only coordinates.",
      scene: { kind: "classes", spec: libraryGrowth, stage: 1 },
    },
    {
      tag: "idea",
      head: "A relationship can be a noun",
      line: "A member holding a book for 14 days has a due day and a fee.",
      scene: { kind: "classes", spec: libraryGrowth, stage: 2 },
    },
    {
      tag: "idea",
      head: "Hand in the collaborator",
      line: "Notifier is passed in, so a test can hand in a fake.",
      scene: { kind: "classes", spec: libraryGrowth, stage: 3 },
    },
    {
      tag: "sum",
      head: "How many classes is enough?",
      line: "Five to eight usually suffice for a classic question. Drag to see the edges.",
      scene: {
        kind: "meter",
        label: "Classes in your design",
        unit: "classes",
        min: 1,
        max: 15,
        start: 6,
        stops: [
          { upTo: 4, verdict: "Too few? Look for a god class", tone: "warn" },
          { upTo: 8, verdict: "Usually enough, each with a reason", tone: "good" },
          { upTo: 15, verdict: "Too many: each must protect something", tone: "bad" },
        ],
      },
    },
    {
      tag: "skip",
      head: "A class must protect something",
      line: "If you cannot say what it protects in one sentence, merge it into its caller.",
      scene: {
        kind: "versus",
        left: { title: "Keep as a class", points: ["State to protect", "Behaviour that would repeat", "A requirement that varies"] },
        right: { title: "Make it a field", points: ["A plain day or fee", "BookManager, MemberManager", "Cannot say what it protects"] },
      },
    },
  ],
};
