# Template 1: a hash map for O(1) lookup + a doubly linked list for O(1) "move to front" and "evict the oldest".
# head.next is the most recently used entry, tail.prev the least recently used. Sentinels remove edge cases.
from collections import OrderedDict
from typing import Dict, Optional


class Entry:
    def __init__(self, key: int, val: int) -> None:
        self.key = key
        self.val = val
        self.prev: Optional["Entry"] = None
        self.next: Optional["Entry"] = None


class LRUCache:
    def __init__(self, capacity: int) -> None:
        self.capacity = capacity
        self.entries: Dict[int, Entry] = {}   # key -> Entry
        self.head = Entry(0, 0)
        self.tail = Entry(0, 0)
        self.head.next = self.tail
        self.tail.prev = self.head

    def _unlink(self, e: Entry) -> None:
        e.prev.next = e.next
        e.next.prev = e.prev

    def _push_front(self, e: Entry) -> None:
        e.prev = self.head
        e.next = self.head.next
        self.head.next.prev = e
        self.head.next = e

    def get(self, key: int) -> int:
        e = self.entries.get(key)
        if e is None:
            return -1
        self._unlink(e)   # a read is a use: move to the front
        self._push_front(e)
        return e.val

    def put(self, key: int, value: int) -> None:
        old = self.entries.get(key)
        if old is not None:
            old.val = value
            self._unlink(old)
            self._push_front(old)
            return
        if len(self.entries) == self.capacity:
            lru = self.tail.prev   # nobody touched it for the longest time
            self._unlink(lru)
            del self.entries[lru.key]   # the node remembers its key for exactly this
        e = Entry(key, value)
        self.entries[key] = e
        self._push_front(e)


# The shortcut: OrderedDict remembers insertion order and can move a key to the end in O(1).
class LRUCacheOrdered:
    def __init__(self, capacity: int) -> None:
        self.capacity = capacity
        self.data: "OrderedDict[int, int]" = OrderedDict()   # oldest key first

    def get(self, key: int) -> int:
        if key not in self.data:
            return -1
        self.data.move_to_end(key)   # now the newest
        return self.data[key]

    def put(self, key: int, value: int) -> None:
        if key in self.data:
            self.data.move_to_end(key)
        self.data[key] = value
        if len(self.data) > self.capacity:
            self.data.popitem(last=False)   # evict the oldest
