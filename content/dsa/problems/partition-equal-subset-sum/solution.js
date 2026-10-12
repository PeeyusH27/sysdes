function canPartition(nums) {
  const total = nums.reduce((sum, x) => sum + x, 0);
  if (total % 2 !== 0) return false; // two equal halves need an even total
  const target = total / 2;
  // reachable[s]: some subset of the numbers processed so far adds up to exactly s
  const reachable = new Array(target + 1).fill(false);
  reachable[0] = true; // the empty subset
  for (const x of nums) {
    // go DOWN so reachable[s - x] still describes subsets without x: each number is used at most once
    for (let s = target; s >= x; s--) {
      if (reachable[s - x]) reachable[s] = true;
    }
  }
  return reachable[target];
}
