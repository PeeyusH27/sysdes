from __future__ import annotations

from typing import List


# Template 1: union-find (disjoint set union) over items 0 ... n - 1.
# parent[] stores a forest: following parent links from any item ends at its group's root.
# Two items are in the same group exactly when they have the same root.
class UnionFind:
    def __init__(self, n: int) -> None:
        self.parent: List[int] = list(range(n))  # every item starts as its own root
        self.rank: List[int] = [0] * n           # upper bound on each root's tree height
        self.count = n                           # number of separate groups

    def find(self, x: int) -> int:
        root = x
        while self.parent[root] != root:
            root = self.parent[root]
        while self.parent[x] != root:            # path compression: point the whole path at the root
            nxt = self.parent[x]
            self.parent[x] = root
            x = nxt
        return root

    def union(self, a: int, b: int) -> bool:
        ra = self.find(a)
        rb = self.find(b)
        if ra == rb:
            return False                         # already in one group (an edge here closes a cycle)
        if self.rank[ra] < self.rank[rb]:
            ra, rb = rb, ra
        self.parent[rb] = ra                     # union by rank: the shorter tree goes under the taller
        if self.rank[ra] == self.rank[rb]:
            self.rank[ra] += 1
        self.count -= 1
        return True

    def connected(self, a: int, b: int) -> bool:
        return self.find(a) == self.find(b)
