import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "When does the server ack a message to the sender?",
    options: ["As soon as the frame arrives", "After it is durably stored", "After the recipient has received it"],
    answer: 1,
    explain:
      "Store first, then ack. An ack before the write could promise a message that a crash then loses; waiting for the recipient would make the sender's tick depend on someone else being online.",
  },
  {
    q: "Redis pub/sub dropped a live message while Bob's gateway was restarting. What repairs it?",
    options: ["Redis persistence (AOF)", "The client syncing from its last seq", "Publishing every message twice"],
    answer: 1,
    explain:
      "Pub/sub is fire-and-forget and only routes. On reconnect (and when a conversation is opened) the client sends sync with the last seq it has, and the server replays the gap from the database.",
  },
  {
    q: "How are read receipts stored?",
    options: ["One row per message per member", "A watermark per member (lastReadSeq)", "Only on the client"],
    answer: 1,
    explain:
      "Reading message 1042 implies reading everything before it, so one number per member is enough. It's one small update per read instead of one row per message, and the update only ever moves forward.",
  },
];
