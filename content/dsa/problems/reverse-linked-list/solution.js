function reverseList(head) {
  let prev = null; // head of the part that is already reversed
  let curr = head; // next node whose arrow gets flipped
  while (curr) {
    const next = curr.next; // save the rest of the list before overwriting the pointer
    curr.next = prev;       // flip the arrow
    prev = curr;
    curr = next;
  }
  return prev; // the old tail
}
