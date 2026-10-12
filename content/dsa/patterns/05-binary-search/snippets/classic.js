// Template 1: exact match on a sorted array.
// Invariant: if target is anywhere in nums, it is inside nums[lo..hi] (both ends included).
export function binarySearch(nums, target) {
  let lo = 0;
  let hi = nums.length - 1;
  while (lo <= hi) {                       // the range is not empty
    const mid = Math.floor((lo + hi) / 2); // rounds down; exact for any index in JS
    if (nums[mid] === target) return mid;
    if (nums[mid] < target) lo = mid + 1;  // mid and everything left of it are too small
    else hi = mid - 1;                     // mid and everything right of it are too big
  }
  return -1;                               // empty range: target is not in nums
}
