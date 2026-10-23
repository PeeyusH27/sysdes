import type { Primer } from "./types";

export const primer: Primer = {
  id: "queue",
  title: "What is a message queue?",
  idea: "Drop slow work into a line and answer right away. A helper takes jobs from the line and does them later.",
  doodle: "queue",
  analogy:
    "Picture a ticket window. People join the line and are served one at a time, so nobody has to stand at the counter while the clerk works.",
  flow: {
    id: "primer-queue",
    title: "A request that does not wait",
    description: "A sign-up must send an email. Without a line the customer waits for it. With a line the app answers at once.",
    nodes: [
      { id: "client", label: "Customer", kind: "client", col: 0, row: 1 },
      { id: "app", label: "Your app", kind: "service", col: 1, row: 1 },
      { id: "queue", label: "Waiting line", kind: "queue", col: 2, row: 0 },
      { id: "worker", label: "Worker", kind: "worker", col: 3, row: 0 },
      { id: "mail", label: "Email service", kind: "external", col: 4, row: 1 },
    ],
    edges: [
      { from: "client", to: "app" },
      { from: "app", to: "mail" },
      { from: "app", to: "queue", style: "async" },
      { from: "queue", to: "worker", style: "async" },
      { from: "worker", to: "mail" },
    ],
    scenarios: [
      {
        id: "without",
        name: "Without a queue",
        steps: [
          { edge: "client>app", caption: "A customer signs up. Your app must also send a welcome email." },
          { edge: "app>mail", caption: "The app calls the email service and waits for it." },
          {
            edge: "app>mail",
            tone: "error",
            caption: "The email service is slow today. It takes 3 seconds.",
            mark: [{ node: "mail", state: "busy" }, { node: "app", state: "busy" }],
          },
          { edge: "client>app", reverse: true, tone: "error", caption: "The customer stares at a spinner for the whole 3 seconds." },
          {
            edge: "app>mail",
            reverse: true,
            tone: "error",
            caption: "If the email service is down, the sign-up fails too.",
            mark: [{ node: "mail", state: "down" }, { node: "app", state: null }],
          },
        ],
      },
      {
        id: "with",
        name: "With a queue",
        steps: [
          { edge: "client>app", caption: "The same sign-up arrives." },
          { edge: "app>queue", caption: "The app drops a note in the line: send Sam a welcome email." },
          { edge: "client>app", reverse: true, tone: "ok", caption: "The app answers the customer at once. No spinner." },
          { edge: "queue>worker", caption: "Meanwhile, a worker takes the next note from the line." },
          { edge: "worker>mail", caption: "The worker sends the email. If it is slow, nobody is waiting." },
        ],
      },
      {
        id: "twice",
        name: "When a note runs twice",
        steps: [
          { edge: "queue>worker", caption: "A worker takes a note from the line." },
          { edge: "worker>mail", caption: "The email goes out." },
          {
            edge: "queue>worker",
            tone: "error",
            caption: "The worker crashes before it can say \"done\".",
            mark: [{ node: "worker", state: "down" }],
          },
          { edge: "queue>worker", caption: "The line never heard \"done\", so it hands out the same note again." },
          {
            edge: "worker>mail",
            tone: "error",
            caption: "The customer gets two welcome emails.",
            mark: [{ node: "worker", state: null }],
          },
        ],
      },
    ],
  },
  remember: [
    "The user gets an answer now; the work happens later.",
    "A line absorbs bursts that would flatten the slow service.",
    "A job may run twice, so doing it twice must be safe.",
  ],
  whenToUse: "When slow work can wait, like sending 10,000 emails after a sale or resizing uploads. Not when the answer is needed now.",
  theCatch: "After a crash the line can hand out a job twice, so a customer gets two emails unless repeating is safe.",
  say: "I would put slow, non-urgent work on a queue so the request returns fast and a worker handles it. Workers must be idempotent, because delivery can repeat.",
  learnMore: [{ href: "/learn/async-messaging", label: "Async messaging" }],
};
