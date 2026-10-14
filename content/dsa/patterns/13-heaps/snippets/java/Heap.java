import java.util.*;

// Template 1: a binary heap. The same structure backs java.util.PriorityQueue; it is written out here so you
// can see (and re-create in an interview) how push and pop keep the order.
// The heap lives in a list: the parent of index i is (i - 1) >> 1, its children are 2i + 1 and 2i + 2.
// compare(a, b) < 0 means a leaves first: (a, b) -> a - b is a min-heap, (a, b) -> b - a a max-heap.
class Heap<T> {
    private final List<T> items = new ArrayList<>();
    private final Comparator<? super T> compare;

    Heap(Comparator<? super T> compare) {
        this.compare = compare;
    }

    /** A min-heap over values that already know how to compare themselves. */
    static <T extends Comparable<? super T>> Heap<T> minHeap() {
        return new Heap<>(Comparator.naturalOrder());
    }

    int size() {
        return items.size();
    }

    T peek() {
        return items.isEmpty() ? null : items.get(0); // null when empty
    }

    void push(T value) {
        items.add(value);              // add as the last leaf...
        siftUp(items.size() - 1);      // ...and float it up past larger parents
    }

    T pop() {
        if (items.isEmpty()) return null;
        T top = items.get(0);
        T last = items.remove(items.size() - 1);
        if (!items.isEmpty()) {
            items.set(0, last);        // move the last leaf to the root...
            siftDown(0);               // ...and sink it below smaller children
        }
        return top;
    }

    private void siftUp(int i) {
        while (i > 0) {
            int parent = (i - 1) >> 1;
            if (compare.compare(items.get(i), items.get(parent)) >= 0) break; // parent already comes first
            Collections.swap(items, i, parent);
            i = parent;
        }
    }

    private void siftDown(int i) {
        for (;;) {
            int left = 2 * i + 1;
            int right = left + 1;
            int best = i;              // whichever of i, left, right should come first
            if (left < items.size() && compare.compare(items.get(left), items.get(best)) < 0) best = left;
            if (right < items.size() && compare.compare(items.get(right), items.get(best)) < 0) best = right;
            if (best == i) return;
            Collections.swap(items, i, best);
            i = best;
        }
    }
}
