from __future__ import annotations

from typing import List

from heap import Heap


# Template 4: two heaps. `low` (a max-heap) holds the smaller half, `high` (a min-heap) the larger half,
# with low.size() == high.size() or one more. The median is then low's top, or the average of both tops.
def running_medians(nums: List[int]) -> List[float]:
    low = Heap(lambda a, b: b - a)
    high = Heap(lambda a, b: a - b)
    medians = []
    for x in nums:
        low.push(x)
        high.push(low.pop())                                   # keeps every low value <= every high value
        if high.size() > low.size():
            low.push(high.pop())                               # keeps the sizes balanced
        medians.append(low.peek() if low.size() > high.size() else (low.peek() + high.peek()) / 2)
    return medians
