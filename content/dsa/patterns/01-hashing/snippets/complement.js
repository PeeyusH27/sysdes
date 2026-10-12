// Template 3: complement lookup. For each x, the partner it needs is target - x: look it up among the values
// already passed, THEN record x. Looking up first means x never pairs with itself.
export function countPairs(nums, target) {
  const seen = new Map();   // value → how many times it has appeared so far
  let pairs = 0;
  for (const x of nums) {
    pairs += seen.get(target - x) ?? 0;   // x pairs with every earlier copy of its complement
    seen.set(x, (seen.get(x) ?? 0) + 1);
  }
  return pairs;
}
