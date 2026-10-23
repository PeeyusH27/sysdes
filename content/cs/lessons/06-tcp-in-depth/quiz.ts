import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "A receiver's application reads slowly and its buffer fills. Which mechanism tells the sender to slow down?",
    options: ["Congestion control", "Flow control, by shrinking the advertised receive window", "Slow start"],
    answer: 1,
    explain: "Flow control protects the receiver: each ACK carries the free buffer space, and the sender never exceeds it. Congestion control reacts to the network, not to the receiver.",
  },
  {
    q: "What does the sender's limit on unacknowledged data equal?",
    options: ["The receive window only", "The congestion window only", "The smaller of the receive window and the congestion window"],
    answer: 2,
    explain: "Either side can be the bottleneck. The sender must respect both the receiver's room and its own estimate of what the network can carry.",
  },
  {
    q: "A connection starts with 10 segments in flight, ssthresh is 64, and there is no loss. What are the next windows?",
    options: ["11, 12, 13", "20, 40, 64, then 65", "10, 10, 10"],
    answer: 1,
    explain: "Slow start doubles each round trip until it reaches ssthresh (10, 20, 40, 64), then congestion avoidance adds one segment per round trip.",
  },
  {
    q: "A window of 64 segments of 1,460 bytes, with a 50 ms round trip. About what throughput is that?",
    options: ["About 1.5 Mbit/s", "About 15 Mbit/s", "About 150 Mbit/s"],
    answer: 1,
    explain: "One window per round trip: 64 × 1,460 × 8 bits = 747,520 bits every 50 ms, which is about 15 Mbit/s. A longer round trip or a smaller window lowers it.",
  },
  {
    q: "Why is a retransmission timeout much more costly than a fast retransmit?",
    options: ["It uses more bandwidth", "The sender sits idle for the whole timeout, then restarts from a window of one", "It re-sends the entire stream"],
    answer: 1,
    explain: "Three duplicate ACKs show later data is still flowing, so the sender halves its window and carries on. A timeout means silence: the sender waits, assumes severe congestion and slow-starts again.",
  },
  {
    q: "A service makes thousands of short connections per second to one backend and starts failing to connect. The client shows tens of thousands of sockets in TIME_WAIT. What is the best fix?",
    options: ["Shorten TIME_WAIT to zero", "Reuse connections with keep-alive or a pool", "Add more source IP addresses only"],
    answer: 1,
    explain: "Ephemeral ports are exhausted because each closed connection holds its port for about 60 seconds. Reusing connections removes the churn; extra source addresses only postpone the limit.",
  },
  {
    q: "Segment 2 of a stream is lost but segments 3 to 5 arrive. What does the receiving application see?",
    options: ["Segments 3 to 5 immediately", "Nothing past segment 1 until segment 2 is retransmitted", "An error"],
    answer: 1,
    explain: "TCP guarantees in-order delivery, so the later data waits in the receiver's buffer. This head-of-line blocking is what QUIC avoids by ordering each stream separately.",
  },
];
