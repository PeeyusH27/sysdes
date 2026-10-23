import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "Which algorithm adapts when one server becomes slow?",
    options: ["Round robin", "Least connections or P2C", "IP hash"],
    answer: 1,
    explain: "A slow server holds requests longer, so its count of open requests rises and new work goes elsewhere. Round robin and IP hash keep sending it the same share.",
  },
  {
    q: "\"Accepted, processing asynchronously\" returns which status?",
    options: ["200", "202", "204"],
    answer: 1,
    explain: "202 Accepted means the request is queued but not done yet; return a job id or a status URL. 200 means done with a body; 204 means done with no body.",
  },
  {
    q: "Why use cursor pagination for feeds?",
    options: ["Smaller payloads", "Stable pages while new items arrive, and fast deep pages", "Better caching"],
    answer: 1,
    explain: "OFFSET counts rows, so new posts shift every page and deep pages scan and discard rows. A cursor (WHERE id < last_seen) seeks straight into the index.",
  },
];
