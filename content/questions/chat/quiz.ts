import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "When does the server ack a message to the sender?",
    options: ["As soon as the frame arrives", "After it is durably stored", "After the recipient has received it"],
    answer: 1,
    explain:
      "Store first, then ack. An early ack could promise a message that a crash then loses. Waiting for the recipient would tie the sender's tick to someone else being online.",
  },
  {
    q: "Redis pub/sub dropped a live message while Bob's gateway was restarting. What repairs it?",
    options: ["Redis persistence (AOF)", "The client syncing from its last seq", "Publishing every message twice"],
    answer: 1,
    explain:
      "Pub/sub only routes and can drop messages. On reconnect (and on opening a conversation) the client sends sync with its last seq, and the server replays the gap from the database.",
  },
  {
    q: "How are read receipts stored?",
    options: ["One row per message per member", "A watermark per member (lastReadSeq)", "Only on the client"],
    answer: 1,
    explain:
      "Reading message 1042 implies reading everything before it, so one number per member is enough. It is one small update per read, and it only moves forward.",
  },
];
