final class Cycle {
    // Template 2: Floyd's cycle detection. Inside a loop, fast gains exactly one node per step on slow,
    // so it can't jump over it: they meet. Without a loop, fast falls off the end.
    static boolean hasCycle(ListNode head) {
        ListNode slow = head;
        ListNode fast = head;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
            if (slow == fast) return true; // the same node (==), not just an equal value
        }
        return false;
    }

    // Phase 2: the head and the meeting point are equally far from the cycle's entry (up to whole laps),
    // so two pointers moving one step at a time from those two places meet exactly at the entry.
    static ListNode cycleStart(ListNode head) {
        ListNode slow = head;
        ListNode fast = head;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
            if (slow == fast) {
                ListNode entry = head;
                while (entry != slow) {
                    entry = entry.next;
                    slow = slow.next;
                }
                return entry;
            }
        }
        return null;
    }
}
