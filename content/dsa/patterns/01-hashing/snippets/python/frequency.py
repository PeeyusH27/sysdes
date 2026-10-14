# Template 2: a frequency map. Count once, then answer "how many?" for any value in O(1).
from typing import Dict, Hashable, Iterable


def count_all(items: Iterable[Hashable]) -> Dict[Hashable, int]:
    count: Dict[Hashable, int] = {}
    for x in items:
        count[x] = count.get(x, 0) + 1
    return count


# Counting as a budget: can `note` be written using each letter of `magazine` at most once?
def can_construct(note: str, magazine: str) -> bool:
    count = count_all(magazine)
    for ch in note:
        left = count.get(ch, 0)
        if left == 0:
            return False      # this letter has run out
        count[ch] = left - 1  # spend one copy
    return True
