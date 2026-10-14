# Template 4: difference array. To add `delta` to every index in [left, right], write +delta at left and
# -delta at right + 1: O(1) per update. One running sum at the end turns the differences into values.
from typing import List


def apply_range_adds(n: int, updates: List[List[int]]) -> List[int]:
    diff = [0] * (n + 1)   # one spare slot so right + 1 never falls off
    for left, right, delta in updates:
        diff[left] += delta
        diff[right + 1] -= delta
    out = [0] * n
    running = 0
    for i in range(n):
        running += diff[i]
        out[i] = running
    return out
