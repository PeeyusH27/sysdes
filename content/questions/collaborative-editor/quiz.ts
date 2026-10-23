import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "A and B both start from 'cat'. A inserts 's' at position 3; B deletes the character at position 0. With operational transformation, what does the server do with B's delete when it arrives second?",
    options: [
      "Rejects it, because the document has changed",
      "Transforms it past A's insert (position 0 is before 3, so it is unchanged) and broadcasts it, so everyone ends with 'ats'",
      "Applies it unchanged and hopes the positions still match",
    ],
    answer: 1,
    explain:
      "Positions are meaningful only relative to a document version. The server rewrites the later operation so it means the same thing after the earlier one. Here the delete is before the insert, so it keeps position 0, while A's insert would shift left to position 2 for B.",
  },
  {
    q: "Why does a CRDT text editor keep deleted characters as tombstones?",
    options: [
      "So the undo button works",
      "So a remote insert that says 'after character X' can still find X, even if X was deleted concurrently",
      "To make the document load faster",
    ],
    answer: 1,
    explain:
      "CRDT inserts refer to the id of the character they follow. If deletion removed that character, a concurrent insert after it would have nowhere to go. Tombstones keep the structure intact, at the price of memory that grows until the document is compacted.",
  },
  {
    q: "A session server for one document crashes. How is the document recovered without losing accepted edits?",
    options: [
      "Ask every editor to send the full document back",
      "Load the latest snapshot and replay the operation log after it; editors resend unacknowledged operations by id",
      "Restore the previous day's backup",
    ],
    answer: 1,
    explain:
      "An operation is acknowledged only after it is appended to the log, so the log is the truth. A snapshot every few hundred operations keeps replay short. Unacknowledged operations are resent with ids so retries are idempotent.",
  },
];
