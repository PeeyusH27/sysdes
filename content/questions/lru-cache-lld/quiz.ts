import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "Why does a thread-safe LRU cache need an exclusive lock even for get()?",
    options: [
      "Reads of a map are never safe in Java",
      "A hit moves the key to the front of the order, so a read is also a write",
      "The lock makes the cache faster",
    ],
    answer: 1,
    explain:
      "LRU records every hit by relinking a node. Two readers relinking at once can corrupt the list, so a plain read-write lock does not help. To scale, split the keys over several independent caches (lock striping), or record hits in a buffer and apply them in batches.",
  },
  {
    q: "A put of a key that is already in the cache arrives while the cache is full. What should happen?",
    options: [
      "Evict the oldest key, then insert",
      "Replace the value, refresh its position, and evict nothing",
      "Reject the put",
    ],
    answer: 1,
    explain:
      "Replacing a key does not grow the cache, so nothing needs to leave. A common bug evicts first and checks for the key afterwards, which throws away a good entry for no reason.",
  },
  {
    q: "Where should the eviction order live: inside Cache, or behind an EvictionPolicy?",
    options: [
      "Inside Cache, because a policy for one rule is simpler",
      "Behind a policy, when LRU, FIFO or LFU must be swappable; otherwise inline LRU is fine",
      "Always behind a policy, with a factory",
    ],
    answer: 1,
    explain:
      "A Strategy earns its place when a second rule really exists. For one fixed LRU, a hash map plus a linked list inside the class is clearer. Offer the policy interface when asked for LFU, and do not build a factory for two choices.",
  },
];
