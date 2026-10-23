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
];
