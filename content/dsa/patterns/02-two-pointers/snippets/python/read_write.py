# Template 2: same direction. `read` visits every element; `write` marks the end of the part you keep.
# Everything before `write` is final, so the list is compacted in place with O(1) extra space.
from typing import List


def remove_duplicates(nums: List[int]) -> int:
    if not nums:
        return 0
    write = 1
    for read in range(1, len(nums)):
        if nums[read] != nums[write - 1]:   # a value we haven't kept yet
            nums[write] = nums[read]
            write += 1
    return write                            # length of the unique prefix
