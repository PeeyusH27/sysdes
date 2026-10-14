import java.util.List;
import java.util.Objects;

// Run from this folder:  javac -d /tmp/out *.java && java -cp /tmp/out CarryDownTest
final class CarryDownTest {
    public static void main(String[] args) {
        test("goodNodes carries the path maximum down", CarryDownTest::good);
        test("rootToLeafPaths copies the path at each leaf", CarryDownTest::paths);
        System.out.println(failed == 0 ? "All tests passed." : failed + " test(s) failed.");
        System.exit(failed == 0 ? 0 : 1);
    }

    static void good() {
        eq(CarryDown.goodNodes(Trees.fromArray(5, 3, 8, 6, 2, 7, 9)), 4);
        eq(CarryDown.goodNodes(Trees.fromArray(2, 2, 2)), 3);
        eq(CarryDown.goodNodes(Trees.fromArray(-1, -5, -3)), 1);
        eq(CarryDown.goodNodes(null), 0);
    }

    static void paths() {
        eq(CarryDown.rootToLeafPaths(Trees.fromArray(1, 2, 3, null, 5)), List.of(List.of(1, 2, 5), List.of(1, 3)));
        eq(CarryDown.rootToLeafPaths(Trees.fromArray(7)), List.of(List.of(7)));
        eq(CarryDown.rootToLeafPaths(null), List.of());
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
