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
    // fromArray(values, pos) links the tail back to index pos to make a cycle (pos = -1: no cycle).
    static ListNode fromArray(int[] values, int pos) {
        ListNode[] nodes = new ListNode[values.length];
        for (int i = 0; i < values.length; i++) nodes[i] = new ListNode(values[i]);
        for (int i = 0; i + 1 < nodes.length; i++) nodes[i].next = nodes[i + 1];
        if (pos >= 0 && nodes.length > 0) nodes[nodes.length - 1].next = nodes[pos];
        return nodes.length > 0 ? nodes[0] : null;
    }

    static ListNode fromArray(int... values) {
        return fromArray(values, -1);
    }

    // Reads at most `limit` values, so a cyclic list can't loop forever.
    static List<Integer> toList(ListNode head, int limit) {
        List<Integer> out = new ArrayList<>();
        for (ListNode node = head; node != null && out.size() < limit; node = node.next) out.add(node.val);
        return out;
    }

    static List<Integer> toList(ListNode head) {
        return toList(head, 50);
    }
}
