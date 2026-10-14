import java.util.List;
import java.util.Objects;

// Run from this folder:  javac -d /tmp/out *.java && java -cp /tmp/out WeaveTest
final class WeaveTest {
    public static void main(String[] args) {
        test("weave alternates nodes and keeps leftovers", WeaveTest::weave);
        test("fold takes from the front and the back in turn", WeaveTest::fold);
        System.out.println(failed == 0 ? "All tests passed." : failed + " test(s) failed.");
        System.exit(failed == 0 ? 0 : 1);
    }

    static void weave() {
        eq(Lists.toList(Weave.weave(Lists.fromArray(1, 2, 3), Lists.fromArray(6, 5, 4))), List.of(1, 6, 2, 5, 3, 4));
        eq(Lists.toList(Weave.weave(Lists.fromArray(1, 2, 3), Lists.fromArray(9))), List.of(1, 9, 2, 3));
        eq(Lists.toList(Weave.weave(Lists.fromArray(1), Lists.fromArray(7, 8, 9))), List.of(1, 7, 8, 9));
        eq(Lists.toList(Weave.weave(Lists.fromArray(1, 2), null)), List.of(1, 2));
    }

    static void fold() {
        eq(Lists.toList(Weave.fold(Lists.fromArray(1, 2, 3, 4, 5, 6))), List.of(1, 6, 2, 5, 3, 4));
        eq(Lists.toList(Weave.fold(Lists.fromArray(1, 2, 3, 4, 5))), List.of(1, 5, 2, 4, 3));
        eq(Lists.toList(Weave.fold(Lists.fromArray(1, 2))), List.of(1, 2));
        eq(Lists.toList(Weave.fold(Lists.fromArray(1))), List.of(1));
        eq(Weave.fold(null), null);
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
