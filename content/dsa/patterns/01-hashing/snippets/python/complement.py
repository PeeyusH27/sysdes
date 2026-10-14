# Template 3: complement lookup. For each x, the partner it needs is target - x: look it up among the values
# already passed, THEN record x. Looking up first means x never pairs with itself.
from typing import Dict, List


def count_pairs(nums: List[int], target: int) -> int:
    seen: Dict[int, int] = {}   # value -> how many times it has appeared so far
    pairs = 0
    for x in nums:
        pairs += seen.get(target - x, 0)   # x pairs with every earlier copy of its complement
        seen[x] = seen.get(x, 0) + 1
    return pairs
