import java.util.Objects;

// Run from this folder:  javac -d /tmp/out *.java && java -cp /tmp/out TreesTest
// Plain Java, no JUnit: each test is a method; main exits 1 if any check fails.
final class TreesTest {
    public static void main(String[] args) {
        test("builds a tree from level order with nulls", TreesTest::builds);
        test("empty input gives null", TreesTest::empty);
        System.out.println(failed == 0 ? "All tests passed." : failed + " test(s) failed.");
        System.exit(failed == 0 ? 0 : 1);
    }

    static void builds() {
        TreeNode root = Trees.fromArray(8, 3, 10, null, 6, null, 14);
        eq(root.val, 8);
        eq(root.left.left, null);
        eq(root.left.right.val, 6);
        eq(root.right.right.val, 14);
    }

    static void empty() {
        eq(Trees.fromArray(), null);
        eq(Trees.fromArray((Integer) null), null);
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
