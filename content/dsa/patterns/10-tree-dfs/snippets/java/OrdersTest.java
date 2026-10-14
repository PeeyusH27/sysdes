import java.util.List;
import java.util.Objects;

// Run from this folder:  javac -d /tmp/out *.java && java -cp /tmp/out OrdersTest
final class OrdersTest {
    public static void main(String[] args) {
        test("pre-, in- and post-order of a small BST", OrdersTest::small);
        test("empty tree and single node", OrdersTest::edges);
        System.out.println(failed == 0 ? "All tests passed." : failed + " test(s) failed.");
        System.exit(failed == 0 ? 0 : 1);
    }

    static void small() {
        Orders.Result r = Orders.traversals(Trees.fromArray(8, 3, 10, 1, 6, null, 14));
        eq(r.pre(), List.of(8, 3, 1, 6, 10, 14));
        eq(r.inorder(), List.of(1, 3, 6, 8, 10, 14));
        eq(r.post(), List.of(1, 6, 3, 14, 10, 8));
    }

    static void edges() {
        eq(Orders.traversals(null), new Orders.Result(List.of(), List.of(), List.of()));
        eq(Orders.traversals(Trees.fromArray(5)), new Orders.Result(List.of(5), List.of(5), List.of(5)));
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
