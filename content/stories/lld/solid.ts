import { mailerInversion } from "../../lld/foundations/02-solid/diagrams";
import type { Story } from "../types";

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "The service builds its own mailer",
      line: "OrderService creates an SmtpMailer inside place(). Every test needs a real mail server.",
      scene: { kind: "classes", spec: mailerInversion, stage: 0 },
    },
    {
      tag: "idea",
      head: "Five questions, not five rules",
      line: "Ask them when a requirement changes. Each one names a smell.",
      scene: { kind: "doodle", name: "solid" },
    },
    {
      tag: "sum",
      head: "When is an if too long?",
      line: "An if with two branches is fine. Drag to see the cue.",
      scene: {
        kind: "meter",
        label: "Branches in an if ladder",
        unit: "branches",
        min: 1,
        max: 8,
        start: 2,
        stops: [
          { upTo: 2, verdict: "A plain if is fine", tone: "good" },
          { upTo: 3, verdict: "Three is the cue. Start extracting", tone: "warn" },
          { upTo: 8, verdict: "Register each rule, never edit", tone: "bad" },
        ],
      },
      predict: { q: "A price ladder reaches three branches. What now?", options: ["Leave it", "Start extracting rules"], answer: 1, why: "Three branches is the cue. A new rule should be added, not edited in." },
    },
    {
      tag: "idea",
      head: "Name the need",
      line: "The service asks for a Mailer, not for SMTP. The interface sits on its side.",
      scene: { kind: "classes", spec: mailerInversion, stage: 1 },
    },
    {
      tag: "idea",
      head: "The detail plugs in",
      line: "SmtpMailer is one way to send. Look at which way its arrow points.",
      scene: { kind: "classes", spec: mailerInversion, stage: 2 },
      predict: { q: "Which way does the code arrow point?", options: ["Service to SMTP", "SMTP to the interface"], answer: 1, why: "The detail depends on what the policy asked for. That is the inversion." },
    },
    {
      tag: "fix",
      head: "A fake for the test",
      line: "FakeMailer records what was sent. No server, no network.",
      scene: { kind: "classes", spec: mailerInversion, stage: 3 },
    },
    {
      tag: "skip",
      head: "Pay only for a varying need",
      line: "Extract an interface at a second variant or a test fake, not for every class.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Mailer interface", tone: "good", why: "SMTP and a test fake" },
          { label: "Two-branch if", tone: "good", why: "No interface needed" },
          { label: "Interface on all", tone: "bad", why: "No requirement varies" },
          { label: "Wide Payment type", tone: "bad", why: "Cash must stub and throw" },
        ],
      },
    },
  ],
};
