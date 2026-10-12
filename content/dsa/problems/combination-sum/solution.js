function combinationSum(candidates, target) {
  const nums = [...candidates].sort((a, b) => a - b);
  const result = [];
  const path = [];

  function backtrack(start, remaining) {
    if (remaining === 0) {
      result.push([...path]);
      return;
    }
    for (let i = start; i < nums.length; i++) {
      if (nums[i] > remaining) break;    // sorted: every later candidate is too big as well
      path.push(nums[i]);                // choose
      backtrack(i, remaining - nums[i]); // explore: i, not i + 1, because nums[i] may be reused
      path.pop();                        // un-choose
    }
  }

  backtrack(0, target);
  return result;
}
