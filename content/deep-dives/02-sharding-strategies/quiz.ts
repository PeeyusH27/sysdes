import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "Going from 4 to 5 nodes with hash % N moves about…",
    options: ["20% of keys", "50% of keys", "80% of keys"],
    answer: 2,
    explain:
      "A key stays put only when hash mod 4 equals hash mod 5, true for 1 in 5 keys. So N/(N+1) = 4/5 = 80% move. Consistent hashing moves only 1/(N+1) = 20%.",
  },
  {
    q: "Virtual nodes exist to…",
    options: ["Add capacity", "Even out load across physical nodes", "Replicate data"],
    answer: 1,
    explain:
      "With one point per node, the arcs on the ring vary wildly. 100+ points per node even them out, and a leaving node's load spreads over many neighbours.",
  },
  {
    q: "Snowflake ids need…",
    options: ["A central counter", "A unique worker id per generator", "A database sequence per shard"],
    answer: 1,
    explain:
      "The worker id bits stop two generators making the same id, so no coordination per id is needed. You assign worker ids once, at startup.",
  },
  {
    q: "Each shard is slow 1% of the time. A query that fans out to 64 shards is slow about…",
    options: ["1% of the time", "47% of the time", "64% of the time"],
    answer: 1,
    explain:
      "It is slow if any shard is slow. The chance that none is slow is 0.99 to the 64th power, about 53%, so about 47% of queries are slow.",
  },
  {
    q: "Which shard key sends every new write to one shard?",
    options: ["created_at with range sharding", "user_id, hashed", "tenant_id through a directory"],
    answer: 0,
    explain:
      "New rows always carry the largest timestamp, so they all fall into the newest range. Hashing the id scatters them; a directory places tenants by choice.",
  },
];
