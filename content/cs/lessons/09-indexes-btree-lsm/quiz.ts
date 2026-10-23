import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "A B-tree page holds about 300 keys. Roughly how many levels does it need for one billion rows?",
    options: ["10", "4", "30"],
    answer: 1,
    explain: "300 cubed is 27 million and 300 to the fourth is 8.1 billion, so four levels reach a billion rows. Lookups cost about four page reads, and the top levels are usually cached.",
  },
  {
    q: "A composite index is on (user_id, status, created_at). Which query can use all three columns?",
    options: ["WHERE status = 'paid' AND created_at > X", "WHERE user_id = 1 AND created_at > X", "WHERE user_id = 1 AND status = 'paid' AND created_at > X"],
    answer: 2,
    explain: "Equality on user_id and status, then a range on created_at, matches the sort order. Skipping the first column, or skipping status, breaks the leftmost prefix.",
  },
  {
    q: "A query reads only user_id and status. There is an index on (user_id, status). What do you get?",
    options: ["A full table scan", "An index-only scan: the index covers the query, so no row is fetched", "A sort of the whole table"],
    answer: 1,
    explain: "A covering index holds every needed column. The database answers from the index pages and never touches the table.",
  },
  {
    q: "Why can an LSM-tree absorb writes faster than a B-tree?",
    options: ["It writes sequentially (log and memtable) and defers merging to background compaction", "It skips the log", "It never reads from disk"],
    answer: 0,
    explain: "Appending and in-memory inserts avoid random in-place page updates. The cost moves to compaction and to reads that may check several files.",
  },
  {
    q: "What is a Bloom filter doing in an LSM-tree read?",
    options: ["Compressing files", "Telling it which files cannot contain the key, so they are skipped", "Sorting the memtable"],
    answer: 1,
    explain: "A Bloom filter gives 'definitely not here' or 'maybe here'. Skipping files that cannot hold the key brings reads close to one file instead of one per level.",
  },
  {
    q: "A table has a million rows and 90% have active = true. Will an index on active speed up WHERE active = true?",
    options: ["Yes, always", "Probably not: the query matches most rows, so a scan is cheaper", "Only on SSDs"],
    answer: 1,
    explain: "Low selectivity means the index would send the database to most of the table in random order. A sequential scan is faster, and the planner knows it.",
  },
  {
    q: "Which query cannot use a normal B-tree index on name?",
    options: ["WHERE name = 'Ada'", "WHERE name LIKE 'Ad%'", "WHERE name LIKE '%da'"],
    answer: 2,
    explain: "A leading wildcard gives no sorted prefix to seek to. A trailing wildcard ('Ad%') is a range on the sort order and works.",
  },
];
