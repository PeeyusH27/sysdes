import java.util.HashSet;
import java.util.Set;

// Template 1: a set of everything already passed. Answers "have I seen this before?" in O(1) on average,
// so the inner "search the earlier elements" loop of the brute force disappears.
public final class SeenSet {
    private SeenSet() {}

    public static <T> T firstRepeat(Iterable<T> items) {
        Set<T> seen = new HashSet<>();
        for (T x : items) {
            if (seen.contains(x)) return x;   // second sighting: the first value to repeat
            seen.add(x);
        }
        return null;                          // every value was distinct
    }
}
