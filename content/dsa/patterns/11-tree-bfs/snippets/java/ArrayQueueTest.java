import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

// Run from this folder:  javac -d /tmp/out *.java && java -cp /tmp/out ArrayQueueTest
final class ArrayQueueTest {
    public static void main(String[] args) {
        test("first in, first out", ArrayQueueTest::fifo);
        test("stays correct across compaction", ArrayQueueTest::compaction);
        System.out.println(failed == 0 ? "All tests passed." : failed + " test(s) failed.");
        System.exit(failed == 0 ? 0 : 1);
    }

    static void fifo() {
        ArrayQueue<Integer> q = new ArrayQueue<>();
        q.push(1);
        q.push(2);
        q.push(3);
        eq(q.shift(), 1);
        q.push(4);
        eq(List.of(q.shift(), q.shift(), q.shift()), List.of(2, 3, 4));
        eq(q.shift(), null);
        eq(q.size(), 0);
    }

    static void compaction() {
        ArrayQueue<Integer> q = new ArrayQueue<>();
        List<Integer> out = new ArrayList<>();
        for (int i = 0; i < 5000; i++) {
            q.push(i);
            q.push(i);
            out.add(q.shift());
        }
        eq(q.size(), 5000);
        eq(out.subList(0, 4), List.of(0, 0, 1, 1));
        eq(q.shift(), 2500);
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
