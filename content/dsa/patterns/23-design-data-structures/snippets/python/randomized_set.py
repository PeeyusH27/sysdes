# Template 4: O(1) insert, remove and random pick. A list makes random picks easy, a dict from value to index
# makes removal easy. Remove by copying the LAST element into the hole, then pop.
import random
from typing import Dict, List


class RandomizedSet:
    def __init__(self) -> None:
        self.items: List[int] = []
        self.index: Dict[int, int] = {}   # value -> position in items

    def insert(self, val: int) -> bool:
        if val in self.index:
            return False
        self.index[val] = len(self.items)
        self.items.append(val)
        return True

    def remove(self, val: int) -> bool:
        if val not in self.index:
            return False
        i = self.index[val]
        last = self.items[-1]
        self.items[i] = last   # fill the hole
        self.index[last] = i   # tell the dict where the moved element lives now
        self.items.pop()
        del self.index[val]   # after the assignment above: if val was last, it must end up deleted
        return True

    def get_random(self) -> int:
        return random.choice(self.items)
