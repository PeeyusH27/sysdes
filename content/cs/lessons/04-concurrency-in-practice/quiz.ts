import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "A job is 90% parallel. What is the best possible speedup with unlimited workers?",
    options: ["9x", "10x", "Unlimited"],
    answer: 1,
    explain: "Amdahl's law: the serial 10% never shrinks, so the limit is 1 / 0.1 = 10x. At 8 workers you already get about 4.7x.",
  },
  {
    q: "An 8-core server runs tasks that spend 90 ms waiting on a database and 10 ms computing. About how many pool threads keep the cores busy?",
    options: ["8", "80", "800"],
    answer: 1,
    explain: "cores × (1 + wait / compute) = 8 × (1 + 9) = 80. With only 8 threads, the cores would sit idle most of the time while threads wait.",
  },
  {
    q: "A worker pool has a queue with no limit. What is the main risk when traffic doubles?",
    options: ["The queue grows, latency rises and memory runs out", "Tasks run twice", "The pool shrinks"],
    answer: 0,
    explain: "An unbounded queue hides overload. A bounded queue forces you to reject, block or shed load, which keeps latency and memory under control.",
  },
  {
    q: "In producer-consumer with a bounded buffer, what should a producer do when the buffer is full?",
    options: ["Drop the oldest item silently", "Wait until a consumer makes room (or reject explicitly)", "Grow the buffer"],
    answer: 1,
    explain: "Blocking the producer is backpressure: the slowdown travels upstream. Growing the buffer just moves the failure to memory.",
  },
  {
    q: "Two threads call a compare-and-swap increment on the same counter at the same moment. What happens to the loser?",
    options: ["It corrupts the counter", "Its swap fails, it re-reads the new value and tries again", "It blocks on a mutex"],
    answer: 1,
    explain: "CAS only writes if the cell still holds the value read. The loser sees a different value, loops and retries. That is lock-free, but heavy contention wastes CPU on retries.",
  },
  {
    q: "On a Node.js server one request runs a 200 ms synchronous loop. What do other requests experience?",
    options: ["Nothing, they run on other cores", "They wait, because the event loop thread is busy", "They get an error"],
    answer: 1,
    explain: "One thread runs all callbacks. While it is busy nothing else, including timers and I/O completions, is processed. Move CPU-heavy work to a worker thread or another process.",
  },
  {
    q: "Which workload suits an event loop best?",
    options: ["Video encoding", "A gateway holding 50,000 mostly idle websocket connections", "Matrix multiplication"],
    answer: 1,
    explain: "Idle connections cost almost nothing on an event loop. CPU-bound work like encoding or matrix maths needs real parallelism: threads on many cores or separate processes.",
  },
];
