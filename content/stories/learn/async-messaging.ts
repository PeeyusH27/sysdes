import { queueWithDlq } from "../../learn/05-async-messaging/diagrams";
import { getPrimer } from "../../primers";
import type { Story } from "../types";

// The queue primer's picture (customer, app, waiting line, worker, email service) tells the problem, the idea and the
// duplicate. The page's own diagram shows a burst being absorbed and a poison message being parked.
const queue = getPrimer("queue")!.flow;

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "Signup waits for the email",
      line: "A slow email service holds the customer on a spinner. If it is down, signup fails.",
      scene: { kind: "flow", spec: queue, scenario: "without" },
    },
    {
      tag: "choose",
      head: "Does the user need the answer?",
      line: "Go async for slow, flaky or spiky work. Keep the rest sync.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Card accepted?", tone: "warn", why: "Keep sync: the user needs it" },
          { label: "Welcome email", tone: "good", why: "Async: slow, and can wait" },
          { label: "Video transcode", tone: "good", why: "Async: return 202 and an id" },
          { label: "Fan out a post", tone: "good", why: "Async: many followers to reach" },
        ],
      },
      predict: { q: "Should \"was my card accepted?\" go on a queue?", options: ["Yes, always queue", "No, the user waits for it"], answer: 1, why: "The user cannot carry on without the answer, so that part stays sync." },
    },
    {
      tag: "idea",
      head: "Drop a note, answer at once",
      line: "The app queues the job and replies. A worker sends the email later.",
      scene: { kind: "flow", spec: queue, scenario: "with" },
    },
    {
      tag: "idea",
      head: "The queue absorbs a spike",
      line: "Depth grows, nothing drops, and the database sees a steady rate.",
      scene: { kind: "flow", spec: queueWithDlq, scenario: "burst" },
    },
    {
      tag: "sum",
      head: "Slower workers, bigger backlog",
      line: "A queue buys time, not capacity. The gap compounds.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Arriving", value: "1,000/s" },
          { label: "Processed", value: "800/s" },
          { label: "Time", value: "1 hour" },
        ],
        result: { label: "Backlog", value: "720,000" },
        verdict: { text: "New arrivals wait 15 minutes", tone: "bad" },
      },
    },
    {
      tag: "catch",
      head: "A note can run twice",
      line: "The worker crashed before saying done, so the queue hands the note out again.",
      scene: { kind: "flow", spec: queue, scenario: "twice" },
      predict: { q: "The worker crashes after sending. What does the customer get?", options: ["One email", "Two emails"], answer: 1, why: "The line never heard done, so it redelivers. Delivery is at-least-once." },
    },
    {
      tag: "fix",
      head: "Make a repeat harmless",
      line: "Acknowledge after the work, and ignore message ids you have seen.",
      scene: {
        kind: "versus",
        left: { title: "Ack first", points: ["A crash loses the message", "Fine for a metrics ping"] },
        right: { title: "Ack after, dedupe", points: ["A crash redelivers it", "A unique id stops repeats"] },
      },
    },
    {
      tag: "catch",
      head: "Poison goes to the DLQ",
      line: "Park the bad message so healthy ones flow. Alert when the DLQ is not empty.",
      scene: { kind: "flow", spec: queueWithDlq, scenario: "poison" },
    },
  ],
};
