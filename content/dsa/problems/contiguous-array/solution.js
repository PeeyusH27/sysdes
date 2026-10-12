function findMaxLength(nums) {
  const firstIndex = new Map([[0, -1]]); // balance → first index where it occurred (0 before the array starts)
  let balance = 0; // (number of 1s) - (number of 0s) so far
  let best = 0;
  for (let i = 0; i < nums.length; i++) {
    balance += nums[i] === 1 ? 1 : -1;
    if (firstIndex.has(balance)) best = Math.max(best, i - firstIndex.get(balance));
    else firstIndex.set(balance, i); // keep only the earliest index: it gives the longest subarray
  }
  return best;
}
