import java.util.Arrays;

// Run from this folder:  javac -d /tmp/out *.java && java -cp /tmp/out MergeTest
// Plain Java, no JUnit: each test is a method; main exits 1 if any check fails.
final class MergeTest {
    public static void main(String[] args) {
        test("merges overlapping, touching and nested intervals", MergeTest::merges);
        test("does not reorder the caller's array", MergeTest::keepsOrder);
        test("covered length counts shared parts once", MergeTest::covered);
        System.out.println(failed == 0 ? "All tests passed." : failed + " test(s) failed.");
        System.exit(failed == 0 ? 0 : 1);
    }

    static void merges() {
        eq(Merge.mergeIntervals(new int[][] {{7, 8}, {2, 4}, {10, 11}, {1, 3}, {4, 5}}), new int[][] {{1, 5}, {7, 8}, {10, 11}});
        eq(Merge.mergeIntervals(new int[][] {{4, 8}, {1, 10}, {10, 11}, {2, 3}}), new int[][] {{1, 11}});
        eq(Merge.mergeIntervals(new int[][] {{1, 2}, {3, 4}}), new int[][] {{1, 2}, {3, 4}});
        eq(Merge.mergeIntervals(new int[][] {}), new int[][] {});
    }

    static void keepsOrder() {
        int[][] input = {{5, 6}, {1, 2}};
        Merge.mergeIntervals(input);
        eq(input, new int[][] {{5, 6}, {1, 2}});
    }

    static void covered() {
        eq(Merge.coveredLength(new int[][] {{1, 4}, {2, 6}, {8, 9}}), 6);
        eq(Merge.coveredLength(new int[][] {{0, 10}, {2, 3}}), 10);
        eq(Merge.coveredLength(new int[][] {}), 0);
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
