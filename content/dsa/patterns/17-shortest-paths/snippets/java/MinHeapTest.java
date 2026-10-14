import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

final class MinHeapTest {
    public static void main(String[] args) {
        Check.test("pops {priority, data} pairs in priority order", () -> {
            MinHeap<Object[]> heap = new MinHeap<>((a, b) -> Integer.compare((Integer) a[0], (Integer) b[0]));
            Object[][] pairs = {{5, "e"}, {1, "a"}, {4, "d"}, {2, "b"}, {3, "c"}, {1, "z"}};
            for (Object[] pair : pairs) heap.push(pair);
            Check.eq(6, heap.size());
            Check.eq(1, heap.peek()[0]);
            List<Integer> out = new ArrayList<>();
            while (heap.size() > 0) out.add((Integer) heap.pop()[0]);
            Check.eq(List.of(1, 1, 2, 3, 4, 5), out);
        });

        Check.test("sorts many numbers with a custom comparator", () -> {
            MinHeap<Integer> heap = new MinHeap<>(Integer::compare);
            List<Integer> values = new ArrayList<>();
            for (int i = 0; i < 200; i++) values.add((i * 7919) % 211);
            for (int v : values) heap.push(v);
            List<Integer> out = new ArrayList<>();
            while (heap.size() > 0) out.add(heap.pop());
            Collections.sort(values);
            Check.eq(values, out);
        });

        Check.test("a max-heap is the same class with the comparator flipped", () -> {
            MinHeap<Integer> heap = new MinHeap<>((a, b) -> Integer.compare(b, a));
            for (int v : new int[] {3, 9, 1, 7}) heap.push(v);
            Check.eq(9, heap.pop());
            Check.eq(7, heap.pop());
        });

        Check.test("pop on an empty heap returns null", () -> {
            MinHeap<Object[]> heap = new MinHeap<>((a, b) -> Integer.compare((Integer) a[0], (Integer) b[0]));
            Check.isTrue(heap.pop() == null);
            Object[] x = {0, "x"};
            heap.push(x);
            Check.isTrue(heap.pop() == x);
            Check.eq(0, heap.size());
        });

        Check.finish();
    }
}
