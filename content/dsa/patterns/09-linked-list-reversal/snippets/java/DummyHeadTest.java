import java.util.List;
import java.util.Objects;

// Run from this folder:  javac -d /tmp/out *.java && java -cp /tmp/out DummyHeadTest
final class DummyHeadTest {
    public static void main(String[] args) {
        test("removeAll handles the head, runs and the tail", DummyHeadTest::removeAll);
        test("mergeSorted splices two sorted lists", DummyHeadTest::mergeSorted);
        System.out.println(failed == 0 ? "All tests passed." : failed + " test(s) failed.");
        System.exit(failed == 0 ? 0 : 1);
    }

    static void removeAll() {
        eq(Lists.toList(DummyHead.removeAll(Lists.fromArray(6, 1, 6, 6, 2, 6), 6)), List.of(1, 2));
        eq(Lists.toList(DummyHead.removeAll(Lists.fromArray(6, 6), 6)), List.of());
        eq(Lists.toList(DummyHead.removeAll(Lists.fromArray(1, 2, 3), 9)), List.of(1, 2, 3));
        eq(DummyHead.removeAll(null, 1), null);
    }

    static void mergeSorted() {
        eq(Lists.toList(DummyHead.mergeSorted(Lists.fromArray(1, 4, 9), Lists.fromArray(2, 3, 10))), List.of(1, 2, 3, 4, 9, 10));
        eq(Lists.toList(DummyHead.mergeSorted(null, Lists.fromArray(0))), List.of(0));
        eq(DummyHead.mergeSorted(null, null), null);
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
