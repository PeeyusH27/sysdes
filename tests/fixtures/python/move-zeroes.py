# In place (inPlace: 0): mutates nums and returns None; the harness reports nums after the call.
from typing import List


def move_zeroes(nums: List[int]) -> None:
    write = 0
    for read in range(len(nums)):
        if nums[read] != 0:
            nums[write], nums[read] = nums[read], nums[write]
            write += 1
