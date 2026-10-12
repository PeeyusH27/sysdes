// Sliding window maximum with a monotonic deque of indices.
// The values at those indices only decrease from front to back, so the front is the max.
// Items leave the front (out of the window) or the back (beaten by a bigger value) but
// never enter at the front, so an array plus a head index is all the deque we need.
function maxSlidingWindow(nums, k) {
  const dq = [];                         // indices; the live part is dq[head..]
  let head = 0;
  const out = [];
  for (let i = 0; i < nums.length; i++) {
    while (dq.length > head && nums[dq[dq.length - 1]] <= nums[i]) dq.pop(); // smaller values can never be a max again
    dq.push(i);
    if (dq[head] <= i - k) head++;       // the front index slid out of the window
    if (i >= k - 1) out.push(nums[dq[head]]);
  }
  return out;
}
console.log(maxSlidingWindow([1, 3, -1, -3, 5, 3, 6, 7], 3)); // [3, 3, 5, 5, 6, 7]
console.log(maxSlidingWindow([9, 8, 7, 6], 2));                // [9, 8, 7]
