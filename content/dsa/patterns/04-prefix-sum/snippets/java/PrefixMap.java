import java.util.HashMap;
import java.util.Map;

// Template 2: prefix sum + hash map. sum(nums[i+1..j]) = P(j) - P(i), so a subarray ending at j sums to k
// exactly when an EARLIER prefix equals P(j) - k. Works with negative numbers, unlike a sliding window.
// Longest version: remember the FIRST index of each prefix sum (earliest start = longest subarray).
public final class PrefixMap {
    private PrefixMap() {}

    public static int longestSubarrayWithSum(int[] nums, int k) {
        Map<Integer, Integer> firstIndex = new HashMap<>();
        firstIndex.put(0, -1);                     // the empty prefix, "before index 0"
        int sum = 0;
        int best = 0;
        for (int j = 0; j < nums.length; j++) {
            sum += nums[j];
            if (firstIndex.containsKey(sum - k)) best = Math.max(best, j - firstIndex.get(sum - k));
            firstIndex.putIfAbsent(sum, j);        // never overwrite: keep the earliest
        }
        return best;
    }
}
