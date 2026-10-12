function canJump(nums) {
  let reach = 0;                          // furthest index we know we can get to
  for (let i = 0; i < nums.length; i++) {
    if (i > reach) return false;          // i can't be reached, so nothing after it can be either
    reach = Math.max(reach, i + nums[i]);
    if (reach >= nums.length - 1) return true;
  }
  return true;
}
