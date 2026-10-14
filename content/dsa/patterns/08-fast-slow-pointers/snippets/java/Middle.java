final class Middle {
    // Template 1: find the middle. fast moves two nodes for every one that slow moves,
    // so slow is half way along when fast runs out of list.
    static ListNode middleNode(ListNode head) {
        ListNode slow = head;
        ListNode fast = head;
        while (fast != null && fast.next != null) { // even length: slow ends on the second middle
            slow = slow.next;
            fast = fast.next.next;
        }
        return slow;
    }

    // Variant for splitting a non-empty list: the last node of the first half (the first middle on even lengths).
    static ListNode endOfFirstHalf(ListNode head) {
        ListNode slow = head;
        ListNode fast = head;
        while (fast.next != null && fast.next.next != null) {
            slow = slow.next;
            fast = fast.next.next;
        }
        return slow;
    }
}
