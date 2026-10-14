import java.util.function.IntUnaryOperator;

final class Sequence {
    // Where the repeating part starts, how many steps lead into it (tail) and how long it is.
    record Loop(int start, int tail, int length) {}

    // Template 3: a cycle in an implicit sequence x0, f(x0), f(f(x0)), ... Nothing is stored: f plays the role of node.next.
    static Loop floyd(IntUnaryOperator f, int x0) {
        int slow = x0;
        int fast = x0;
        do {                          // phase 1: meet somewhere inside the cycle
            slow = f.applyAsInt(slow);
            fast = f.applyAsInt(f.applyAsInt(fast));
        } while (slow != fast);
        int entry = x0;               // phase 2: equal distances lead to the start of the cycle
        int tail = 0;
        while (entry != slow) {
            entry = f.applyAsInt(entry);
            slow = f.applyAsInt(slow);
            tail++;
        }
        int length = 1;               // phase 3: walk once around the cycle
        for (int x = f.applyAsInt(entry); x != entry; x = f.applyAsInt(x)) length++;
        return new Loop(entry, tail, length);
    }
}
