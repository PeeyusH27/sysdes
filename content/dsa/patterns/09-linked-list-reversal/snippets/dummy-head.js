import { ListNode } from './list.js';

// Template 2: a dummy node in front of the head, so the head can be removed or replaced like any other node.
export function removeAll(head, value) {
  const dummy = new ListNode(0, head);
  let prev = dummy;
  while (prev.next) {
    if (prev.next.val === value) prev.next = prev.next.next; // unlink; don't move: the new prev.next is unchecked
    else prev = prev.next;
  }
  return dummy.next; // may not be the old head any more
}

// Building a list: with a dummy and a tail pointer, appending never needs a special case for the first node.
export function mergeSorted(a, b) {
  const dummy = new ListNode();
  let tail = dummy;
  while (a && b) {
    if (a.val <= b.val) {
      tail.next = a;
      a = a.next;
    } else {
      tail.next = b;
      b = b.next;
    }
    tail = tail.next;
  }
  tail.next = a ?? b; // the rest of the other list is already sorted
  return dummy.next;
}
