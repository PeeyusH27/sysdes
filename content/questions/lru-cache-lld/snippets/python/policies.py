from collections import OrderedDict
from typing import Dict, Generic, Hashable, Optional, TypeVar

K = TypeVar("K", bound=Hashable)


class EvictionPolicy(Generic[K]):
    """Strategy: the cache owns the data, the policy owns the order. A policy answers one question: who goes next?"""

    def on_insert(self, key: K) -> None: raise NotImplementedError
    def on_access(self, key: K) -> None: raise NotImplementedError
    def on_remove(self, key: K) -> None: raise NotImplementedError
    def victim(self) -> Optional[K]: raise NotImplementedError  # None when empty


class _Node(Generic[K]):
    __slots__ = ("key", "prev", "next")

    def __init__(self, key: Optional[K]):
        self.key = key
        self.prev: "Optional[_Node[K]]" = None
        self.next: "Optional[_Node[K]]" = None


class LruPolicy(EvictionPolicy[K]):
    def __init__(self) -> None:
        self._nodes: Dict[K, _Node[K]] = {}  # key -> node, so any key is found in O(1)
        self._head: _Node[K] = _Node(None)  # sentinels: the ends need no None checks
        self._tail: _Node[K] = _Node(None)
        self._head.next, self._tail.prev = self._tail, self._head

    @staticmethod
    def _unlink(n: _Node[K]) -> None:
        n.prev.next, n.next.prev = n.next, n.prev

    def _push_front(self, n: _Node[K]) -> None:
        n.next, n.prev = self._head.next, self._head
        self._head.next.prev = n
        self._head.next = n

    def on_insert(self, key: K) -> None:
        self._nodes[key] = n = _Node(key)
        self._push_front(n)

    def on_access(self, key: K) -> None:  # newest to the front
        n = self._nodes[key]
        self._unlink(n)
        self._push_front(n)

    def on_remove(self, key: K) -> None:
        self._unlink(self._nodes.pop(key))

    def victim(self) -> Optional[K]:  # the back is the oldest
        return None if self._tail.prev is self._head else self._tail.prev.key


class FifoPolicy(EvictionPolicy[K]):
    def __init__(self) -> None:
        self._order: "OrderedDict[K, None]" = OrderedDict()  # remembers insertion order

    def on_insert(self, key: K) -> None: self._order[key] = None
    def on_access(self, key: K) -> None: pass  # reads do not change who is next
    def on_remove(self, key: K) -> None: del self._order[key]

    def victim(self) -> Optional[K]:
        return next(iter(self._order), None)
