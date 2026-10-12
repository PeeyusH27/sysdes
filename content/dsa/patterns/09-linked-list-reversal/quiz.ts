import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "Inside the reversal loop, which statement must run first?",
    options: ["curr.next = prev", "const next = curr.next", "prev = curr"],
    answer: 1,
    explain: "curr.next is the only link to the rest of the list. Once it is pointed back at prev, the rest is unreachable unless it was saved in next first.",
  },
  {
    q: "Why do merge and removal solutions often start with const dummy = new ListNode(0, head)?",
    options: [
      "It makes the algorithm faster than O(n)",
      "The head gets a predecessor, so removing or replacing it is the same code as for any other node",
      "JavaScript requires a node before the head to modify a list",
    ],
    answer: 1,
    explain: "Without a dummy, deleting or replacing the head needs its own branch. With one, every real node has a node before it, and the answer is simply dummy.next.",
  },
  {
    q: "You reversed the k nodes after node before with prev/curr/next. Which two links still need fixing?",
    options: [
      "before.next must point at prev, and the old first node of the segment must point at curr",
      "prev.next must point at before, and curr.next must point at the old first node",
      "Nothing: the reversal loop already reconnected the segment",
    ],
    answer: 0,
    explain: "before still points at the segment's old first node, which is now its last node and points at null. Set before.next = prev (the new first node) and first.next = curr (the node after the segment).",
  },
];
