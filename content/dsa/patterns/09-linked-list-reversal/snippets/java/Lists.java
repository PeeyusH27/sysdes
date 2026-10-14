import java.util.ArrayList;
import java.util.List;

// Helpers so the templates run on their own (the same ListNode the problems give you).
class ListNode {
    int val;
    ListNode next;

    ListNode() {}

    ListNode(int val) { this.val = val; }

    ListNode(int val, ListNode next) {
        this.val = val;
        this.next = next;
    }
}

final class Lists {
    static ListNode fromArray(int... values) {
        ListNode dummy = new ListNode();
        ListNode tail = dummy;
        for (int val : values) {
            tail.next = new ListNode(val);
            tail = tail.next;
        }
        return dummy.next;
    }

    static List<Integer> toList(ListNode head) {
        List<Integer> out = new ArrayList<>();
        for (ListNode node = head; node != null; node = node.next) out.add(node.val);
        return out;
    }
}
