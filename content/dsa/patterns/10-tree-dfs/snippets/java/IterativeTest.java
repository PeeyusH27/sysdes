import java.util.List;
import java.util.Objects;

// Run from this folder:  javac -d /tmp/out *.java && java -cp /tmp/out IterativeTest
final class IterativeTest {
    public static void main(String[] args) {
        test("iterative orders match the recursive ones", IterativeTest::matchRecursive);
        test("in-order of a BST is sorted", IterativeTest::sorted);
        System.out.println(failed == 0 ? "All tests passed." : failed + " test(s) failed.");
        System.exit(failed == 0 ? 0 : 1);
    }

    static final Integer[][] SHAPES = {
        {8, 3, 10, 1, 6, null, 14, null, null, 4, 7, 13}, {1, 2, null, 3, null, 4}, {1, null, 2, null, 3}, {5}, {},
    };

    static void matchRecursive() {
        for (Integer[] shape : SHAPES) {
            Orders.Result expected = Orders.traversals(Trees.fromArray(shape));
            eq(Iterative.preorderIterative(Trees.fromArray(shape)), expected.pre());
            eq(Iterative.inorderIterative(Trees.fromArray(shape)), expected.inorder());
            eq(Iterative.postorderIterative(Trees.fromArray(shape)), expected.post());
        }
    }

    static void sorted() {
        eq(Iterative.inorderIterative(Trees.fromArray(6, 3, 9, 1, 4, 8, 10)), List.of(1, 3, 4, 6, 8, 9, 10));
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
