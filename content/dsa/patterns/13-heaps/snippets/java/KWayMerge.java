import java.util.*;

// Template 3: k-way merge. The next output is always the smallest of the k current heads,
// so keep one entry per input in a min-heap. Each of the N items is pushed and popped once: O(N log k).
final class KWayMerge {
    private KWayMerge() {}

    // The value on top, and where to find that input's next item.
    private record Head(int value, int list, int index) {}

    static List<Integer> mergeSortedArrays(int[][] arrays) {
        Heap<Head> heap = new Heap<>((a, b) -> Integer.compare(a.value(), b.value()));
        for (int list = 0; list < arrays.length; list++) {
            if (arrays[list].length > 0) heap.push(new Head(arrays[list][0], list, 0));
        }
        List<Integer> out = new ArrayList<>();
        while (heap.size() > 0) {
            Head h = heap.pop();
            out.add(h.value());
            int next = h.index() + 1;
            if (next < arrays[h.list()].length) {
                heap.push(new Head(arrays[h.list()][next], h.list(), next)); // advance that input
            }
        }
        return out;
    }
}
