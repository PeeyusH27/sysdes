function searchRange(nums, target) {
  const first = firstIndex(nums, (x) => x >= target);
  if (first === nums.length || nums[first] !== target) return [-1, -1];
  const afterLast = firstIndex(nums, (x) => x > target);
  return [first, afterLast - 1];
}

// First index whose value passes `ok`, or nums.length if none does.
// Works because, in sorted order, `ok` is false for a prefix and true for the rest.
function firstIndex(nums, ok) {
  let lo = 0;
  let hi = nums.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (ok(nums[mid])) hi = mid; // mid passes: the first pass is mid or to its left
    else lo = mid + 1;           // mid fails: the first pass is to its right
  }
  return lo;
}
