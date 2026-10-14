// Template 1: fixed-size window. Neighbouring windows share k - 1 elements, so update the summary
// with the element that enters and the one that leaves instead of recomputing it: O(n), not O(n * k).
public final class FixedWindow {
    private FixedWindow() {}

    // Integer (not int) so that "no such window" can be null, like the JavaScript version.
    public static Integer maxWindowSum(int[] nums, int k) {
        if (k <= 0 || k > nums.length) return null;
        int sum = 0;
        for (int i = 0; i < k; i++) sum += nums[i];   // the first full window ends at index k - 1
        int best = sum;
        for (int right = k; right < nums.length; right++) {
            sum += nums[right] - nums[right - k];     // nums[right] enters, nums[right - k] leaves
            best = Math.max(best, sum);
        }
        return best;
    }
}
