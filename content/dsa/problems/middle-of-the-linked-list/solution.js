function middleNode(head) {
  let slow = head;
  let fast = head;
  // fast moves twice as far as slow, so slow is half way when fast runs out of list.
  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;
  }
  return slow;
}
