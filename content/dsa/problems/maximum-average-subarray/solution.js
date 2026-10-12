function findMaxAverage(nums, k) {
  let sum = 0;
  for (let i = 0; i < k; i++) sum += nums[i]; // the first window: nums[0..k-1]
  let best = sum;
  for (let right = k; right < nums.length; right++) {
    sum += nums[right] - nums[right - k];     // one value enters, one leaves
    best = Math.max(best, sum);
  }
  return best / k; // equal lengths: the largest sum has the largest average
}
