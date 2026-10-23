# Template 2: group keys into buckets by use count. A hit moves a key from bucket c to bucket c + 1 only,
# so eviction needs just the lowest non-empty count (min_count) and, inside it, the oldest key.
from collections import OrderedDict
from typing import Dict


class LFUCache:
    def __init__(self, capacity: int) -> None:
        self.capacity = capacity
        self.values: Dict[int, int] = {}   # key -> value
        self.counts: Dict[int, int] = {}   # key -> use count
        self.buckets: Dict[int, "OrderedDict[int, None]"] = {}   # count -> keys, oldest first
        self.min_count = 0

    def _touch(self, key: int) -> None:
        c = self.counts[key]
        bucket = self.buckets[c]
        del bucket[key]
        if not bucket:
            del self.buckets[c]
            if self.min_count == c:
                self.min_count = c + 1   # the key itself just moved to c + 1
        self.counts[key] = c + 1
        self.buckets.setdefault(c + 1, OrderedDict())[key] = None

    def get(self, key: int) -> int:
        if key not in self.values:
            return -1
        self._touch(key)
        return self.values[key]

    def put(self, key: int, value: int) -> None:
        if self.capacity == 0:
            return
        if key in self.values:
            self.values[key] = value
            self._touch(key)
            return
        if len(self.values) == self.capacity:
            bucket = self.buckets[self.min_count]
            oldest, _ = bucket.popitem(last=False)   # fewest uses, and the oldest among ties
            if not bucket:
                del self.buckets[self.min_count]
            del self.values[oldest]
            del self.counts[oldest]
        self.values[key] = value
        self.counts[key] = 1
        self.buckets.setdefault(1, OrderedDict())[key] = None
        self.min_count = 1   # a new key always has the lowest count
