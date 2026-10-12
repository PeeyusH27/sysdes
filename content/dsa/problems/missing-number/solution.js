function missingNumber(nums) {
  // XOR every index 0..n and every value: each number that is present appears twice and
  // cancels, so only the missing one is left. Start at n, the one index the loop doesn't reach.
  let result = nums.length;
  for (let i = 0; i < nums.length; i++) result ^= i ^ nums[i];
  return result;
}
