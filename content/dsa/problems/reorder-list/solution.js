function reorderList(head) {
  if (!head) return;

  // 1. Find the last node of the first half (the first half keeps the extra node when the length is odd).
  let slow = head;
  let fast = head;
  while (fast.next && fast.next.next) {
    slow = slow.next;
    fast = fast.next.next;
  }

  // 2. Cut after it and reverse the second half.
  let prev = null;
  let curr = slow.next;
  slow.next = null;
  while (curr) {
    const next = curr.next;
    curr.next = prev;
    prev = curr;
    curr = next;
  }

  // 3. Weave: one node from the front half, one from the reversed back half.
  let a = head;
  let b = prev;
  while (b) {
    const aNext = a.next; // save both successors before rewiring
    const bNext = b.next;
    a.next = b;
    b.next = aNext;
    a = aNext;
    b = bNext;
  }
}
