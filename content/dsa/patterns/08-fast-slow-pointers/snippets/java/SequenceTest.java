import java.util.Objects;
import java.util.function.IntUnaryOperator;

// Run from this folder:  javac -d /tmp/out *.java && java -cp /tmp/out SequenceTest
final class SequenceTest {
    public static void main(String[] args) {
        test("finds the cycle of a lookup table", SequenceTest::table);
        test("happy numbers end in the 1 -> 1 loop", SequenceTest::happy);
        test("the duplicate in [1..n] values is the entry of the index walk from 0", SequenceTest::duplicate);
        System.out.println(failed == 0 ? "All tests passed." : failed + " test(s) failed.");
        System.exit(failed == 0 ? 0 : 1);
    }

    static final IntUnaryOperator DIGIT_SQUARES = TryIt::digitSquares;

    static void table() {
        int[] table = {4, 0, 7, 2, 6, 3, 2, 5};
        eq(Sequence.floyd(x -> table[x], 0), new Sequence.Loop(2, 3, 4));
        eq(Sequence.floyd(x -> (x * x + 1) % 10, 3), new Sequence.Loop(0, 1, 6));
    }

    static void happy() {
        eq(Sequence.floyd(DIGIT_SQUARES, 19), new Sequence.Loop(1, 4, 1));
        eq(Sequence.floyd(DIGIT_SQUARES, 1), new Sequence.Loop(1, 0, 1));
        eq(Sequence.floyd(DIGIT_SQUARES, 2), new Sequence.Loop(4, 1, 8));
    }

    static void duplicate() {
        int[] nums = {4, 3, 1, 4, 2};
        eq(Sequence.floyd(i -> nums[i], 0).start(), 4);
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
