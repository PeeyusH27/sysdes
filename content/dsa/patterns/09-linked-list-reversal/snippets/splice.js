import { ListNode } from './list.js';

// Template 3: reverse the k nodes after `before` (they must exist) and splice them back into place.
// Returns the segment's new last node, which is the `before` of whatever comes next.
export function reverseAfter(before, k) {
  const first = before.next; // will become the segment's last node
  let prev = null;
  let curr = first;
  for (let i = 0; i < k; i++) {
    const next = curr.next;
    curr.next = prev;
    prev = curr;
    curr = next;
  }
  before.next = prev; // before → the segment's new first node
  first.next = curr;  // the segment's new last node → the rest of the list
  return first;
}

// Example: swap every two adjacent nodes, which is "reverse in groups of 2".
export function swapPairs(head) {
  const dummy = new ListNode(0, head);
  let before = dummy;
  while (before.next && before.next.next) before = reverseAfter(before, 2);
  return dummy.next;
}
