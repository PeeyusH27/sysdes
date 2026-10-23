function findMin(nums) {
  let left = 0;
  let right = nums.length - 1;
  while (left < right) {
    const mid = (left + right) >> 1;
    if (nums[mid] > nums[right]) {
      left = mid + 1; // mid sits in the larger left run, so the drop (and the minimum) is to its right
    } else {
      right = mid; // mid is in the smaller right run: it could be the minimum, so keep it
    }
  }
  return nums[left];
}
