import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

final class Merge {
    // Template 1: sort by start, then sweep. The last interval in `merged` is the group still being built;
    // an interval that starts after its end can never be reached by anything later, so the group is final.
    static int[][] mergeIntervals(int[][] intervals) {
        int[][] sorted = intervals.clone(); // a copy of the outer array: the caller's order stays untouched
        Arrays.sort(sorted, (a, b) -> Integer.compare(a[0], b[0]));
        List<int[]> merged = new ArrayList<>();
        for (int[] interval : sorted) {
            int start = interval[0];
            int end = interval[1];
            int[] last = merged.isEmpty() ? null : merged.get(merged.size() - 1);
            if (last != null && start <= last[1]) last[1] = Math.max(last[1], end); // overlaps (or touches): stretch
            else merged.add(new int[] {start, end});                                  // a gap: start a new group
        }
        return merged.toArray(new int[0][]);
    }

    // Total length covered by at least one interval: merge first, then nothing is counted twice.
    static int coveredLength(int[][] intervals) {
        int sum = 0;
        for (int[] group : mergeIntervals(intervals)) sum += group[1] - group[0];
        return sum;
    }
}
