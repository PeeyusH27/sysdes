import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "Two threads of one process are running. Which of these does each thread have its own copy of?",
    options: ["The heap", "The stack", "The open file table"],
    answer: 1,
    explain: "Each thread has its own stack and registers, because it needs its own call history. The heap, code, globals and open files belong to the process and are shared.",
  },
  {
    q: "Why is a switch between two threads of one process usually cheaper than a switch between two processes?",
    options: ["Threads need no registers saved", "The address space stays the same, so no page-table change and less cache and TLB loss", "The kernel is not involved"],
    answer: 1,
    explain: "Both switches enter the kernel and save registers. A process switch also loads another page table, which can flush the TLB and leaves the caches full of the old process's data.",
  },
  {
    q: "Two threads each run counter++ 1000 times with no lock. Why can the total end below 2000?",
    options: ["The CPU skips some increments", "Increment is load, add, store, so two threads can load the same value and one store overwrites the other", "Threads cannot share a variable"],
    answer: 1,
    explain: "That is a lost update: both threads read 5, both write 6. Nothing is skipped, but two increments produced one. A lock or an atomic increment fixes it.",
  },
  {
    q: "A browser runs each site in its own process. What is the main reason?",
    options: ["Processes are faster than threads", "A crash or exploit in one site stays inside its process", "Threads cannot run JavaScript"],
    answer: 1,
    explain: "Processes cost more than threads, so this is a deliberate trade. The separate address space contains crashes and stops one site from reading another's memory.",
  },
  {
    q: "A server holds 20,000 mostly idle connections. Which design fits best?",
    options: ["A thread per connection", "A process per connection", "An event loop with a few threads"],
    answer: 2,
    explain: "20,000 threads would each need a stack and would be switched in and out. An event loop (epoll, kqueue) wakes only for connections that have data, so a few threads are enough.",
  },
  {
    q: "A parent forks a child and never calls wait(). The child finishes. What do you see?",
    options: ["A zombie process entry", "The child keeps running", "The parent crashes"],
    answer: 0,
    explain: "The exited child stays in the process table so the parent can read its exit status. Calling wait, or the parent exiting, removes the entry.",
  },
  {
    q: "A scheduler cuts the time slice from 4 ms to 50 microseconds, with a 5 microsecond switch. What happens to useful work?",
    options: ["Nothing changes, switches are free", "About 9% of CPU time now goes to switching", "Throughput doubles because the system is more responsive"],
    answer: 1,
    explain: "5 / (50 + 5) is about 9%, and cache refill makes it worse. Shorter slices help response time but cost throughput.",
  },
];
