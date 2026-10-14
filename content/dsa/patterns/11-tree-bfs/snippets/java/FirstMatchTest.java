import java.util.Objects;

// Run from this folder:  javac -d /tmp/out *.java && java -cp /tmp/out FirstMatchTest
final class FirstMatchTest {
    public static void main(String[] args) {
        test("the first leaf BFS meets is the shallowest leaf", FirstMatchTest::leaves);
        test("any predicate works, and no match gives -1", FirstMatchTest::predicates);
        System.out.println(failed == 0 ? "All tests passed." : failed + " test(s) failed.");
        System.exit(failed == 0 ? 0 : 1);
    }

    static void leaves() {
        eq(FirstMatch.shallowestDepth(Trees.fromArray(1, 2, 3, 4, 5, null, null, 6, 7), FirstMatch::isLeaf), 2);
        eq(FirstMatch.shallowestDepth(Trees.fromArray(1, null, 2, null, 3), FirstMatch::isLeaf), 3);
        eq(FirstMatch.shallowestDepth(Trees.fromArray(1), FirstMatch::isLeaf), 1);
    }

    static void predicates() {
        TreeNode root = Trees.fromArray(5, 8, 2, 1, 9, 9);
        eq(FirstMatch.shallowestDepth(root, n -> n.val == 9), 3);
        eq(FirstMatch.shallowestDepth(root, n -> n.val > 100), -1);
        eq(FirstMatch.shallowestDepth(null, FirstMatch::isLeaf), -1);
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
