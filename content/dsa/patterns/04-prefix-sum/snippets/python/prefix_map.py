# Template 2: prefix sum + hash map. sum(nums[i+1..j]) = P(j) - P(i), so a subarray ending at j sums to k
# exactly when an EARLIER prefix equals P(j) - k. Works with negative numbers, unlike a sliding window.
# Longest version: remember the FIRST index of each prefix sum (earliest start = longest subarray).
from typing import Dict, List


def longest_subarray_with_sum(nums: List[int], k: int) -> int:
    first_index: Dict[int, int] = {0: -1}   # the empty prefix, "before index 0"
    total = 0
    best = 0
    for j, x in enumerate(nums):
        total += x
        if total - k in first_index:
            best = max(best, j - first_index[total - k])
        if total not in first_index:
            first_index[total] = j          # never overwrite: keep the earliest
    return best
