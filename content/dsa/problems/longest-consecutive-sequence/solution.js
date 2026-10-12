function longestConsecutive(nums) {
  const values = new Set(nums);
  let best = 0;
  for (const x of values) {           // iterate the set: duplicates are visited once
    if (values.has(x - 1)) continue;  // x is not where a run starts
    let length = 1;
    while (values.has(x + length)) length++;
    best = Math.max(best, length);
  }
  return best;
}
