import java.util.Arrays;

// Template 4: binary search on the answer. The answer is a number in [lo, hi], and "does x work?"
// flips from false to true exactly once as x grows. Here: the smallest ship capacity that delivers
// every package, in order, within `days` days.
public final class AnswerSpace {
    private AnswerSpace() {}

    public static int shipWithinDays(int[] weights, int days) {
        int lo = Arrays.stream(weights).max().getAsInt();   // anything smaller can't carry the heaviest package
        int hi = Arrays.stream(weights).sum();              // everything in one day always works
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (daysNeeded(weights, mid) <= days) hi = mid; // works: the answer is mid or smaller
            else lo = mid + 1;                              // too small: the answer is bigger
        }
        return lo;
    }

    private static int daysNeeded(int[] weights, int cap) {
        int used = 1;
        int load = 0;
        for (int w : weights) {
            if (load + w > cap) {   // this package doesn't fit today: start a new day
                used++;
                load = 0;
            }
            load += w;
        }
        return used;
    }

    // "Maximize the minimum": the largest gap such that k items (2 <= k <= positions.length) can sit at
    // distinct positions with every two of them at least `gap` apart. Here "works" goes true...true, false...false,
    // so search for the first gap that fails and step back by one.
    public static int maxMinDistance(int[] positions, int k) {
        int[] sorted = positions.clone();   // don't reorder the caller's array
        Arrays.sort(sorted);
        int lo = 1;                                           // a gap of 1 always works
        int hi = sorted[sorted.length - 1] - sorted[0] + 1;   // wider than the whole span: always fails
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (!canPlace(sorted, k, mid)) hi = mid;          // first failing gap is mid or smaller
            else lo = mid + 1;
        }
        return lo - 1;                                        // the last gap that works
    }

    private static boolean canPlace(int[] sorted, int k, int gap) {
        int placed = 1;
        int last = sorted[0];
        for (int p : sorted) {
            if (p - last >= gap) {  // greedy: take the earliest position that is far enough
                placed++;
                last = p;
            }
        }
        return placed >= k;
    }
}
