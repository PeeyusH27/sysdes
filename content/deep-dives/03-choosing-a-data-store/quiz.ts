import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "Which store for a like counter that's read constantly?",
    options: ["Postgres", "Redis", "S3"],
    answer: 1,
    explain:
      "INCR is atomic and takes about a millisecond, served from memory. Save the total to the database now and then if it must survive a Redis loss.",
  },
  {
    q: "Full-text search with relevance ranking?",
    options: ["Elasticsearch / OpenSearch", "DynamoDB", "Cassandra"],
    answer: 0,
    explain:
      "Search engines build indexes with word splitting and relevance scoring. Key-value and wide-column stores can only look things up by key.",
  },
  {
    q: "Money movements?",
    options: ["A relational DB with transactions", "Cassandra", "Redis"],
    answer: 0,
    explain:
      "A transfer must debit and credit together, and never push a balance below zero. That is what transactions in Postgres or MySQL give you.",
  },
  {
    q: "A Monday report scans 100M rows and checkout times out. Best fix?",
    options: ["Index every column", "Stream changes to a columnar store", "Move orders to Redis"],
    answer: 1,
    explain:
      "Scans and transactions fight over disk and CPU. CDC into ClickHouse gives reports their own machine and leaves Postgres to checkout.",
  },
  {
    q: "The order commits but the search index call times out. Which design survives?",
    options: ["Skip the index", "Write both stores in one request", "Outbox or CDC feeding the index"],
    answer: 2,
    explain:
      "A dual write has no retry, so one failure leaves the stores different forever. An outbox row commits with the order, and a relay retries until the index catches up.",
  },
];
