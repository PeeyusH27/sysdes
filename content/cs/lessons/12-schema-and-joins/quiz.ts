import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "Which phrase sums up third normal form?",
    options: ["Every table has an index", "Each non-key column depends on the key, the whole key and nothing but the key", "No table has foreign keys"],
    answer: 1,
    explain: "Third normal form removes columns that depend on other non-key columns. Storing a customer's city on each order is such a dependency: city depends on the customer, not the order.",
  },
  {
    q: "An orders table repeats customer_city. The customer moves and only some orders are updated. What is this called?",
    options: ["A deadlock", "An update anomaly", "A phantom read"],
    answer: 1,
    explain: "Because the same fact is stored many times, updates can leave copies disagreeing. Storing the city once on the customer row makes the update a single change.",
  },
  {
    q: "When is denormalizing a good idea?",
    options: ["Always, joins are slow", "For a measured hot read path, when you can keep the copies in sync", "Never, it breaks the relational model"],
    answer: 1,
    explain: "Denormalizing trades write cost and staleness risk for read speed. It pays off when reads dominate and you have a plan, such as a transaction or async job, to keep the copy correct.",
  },
  {
    q: "Joining 100 users with 1,000 orders: roughly how many steps do a naive nested loop and a hash join take?",
    options: ["100,000 and 1,100", "1,100 and 100,000", "Both about 1,000"],
    answer: 0,
    explain: "Nested loop compares every pair (100 × 1,000). Hash join builds a table of 100 and probes it 1,000 times. The gap grows with the table sizes.",
  },
  {
    q: "You want customers who have never placed an order. Which query shape finds them?",
    options: ["INNER JOIN customers to orders", "LEFT JOIN orders and keep rows where the order id IS NULL", "CROSS JOIN customers and orders"],
    answer: 1,
    explain: "A left join keeps every customer and fills the order columns with NULL when there is no match. Filtering on that NULL leaves the unmatched ones. NOT EXISTS is equivalent.",
  },
  {
    q: "A merge join needs what from its inputs?",
    options: ["A hash table that fits in memory", "Both sorted on the join key", "An index on every column"],
    answer: 1,
    explain: "A merge join walks two sorted inputs once. If they are not sorted, the planner would have to sort them first, so it often picks a hash join instead.",
  },
  {
    q: "Orders and customers live on different shards, and a query joins them. What is a good way to keep it cheap?",
    options: ["Shard both by customer id so a customer's rows are on the same shard", "Add more indexes", "Use a bigger server"],
    answer: 0,
    explain: "Co-locating related rows by a shared key keeps the join local to one machine. Otherwise you broadcast small tables, join in the application, or denormalize.",
  },
];
