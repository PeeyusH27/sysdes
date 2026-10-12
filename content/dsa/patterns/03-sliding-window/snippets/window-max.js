// Template 4: monotonic deque. Holds indices whose values DECREASE from front to back, so the front is
// always the maximum of the current window. Every index is pushed once and popped once: O(n) overall.
export function windowMax(nums, k) {
  const dq = [];      // indices; dq[head..] is the live part of the deque
  let head = 0;       // moving head instead of dq.shift(), which is O(n)
  const out = [];
  for (let i = 0; i < nums.length; i++) {
    if (head < dq.length && dq[head] <= i - k) head++;               // front index slid out
    while (dq.length > head && nums[dq.at(-1)] <= nums[i]) dq.pop(); // can never be a max again
    dq.push(i);
    if (i >= k - 1) out.push(nums[dq[head]]);                        // window [i - k + 1, i] is full
  }
  return out;
}
