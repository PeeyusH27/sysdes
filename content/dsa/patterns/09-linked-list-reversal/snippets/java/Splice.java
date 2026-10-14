final class Splice {
    // Template 3: reverse the k nodes after `before` (they must exist) and splice them back into place.
    // Returns the segment's new last node, which is the `before` of whatever comes next.
    static ListNode reverseAfter(ListNode before, int k) {
        ListNode first = before.next; // will become the segment's last node
        ListNode prev = null;
        ListNode curr = first;
        for (int i = 0; i < k; i++) {
            ListNode next = curr.next;
            curr.next = prev;
            prev = curr;
            curr = next;
        }
        before.next = prev; // before -> the segment's new first node
        first.next = curr;  // the segment's new last node -> the rest of the list
        return first;
    }

    // Example: swap every two adjacent nodes, which is "reverse in groups of 2".
    static ListNode swapPairs(ListNode head) {
        ListNode dummy = new ListNode(0, head);
        ListNode before = dummy;
        while (before.next != null && before.next.next != null) before = reverseAfter(before, 2);
        return dummy.next;
    }
}
