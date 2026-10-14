import java.util.*;

// Edit the inputs and run main. Heap and the helpers are the templates above.
public class TryIt {
    public static void main(String[] args) {
        Heap<Integer> heap = new Heap<>(Integer::compare); // min-heap; (a, b) -> Integer.compare(b, a) for a max-heap
        for (int x : new int[] {5, 3, 8, 1, 4}) heap.push(x);
        System.out.println(heap.peek() + " " + heap.size());                      // 1 5
        System.out.println(heap.pop() + " " + heap.pop() + " " + heap.pop());     // 1 3 4

        System.out.println(TopK.kLargest(new int[] {3, 1, 5, 12, 2, 11, 7}, 3)); // [12, 11, 7]
        List<int[]> points = List.of(new int[] {3, 3}, new int[] {1, -2}, new int[] {-4, 0}, new int[] {0, 1});
        List<int[]> nearest = TopK.kSmallestBy(points, 2, p -> p[0] * p[0] + p[1] * p[1]);
        for (int[] p : nearest) System.out.println(Arrays.toString(p));          // [0, 1] then [1, -2]

        System.out.println(KWayMerge.mergeSortedArrays(new int[][] {{1, 4, 9}, {2, 3, 10}, {5, 6}})); // [1, 2, 3, 4, 5, 6, 9, 10]
        System.out.println(Arrays.toString(TwoHeaps.runningMedians(new int[] {6, 2, 9, 1})));          // [6.0, 4.0, 6.0, 4.0]
    }
}
