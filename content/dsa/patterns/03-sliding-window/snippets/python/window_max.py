# Template 4: monotonic deque. Holds indices whose values DECREASE from front to back, so the front is
# always the maximum of the current window. Every index is pushed once and popped once: O(n) overall.
from collections import deque
from typing import List


def window_max(nums: List[int], k: int) -> List[int]:
    dq = deque()   # indices; a deque pops from either end in O(1), so no moving head is needed
    out = []
    for i, x in enumerate(nums):
        if dq and dq[0] <= i - k:
            dq.popleft()                        # front index slid out
        while dq and nums[dq[-1]] <= x:
            dq.pop()                            # can never be a max again
        dq.append(i)
        if i >= k - 1:
            out.append(nums[dq[0]])             # window [i - k + 1, i] is full
    return out
