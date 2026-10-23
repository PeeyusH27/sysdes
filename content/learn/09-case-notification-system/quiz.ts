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
];
