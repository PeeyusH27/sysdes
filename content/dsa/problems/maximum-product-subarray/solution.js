function maxProduct(nums) {
  let max = nums[0]; // largest product of a subarray ending at the current index
  let min = nums[0]; // smallest (most negative) product of a subarray ending here
  let best = nums[0];
  for (let i = 1; i < nums.length; i++) {
    const x = nums[i];
    const a = max * x;
    const b = min * x;
    max = Math.max(x, a, b); // start fresh at x, or extend the best or the worst run
    min = Math.min(x, a, b);
    best = Math.max(best, max);
  }
  return best;
}
