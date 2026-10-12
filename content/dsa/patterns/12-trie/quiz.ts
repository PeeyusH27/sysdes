import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "You insert \"apple\" into an empty trie, then call search(\"app\") and startsWith(\"app\"). What do they return?",
    options: ["true and true", "false and true", "false and false"],
    answer: 1,
    explain: "The path a → p → p exists, so startsWith is true. But only the node for \"apple\" is marked as the end of a word, so search(\"app\") is false. That end flag is the whole difference between the two operations.",
  },
  {
    q: "Word Search II: why build a trie of the words instead of running a separate grid search for each word?",
    options: [
      "A trie uses less memory than the list of words",
      "One DFS over the grid checks every word at once, and it stops as soon as the letters walked so far are not a prefix of any word",
      "A trie sorts the words, so the answers come out in order",
    ],
    answer: 1,
    explain: "Separate searches redo the same grid walk for every word that shares a prefix. With a trie, the DFS carries a trie node along and abandons a path the moment no word continues it, so shared prefixes are explored once.",
  },
  {
    q: "Children stored in an array of 26 versus a Map: which statement is right?",
    options: [
      "The array finds a child by index with no hashing, but every node pays for 26 slots; a Map stores only the children that exist and works for any alphabet",
      "A Map is always faster because it is a hash table",
      "An array of 26 works for any Unicode text",
    ],
    answer: 0,
    explain: "Both make each step O(1). The array is fast and predictable but memory-hungry and limited to a known small alphabet; a Map (or an object) grows with the actual children and accepts any character.",
  },
];
