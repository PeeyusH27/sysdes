import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "Which status code means 'accepted for async processing'?",
    options: ["202", "201", "204"],
    answer: 0,
    explain: "202 Accepted says the work was queued, not done. Return a Location header (or a status URL) the client can poll, or notify it later by SSE or webhook. 201 means the resource already exists.",
  },
  {
    q: "What does the transactional outbox prevent?",
    options: ["Slow writes", "Lost or phantom events from dual writes", "Duplicate HTTP requests"],
    answer: 1,
    explain: "Writing the row and publishing to the queue separately can lose the event (crash after commit) or publish one for a rolled-back write. The outbox row commits atomically with the data, and a relay publishes it afterwards.",
  },
  {
    q: "Which header carries trace context between services?",
    options: ["x-request-id only", "traceparent", "Authorization"],
    answer: 1,
    explain: "The W3C traceparent header carries the trace id, the parent span id and sampling flags. OpenTelemetry injects and extracts it automatically.",
  },
  {
    q: "Two requests with the same Idempotency-Key arrive at the same moment. With SET key pending NX, what happens?",
    options: ["Both charge the card", "One claims the key; the other gets 409", "Both get 409"],
    answer: 1,
    explain: "SET … NX is atomic, so exactly one request claims the key and charges. The other sees 'pending' and gets 409; once the first finishes, a retry replays the stored result.",
  },
];
