// Template 2: monotonic decreasing stack. For each index, the index of the first strictly greater value to its
// right, or -1. The stack holds indices still waiting for an answer; their values never rise from bottom to top.
export function nextGreaterIndex(nums) {
  const answer = new Array(nums.length).fill(-1);
  const stack = [];
  for (let i = 0; i < nums.length; i++) {
    while (stack.length && nums[stack.at(-1)] < nums[i]) {
      answer[stack.pop()] = i; // nums[i] resolves every smaller value waiting on top
    }
    stack.push(i);
  }
  return answer;
}

// Template 3: monotonic increasing stack. right[i] is the first index to the right with a smaller value (n if none);
// left[i] is the nearest index to the left with a value that is not larger (-1 if none).
// Each pop resolves the popped index's right side; the top left after popping is the current index's left side.
export function smallerNeighbours(nums) {
  const n = nums.length;
  const left = new Array(n).fill(-1);
  const right = new Array(n).fill(n);
  const stack = [];
  for (let i = 0; i < n; i++) {
    while (stack.length && nums[stack.at(-1)] > nums[i]) {
      right[stack.pop()] = i;
    }
    left[i] = stack.length ? stack.at(-1) : -1;
    stack.push(i);
  }
  return { left, right };
}
