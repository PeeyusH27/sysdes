function searchInsert(nums, target) {
  // Find the first index whose value is >= target. The answer may be nums.length, so hi starts there.
  let lo = 0;
  let hi = nums.length;
  while (lo < hi) {                        // more than one candidate left
    const mid = Math.floor((lo + hi) / 2);
    if (nums[mid] < target) lo = mid + 1;  // mid is too small, so the answer is to its right
    else hi = mid;                         // mid is big enough: it might be the answer, keep it
  }
  return lo;                               // lo === hi: the only candidate left
}
