function maxSubArray(nums) {
  let endingHere = nums[0]; // best sum of a subarray that ends at the current index
  let best = nums[0];
  for (let i = 1; i < nums.length; i++) {
    // extend the best run ending at i - 1, or start fresh at i when that run would only drag it down
    endingHere = Math.max(nums[i], endingHere + nums[i]);
    best = Math.max(best, endingHere);
  }
  return best;
}
