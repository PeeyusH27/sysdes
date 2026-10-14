# Template 1: exact match on a sorted list.
# Invariant: if target is anywhere in nums, it is inside nums[lo..hi] (both ends included).
from typing import List


def binary_search(nums: List[int], target: int) -> int:
    lo = 0
    hi = len(nums) - 1
    while lo <= hi:                  # the range is not empty
        mid = (lo + hi) // 2         # rounds down; Python ints never overflow
        if nums[mid] == target:
            return mid
        if nums[mid] < target:
            lo = mid + 1             # mid and everything left of it are too small
        else:
            hi = mid - 1             # mid and everything right of it are too big
    return -1                        # empty range: target is not in nums
