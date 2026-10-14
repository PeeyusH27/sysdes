import java.util.List;
import java.util.Objects;

// Run from this folder:  javac -d /tmp/out *.java && java -cp /tmp/out SpliceTest
final class SpliceTest {
    public static void main(String[] args) {
        test("reverseAfter reverses a middle segment and returns its new tail", SpliceTest::middle);
        test("reverseAfter on the dummy changes the head", SpliceTest::onDummy);
        test("swapPairs reverses groups of two and leaves an odd node alone", SpliceTest::pairs);
        System.out.println(failed == 0 ? "All tests passed." : failed + " test(s) failed.");
        System.exit(failed == 0 ? 0 : 1);
    }

    static void middle() {
        ListNode dummy = new ListNode(0, Lists.fromArray(1, 2, 3, 4, 5, 6));
        ListNode tail = Splice.reverseAfter(dummy.next.next, 3);
        eq(Lists.toList(dummy.next), List.of(1, 2, 5, 4, 3, 6));
        eq(tail.val, 3);
    }

    static void onDummy() {
        ListNode dummy = new ListNode(0, Lists.fromArray(1, 2, 3, 4));
        Splice.reverseAfter(dummy, 4);
        eq(Lists.toList(dummy.next), List.of(4, 3, 2, 1));
    }

    static void pairs() {
        eq(Lists.toList(Splice.swapPairs(Lists.fromArray(1, 2, 3, 4, 5))), List.of(2, 1, 4, 3, 5));
        eq(Lists.toList(Splice.swapPairs(Lists.fromArray(1, 2, 3, 4))), List.of(2, 1, 4, 3));
        eq(Lists.toList(Splice.swapPairs(Lists.fromArray(1))), List.of(1));
        eq(Splice.swapPairs(null), null);
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
