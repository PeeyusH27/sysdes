function search(nums, target) {
  let lo = 0;
  let hi = nums.length - 1;               // if target is anywhere, it is inside nums[lo..hi]
  while (lo <= hi) {                      // the range still holds at least one element
    const mid = Math.floor((lo + hi) / 2);
    if (nums[mid] === target) return mid;
    if (nums[mid] < target) lo = mid + 1; // mid and everything left of it are too small
    else hi = mid - 1;                    // mid and everything right of it are too big
  }
  return -1;                              // the range is empty: target is not in nums
}
