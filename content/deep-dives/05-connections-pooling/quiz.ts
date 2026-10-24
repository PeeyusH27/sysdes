import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "12 app instances each open a pool of 20, and PostgreSQL has max_connections = 200. What happens?",
    options: ["Fine", "Connection errors under load", "PostgreSQL queues the extra connections"],
    answer: 1,
    explain: "12 × 20 = 240, more than 200 (and admin tools need some too). Under load, new connections are refused. Size pools from the total, or add PgBouncer.",
  },
  {
    q: "A cold HTTPS request with TLS 1.3 costs roughly how many round trips before the response arrives?",
    options: ["1", "~4 (DNS, TCP, TLS, request)", "~10"],
    answer: 1,
    explain: "DNS, TCP, TLS 1.3, then the request. A kept-alive connection pays only the last. TLS 1.2 adds one more; HTTP/3 merges TCP and TLS.",
  },
  {
    q: "Does Node's built-in fetch keep connections alive by default?",
    options: ["Yes", "No"],
    answer: 0,
    explain: "fetch is built on undici, which reuses connections per origin. Since Node 19 the default http.Agent keeps them alive too.",
  },
  {
    q: "With PgBouncer in transaction mode, which of these breaks?",
    options: ["A plain SELECT", "A session-level SET that later transactions rely on", "BEGIN … COMMIT"],
    answer: 1,
    explain: "Each transaction may run on a different server connection, so session state is lost. Use SET LOCAL inside the transaction instead.",
  },
  {
    q: "A handler runs BEGIN, calls a payment API that stalls for 30 s, then COMMITs. What is the main risk?",
    options: ["Nothing: the transaction is atomic", "It holds a pool connection and row locks while idle", "PgBouncer closes the connection"],
    answer: 1,
    explain: "The session is idle in transaction: it keeps its connection and locks for 30 s. Do network calls outside the transaction and set idle_in_transaction_session_timeout.",
  },
];
