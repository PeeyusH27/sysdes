function twoSum(nums, target) {
  const indexOf = new Map(); // value → index where we saw it
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    if (indexOf.has(need)) return [indexOf.get(need), i];
    indexOf.set(nums[i], i); // store after the lookup, so nums[i] can't pair with itself
  }
  return []; // unreachable when an answer is guaranteed
}
