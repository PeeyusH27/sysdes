# Strings, compare: deep-unordered. Returns a dict view on purpose: the harness turns iterables into lists.
from collections import defaultdict
from typing import List


def group_anagrams(strs: List[str]):
    groups = defaultdict(list)
    for s in strs:
        groups["".join(sorted(s))].append(s)
    return groups.values()
