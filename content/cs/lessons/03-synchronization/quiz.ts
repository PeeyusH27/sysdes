import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "Which of these is NOT one of the four conditions for deadlock?",
    options: ["Hold and wait", "Starvation", "Circular wait"],
    answer: 1,
    explain: "The four are mutual exclusion, hold and wait, no preemption and circular wait. Starvation is a different problem: a thread that is runnable but never chosen.",
  },
  {
    q: "Thread 1 locks A then B. Thread 2 locks B then A. What is the simplest reliable fix?",
    options: ["Add more threads", "Make both threads lock in the same global order", "Make the critical sections longer"],
    answer: 1,
    explain: "A fixed order breaks circular wait, so a ring of waiters cannot form. Timeouts also work, but they detect the problem after it happens instead of preventing it.",
  },
  {
    q: "What is the main difference between a mutex and a binary semaphore?",
    options: ["A mutex has an owner that must unlock it; a semaphore can be released by any thread", "A mutex is faster on all hardware", "A semaphore can only count to one"],
    answer: 0,
    explain: "Ownership is what makes a mutex safe for protecting data and lets systems do things like priority inheritance. A semaphore is a counter, often used to signal between threads.",
  },
  {
    q: "A consumer wakes from a condition variable wait. Why must it recheck the condition?",
    options: ["The wake-up may be spurious, or another consumer may have taken the item first", "The mutex was never released", "Signals are always lost"],
    answer: 0,
    explain: "Between the signal and the re-lock another thread can run, and spurious wake-ups are allowed. Use while (not ready) wait, never if.",
  },
  {
    q: "Single-threaded JavaScript reads a balance, awaits a network call, then writes balance + 10. Two calls overlap. What happens?",
    options: ["Nothing: one thread means no races", "One update can be lost, because the other call runs during the await", "An exception is thrown"],
    answer: 1,
    explain: "The await yields to other tasks. Both read the same old balance and the second write overwrites the first. A mutex around the read-modify-write, or an atomic database update, fixes it.",
  },
  {
    q: "Two threads keep backing off and retrying in lockstep, using CPU but never completing. What is this?",
    options: ["Deadlock", "Livelock", "Priority inversion"],
    answer: 1,
    explain: "In a deadlock threads are blocked. In a livelock they are running but their actions cancel out. Random backoff breaks the symmetry.",
  },
  {
    q: "A semaphore guards 3 database connections. A fourth task calls acquire. What happens?",
    options: ["It fails with an error", "It waits until one of the three releases", "It steals a permit"],
    answer: 1,
    explain: "acquire blocks (or awaits) when no permits are left and is woken by a release. That queueing is the point: it turns overload into waiting instead of failure.",
  },
];
