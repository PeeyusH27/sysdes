import java.util.Objects;

// Run from this folder:  javac -d /tmp/out *.java && java -cp /tmp/out GlobalBestTest
final class GlobalBestTest {
    public static void main(String[] args) {
        test("finds a path that bends below the root", GlobalBestTest::bends);
        test("a path of one node has no edges", GlobalBestTest::single);
        System.out.println(failed == 0 ? "All tests passed." : failed + " test(s) failed.");
        System.exit(failed == 0 ? 0 : 1);
    }

    static void bends() {
        eq(GlobalBest.longestUnivaluePath(Trees.fromArray(1, 4, 5, 4, 4, 5)), 2);
        eq(GlobalBest.longestUnivaluePath(Trees.fromArray(2, 7, 2, 7, 7, null, 2)), 2);
        eq(GlobalBest.longestUnivaluePath(Trees.fromArray(3, 3, 3, 3, null, null, 3)), 4);
    }

    static void single() {
        eq(GlobalBest.longestUnivaluePath(Trees.fromArray(1, 2, 3)), 0);
        eq(GlobalBest.longestUnivaluePath(null), 0);
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
