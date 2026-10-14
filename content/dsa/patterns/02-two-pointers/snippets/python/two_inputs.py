# Template 3: one pointer per input (or both ends of one input) feeding an output.
# The largest square of a sorted list sits at one of its two ends, so fill the result from the back.
from typing import List


def sorted_squares(nums: List[int]) -> List[int]:
    out = [0] * len(nums)
    left = 0
    right = len(nums) - 1
    for pos in range(len(nums) - 1, -1, -1):
        a = nums[left] ** 2
        b = nums[right] ** 2
        if a > b:
            out[pos] = a
            left += 1
        else:
            out[pos] = b
            right -= 1
    return out


# The same shape merges two sorted lists: compare the heads, take the smaller, advance that pointer.
def merge_sorted(a: List[int], b: List[int]) -> List[int]:
    out = []
    i = 0
    j = 0
    while i < len(a) and j < len(b):
        if a[i] <= b[j]:
            out.append(a[i])
            i += 1
        else:
            out.append(b[j])
            j += 1
    out.extend(a[i:])     # at most one of these two has anything left
    out.extend(b[j:])
    return out
