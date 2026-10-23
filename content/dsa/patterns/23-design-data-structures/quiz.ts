import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "An LRU cache must find a key in O(1) and also evict the least recently used key in O(1). Which pair of structures delivers both?",
    options: [
      "A hash map alone, scanning all keys when it is full",
      "A hash map from key to node, plus a doubly linked list ordered by recency",
      "A sorted array of keys, searched with binary search",
    ],
    answer: 1,
    explain: "The map finds the node in O(1). The doubly linked list lets a node unlink itself in O(1) and keeps the least recent entry at one end. Each structure covers the weakness of the other.",
  },
  {
    q: "In Insert Delete GetRandom O(1), remove(val) copies the last array element into val's slot before popping. Why not just splice val out?",
    options: [
      "splice keeps the array sorted, which a set must not do",
      "splice shifts every later element, so removal becomes O(n)",
      "splice does not work on arrays that hold numbers",
    ],
    answer: 1,
    explain: "The order of a set does not matter, so filling the hole with the last element keeps the array dense and makes pop() the only change at the end. That is O(1); splice is O(n).",
  },
  {
    q: "A time-based store gets set(key, value, t) with increasing t for each key, and get(key, t) asks for the latest value at or before t. What makes O(log n) get possible?",
    options: [
      "Each key's writes are appended in time order, so its history is already sorted and can be binary searched",
      "A hash map from timestamp to value answers any t in O(1)",
      "Sorting all writes again on every get",
    ],
    answer: 0,
    explain: "Increasing timestamps mean appending keeps each history sorted for free. Then get is a search for the last write at or before t. An exact-match map cannot answer for a t that was never written.",
  },
];
