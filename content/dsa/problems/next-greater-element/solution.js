function nextGreater(nums) {
  const answer = new Array(nums.length).fill(-1);
  const stack = []; // indices still waiting for a greater value; their values never increase from bottom to top
  for (let i = 0; i < nums.length; i++) {
    while (stack.length && nums[stack[stack.length - 1]] < nums[i]) {
      answer[stack.pop()] = nums[i]; // nums[i] is the first greater value to the right of the popped index
    }
    stack.push(i);
  }
  return answer;
}
