# A single float result (compare: float).
from typing import List


def find_max_average(nums: List[int], k: int) -> float:
    window = best = sum(nums[:k])
    for i in range(k, len(nums)):
        window += nums[i] - nums[i - k]
        best = max(best, window)
    return best / k
