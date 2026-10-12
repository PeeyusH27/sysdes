// Template 3: variable window, SHORTEST valid. Grow right until the window is valid; then, while it stays
// valid, record it and shrink left. Example rule: sum >= target, with positive numbers only.
export function shortestSumAtLeast(nums, target) {
  let left = 0;
  let sum = 0;
  let best = Infinity;
  for (let right = 0; right < nums.length; right++) {
    sum += nums[right];
    while (sum >= target) {                      // valid: record BEFORE shrinking
      best = Math.min(best, right - left + 1);
      sum -= nums[left];
      left++;
    }
  }
  return best === Infinity ? 0 : best;
}
