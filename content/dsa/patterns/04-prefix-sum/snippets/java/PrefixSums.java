// Template 1: running sums. prefix[i] is the sum of the first i values (prefix[0] = 0), so
// sum(nums[l..r]) = prefix[r + 1] - prefix[l] for any range, in O(1) after an O(n) build.
public final class PrefixSums {
    private PrefixSums() {}

    public static int[] buildPrefix(int[] nums) {
        int[] prefix = new int[nums.length + 1];   // zero-filled, so prefix[0] = 0
        for (int i = 0; i < nums.length; i++) prefix[i + 1] = prefix[i] + nums[i];
        return prefix;
    }

    public static int rangeSum(int[] prefix, int left, int right) {
        return prefix[right + 1] - prefix[left];   // inclusive on both ends
    }
}
