import java.util.Arrays;

// Tiny test helper (plain Java, no JUnit): each test prints PASS or FAIL; done() exits 1 if any failed.
final class Check {
    private static int failed = 0;

    static void test(String name, Runnable body) {
        try {
            body.run();
            System.out.println("PASS " + name);
        } catch (Throwable e) {
            failed++;
            System.out.println("FAIL " + name + ": " + e.getMessage());
        }
    }

    /** Deep equality, so int[] and int[][] compare by content. */
    static void eq(Object actual, Object expected) {
        if (!Arrays.deepEquals(new Object[] {actual}, new Object[] {expected})) {
            throw new AssertionError("expected " + Arrays.deepToString(new Object[] {expected})
                    + " but got " + Arrays.deepToString(new Object[] {actual}));
        }
    }

    static void done() {
        System.out.println(failed == 0 ? "All tests passed." : failed + " test(s) failed.");
        System.exit(failed == 0 ? 0 : 1);
    }
}
