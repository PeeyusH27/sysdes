function reverseKGroup(head, k) {
  const dummy = new ListNode(0, head);
  let before = dummy; // the node just in front of the current group
  while (true) {
    // Only reverse a full group: a shorter final group stays as it is.
    let probe = before;
    for (let i = 0; i < k; i++) {
      probe = probe.next;
      if (!probe) return dummy.next;
    }

    const first = before.next; // will become the group's last node
    let prev = null;
    let curr = first;
    for (let i = 0; i < k; i++) {
      const next = curr.next;
      curr.next = prev;
      prev = curr;
      curr = next;
    }

    before.next = prev; // before → the group's new first node
    first.next = curr;  // the group's new last node → the next group
    before = first;
  }
}
