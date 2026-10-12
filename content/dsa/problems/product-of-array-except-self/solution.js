function productExceptSelf(nums) {
  const n = nums.length;
  const answer = new Array(n);
  // Pass 1: answer[i] = product of everything LEFT of i.
  let left = 1;
  for (let i = 0; i < n; i++) {
    answer[i] = left;
    left *= nums[i];
  }
  // Pass 2: multiply in the product of everything RIGHT of i.
  let right = 1;
  for (let i = n - 1; i >= 0; i--) {
    answer[i] *= right;
    right *= nums[i];
  }
  return answer;
}
