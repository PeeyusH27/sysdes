final class Weave {
    // Template 4: interleave two lists in place, a1 -> b1 -> a2 -> b2 -> ...
    // Save BOTH successors before rewiring; whichever list is longer keeps its leftover nodes at the end.
    static ListNode weave(ListNode a, ListNode b) {
        ListNode head = a;
        while (a != null && b != null) {
            ListNode aNext = a.next;
            ListNode bNext = b.next;
            a.next = b;
            b.next = aNext != null ? aNext : bNext; // if a has run out, b keeps the rest of its own list
            a = aNext;
            b = bNext;
        }
        return head;
    }

    // The combo: L0 -> Ln -> L1 -> Ln-1 -> ... in place. Find the middle, cut, reverse the back half, weave.
    static ListNode fold(ListNode head) {
        if (head == null) return head;
        ListNode slow = head;
        ListNode fast = head;
        while (fast.next != null && fast.next.next != null) { // slow ends on the last node of the front half
            slow = slow.next;
            fast = fast.next.next;
        }
        ListNode back = Reverse.reverseList(slow.next);
        slow.next = null; // cut, or the front half still runs into the back half
        return weave(head, back);
    }
}
