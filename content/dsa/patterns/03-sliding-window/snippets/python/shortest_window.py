# Template 3: variable window, SHORTEST valid. Grow right until the window is valid; then, while it stays
# valid, record it and shrink left. Example rule: sum >= target, with positive numbers only.
from typing import List


def shortest_sum_at_least(nums: List[int], target: int) -> int:
    left = 0
    total = 0
    best = float("inf")
    for right, x in enumerate(nums):
        total += x
        while total >= target:                  # valid: record BEFORE shrinking
            best = min(best, right - left + 1)
            total -= nums[left]
            left += 1
    return 0 if best == float("inf") else int(best)
