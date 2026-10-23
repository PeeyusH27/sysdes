import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "You grow a 50-node cluster by one node. Which placement scheme moves the least data?",
    options: [
      "hash(key) mod number-of-nodes",
      "Consistent hashing with virtual nodes: about 1 in 51 keys move, all onto the new node",
      "Range partitioning by the first letter of the key",
    ],
    answer: 1,
    explain:
      "Mod-N reshuffles almost every key when N changes (over 90% in a test). On a consistent-hash ring the new node takes over small arcs, about 1/51 or 2% of the data, and no data moves between existing nodes.",
  },
  {
    q: "N = 3 replicas. Which setting guarantees a read sees the latest acknowledged write?",
    options: ["W = 1, R = 1", "W = 2, R = 2", "W = 1, R = 2"],
    answer: 1,
    explain:
      "A read is guaranteed to overlap the last write when R + W > N. W = 2 and R = 2 gives 4 > 3. With W = 1 and R = 1 a random read misses a random write's replica 2 times in 3.",
  },
  {
    q: "Two clients write the same key on opposite sides of a partition. What do vector clocks give you that last-write-wins does not?",
    options: [
      "Faster writes",
      "Detection that the writes are concurrent, so both versions are kept for the application to merge",
      "Strong consistency without quorums",
    ],
    answer: 1,
    explain:
      "If neither clock includes the other, the writes were concurrent. The store returns both as siblings and the client merges them. Last-write-wins picks one by timestamp, and clock skew can make it drop the newer write.",
  },
];
