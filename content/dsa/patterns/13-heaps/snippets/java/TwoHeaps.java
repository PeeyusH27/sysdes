// Template 4: two heaps. `low` (a max-heap) holds the smaller half, `high` (a min-heap) the larger half,
// with low.size() == high.size() or one more. The median is then low's top, or the average of both tops.
final class TwoHeaps {
    private TwoHeaps() {}

    static double[] runningMedians(int[] nums) {
        Heap<Integer> low = new Heap<>((a, b) -> Integer.compare(b, a));
        Heap<Integer> high = new Heap<>(Integer::compare);
        double[] medians = new double[nums.length];
        int i = 0;
        for (int x : nums) {
            low.push(x);
            high.push(low.pop());                                   // keeps every low value <= every high value
            if (high.size() > low.size()) low.push(high.pop());     // keeps the sizes balanced
            medians[i++] = low.size() > high.size() ? low.peek() : (low.peek() + (double) high.peek()) / 2;
        }
        return medians;
    }
}
