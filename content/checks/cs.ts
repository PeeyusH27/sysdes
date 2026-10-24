import type { PageChecks } from "./types";

export const checks: Record<string, PageChecks> = {
  "tcp-in-depth": {
    "what-tcp-promises": {
      q: "What does TCP guarantee about data?",
      options: ["Lowest possible latency", "Ordered, reliable delivery", "No acknowledgements needed"],
      answer: 1,
      why: "Sequence numbers, ACKs and retransmission give an ordered stream or a clear failure.",
    },
    "flow-control-versus-congestion-control": {
      q: "Flow control protects which side?",
      options: ["The receiver", "The network", "The router"],
      answer: 0,
      why: "The receiver advertises its free buffer. Congestion control is what protects the network.",
    },
    "congestion-control-slow-start-and-aimd": {
      q: "In slow start, how does the window grow each round trip?",
      options: ["By one segment", "It doubles", "It stays flat"],
      answer: 1,
      why: "Doubling finds the available bandwidth quickly. After a threshold or a loss, growth slows to one per round trip.",
    },
    "loss-and-retransmission": {
      q: "Three duplicate ACKs arrive. What does the sender do?",
      options: ["Retransmits at once", "Waits for the timeout", "Closes the connection"],
      answer: 0,
      why: "Duplicate ACKs say later data got through, so waiting for the slow timeout would waste time.",
    },
    "head-of-line-blocking": {
      q: "One lost segment stalls data the app already received. What is this?",
      options: ["Slow start", "TIME_WAIT", "Head-of-line blocking"],
      answer: 2,
      why: "TCP delivers in order, so the application waits until the gap is filled.",
    },
    "closing-a-connection-and-time-wait": {
      q: "Which side ends up in TIME_WAIT?",
      options: ["The side that closes first", "Always the server", "The side that closes last"],
      answer: 0,
      why: "It must stay to re-ACK a lost final FIN and let old packets die.",
    },
  },
};
