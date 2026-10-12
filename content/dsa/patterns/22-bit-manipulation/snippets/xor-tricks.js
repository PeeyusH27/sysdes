// Template 2: XOR cancellation. x ^ x = 0, x ^ 0 = x, and the order doesn't matter, so
// XOR-ing a list leaves exactly the bits of the values that appear an odd number of times.
export function xorAll(nums) {
  let acc = 0;
  for (const x of nums) acc ^= x;
  return acc;
}

// Missing number in 0..n: XOR every index and value; present numbers appear twice and cancel.
export function missingNumber(nums) {
  let acc = nums.length;
  for (let i = 0; i < nums.length; i++) acc ^= i ^ nums[i];
  return acc;
}

// Two values appear once, all others twice. a ^ b is non-zero, so pick a bit where a and b differ
// and XOR each half separately: each half then holds exactly one of the two singles.
export function twoSingles(nums) {
  const both = xorAll(nums);
  const bit = both & -both;               // lowest set bit of a ^ b
  let a = 0;
  for (const x of nums) if (x & bit) a ^= x;
  return [a, both ^ a].sort((x, y) => x - y);
}
