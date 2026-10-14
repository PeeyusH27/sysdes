from __future__ import annotations

from typing import Any, List, Optional


# A queue on top of a list and a head index. push() is O(1) and so is shift() here: it only moves head.
# list.pop(0) moves every remaining element down one slot, so a big BFS that uses it is O(n^2).
# (In real code collections.deque does this for you; this shows what it saves you from.)
class ArrayQueue:
    def __init__(self) -> None:
        self._items: List[Any] = []
        self._head = 0

    def push(self, item: Any) -> None:
        self._items.append(item)

    def shift(self) -> Optional[Any]:
        if self._head == len(self._items):
            return None
        item = self._items[self._head]
        self._head += 1
        if self._head > 1024 and self._head * 2 > len(self._items):
            self._items = self._items[self._head:]  # now and then, drop the used prefix to free memory
            self._head = 0
        return item

    @property
    def size(self) -> int:
        return len(self._items) - self._head
