import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "Jobs of 24, 3 and 3 ms arrive together. Which policy gives the lowest average wait?",
    options: ["First come, first served (17 ms)", "Shortest job first (3 ms)", "Round robin, 4 ms quantum (about 5.7 ms)"],
    answer: 1,
    explain: "Short jobs finish before they can block anything. The catch is that you must know the burst in advance and a stream of short jobs can starve a long one.",
  },
  {
    q: "A round-robin quantum is made much too small. What is the main effect?",
    options: ["Long jobs starve", "Too much time goes to context switches", "Jobs finish in a random order"],
    answer: 1,
    explain: "Response time improves but every switch costs time and cache warmth. A very large quantum is the opposite failure: it behaves like first come, first served.",
  },
  {
    q: "With 4 KiB pages, virtual address 0x3A7C is on page 3 and page 3 is in frame 7. What is the physical address?",
    options: ["0x7A7C", "0x3A7C", "0x73A7C"],
    answer: 0,
    explain: "The low 12 bits (0xA7C) are the offset and pass through unchanged. Only the page number 3 is replaced by the frame number 7, giving 0x7A7C.",
  },
  {
    q: "What does a TLB cache?",
    options: ["Recent page-to-frame translations", "Recently used disk blocks", "The most recent stack frames"],
    answer: 0,
    explain: "The TLB avoids a page-table walk for pages the program used a moment ago. It is why translation adds only a few percent to memory access time.",
  },
  {
    q: "A process touches a valid page that is currently on disk. What happens?",
    options: ["The process is killed", "A page fault: the kernel reads the page into a frame, fixes the table and retries", "The TLB loads the page from disk"],
    answer: 1,
    explain: "Not-present is a normal event, not an error. Only an access to an unmapped or forbidden address ends the process with a segmentation fault.",
  },
  {
    q: "A server slows to a crawl, CPU is low, and disk reads are at their limit. Memory use is at 100%. What is the most likely cause?",
    options: ["A lock is held too long", "Thrashing: the working set is bigger than RAM", "The TLB is too small"],
    answer: 1,
    explain: "Constant paging keeps the CPU idle, waiting for disk. Adding RAM, running fewer processes or shrinking the working set fixes it. A TLB miss costs nanoseconds, not disk time.",
  },
  {
    q: "A recursive function with no base case crashes with a stack overflow. Why does an object-heavy loop not crash the same way?",
    options: ["Each call frame goes on the stack, which is small and per-thread; objects go on the larger heap", "Objects are freed instantly", "The heap is checked at compile time"],
    answer: 0,
    explain: "Stack space is limited (often a few MB per thread) and every nested call consumes some. The heap can grow much larger, and when it runs out you get an out-of-memory error instead.",
  },
];
