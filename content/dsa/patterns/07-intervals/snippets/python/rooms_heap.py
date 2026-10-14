from __future__ import annotations

import heapq
from typing import List


# Template 2b: rooms needed for half-open meetings. Take meetings by start; the heap holds the end time of each
# busy room, so its top is the room that frees up first. Reuse it if it is free, otherwise open a new room.
# (heapq is Python's built-in binary min-heap, so there is no hand-written MinHeap here as in the JavaScript.)
def min_rooms(intervals: List[List[int]]) -> int:
    ends: List[int] = []
    for start, end in sorted(intervals, key=lambda iv: iv[0]):
        if ends and ends[0] <= start:
            heapq.heappop(ends)  # that room is free again: hand it over
        heapq.heappush(ends, end)
    return len(ends)
