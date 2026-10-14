import java.util.ArrayList;
import java.util.List;

final class SweepLine {
    // Template 2a: sweep line. Every interval [start, end) becomes +1 at its start and -1 at its end.
    // Sorted by time (ends before starts on ties), the running sum is how many intervals are open right now.
    static int maxOverlap(int[][] intervals) {
        List<int[]> events = new ArrayList<>();
        for (int[] interval : intervals) {
            events.add(new int[] {interval[0], +1});
            events.add(new int[] {interval[1], -1});
        }
        // at equal times, -1 sorts before +1
        events.sort((a, b) -> a[0] != b[0] ? Integer.compare(a[0], b[0]) : Integer.compare(a[1], b[1]));
        int open = 0;
        int most = 0;
        for (int[] event : events) {
            open += event[1];
            most = Math.max(most, open);
        }
        return most;
    }
}
