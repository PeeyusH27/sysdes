import java.util.Objects;

// Run from this folder:  javac -d /tmp/out *.java && java -cp /tmp/out RoomsHeapTest
final class RoomsHeapTest {
    public static void main(String[] args) {
        test("counts rooms like the sweep line does", RoomsHeapTest::counts);
        test("agrees with the sweep line on many inputs", RoomsHeapTest::agrees);
        System.out.println(failed == 0 ? "All tests passed." : failed + " test(s) failed.");
        System.exit(failed == 0 ? 0 : 1);
    }

    static void counts() {
        eq(RoomsHeap.minRooms(new int[][] {{2, 7}, {0, 5}, {6, 9}, {1, 3}, {4, 6}}), 3);
        eq(RoomsHeap.minRooms(new int[][] {{1, 5}, {5, 10}, {10, 15}}), 1);
        eq(RoomsHeap.minRooms(new int[][] {{1, 10}, {2, 3}, {4, 5}}), 2);
        eq(RoomsHeap.minRooms(new int[][] {}), 0);
    }

    // Stands in for the JavaScript's MinHeap test: the heap of end times must always free the earliest room.
    static void agrees() {
        for (int n = 1; n < 8; n++) {
            int[][] meetings = new int[n * 3][];
            for (int i = 0; i < meetings.length; i++) meetings[i] = new int[] {(i * 7) % 11, (i * 7) % 11 + 1 + (i * 3) % 5};
            eq(RoomsHeap.minRooms(meetings), SweepLine.maxOverlap(meetings));
        }
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
