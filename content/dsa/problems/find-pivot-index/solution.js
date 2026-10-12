function pivotIndex(nums) {
  const total = nums.reduce((a, b) => a + b, 0);
  let leftSum = 0; // sum of nums[0..i-1]
  for (let i = 0; i < nums.length; i++) {
    const rightSum = total - leftSum - nums[i]; // everything after i
    if (leftSum === rightSum) return i;
    leftSum += nums[i];
  }
  return -1;
}
