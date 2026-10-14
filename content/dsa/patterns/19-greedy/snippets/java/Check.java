import java.util.Arrays;
import java.util.Objects;

// A tiny test helper (no JUnit): test() runs a named check, eq() compares values deeply.
// Run from this folder:  javac -d /tmp/out *.java && java -cp /tmp/out <Name>Test
final class Check {
    interface Body { void run() throws Exception; }

    private static int failed = 0;

    static void test(String name, Body body) {
        try {
            body.run();
            System.out.println("PASS " + name);
        } catch (Throwable e) {
            failed++;
            System.out.println("FAIL " + name + ": " + e);
        }
    }

    static void eq(Object expected, Object actual) {
        if (!Objects.deepEquals(expected, actual)) {
            throw new AssertionError("expected " + show(expected) + " but got " + show(actual));
        }
    }

    static void isTrue(boolean condition) {
        if (!condition) throw new AssertionError("expected true");
    }

    private static String show(Object o) {
        return o instanceof Object[] a ? Arrays.deepToString(a)
             : o instanceof int[] a ? Arrays.toString(a)
             : o instanceof long[] a ? Arrays.toString(a)
             : String.valueOf(o);
    }

    /** Call last: prints the summary and sets the exit code. */
    static void finish() {
        System.out.println(failed == 0 ? "All tests passed." : failed + " test(s) failed.");
        System.exit(failed == 0 ? 0 : 1);
    }
}
