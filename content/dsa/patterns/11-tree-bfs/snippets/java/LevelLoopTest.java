import java.util.List;
import java.util.Objects;

// Run from this folder:  javac -d /tmp/out *.java && java -cp /tmp/out LevelLoopTest
// Plain Java, no JUnit: each test is a method; main exits 1 if any check fails.
final class LevelLoopTest {
    public static void main(String[] args) {
        test("levelMaxes keeps one value per level", LevelLoopTest::maxes);
        test("levelValues groups values level by level, left to right", LevelLoopTest::values);
        System.out.println(failed == 0 ? "All tests passed." : failed + " test(s) failed.");
        System.exit(failed == 0 ? 0 : 1);
    }

    static void maxes() {
        eq(LevelLoop.levelMaxes(Trees.fromArray(1, 3, 2, 5, 3, null, 9)), List.of(1, 3, 9));
        eq(LevelLoop.levelMaxes(Trees.fromArray(-4, -7, -2)), List.of(-4, -2));
        eq(LevelLoop.levelMaxes(Trees.fromArray(1, 2, null, 3)), List.of(1, 2, 3));
        eq(LevelLoop.levelMaxes(null), List.of());
    }

    static void values() {
        eq(LevelLoop.levelValues(Trees.fromArray(8, 3, 10, 1, 6, null, 14, null, null, 4, 7)), List.of(List.of(8), List.of(3, 10), List.of(1, 6, 14), List.of(4, 7)));
        eq(LevelLoop.levelValues(Trees.fromArray(5)), List.of(List.of(5)));
        eq(LevelLoop.levelValues(null), List.of());
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
