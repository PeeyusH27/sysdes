# Template 1: fixed-size window. Neighbouring windows share k - 1 elements, so update the summary
# with the element that enters and the one that leaves instead of recomputing it: O(n), not O(n * k).
from typing import List, Optional


def max_window_sum(nums: List[int], k: int) -> Optional[int]:
    if k <= 0 or k > len(nums):
        return None
    total = sum(nums[:k])                 # the first full window ends at index k - 1
    best = total
    for right in range(k, len(nums)):
        total += nums[right] - nums[right - k]   # nums[right] enters, nums[right - k] leaves
        best = max(best, total)
    return best
