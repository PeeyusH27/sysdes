import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "A client times out on PUT /users/7 with a full new profile and retries. Is that safe?",
    options: ["No, it may apply twice and corrupt data", "Yes, PUT is idempotent: the same body leaves the same state", "Only if the server uses HTTP/2"],
    answer: 1,
    explain: "Idempotent means repeating the request has the same effect as sending it once. PUT replaces the resource, so a second identical PUT changes nothing more.",
  },
  {
    q: "The browser sends If-None-Match with an ETag and receives 304. What does it do?",
    options: ["Shows an error", "Uses its cached copy, which is still valid", "Downloads the body again"],
    answer: 1,
    explain: "304 Not Modified has no body. It tells the client its cached copy is current. The round trip still happened, but the payload did not.",
  },
  {
    q: "A logged-in user requests an admin page they are not allowed to see. Which status is correct?",
    options: ["401 Unauthorized", "403 Forbidden", "404 Not Found only"],
    answer: 1,
    explain: "401 means the client is not authenticated (log in first). 403 means the server knows who you are and refuses. Some systems return 404 to hide that a resource exists.",
  },
  {
    q: "A mobile client calls POST /payments, the connection drops, and it retries. How do you avoid charging twice?",
    options: ["Never retry POST", "Send an Idempotency-Key; the server returns the stored result for a repeat", "Switch to GET"],
    answer: 1,
    explain: "The server records the outcome under the key, so a repeat returns the first result instead of charging again. Retrying with backoff stays safe.",
  },
  {
    q: "A GraphQL query for 100 posts with their authors runs 101 database queries. What is this, and what is the fix?",
    options: ["N+1; batch author lookups with a loader", "Over-fetching; add more fields", "A deadlock; add a mutex"],
    answer: 0,
    explain: "One query for the list plus one per item is N+1. A loader collects the author IDs from the same tick and fetches them all in one call.",
  },
  {
    q: "Which is the strongest reason to choose gRPC between two internal services?",
    options: ["It is easy to call from a browser", "Typed contracts, compact binary payloads and streaming over HTTP/2", "It caches at the CDN"],
    answer: 1,
    explain: "gRPC trades readability and browser support for efficiency and strictness, which suits high-volume service-to-service calls.",
  },
  {
    q: "Why does offset pagination (page=500) misbehave on a list that changes while the user pages?",
    options: ["Rows inserted or deleted shift the offset, so items are skipped or repeated", "HTTP limits page numbers", "It cannot be cached"],
    answer: 0,
    explain: "The offset counts rows from the start, so a new row at the top pushes every row down by one. Cursor pagination anchors on a stable key instead and stays fast on deep pages.",
  },
];
