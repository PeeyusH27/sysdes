function robCircle(nums) {
  const n = nums.length;
  if (n === 1) return nums[0]; // a single house can simply be robbed

  // Classic line version on nums[lo..hi].
  const robLine = (lo, hi) => {
    let skip = 0; // best total up to two houses back
    let take = 0; // best total up to the previous house
    for (let i = lo; i <= hi; i++) {
      const next = Math.max(take, skip + nums[i]);
      skip = take;
      take = next;
    }
    return take;
  };

  // The first and last house can't both be robbed: drop one of them.
  return Math.max(robLine(0, n - 2), robLine(1, n - 1));
}
