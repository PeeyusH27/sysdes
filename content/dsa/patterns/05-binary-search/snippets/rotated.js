// Template 3: a sorted array of distinct values, rotated. Returns the index of the minimum (where the rotation starts).
// Compare with nums[hi]: if nums[mid] > nums[hi], the drop, and so the minimum, is to the right of mid.
export function findMinIndex(nums) {
  let lo = 0;
  let hi = nums.length - 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (nums[mid] > nums[hi]) lo = mid + 1; // mid is in the upper run: the minimum comes after it
    else hi = mid;                          // mid is in the lower run: the minimum is mid or before it
  }
  return lo;
}
