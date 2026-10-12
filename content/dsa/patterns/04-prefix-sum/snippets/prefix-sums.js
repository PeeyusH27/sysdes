// Template 1: running sums. prefix[i] is the sum of the first i values (prefix[0] = 0), so
// sum(nums[l..r]) = prefix[r + 1] - prefix[l] for any range, in O(1) after an O(n) build.
export function buildPrefix(nums) {
  const prefix = new Array(nums.length + 1).fill(0);
  for (let i = 0; i < nums.length; i++) prefix[i + 1] = prefix[i] + nums[i];
  return prefix;
}

export function rangeSum(prefix, left, right) {
  return prefix[right + 1] - prefix[left];   // inclusive on both ends
}
