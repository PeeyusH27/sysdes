import java.util.*;

// Run from this folder:  javac -d /tmp/heaps *.java && java -cp /tmp/heaps HeapsTest
// Plain Java, no JUnit: each test is a method; main exits 1 if any check fails.
final class HeapsTest {
    public static void main(String[] args) {
        test("min-heap pops values in ascending order", HeapsTest::minHeap);
        test("a reversed comparator makes a max-heap", HeapsTest::maxHeap);
        test("orders pairs by a key", HeapsTest::pairs);
        test("empty heap: peek and pop return null", HeapsTest::empty);
        test("agrees with sorting on random input", HeapsTest::random);
        test("keeps the k largest values, largest first", HeapsTest::kLargest);
        test("k equal to the length returns everything sorted", HeapsTest::kEqualsLength);
        test("k smallest by a key", HeapsTest::kSmallestBy);
        test("merges several sorted arrays", HeapsTest::merge);
        test("handles empty inputs and duplicates", HeapsTest::mergeEdges);
        test("median after every number", HeapsTest::medians);
        test("matches re-sorting on mixed input", HeapsTest::mediansMixed);
        System.out.println(failed == 0 ? "All tests passed." : failed + " test(s) failed.");
        System.exit(failed == 0 ? 0 : 1);
    }

    static <T> List<T> drain(Heap<T> heap) {
        List<T> out = new ArrayList<>();
        while (heap.size() > 0) out.add(heap.pop());
        return out;
    }

    static void minHeap() {
        Heap<Integer> heap = Heap.minHeap();
        for (int x : new int[] {5, 3, 8, 1, 4, 1, -2}) heap.push(x);
        eq(heap.size(), 7);
        eq(heap.peek(), -2);
        eq(drain(heap), List.of(-2, 1, 1, 3, 4, 5, 8));
    }

    static void maxHeap() {
        Heap<Integer> heap = new Heap<>((a, b) -> b - a);
        for (int x : new int[] {5, 3, 8, 1, 4}) heap.push(x);
        eq(drain(heap), List.of(8, 5, 4, 3, 1));
    }

    static void pairs() {
        Heap<Map.Entry<String, Integer>> heap = new Heap<>((a, b) -> a.getValue() - b.getValue());
        heap.push(Map.entry("x", 3));
        heap.push(Map.entry("y", 1));
        heap.push(Map.entry("z", 2));
        List<String> names = new ArrayList<>();
        for (Map.Entry<String, Integer> e : drain(heap)) names.add(e.getKey());
        eq(names, List.of("y", "z", "x"));
    }

    static void empty() {
        Heap<Integer> heap = Heap.minHeap();
        eq(heap.peek(), null);
        eq(heap.pop(), null);
        heap.push(7);
        eq(heap.pop(), 7);
        eq(heap.size(), 0);
    }

    static void random() {
        long seed = 42;
        List<Integer> values = new ArrayList<>();
        for (int i = 0; i < 300; i++) {
            seed = (seed * 1103515245L + 12345L) % 2147483648L;
            values.add((int) (seed % 1000));
        }
        Heap<Integer> heap = Heap.minHeap();
        values.forEach(heap::push);
        List<Integer> sorted = new ArrayList<>(values);
        Collections.sort(sorted);
        eq(drain(heap), sorted);
    }

    static void kLargest() {
        eq(TopK.kLargest(new int[] {3, 1, 5, 12, 2, 11, 7}, 3), List.of(12, 11, 7));
        eq(TopK.kLargest(new int[] {4, 4, 1, 4, 2}, 2), List.of(4, 4));
        eq(TopK.kLargest(new int[] {-5, -1, -3}, 1), List.of(-1));
    }

    static void kEqualsLength() {
        eq(TopK.kLargest(new int[] {2, 9, 4}, 3), List.of(9, 4, 2));
        eq(TopK.kLargest(new int[] {}, 2), List.of());
    }

    static void kSmallestBy() {
        List<int[]> pts = List.of(new int[] {3, 3}, new int[] {1, -2}, new int[] {-4, 0}, new int[] {0, 1});
        List<int[]> got = TopK.kSmallestBy(pts, 2, p -> p[0] * p[0] + p[1] * p[1]);
        eq(got.size(), 2);
        check(Arrays.equals(got.get(0), new int[] {0, 1}));
        check(Arrays.equals(got.get(1), new int[] {1, -2}));
        eq(TopK.kSmallestBy(List.of("pear", "fig", "banana", "kiwi"), 1, String::length), List.of("fig"));
    }

    static void merge() {
        eq(KWayMerge.mergeSortedArrays(new int[][] {{1, 4, 9}, {2, 3, 10}, {5, 6}}), List.of(1, 2, 3, 4, 5, 6, 9, 10));
        eq(KWayMerge.mergeSortedArrays(new int[][] {{-3, 0}, {-5, 7, 8}}), List.of(-5, -3, 0, 7, 8));
    }

    static void mergeEdges() {
        eq(KWayMerge.mergeSortedArrays(new int[][] {}), List.of());
        eq(KWayMerge.mergeSortedArrays(new int[][] {{}, {}}), List.of());
        eq(KWayMerge.mergeSortedArrays(new int[][] {{1, 1}, {}, {0, 1}}), List.of(0, 1, 1, 1));
    }

    static void medians() {
        check(Arrays.equals(TwoHeaps.runningMedians(new int[] {6, 2, 9, 1}), new double[] {6, 4, 6, 4}));
        check(Arrays.equals(TwoHeaps.runningMedians(new int[] {1, 2, 3}), new double[] {1, 1.5, 2}));
        check(Arrays.equals(TwoHeaps.runningMedians(new int[] {}), new double[] {}));
    }

    static void mediansMixed() {
        int[] nums = {5, -3, 5, 12, 0, 0, -7, 8, 8, 1, 4, -2};
        double[] expected = new double[nums.length];
        for (int i = 0; i < nums.length; i++) {
            int[] s = Arrays.copyOf(nums, i + 1);
            Arrays.sort(s);
            int n = s.length;
            expected[i] = n % 2 == 1 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2.0;
        }
        check(Arrays.equals(TwoHeaps.runningMedians(nums), expected));
    }

    // ---- a tiny test harness
    interface Body { void run() throws Exception; }

    private static int failed = 0;

    static void test(String name, Body body) {
        try {
            body.run();
            System.out.println("PASS  " + name);
        } catch (Throwable e) {
            failed++;
            System.out.println("FAIL  " + name + ": " + e);
        }
    }

    static void check(boolean condition) {
        if (!condition) throw new AssertionError("check failed");
    }

    static void eq(Object actual, Object expected) {
        if (!Objects.equals(actual, expected)) throw new AssertionError("expected " + expected + ", got " + actual);
    }
}
