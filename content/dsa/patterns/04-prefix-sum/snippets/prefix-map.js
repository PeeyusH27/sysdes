// Template 2: prefix sum + hash map. sum(nums[i+1..j]) = P(j) - P(i), so a subarray ending at j sums to k
// exactly when an EARLIER prefix equals P(j) - k. Works with negative numbers, unlike a sliding window.
// Longest version: remember the FIRST index of each prefix sum (earliest start = longest subarray).
export function longestSubarrayWithSum(nums, k) {
  const firstIndex = new Map([[0, -1]]);   // the empty prefix, "before index 0"
  let sum = 0;
  let best = 0;
  for (let j = 0; j < nums.length; j++) {
    sum += nums[j];
    if (firstIndex.has(sum - k)) best = Math.max(best, j - firstIndex.get(sum - k));
    if (!firstIndex.has(sum)) firstIndex.set(sum, j);   // never overwrite: keep the earliest
  }
  return best;
}
