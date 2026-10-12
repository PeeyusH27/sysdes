function lengthOfLIS(nums) {
  const len = new Array(nums.length).fill(1); // len[i]: longest increasing subsequence ending with nums[i]
  let best = 1;
  for (let i = 1; i < nums.length; i++) {
    for (let j = 0; j < i; j++) {
      // nums[i] can extend any chain that ends with a smaller value
      if (nums[j] < nums[i] && len[j] + 1 > len[i]) len[i] = len[j] + 1;
    }
    best = Math.max(best, len[i]);
  }
  return best;
}
