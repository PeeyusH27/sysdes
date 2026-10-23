import type { SequenceSpec, TimelineSpec } from "@/components/diagram/types";

export const roundRobin: TimelineSpec = {
  id: "round-robin",
  title: "Round robin with a 4 ms quantum: A needs 24 ms, B and C need 3 ms each",
  description: "A runs for 4 ms, then B and C each finish within their first turn, then A runs alone to the end. B and C wait 4 and 7 ms instead of 24 and 27.",
  unit: "ms",
  lanes: [
    { id: "a", label: "Job A (24)" },
    { id: "b", label: "Job B (3)" },
    { id: "c", label: "Job C (3)" },
  ],
  spans: [
    { lane: "a", start: 0, end: 4, label: "A", tone: 1 },
    { lane: "b", start: 4, end: 7, label: "B done", tone: 2 },
    { lane: "c", start: 7, end: 10, label: "C done", tone: 3 },
    { lane: "a", start: 10, end: 30, label: "A runs alone", tone: 1 },
  ],
  markers: [{ at: 4, label: "quantum ends" }],
};

export const translation: SequenceSpec = {
  id: "translation",
  title: "Translating one virtual address",
  description: "The CPU asks the TLB first. On a hit the physical address is ready at once. On a miss the hardware walks the page table. If the page is not in RAM, the kernel handles a page fault.",
  actors: [
    { id: "cpu", label: "CPU", kind: "client" },
    { id: "tlb", label: "TLB", kind: "cache" },
    { id: "pt", label: "Page table", kind: "database" },
    { id: "ram", label: "RAM", kind: "storage" },
    { id: "disk", label: "Disk", kind: "external" },
  ],
  items: [
    { from: "cpu", to: "tlb", label: "page 3, offset 0xA7C?", type: "call" },
    {
      alt: [
        {
          when: "TLB hit",
          items: [
            { from: "tlb", to: "cpu", label: "frame 7 (about 1 ns)", type: "reply" },
            { from: "cpu", to: "ram", label: "read 0x7A7C", type: "call" },
          ],
        },
        {
          when: "TLB miss",
          items: [
            { from: "tlb", to: "pt", label: "miss: walk the table", type: "call" },
            { from: "pt", to: "tlb", label: "frame 7, cache it", type: "reply" },
            { from: "tlb", to: "cpu", label: "frame 7", type: "reply" },
            { from: "cpu", to: "ram", label: "read 0x7A7C", type: "call" },
          ],
        },
        {
          when: "Page fault",
          items: [
            { from: "tlb", to: "pt", label: "miss: walk the table", type: "call" },
            { from: "pt", to: "cpu", label: "not present: trap to kernel", type: "reply" },
            { from: "cpu", to: "disk", label: "kernel reads the page in", type: "call" },
            { from: "disk", to: "ram", label: "page into a free frame (milliseconds)", type: "reply" },
            { note: "Kernel updates the page table and retries the instruction", over: ["pt", "cpu"] },
          ],
        },
      ],
    },
  ],
};
