import java.util.List;
import java.util.Objects;

// Run from this folder:  javac -d /tmp/out *.java && java -cp /tmp/out MiddleTest
// Plain Java, no JUnit: each test is a method; main exits 1 if any check fails.
final class MiddleTest {
    public static void main(String[] args) {
        test("middleNode returns the middle, or the second middle on even lengths", MiddleTest::middle);
        test("endOfFirstHalf stops on the first middle", MiddleTest::firstHalf);
        System.out.println(failed == 0 ? "All tests passed." : failed + " test(s) failed.");
        System.exit(failed == 0 ? 0 : 1);
    }

    static void middle() {
        eq(Lists.toList(Middle.middleNode(Lists.fromArray(1, 2, 3, 4, 5))), List.of(3, 4, 5));
        eq(Lists.toList(Middle.middleNode(Lists.fromArray(1, 2, 3, 4, 5, 6))), List.of(4, 5, 6));
        eq(Lists.toList(Middle.middleNode(Lists.fromArray(7))), List.of(7));
        eq(Lists.toList(Middle.middleNode(Lists.fromArray(1, 2))), List.of(2));
        eq(Middle.middleNode(null), null);
    }

    static void firstHalf() {
        eq(Middle.endOfFirstHalf(Lists.fromArray(1, 2, 3, 4, 5)).val, 3);
        eq(Middle.endOfFirstHalf(Lists.fromArray(1, 2, 3, 4, 5, 6)).val, 3);
        eq(Middle.endOfFirstHalf(Lists.fromArray(1, 2)).val, 1);
        eq(Middle.endOfFirstHalf(Lists.fromArray(9)).val, 9);
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
