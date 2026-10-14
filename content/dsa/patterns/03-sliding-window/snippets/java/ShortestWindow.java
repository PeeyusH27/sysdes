// Template 3: variable window, SHORTEST valid. Grow right until the window is valid; then, while it stays
// valid, record it and shrink left. Example rule: sum >= target, with positive numbers only.
public final class ShortestWindow {
    private ShortestWindow() {}

    public static int shortestSumAtLeast(int[] nums, int target) {
        int left = 0;
        long sum = 0;
        int best = Integer.MAX_VALUE;
        for (int right = 0; right < nums.length; right++) {
            sum += nums[right];
            while (sum >= target) {                        // valid: record BEFORE shrinking
                best = Math.min(best, right - left + 1);
                sum -= nums[left];
                left++;
            }
        }
        return best == Integer.MAX_VALUE ? 0 : best;
    }
}
