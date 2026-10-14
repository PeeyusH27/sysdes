# Template 2: variable window, LONGEST valid. Grow right; while the window breaks the rule, shrink left;
# then the window is the longest valid one ending at right. Works when shrinking a valid window keeps it valid.
# Example rule: at most k distinct characters.
from typing import Dict


def longest_at_most_k_distinct(s: str, k: int) -> int:
    count: Dict[str, int] = {}   # character -> copies inside s[left..right]
    left = 0
    best = 0
    for right, ch in enumerate(s):
        count[ch] = count.get(ch, 0) + 1
        while len(count) > k:                   # invalid: too many distinct characters
            out = s[left]
            if count[out] == 1:
                del count[out]                  # delete at zero so len(count) stays honest
            else:
                count[out] -= 1
            left += 1
        best = max(best, right - left + 1)      # record AFTER shrinking
    return best
