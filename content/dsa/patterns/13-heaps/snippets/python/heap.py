from __future__ import annotations

from typing import Any, Callable, List, Optional

# Template 1: a binary heap. Python's heapq only orders by the items themselves, so a custom
# comparator needs this class; write it once and reuse it.
# The heap lives in a list: the parent of index i is (i - 1) >> 1, its children are 2i + 1 and 2i + 2.
# compare(a, b) < 0 means a leaves first: (a, b) -> a - b is a min-heap, (a, b) -> b - a a max-heap.
class Heap:
    def __init__(self, compare: Optional[Callable[[Any, Any], float]] = None) -> None:
        self.items: List[Any] = []
        self.compare = compare if compare is not None else (lambda a, b: a - b)

    def size(self) -> int:
        return len(self.items)

    def peek(self) -> Any:
        return self.items[0] if self.items else None  # None when empty

    def push(self, value: Any) -> None:
        self.items.append(value)              # add as the last leaf...
        self.sift_up(len(self.items) - 1)     # ...and float it up past larger parents

    def pop(self) -> Any:
        items = self.items
        if not items:
            return None
        top = items[0]
        last = items.pop()
        if items:
            items[0] = last                   # move the last leaf to the root...
            self.sift_down(0)                 # ...and sink it below smaller children
        return top

    def sift_up(self, i: int) -> None:
        items = self.items
        while i > 0:
            parent = (i - 1) >> 1
            if self.compare(items[i], items[parent]) >= 0:
                break                         # parent already comes first
            items[i], items[parent] = items[parent], items[i]
            i = parent

    def sift_down(self, i: int) -> None:
        items = self.items
        while True:
            left = 2 * i + 1
            right = left + 1
            best = i                          # whichever of i, left, right should come first
            if left < len(items) and self.compare(items[left], items[best]) < 0:
                best = left
            if right < len(items) and self.compare(items[right], items[best]) < 0:
                best = right
            if best == i:
                return
            items[i], items[best] = items[best], items[i]
            i = best
