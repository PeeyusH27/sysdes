public final class EndingAt {
    // "Ending at i": dp[i] = the best answer whose LAST element is nums[i].
    // dp[i] looks back at every j < i that may come right before i, so it costs O(n^2).
    // The answer can end anywhere, so it is the best cell, not dp[n - 1].
    // Here: the largest sum of a strictly increasing subsequence.
    public static int maxSumIncreasing(int[] nums) {
        if (nums.length == 0) return 0;
        int[] dp = nums.clone();                 // nums[i] on its own is already a valid subsequence ending at i
        int best = Integer.MIN_VALUE;
        for (int i = 0; i < nums.length; i++) {
            for (int j = 0; j < i; j++) {
                if (nums[j] < nums[i]) dp[i] = Math.max(dp[i], dp[j] + nums[i]); // extend the best chain ending at j
            }
            best = Math.max(best, dp[i]);
        }
        return best;
    }
}
