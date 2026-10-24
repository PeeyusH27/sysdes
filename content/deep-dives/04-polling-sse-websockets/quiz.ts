import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "You need one-way server-to-browser updates with automatic resume after a dropped connection. Which technique?",
    options: ["SSE", "WebSocket", "Short polling"],
    answer: 0,
    explain: "EventSource reconnects by itself and sends Last-Event-ID, so the server can replay what you missed. A WebSocket needs all of that written by hand.",
  },
  {
    q: "The first thing a webhook handler does:",
    options: ["Process the event", "Verify the signature", "Return 200"],
    answer: 1,
    explain: "Anyone can POST to a public URL. Verify the signature over the raw body first, then enqueue the event and reply.",
  },
  {
    q: "Why add jitter to reconnect delays?",
    options: ["Lower latency", "Avoid a reconnect stampede", "Save bandwidth"],
    answer: 1,
    explain: "After a deploy, every client drops at the same moment. Without jitter they all return together and overload the servers still up.",
  },
  {
    q: "Over HTTP/1.1, a user opens 7 tabs of your app, each with an SSE stream. What happens?",
    options: ["All 7 work", "The 7th tab hangs waiting for a free connection", "The browser upgrades to WebSocket"],
    answer: 1,
    explain: "Browsers allow about 6 HTTP/1.1 connections per origin, and each SSE stream holds one. HTTP/2 shares one connection, so serve SSE over HTTP/2.",
  },
  {
    q: "A gateway node loses its Redis connection for 4 s. Redis pub/sub messages sent in that window are:",
    options: ["Replayed on reconnect", "Lost to that node's sockets", "Queued for up to a minute"],
    answer: 1,
    explain: "Redis pub/sub is at most once and stores nothing for absent subscribers. Write messages to a log with ids so clients can resume.",
  },
];
