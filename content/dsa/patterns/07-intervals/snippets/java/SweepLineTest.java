import java.util.Objects;

// Run from this folder:  javac -d /tmp/out *.java && java -cp /tmp/out SweepLineTest
final class SweepLineTest {
    public static void main(String[] args) {
        test("counts the most intervals open at once", SweepLineTest::counts);
        test("back-to-back intervals do not overlap", SweepLineTest::backToBack);
        System.out.println(failed == 0 ? "All tests passed." : failed + " test(s) failed.");
        System.exit(failed == 0 ? 0 : 1);
    }

    static void counts() {
        eq(SweepLine.maxOverlap(new int[][] {{1, 5}, {2, 6}, {4, 8}, {6, 9}, {8, 10}}), 3);
        eq(SweepLine.maxOverlap(new int[][] {{1, 10}, {2, 9}, {3, 8}}), 3);
        eq(SweepLine.maxOverlap(new int[][] {}), 0);
    }

    static void backToBack() {
        eq(SweepLine.maxOverlap(new int[][] {{1, 3}, {3, 5}, {5, 7}}), 1);
        eq(SweepLine.maxOverlap(new int[][] {{3, 5}, {1, 3}}), 1);
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
