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
];
