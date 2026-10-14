final class DummyHead {
    // Template 2: a dummy node in front of the head, so the head can be removed or replaced like any other node.
    static ListNode removeAll(ListNode head, int value) {
        ListNode dummy = new ListNode(0, head);
        ListNode prev = dummy;
        while (prev.next != null) {
            if (prev.next.val == value) prev.next = prev.next.next; // unlink; don't move: the new prev.next is unchecked
            else prev = prev.next;
        }
        return dummy.next; // may not be the old head any more
    }

    // Building a list: with a dummy and a tail pointer, appending never needs a special case for the first node.
    static ListNode mergeSorted(ListNode a, ListNode b) {
        ListNode dummy = new ListNode();
        ListNode tail = dummy;
        while (a != null && b != null) {
            if (a.val <= b.val) {
                tail.next = a;
                a = a.next;
            } else {
                tail.next = b;
                b = b.next;
            }
            tail = tail.next;
        }
        tail.next = a != null ? a : b; // the rest of the other list is already sorted
        return dummy.next;
    }
}
