# Template 3: keep every key's history in time order (appends keep it sorted), then binary search it.
# last_at_or_before returns the index of the newest entry with time <= t, or -1.
from typing import Dict, List, Tuple


def last_at_or_before(history: List[Tuple[int, str]], t: int) -> int:
    lo, hi = 0, len(history)   # hi: first index whose time is greater than t
    while lo < hi:
        mid = (lo + hi) // 2
        if history[mid][0] <= t:
            lo = mid + 1
        else:
            hi = mid
    return lo - 1


class TimeMap:
    def __init__(self) -> None:
        self.history: Dict[str, List[Tuple[int, str]]] = {}   # key -> [(time, value), ...] sorted by time

    def set(self, key: str, value: str, time: int) -> None:
        self.history.setdefault(key, []).append((time, value))

    def get(self, key: str, time: int) -> str:
        entries = self.history.get(key)
        if not entries:
            return ""
        i = last_at_or_before(entries, time)
        return "" if i == -1 else entries[i][1]
