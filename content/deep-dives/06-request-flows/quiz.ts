import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "Which status code means 'accepted for async processing'?",
    options: ["202", "201", "204"],
    answer: 0,
    explain: "202 Accepted says the work was queued, not done. Return a status URL the client can poll, or notify it later. 201 means the resource already exists.",
  },
  {
    q: "What does the transactional outbox prevent?",
    options: ["Slow writes", "Lost or phantom events from dual writes", "Duplicate HTTP requests"],
    answer: 1,
    explain: "Saving the row and publishing separately can lose the event (crash after commit) or announce a rolled-back write. The outbox row commits with the data, and a relay publishes it afterwards.",
  },
  {
    q: "Which header carries trace context between services?",
    options: ["x-request-id only", "traceparent", "Authorization"],
    answer: 1,
    explain: "The W3C traceparent header carries the trace id, parent span id and sampling flags. OpenTelemetry handles it for you.",
  },
  {
    q: "Two requests with the same Idempotency-Key arrive at the same moment. With SET key pending NX, what happens?",
    options: ["Both charge the card", "One claims the key; the other gets 409", "Both get 409"],
    answer: 1,
    explain: "SET … NX is atomic, so exactly one request claims the key and charges. The other sees 'pending' and gets 409. Once the first finishes, a retry gets the stored result.",
  },
  {
    q: "A client, a gateway and a service each retry a failing call 3 times. How many attempts can reach the database for one user action?",
    options: ["9", "12", "27"],
    answer: 2,
    explain: "Retries multiply across layers: 3 x 3 x 3 = 27. Retry in one layer only, with jitter and a budget such as 10% of calls, so a struggling database can recover.",
  },
];
