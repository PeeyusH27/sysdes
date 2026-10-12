function singleNumber(nums) {
  // x ^ x = 0 and x ^ 0 = x, and XOR doesn't care about order:
  // every pair cancels itself out and only the lonely number survives.
  let result = 0;
  for (const x of nums) result ^= x;
  return result;
}
