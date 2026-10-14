import math


# Template 2: interval scheduling. Keep the most non-overlapping intervals [start, end) by always taking
# the one that ends first among those that still fit. After k picks, no other choice of k intervals ends sooner.
def max_non_overlapping(intervals):
    kept = 0
    last_end = -math.inf
    for start, end in sorted(intervals, key=lambda iv: iv[1]):
        if start >= last_end:   # fits after the last kept interval (touching is fine)
            kept += 1
            last_end = end
    return kept
