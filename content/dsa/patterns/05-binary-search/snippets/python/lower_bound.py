# Template 2: first true. ok(i) must be false for a prefix of [lo, hi) and true for the rest.
# Returns the first i with ok(i), or hi if there is none. Invariant: the answer is always in [lo, hi].
from typing import Callable, List


def first_true(lo: int, hi: int, ok: Callable[[int], bool]) -> int:
    while lo < hi:
        mid = (lo + hi) // 2         # lo <= mid < hi, so both updates shrink the range
        if ok(mid):
            hi = mid                 # mid might be the first true: keep it
        else:
            lo = mid + 1             # mid is false, and so is everything before it
    return lo                        # lo == hi


# First index with nums[i] >= target, or len(nums): the first copy of target, or where it would be inserted.
def lower_bound(nums: List[int], target: int) -> int:
    return first_true(0, len(nums), lambda i: nums[i] >= target)


# First index with nums[i] > target: one past the last copy of target.
def upper_bound(nums: List[int], target: int) -> int:
    return first_true(0, len(nums), lambda i: nums[i] > target)


# How many values lie in [low, high]? Two bounds, O(log n), no scanning.
def count_in_range(nums: List[int], low: int, high: int) -> int:
    return max(0, upper_bound(nums, high) - lower_bound(nums, low))
