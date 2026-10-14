final class Reverse {
    // Template 1: reverse a list in place. prev heads the part that is already reversed; curr is the next node to flip.
    // Save curr.next BEFORE overwriting it, or the rest of the list is lost.
    static ListNode reverseList(ListNode head) {
        ListNode prev = null;
        ListNode curr = head;
        while (curr != null) {
            ListNode next = curr.next; // 1. save the rest
            curr.next = prev;          // 2. flip the arrow
            prev = curr;               // 3. move both pointers forward
            curr = next;
        }
        return prev;                   // the old tail is the new head
    }
}
