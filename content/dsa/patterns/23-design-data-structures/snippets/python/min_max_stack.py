# Template 5: auxiliary state. Store, with every pushed value, the answer for "everything below me":
# the entry never changes while it lives, so pop needs no repair. O(1) push, pop, top, min and max.
from typing import List, Tuple


class MinMaxStack:
    def __init__(self) -> None:
        self.items: List[Tuple[int, int, int]] = []   # (value, min so far, max so far)

    def push(self, val: int) -> None:
        if self.items:
            _, lo, hi = self.items[-1]
            self.items.append((val, min(val, lo), max(val, hi)))
        else:
            self.items.append((val, val, val))

    def pop(self) -> int:
        return self.items.pop()[0]

    def top(self) -> int:
        return self.items[-1][0]

    def get_min(self) -> int:
        return self.items[-1][1]

    def get_max(self) -> int:
        return self.items[-1][2]
