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
  {
    q: "The optional recommendations service is down. What should /readyz do?",
    options: ["Fail, so no traffic reaches a broken instance", "Still pass, and the page drops the carousel", "Restart the instance"],
    answer: 1,
    explain: "Readiness should cover only what the instance cannot work without. Failing it on an optional dependency takes every instance out at once, so the whole site returns 503 over a carousel.",
  },
  {
    q: "A client retries a failed call 3 times. At 1,000 req/s, what load can an already failing server see?",
    options: ["About 1,300 req/s", "About 4,000 req/s", "Still 1,000 req/s"],
    answer: 1,
    explain: "Each failed call becomes the original plus 3 retries, so 1,000 becomes up to 4,000. Cap retries with a budget, back off with jitter, and trip a circuit breaker.",
  },
];
