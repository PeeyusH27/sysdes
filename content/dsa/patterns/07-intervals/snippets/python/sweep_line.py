from __future__ import annotations

from typing import List, Tuple


# Template 2a: sweep line. Every interval [start, end) becomes +1 at its start and -1 at its end.
# Sorted by time (ends before starts on ties), the running sum is how many intervals are open right now.
def max_overlap(intervals: List[List[int]]) -> int:
    events: List[Tuple[int, int]] = []
    for start, end in intervals:
        events.append((start, +1))
        events.append((end, -1))
    events.sort()  # tuples sort by time, then delta: at equal times, -1 sorts before +1
    open_now = 0
    most = 0
    for _, delta in events:
        open_now += delta
        most = max(most, open_now)
    return most
