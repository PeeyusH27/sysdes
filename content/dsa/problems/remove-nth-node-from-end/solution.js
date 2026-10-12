function removeNthFromEnd(head, n) {
  const dummy = new ListNode(0, head); // lets us remove the head like any other node
  let fast = dummy;
  let slow = dummy;
  for (let i = 0; i <= n; i++) fast = fast.next; // fast is now n + 1 nodes ahead of slow
  while (fast) {
    fast = fast.next;
    slow = slow.next;
  }
  slow.next = slow.next.next; // slow is just before the node to remove
  return dummy.next;
}
