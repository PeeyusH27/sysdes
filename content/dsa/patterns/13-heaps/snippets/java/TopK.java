import java.util.*;
import java.util.function.ToIntFunction;

// Template 2: top k. To keep the k LARGEST values, keep a MIN-heap of size k: its top is the
// weakest of the current top k, the one to evict when something bigger arrives. O(n log k).
final class TopK {
    private TopK() {}

    static List<Integer> kLargest(int[] nums, int k) {
        Heap<Integer> heap = new Heap<>(Integer::compare);
        for (int x : nums) {
            heap.push(x);
            if (heap.size() > k) heap.pop();   // drop the smallest: it is not in the top k
        }
        List<Integer> out = new ArrayList<>();
        while (heap.size() > 0) out.add(heap.pop());
        Collections.reverse(out);              // largest first
        return out;
    }

    // The mirror image: the k SMALLEST items by some key need a MAX-heap of size k.
    static <T> List<T> kSmallestBy(List<T> items, int k, ToIntFunction<T> key) {
        Heap<T> heap = new Heap<>((a, b) -> Integer.compare(key.applyAsInt(b), key.applyAsInt(a)));
        for (T item : items) {
            heap.push(item);
            if (heap.size() > k) heap.pop();   // drop the largest key
        }
        List<T> out = new ArrayList<>();
        while (heap.size() > 0) out.add(heap.pop());
        Collections.reverse(out);              // smallest key first
        return out;
    }
}
