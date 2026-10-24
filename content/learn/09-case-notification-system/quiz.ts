import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "Why use separate queues per channel and priority?",
    options: ["It's cheaper", "Isolation: slow SMS or a big campaign can't block OTPs", "It preserves ordering"],
    answer: 1,
    explain: "Each queue has its own backlog and workers. A 1M-message campaign fills notif.push.low while notif.sms.critical stays empty and fast.",
  },
  {
    q: "What's the deterministic id eventId:channel for?",
    options: ["Sorting", "Deduplication", "Encryption"],
    answer: 1,
    explain: "A retried or redelivered message gets the same id, so the worker sees it was already sent and drops the copy.",
  },
  {
    q: "Quiet hours should be checked…",
    options: ["When the event is created", "At send time, in the user's time zone", "In UTC"],
    answer: 1,
    explain: "A message can wait in a queue, and 22:00 means 22:00 where the user lives. Store the time zone and check when sending.",
  },
  {
    q: "A worker sets sent:id before calling the provider, and the provider then returns 503. What happens on redelivery?",
    options: ["It sees sent and drops the message, which is lost", "It retries and succeeds", "It sends twice"],
    answer: 0,
    explain: "Marking before sending turns a failed send into a lost message. Mark only after the provider accepts, and accept the rare duplicate.",
  },
  {
    q: "SMS provider A returns 200 for every send, but receipts show 40% delivered. What do you do?",
    options: ["Retry harder on A", "Nothing: the breaker is closed", "Alert on delivery rate and route to provider B"],
    answer: 2,
    explain: "The breaker only sees errors. Per-provider delivery rate from webhooks catches a provider that accepts but drops, so traffic can move to the backup.",
  },
];
