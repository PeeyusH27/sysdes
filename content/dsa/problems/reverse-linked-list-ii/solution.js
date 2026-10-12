function reverseBetween(head, left, right) {
  const dummy = new ListNode(0, head); // so that left = 1 also has a node in front of it
  let before = dummy;
  for (let i = 1; i < left; i++) before = before.next;

  // Reverse right - left + 1 nodes, starting at position left.
  let prev = null;
  let curr = before.next;
  for (let i = left; i <= right; i++) {
    const next = curr.next;
    curr.next = prev;
    prev = curr;
    curr = next;
  }

  // before.next is still the segment's old first node, which is now its last node.
  before.next.next = curr; // old first node → the node after the segment
  before.next = prev;      // before → the segment's new first node
  return dummy.next;
}
