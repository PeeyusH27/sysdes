import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "A user edits one paragraph of a 1 GiB file. With 4 MiB chunks named by hash, what is uploaded?",
    options: ["The whole 1 GiB file", "Only the 4 MiB chunk that changed (1 of 256)", "Nothing: the server detects the edit by itself"],
    answer: 1,
    explain:
      "The client re-hashes all 256 chunks, asks the server which hashes it lacks, and uploads just that one: 4 MiB, 0.4% of the file. Because chunks are named by content, identical chunks are never stored or sent twice.",
  },
  {
    q: "With fixed 4 MiB chunks, a user inserts one byte at the start of a large file. What happens to chunk hashes?",
    options: [
      "Only the first chunk changes",
      "Every chunk changes, because all the bytes shift; content-defined chunking avoids this",
      "None change: hashes ignore position",
    ],
    answer: 1,
    explain:
      "Fixed boundaries sit at fixed offsets, so an insertion moves every later byte into a different chunk. Content-defined chunking cuts where a rolling hash matches a pattern, so cut points re-synchronise right after the edit and most chunks keep their hash.",
  },
  {
    q: "Two offline devices both edit revision 7 of the same file. How does the server handle the second commit?",
    options: [
      "Last write wins: the second device's version overwrites the first",
      "It rejects a commit whose base revision is no longer current, and the client keeps its work as a conflicted copy",
      "It merges the two files automatically, byte by byte",
    ],
    answer: 1,
    explain:
      "A commit carries the revision it started from. If the file moved on, the commit is refused, and nothing is silently lost: the loser saves a conflicted copy. Automatic merging only works for formats the server understands.",
  },
];
