import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "You need one-way server-to-browser updates with automatic resume after a dropped connection. Which technique?",
    options: ["SSE", "WebSocket", "Short polling"],
    answer: 0,
    explain: "EventSource reconnects by itself and sends Last-Event-ID, so the server can replay what was missed. A WebSocket would need all of that written by hand.",
  },
  {
    q: "The first thing a webhook handler does:",
    options: ["Process the event", "Verify the signature", "Return 200"],
    answer: 1,
    explain: "Anyone can POST to a public URL. Verify the HMAC (and the signed timestamp) over the raw body first, then enqueue the event and acknowledge.",
  },
  {
    q: "Why add jitter to reconnect delays?",
    options: ["Lower latency", "Avoid a reconnect stampede", "Save bandwidth"],
    answer: 1,
    explain: "After a deploy or network blip, every client disconnects at the same moment. Without jitter they all reconnect together and overload the servers that are still up.",
  },
  {
    q: "Over HTTP/1.1, a user opens 7 tabs of your app, each with an SSE stream. What happens?",
    options: ["All 7 work", "The 7th tab hangs waiting for a free connection", "The browser upgrades to WebSocket"],
    answer: 1,
    explain: "Browsers allow about 6 HTTP/1.1 connections per origin, and each SSE stream holds one open. HTTP/2 multiplexes the streams over one connection, so serve SSE over HTTP/2.",
  },
];
