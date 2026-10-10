import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "12 app instances each open a pool of 20, and PostgreSQL has max_connections = 200. What happens?",
    options: ["Fine", "Connection errors under load", "PostgreSQL queues the extra connections"],
    answer: 1,
    explain: "12 × 20 = 240 connections, more than 200 (and admin tools need some too). Once the pools fill up under load, new connections are refused. Size pools from the total, or put PgBouncer in front.",
  },
  {
    q: "A cold HTTPS request with TLS 1.3 costs roughly how many round trips before the response arrives?",
    options: ["1", "~4 (DNS, TCP, TLS, request)", "~10"],
    answer: 1,
    explain: "DNS lookup, TCP handshake, TLS 1.3 handshake, then the request itself. On a kept-alive connection only the last one remains. TLS 1.2 adds one more; HTTP/3 merges TCP and TLS.",
  },
  {
    q: "Does Node's built-in fetch keep connections alive by default?",
    options: ["Yes", "No"],
    answer: 0,
    explain: "fetch is built on undici, which pools and reuses connections per origin. Since Node 19 the default http.Agent keeps connections alive as well.",
  },
  {
    q: "With PgBouncer in transaction mode, which of these breaks?",
    options: ["A plain SELECT", "A session-level SET that later transactions rely on", "BEGIN … COMMIT"],
    answer: 1,
    explain: "Each transaction may run on a different server connection, so session state is lost between transactions. Use SET LOCAL inside the transaction instead.",
  },
];
