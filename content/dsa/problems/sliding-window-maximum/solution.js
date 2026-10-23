function maxSlidingWindow(nums, k) {
  const result = [];
  const deque = []; // indices; their values decrease from front to back
  let head = 0; // front of the deque (avoids the O(n) cost of shift)
  for (let i = 0; i < nums.length; i++) {
    if (head < deque.length && deque[head] <= i - k) head++; // front index left the window
    while (deque.length > head && nums[deque[deque.length - 1]] <= nums[i]) deque.pop(); // smaller values can never win again
    deque.push(i);
    if (i >= k - 1) result.push(nums[deque[head]]); // the front is the window maximum
  }
  return result;
}
