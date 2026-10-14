from __future__ import annotations

from typing import Callable, NamedTuple


class Loop(NamedTuple):
    start: int   # where the repeating part starts
    tail: int    # how many steps lead into it
    length: int  # how long the repeating part is


# Template 3: a cycle in an implicit sequence x0, f(x0), f(f(x0)), ... Nothing is stored: f plays the role of node.next.
def floyd(f: Callable[[int], int], x0: int) -> Loop:
    slow = x0
    fast = x0
    while True:                # phase 1: meet somewhere inside the cycle
        slow = f(slow)
        fast = f(f(fast))
        if slow == fast:
            break
    entry = x0                 # phase 2: equal distances lead to the start of the cycle
    tail = 0
    while entry != slow:
        entry = f(entry)
        slow = f(slow)
        tail += 1
    length = 1                 # phase 3: walk once around the cycle
    x = f(entry)
    while x != entry:
        length += 1
        x = f(x)
    return Loop(entry, tail, length)
