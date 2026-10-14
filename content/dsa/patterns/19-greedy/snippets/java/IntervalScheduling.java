import java.util.Arrays;

public final class IntervalScheduling {
    // Template 2: interval scheduling. Keep the most non-overlapping intervals [start, end) by always taking
    // the one that ends first among those that still fit. After k picks, no other choice of k intervals ends sooner.
    public static int maxNonOverlapping(int[][] intervals) {
        int[][] sorted = intervals.clone();
        Arrays.sort(sorted, (a, b) -> Integer.compare(a[1], b[1]));
        int kept = 0;
        long lastEnd = Long.MIN_VALUE;
        for (int[] interval : sorted) {
            if (interval[0] >= lastEnd) {        // fits after the last kept interval (touching is fine)
                kept++;
                lastEnd = interval[1];
            }
        }
        return kept;
    }
}
