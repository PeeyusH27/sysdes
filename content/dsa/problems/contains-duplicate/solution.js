function containsDuplicate(nums) {
  const seen = new Set();
  for (const x of nums) {
    if (seen.has(x)) return true; // we have met this value before
    seen.add(x);
  }
  return false;
}
