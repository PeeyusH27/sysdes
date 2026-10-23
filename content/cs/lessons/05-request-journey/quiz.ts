import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "On a cold HTTPS connection with TCP and TLS 1.3, how many round trips pass before the browser can send the HTTP request (DNS already done)?",
    options: ["1", "2", "3"],
    answer: 1,
    explain: "One round trip for the TCP handshake and one for TLS 1.3. The request travels with the client's final TLS message. TLS 1.2 would need three before the request.",
  },
  {
    q: "A round trip is 50 ms. DNS is uncached, TLS 1.3, HTTP/1.1, one request. About how long until the response arrives?",
    options: ["100 ms", "200 ms", "50 ms"],
    answer: 1,
    explain: "DNS 1 + TCP 1 + TLS 1 + request 1 = 4 round trips = 200 ms, ignoring server time. A kept-alive connection would need only 1 round trip.",
  },
  {
    q: "You will move a service to a new IP tomorrow. The DNS TTL is 86400 seconds. What should you do today?",
    options: ["Nothing, DNS updates instantly", "Lower the TTL now, so caches expire quickly by tomorrow", "Raise the TTL so it is cached longer"],
    answer: 1,
    explain: "Resolvers may keep the old answer for the full TTL. Lowering it at least a TTL before the change means the switch reaches users in minutes.",
  },
  {
    q: "TLS uses public-key crypto during the handshake but symmetric encryption for the data. Why?",
    options: ["Symmetric ciphers are much faster for bulk data", "Public-key crypto cannot encrypt anything", "Symmetric ciphers prove identity"],
    answer: 0,
    explain: "Public-key operations are slow, so they are used only to agree on a shared key (and to prove identity). The bulk of the traffic uses a fast symmetric cipher with that key.",
  },
  {
    q: "What does the server's certificate let the browser verify?",
    options: ["That the page is free of malware", "That the server holds a key bound to this hostname, vouched for by a trusted authority", "That the connection is fast"],
    answer: 1,
    explain: "It proves identity, not trustworthiness of the content. The browser checks the chain to a trusted authority, the hostname and the expiry date.",
  },
  {
    q: "With HTTP/2 over a lossy network, one lost packet slows every request on the connection. What causes it, and what fixes it?",
    options: ["Header compression; use HTTP/1.1", "TCP head-of-line blocking; HTTP/3 over QUIC delivers streams independently", "DNS caching; lower the TTL"],
    answer: 1,
    explain: "All HTTP/2 streams share one ordered TCP byte stream, so a gap stalls everything behind it. QUIC tracks loss per stream, so only the affected stream waits.",
  },
  {
    q: "Why do HTTP/1.1 browsers open about six connections to one host?",
    options: ["To use more bandwidth than allowed", "Because one connection handles one request at a time", "Because TLS requires it"],
    answer: 1,
    explain: "HTTP/1.1 has no multiplexing, so parallel downloads need parallel connections. HTTP/2 removed that need, which is why bundling and domain sharding are no longer helpful.",
  },
];
