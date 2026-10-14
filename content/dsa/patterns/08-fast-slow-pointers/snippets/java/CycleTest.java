import java.util.Objects;

// Run from this folder:  javac -d /tmp/out *.java && java -cp /tmp/out CycleTest
final class CycleTest {
    public static void main(String[] args) {
        test("detects cycles of every shape", CycleTest::detects);
        test("finds the node where the cycle starts", CycleTest::finds);
        System.out.println(failed == 0 ? "All tests passed." : failed + " test(s) failed.");
        System.exit(failed == 0 ? 0 : 1);
    }

    static void detects() {
        eq(Cycle.hasCycle(Lists.fromArray(new int[] {3, 8, 5, 1, 9, 4, 7}, 2)), true);
        eq(Cycle.hasCycle(Lists.fromArray(new int[] {1}, 0)), true);
        eq(Cycle.hasCycle(Lists.fromArray(new int[] {1, 2, 3, 4}, 0)), true);
        eq(Cycle.hasCycle(Lists.fromArray(1, 2, 3, 4)), false);
        eq(Cycle.hasCycle(Lists.fromArray(5, 5, 5)), false);
        eq(Cycle.hasCycle(null), false);
    }

    static void finds() {
        int[][] values = {{3, 8, 5, 1, 9, 4, 7}, {1, 2}, {1, 2, 3, 4, 5, 6}, {1}, {10, 20, 30, 40, 50, 60, 70, 80, 90}};
        int[] pos = {2, 0, 5, 0, 1};
        for (int i = 0; i < values.length; i++) eq(Cycle.cycleStart(Lists.fromArray(values[i], pos[i])).val, values[i][pos[i]]);
        eq(Cycle.cycleStart(Lists.fromArray(1, 2, 3)), null);
        eq(Cycle.cycleStart(null), null);
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
