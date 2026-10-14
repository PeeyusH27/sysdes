# Template 1: running sums. prefix[i] is the sum of the first i values (prefix[0] = 0), so
# sum(nums[l..r]) = prefix[r + 1] - prefix[l] for any range, in O(1) after an O(n) build.
from typing import List


def build_prefix(nums: List[int]) -> List[int]:
    prefix = [0] * (len(nums) + 1)
    for i, x in enumerate(nums):
        prefix[i + 1] = prefix[i] + x
    return prefix


def range_sum(prefix: List[int], left: int, right: int) -> int:
    return prefix[right + 1] - prefix[left]   # inclusive on both ends
