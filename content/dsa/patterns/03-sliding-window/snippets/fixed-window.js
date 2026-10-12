// Template 1: fixed-size window. Neighbouring windows share k - 1 elements, so update the summary
// with the element that enters and the one that leaves instead of recomputing it: O(n), not O(n · k).
export function maxWindowSum(nums, k) {
  if (k <= 0 || k > nums.length) return null;
  let sum = 0;
  for (let i = 0; i < k; i++) sum += nums[i];   // the first full window ends at index k - 1
  let best = sum;
  for (let right = k; right < nums.length; right++) {
    sum += nums[right] - nums[right - k];       // nums[right] enters, nums[right - k] leaves
    best = Math.max(best, sum);
  }
  return best;
}
