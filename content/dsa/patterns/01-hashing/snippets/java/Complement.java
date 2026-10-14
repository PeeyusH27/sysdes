import java.util.HashMap;
import java.util.Map;

// Template 3: complement lookup. For each x, the partner it needs is target - x: look it up among the values
// already passed, THEN record x. Looking up first means x never pairs with itself.
public final class Complement {
    private Complement() {}

    public static int countPairs(int[] nums, int target) {
        Map<Integer, Integer> seen = new HashMap<>();   // value -> how many times it has appeared so far
        int pairs = 0;
        for (int x : nums) {
            pairs += seen.getOrDefault(target - x, 0);  // x pairs with every earlier copy of its complement
            seen.merge(x, 1, Integer::sum);
        }
        return pairs;
    }
}
