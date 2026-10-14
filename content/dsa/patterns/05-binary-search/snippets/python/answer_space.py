# Template 4: binary search on the answer. The answer is a number in [lo, hi], and "does x work?"
# flips from false to true exactly once as x grows. Here: the smallest ship capacity that delivers
# every package, in order, within `days` days.
from typing import List


def ship_within_days(weights: List[int], days: int) -> int:
    def days_needed(cap: int) -> int:
        used = 1
        load = 0
        for w in weights:
            if load + w > cap:       # this package doesn't fit today: start a new day
                used += 1
                load = 0
            load += w
        return used

    lo = max(weights)                # anything smaller can't carry the heaviest package
    hi = sum(weights)                # everything in one day always works
    while lo < hi:
        mid = (lo + hi) // 2
        if days_needed(mid) <= days:
            hi = mid                 # works: the answer is mid or smaller
        else:
            lo = mid + 1             # too small: the answer is bigger
    return lo


# "Maximize the minimum": the largest gap such that k items (2 <= k <= len(positions)) can sit at
# distinct positions with every two of them at least `gap` apart. Here "works" goes true...true, false...false,
# so search for the first gap that fails and step back by one.
def max_min_distance(positions: List[int], k: int) -> int:
    ordered = sorted(positions)

    def can_place(gap: int) -> bool:
        placed = 1
        last = ordered[0]
        for p in ordered:
            if p - last >= gap:      # greedy: take the earliest position that is far enough
                placed += 1
                last = p
        return placed >= k

    lo = 1                           # a gap of 1 always works
    hi = ordered[-1] - ordered[0] + 1   # wider than the whole span: always fails
    while lo < hi:
        mid = (lo + hi) // 2
        if not can_place(mid):
            hi = mid                 # first failing gap is mid or smaller
        else:
            lo = mid + 1
    return lo - 1                    # the last gap that works
