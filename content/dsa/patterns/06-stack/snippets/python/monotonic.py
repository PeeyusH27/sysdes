# Template 2: monotonic decreasing stack. For each index, the index of the first strictly greater value to its
# right, or -1. The stack holds indices still waiting for an answer; their values never rise from bottom to top.
from typing import List, NamedTuple


def next_greater_index(nums: List[int]) -> List[int]:
    answer = [-1] * len(nums)
    stack: List[int] = []
    for i, x in enumerate(nums):
        while stack and nums[stack[-1]] < x:
            answer[stack.pop()] = i   # nums[i] resolves every smaller value waiting on top
        stack.append(i)
    return answer


class Neighbours(NamedTuple):
    left: List[int]
    right: List[int]


# Template 3: monotonic increasing stack. right[i] is the first index to the right with a smaller value (n if none);
# left[i] is the nearest index to the left with a value that is not larger (-1 if none).
# Each pop resolves the popped index's right side; the top left after popping is the current index's left side.
def smaller_neighbours(nums: List[int]) -> Neighbours:
    n = len(nums)
    left = [-1] * n
    right = [n] * n
    stack: List[int] = []
    for i, x in enumerate(nums):
        while stack and nums[stack[-1]] > x:
            right[stack.pop()] = i
        left[i] = stack[-1] if stack else -1
        stack.append(i)
    return Neighbours(left, right)
