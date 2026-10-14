import java.util.ArrayList;
import java.util.List;

public final class SubsetsBitmask {
    // Template 4: subsets as bitmasks. Bit i of mask says whether items[i] is in the subset, so
    // counting mask from 0 to 2^n - 1 lists every subset exactly once. Keep n at 30 or less:
    // 1 << 31 is already negative in an int.
    public static <T> List<List<T>> subsets(List<T> items) {
        int n = items.size();
        List<List<T>> out = new ArrayList<>();
        for (int mask = 0; mask < 1 << n; mask++) {
            List<T> subset = new ArrayList<>();
            for (int i = 0; i < n; i++) {
                if ((mask & (1 << i)) != 0) subset.add(items.get(i));
            }
            out.add(subset);
        }
        return out;
    }

    // Every submask of mask, from mask itself down to 0. (s - 1) & mask jumps to the next smaller
    // number that only uses bits of mask.
    public static List<Integer> submasks(int mask) {
        List<Integer> out = new ArrayList<>();
        for (int s = mask; ; s = (s - 1) & mask) {
            out.add(s);
            if (s == 0) break;
        }
        return out;
    }
}
