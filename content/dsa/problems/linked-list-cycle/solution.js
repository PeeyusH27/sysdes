function hasCycle(head) {
  let slow = head;
  let fast = head;
  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;
    if (slow === fast) return true; // same node object, not just the same value
  }
  return false; // fast reached the end, so there is no loop
}
