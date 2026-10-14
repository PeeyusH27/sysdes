import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

// A binary min-heap. Java's PriorityQueue does this job, but writing it out shows what Dijkstra relies on.
// compare(a, b) < 0 means a comes out first. Dijkstra stores {distance, node} pairs as int[].
public final class MinHeap<T> {
    private final List<T> items = new ArrayList<>();
    private final Comparator<T> compare;

    public MinHeap(Comparator<T> compare) {
        this.compare = compare;
    }

    public int size() {
        return items.size();
    }

    public T peek() {
        return items.isEmpty() ? null : items.get(0);
    }

    public void push(T item) {
        List<T> a = items;
        a.add(item);
        int i = a.size() - 1;
        while (i > 0) {                            // sift up while the parent is larger
            int p = (i - 1) >> 1;
            if (compare.compare(a.get(p), a.get(i)) <= 0) break;
            swap(p, i);
            i = p;
        }
    }

    public T pop() {
        List<T> a = items;
        if (a.isEmpty()) return null;              // null when the heap was empty
        T top = a.get(0);
        T last = a.remove(a.size() - 1);
        if (!a.isEmpty()) {
            a.set(0, last);                        // move the last item to the root and sift it down
            int i = 0;
            for (;;) {
                int l = 2 * i + 1;
                int r = l + 1;
                int m = i;
                if (l < a.size() && compare.compare(a.get(l), a.get(m)) < 0) m = l;
                if (r < a.size() && compare.compare(a.get(r), a.get(m)) < 0) m = r;
                if (m == i) break;
                swap(m, i);
                i = m;
            }
        }
        return top;
    }

    private void swap(int i, int j) {
        T tmp = items.get(i);
        items.set(i, items.get(j));
        items.set(j, tmp);
    }
}
