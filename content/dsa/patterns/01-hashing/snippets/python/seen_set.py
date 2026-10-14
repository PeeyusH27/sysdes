# Template 1: a set of everything already passed. Answers "have I seen this before?" in O(1) on average,
# so the inner "search the earlier elements" loop of the brute force disappears.
from typing import Hashable, Iterable, Optional


def first_repeat(items: Iterable[Hashable]) -> Optional[Hashable]:
    seen = set()
    for x in items:
        if x in seen:
            return x          # second sighting: the first value to repeat
        seen.add(x)
    return None               # every value was distinct
