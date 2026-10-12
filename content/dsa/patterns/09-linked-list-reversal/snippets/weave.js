import { reverseList } from './reverse.js';

// Template 4: interleave two lists in place, a1 → b1 → a2 → b2 → …
// Save BOTH successors before rewiring; whichever list is longer keeps its leftover nodes at the end.
export function weave(a, b) {
  const head = a;
  while (a && b) {
    const aNext = a.next;
    const bNext = b.next;
    a.next = b;
    b.next = aNext ?? bNext; // if a has run out, b keeps the rest of its own list
    a = aNext;
    b = bNext;
  }
  return head;
}

// The combo: L0 → Ln → L1 → Ln-1 → … in place. Find the middle, cut, reverse the back half, weave.
export function fold(head) {
  if (!head) return head;
  let slow = head;
  let fast = head;
  while (fast.next && fast.next.next) { // slow ends on the last node of the front half
    slow = slow.next;
    fast = fast.next.next;
  }
  const back = reverseList(slow.next);
  slow.next = null; // cut, or the front half still runs into the back half
  return weave(head, back);
}
