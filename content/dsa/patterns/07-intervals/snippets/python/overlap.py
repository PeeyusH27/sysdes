from __future__ import annotations

from typing import List, Optional


# Closed intervals [start, end] share a point when each one starts no later than the other ends.
def overlaps(a: List[int], b: List[int]) -> bool:
    return a[0] <= b[1] and b[0] <= a[1]


# Half-open meetings [start, end): one ending at t and one starting at t don't clash, so the test is strict.
def clashes(a: List[int], b: List[int]) -> bool:
    return a[0] < b[1] and b[0] < a[1]


# The common part of two closed intervals: from the later start to the earlier end, or None if that's empty.
def intersect(a: List[int], b: List[int]) -> Optional[List[int]]:
    lo = max(a[0], b[0])
    hi = min(a[1], b[1])
    return [lo, hi] if lo <= hi else None
