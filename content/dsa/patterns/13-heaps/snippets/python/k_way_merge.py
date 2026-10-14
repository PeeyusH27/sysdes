from __future__ import annotations

from typing import List

from heap import Heap


# Template 3: k-way merge. The next output is always the smallest of the k current heads,
# so keep one entry per input in a min-heap. Each of the N items is pushed and popped once: O(N log k).
def merge_sorted_arrays(arrays: List[List[int]]) -> List[int]:
    # Entries are (value, list, index): the value on top, and where to find that input's next item.
    heap = Heap(lambda a, b: a[0] - b[0])
    for list_i, arr in enumerate(arrays):
        if arr:
            heap.push((arr[0], list_i, 0))
    out = []
    while heap.size() > 0:
        value, list_i, index = heap.pop()
        out.append(value)
        nxt = index + 1
        if nxt < len(arrays[list_i]):
            heap.push((arrays[list_i][nxt], list_i, nxt))  # advance that input
    return out
