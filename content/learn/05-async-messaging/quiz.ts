import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "A topic has 6 partitions and a consumer group has 8 consumers. How many consumers sit idle?",
    options: ["0", "2", "6"],
    answer: 1,
    explain: "Each partition is read by exactly one consumer in a group, so 6 consumers get a partition each and 2 have nothing to read. Parallelism is capped by the partition count.",
  },
  {
    q: "Kafka guarantees message order…",
    options: ["Across the whole topic", "Within a partition", "Never"],
    answer: 1,
    explain: "Each partition is an ordered log. Give related messages the same key (for example the userId) so they land in the same partition and stay in order.",
  },
  {
    q: "In practice, \"exactly once\" processing means…",
    options: ["A magic broker setting", "At-least-once delivery + idempotent processing", "At-most-once delivery"],
    answer: 1,
    explain: "Brokers redeliver after crashes and timeouts, so duplicates are normal. Deduplicating by message id (or making the write idempotent) gives an effectively-once result.",
  },
  {
    q: "A worker charges a card, then crashes before acking. What does the broker do?",
    options: ["Redelivers it, so the consumer must dedupe", "Forgets the message", "Marks it done"],
    answer: 0,
    explain: "No ack means the broker assumes the work did not finish and delivers the message again. That is at-least-once, so the charge needs a dedupe table or an idempotency key.",
  },
  {
    q: "Why add jitter to exponential backoff?",
    options: ["It makes each retry faster", "It skips the dead letter queue", "It spreads retries so clients don't hit the service together"],
    answer: 2,
    explain: "Without jitter, clients that failed together retry together at 1 s, 2 s and 4 s, and the recovering service sees synchronized waves. Random delays spread the load.",
  },
];
