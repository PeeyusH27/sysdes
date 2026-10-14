# Template 1: opposite ends. Works when the input is sorted (or symmetric, like a palindrome):
# the sum or comparison at the two ends tells you which end can never be part of the answer.
from typing import List


def pair_sum(nums: List[int], target: int) -> List[int]:
    left = 0
    right = len(nums) - 1
    while left < right:
        total = nums[left] + nums[right]
        if total == target:
            return [left, right]
        if total < target:
            left += 1     # nums[left] is too small for every remaining partner
        else:
            right -= 1    # nums[right] is too big for every remaining partner
    return [-1, -1]
