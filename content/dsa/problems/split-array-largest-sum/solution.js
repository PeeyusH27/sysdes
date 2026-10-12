function splitArray(nums, k) {
  // Fewest pieces needed if no piece may sum to more than `limit` (fill each piece as far as it goes).
  const piecesNeeded = (limit) => {
    let pieces = 1;
    let sum = 0;
    for (const x of nums) {
      if (sum + x > limit) {   // x doesn't fit: close this piece and start a new one with x
        pieces++;
        sum = 0;
      }
      sum += x;
    }
    return pieces;
  };
  let lo = Math.max(...nums);                 // some piece must hold the biggest element
  let hi = nums.reduce((a, b) => a + b, 0);   // a single piece holds everything
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (piecesNeeded(mid) <= k) hi = mid;     // this limit is achievable: try a smaller one
    else lo = mid + 1;                        // needs more than k pieces: allow bigger sums
  }
  return lo;
}
