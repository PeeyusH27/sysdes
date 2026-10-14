import java.util.Arrays;

// Run from this folder:  javac -d /tmp/out *.java && java -cp /tmp/out OverlapTest
final class OverlapTest {
    public static void main(String[] args) {
        test("closed intervals overlap when they share a point", OverlapTest::closed);
        test("half-open meetings may be back to back", OverlapTest::halfOpen);
        test("intersection is the later start to the earlier end", OverlapTest::intersection);
        System.out.println(failed == 0 ? "All tests passed." : failed + " test(s) failed.");
        System.exit(failed == 0 ? 0 : 1);
    }

    static void closed() {
        eq(Overlap.overlaps(new int[] {1, 3}, new int[] {2, 5}), true);
        eq(Overlap.overlaps(new int[] {1, 3}, new int[] {3, 5}), true);
        eq(Overlap.overlaps(new int[] {1, 10}, new int[] {4, 6}), true);
        eq(Overlap.overlaps(new int[] {1, 2}, new int[] {3, 4}), false);
        eq(Overlap.overlaps(new int[] {5, 6}, new int[] {1, 2}), false);
    }

    static void halfOpen() {
        eq(Overlap.clashes(new int[] {1, 3}, new int[] {3, 5}), false);
        eq(Overlap.clashes(new int[] {1, 4}, new int[] {3, 5}), true);
        eq(Overlap.clashes(new int[] {2, 3}, new int[] {1, 9}), true);
    }

    static void intersection() {
        eq(Overlap.intersect(new int[] {0, 3}, new int[] {2, 7}), new int[] {2, 3});
        eq(Overlap.intersect(new int[] {1, 5}, new int[] {5, 10}), new int[] {5, 5});
        eq(Overlap.intersect(new int[] {1, 2}, new int[] {4, 6}), null);
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
        if (!Arrays.deepEquals(new Object[] {actual}, new Object[] {expected})) {
            throw new AssertionError("expected " + Arrays.deepToString(new Object[] {expected}) + ", got " + Arrays.deepToString(new Object[] {actual}));
        }
    }
}
