function subarraySum(nums, k) {
  const seen = new Map([[0, 1]]); // running sum → how many prefixes had it (the empty prefix sums to 0)
  let sum = 0;
  let count = 0;
  for (const x of nums) {
    sum += x;
    count += seen.get(sum - k) ?? 0;          // each earlier prefix with sum - k starts a subarray summing to k
    seen.set(sum, (seen.get(sum) ?? 0) + 1);  // record AFTER the lookup
  }
  return count;
}
