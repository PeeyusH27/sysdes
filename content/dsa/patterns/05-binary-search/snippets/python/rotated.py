# Template 3: a sorted list of distinct values, rotated. Returns the index of the minimum (where the rotation starts).
# Compare with nums[hi]: if nums[mid] > nums[hi], the drop, and so the minimum, is to the right of mid.
from typing import List


def find_min_index(nums: List[int]) -> int:
    lo = 0
    hi = len(nums) - 1
    while lo < hi:
        mid = (lo + hi) // 2
        if nums[mid] > nums[hi]:
            lo = mid + 1             # mid is in the upper run: the minimum comes after it
        else:
            hi = mid                 # mid is in the lower run: the minimum is mid or before it
    return lo
