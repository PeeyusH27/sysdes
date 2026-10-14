from __future__ import annotations

from typing import Any, Callable, Iterable, List

from heap import Heap


# Template 2: top k. To keep the k LARGEST values, keep a MIN-heap of size k: its top is the
# weakest of the current top k, the one to evict when something bigger arrives. O(n log k).
def k_largest(nums: Iterable[int], k: int) -> List[int]:
    heap = Heap(lambda a, b: a - b)
    for x in nums:
        heap.push(x)
        if heap.size() > k:
            heap.pop()                 # drop the smallest: it is not in the top k
    out = []
    while heap.size() > 0:
        out.append(heap.pop())
    out.reverse()                      # largest first
    return out


# The mirror image: the k SMALLEST items by some key need a MAX-heap of size k.
def k_smallest_by(items: Iterable[Any], k: int, key: Callable[[Any], float]) -> List[Any]:
    heap = Heap(lambda a, b: key(b) - key(a))
    for item in items:
        heap.push(item)
        if heap.size() > k:
            heap.pop()                 # drop the largest key
    out = []
    while heap.size() > 0:
        out.append(heap.pop())
    out.reverse()                      # smallest key first
    return out
