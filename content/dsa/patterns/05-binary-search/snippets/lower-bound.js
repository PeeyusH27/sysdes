// Template 2: first true. ok(i) must be false for a prefix of [lo, hi) and true for the rest.
// Returns the first i with ok(i), or hi if there is none. Invariant: the answer is always in [lo, hi].
export function firstTrue(lo, hi, ok) {
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2); // lo <= mid < hi, so both updates shrink the range
    if (ok(mid)) hi = mid;                 // mid might be the first true: keep it
    else lo = mid + 1;                     // mid is false, and so is everything before it
  }
  return lo;                               // lo === hi
}

// First index with nums[i] >= target, or nums.length: the first copy of target, or where it would be inserted.
export function lowerBound(nums, target) {
  return firstTrue(0, nums.length, (i) => nums[i] >= target);
}

// First index with nums[i] > target: one past the last copy of target.
export function upperBound(nums, target) {
  return firstTrue(0, nums.length, (i) => nums[i] > target);
}

// How many values lie in [low, high]? Two bounds, O(log n), no scanning.
export function countInRange(nums, low, high) {
  return Math.max(0, upperBound(nums, high) - lowerBound(nums, low));
}
