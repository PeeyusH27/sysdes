import java.util.Objects;

// Run from this folder:  javac -d /tmp/out *.java && java -cp /tmp/out BstTest
final class BstTest {
    public static void main(String[] args) {
        test("rangeSum adds only values inside [low, high]", BstTest::range);
        test("searchBST follows one branch", BstTest::search);
        System.out.println(failed == 0 ? "All tests passed." : failed + " test(s) failed.");
        System.exit(failed == 0 ? 0 : 1);
    }

    static TreeNode bst() {
        return Trees.fromArray(8, 3, 10, 1, 6, null, 14, null, null, 4, 7, 13);
    }

    static void range() {
        eq(Bst.rangeSum(bst(), 4, 10), 4 + 6 + 7 + 8 + 10);
        eq(Bst.rangeSum(bst(), 15, 20), 0);
        eq(Bst.rangeSum(null, 0, 5), 0);
    }

    static void search() {
        eq(Bst.searchBST(bst(), 7).val, 7);
        eq(Bst.searchBST(bst(), 13).val, 13);
        eq(Bst.searchBST(bst(), 5), null);
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
