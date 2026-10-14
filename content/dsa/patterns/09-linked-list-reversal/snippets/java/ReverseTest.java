import java.util.List;
import java.util.Objects;

// Run from this folder:  javac -d /tmp/out *.java && java -cp /tmp/out ReverseTest
// Plain Java, no JUnit: each test is a method; main exits 1 if any check fails.
final class ReverseTest {
    public static void main(String[] args) {
        test("reverses lists of every length", ReverseTest::lengths);
        test("reuses the original nodes", ReverseTest::sameNodes);
        System.out.println(failed == 0 ? "All tests passed." : failed + " test(s) failed.");
        System.exit(failed == 0 ? 0 : 1);
    }

    static void lengths() {
        eq(Lists.toList(Reverse.reverseList(Lists.fromArray(1, 2, 3, 4, 5))), List.of(5, 4, 3, 2, 1));
        eq(Lists.toList(Reverse.reverseList(Lists.fromArray(1, 2))), List.of(2, 1));
        eq(Lists.toList(Reverse.reverseList(Lists.fromArray(7))), List.of(7));
        eq(Reverse.reverseList(null), null);
    }

    static void sameNodes() {
        ListNode head = Lists.fromArray(1, 2, 3);
        ListNode tail = head.next.next;
        same(Reverse.reverseList(head), tail);
        same(head.next, null);
    }

    static void same(Object actual, Object expected) {
        if (actual != expected) throw new AssertionError("expected the very same object");
    }

    private static int failed = 0;

    static void test(String name, Runnable body) {
        try {
            body.run();
            System.out.println("PASS  " + name);
        } catch (Throwable e) {
            failed++;
            System.out.println("FAIL  " + name + "\n      " + e);
        }
    }

    static void eq(Object actual, Object expected) {
        if (!Objects.equals(actual, expected)) throw new AssertionError("expected " + expected + ", got " + actual);
    }
}
