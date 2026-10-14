import java.util.Objects;

// Run from this folder:  javac -d /tmp/out *.java && java -cp /tmp/out ReturnUpTest
final class ReturnUpTest {
    public static void main(String[] args) {
        test("height counts nodes on the longest root-to-leaf path", ReturnUpTest::heights);
        test("isBalanced compares subtree heights at every node", ReturnUpTest::balanced);
        System.out.println(failed == 0 ? "All tests passed." : failed + " test(s) failed.");
        System.exit(failed == 0 ? 0 : 1);
    }

    static void heights() {
        eq(ReturnUp.height(Trees.fromArray(8, 3, 10, 1, 6, null, 14, null, null, 4, 7)), 4);
        eq(ReturnUp.height(Trees.fromArray(1, 2, null, 3, null, 4)), 4);
        eq(ReturnUp.height(Trees.fromArray(5)), 1);
        eq(ReturnUp.height(null), 0);
    }

    static void balanced() {
        eq(ReturnUp.isBalanced(Trees.fromArray(8, 3, 10, 1, 6, null, 14)), true);
        eq(ReturnUp.isBalanced(Trees.fromArray(1, 2, null, 3)), false);
        eq(ReturnUp.isBalanced(Trees.fromArray(1, 2, 2, 3, null, null, 3, 4, null, null, 4)), false);
        eq(ReturnUp.isBalanced(null), true);
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
