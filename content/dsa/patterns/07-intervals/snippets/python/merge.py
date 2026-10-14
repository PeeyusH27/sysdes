from __future__ import annotations

from typing import List


# Template 1: sort by start, then sweep. The last interval in `merged` is the group still being built;
# an interval that starts after its end can never be reached by anything later, so the group is final.
def merge_intervals(intervals: List[List[int]]) -> List[List[int]]:
    merged: List[List[int]] = []
    for start, end in sorted(intervals, key=lambda iv: iv[0]):  # sorted() copies: the caller's list keeps its order
        if merged and start <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], end)  # overlaps (or touches): stretch
        else:
            merged.append([start, end])              # a gap: start a new group
    return merged


# Total length covered by at least one interval: merge first, then nothing is counted twice.
def covered_length(intervals: List[List[int]]) -> int:
    return sum(e - s for s, e in merge_intervals(intervals))
