// "Ending at i": dp[i] = the best answer whose LAST element is nums[i].
// dp[i] looks back at every j < i that may come right before i, so it costs O(n²).
// The answer can end anywhere, so it is the best cell, not dp[n - 1].
// Here: the largest sum of a strictly increasing subsequence.
export function maxSumIncreasing(nums) {
  if (nums.length === 0) return 0;
  const dp = nums.slice(); // nums[i] on its own is already a valid subsequence ending at i
  let best = -Infinity;
  for (let i = 0; i < nums.length; i++) {
    for (let j = 0; j < i; j++) {
      if (nums[j] < nums[i]) dp[i] = Math.max(dp[i], dp[j] + nums[i]); // extend the best chain ending at j
    }
    best = Math.max(best, dp[i]);
  }
  return best;
}
