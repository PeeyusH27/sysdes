from __future__ import annotations

from typing import Dict, Hashable, List


# Template 4: union-find over arbitrary keys (emails, words, "r,c" cells) with union by size.
# Keys are added the first time they are seen, so nothing has to be numbered up front,
# and every root knows how many items its group holds.
class KeyedUnionFind:
    def __init__(self) -> None:
        self.parent: Dict[Hashable, Hashable] = {}
        self.sizes: Dict[Hashable, int] = {}  # root -> number of items in its group

    def add(self, x: Hashable) -> None:
        if x not in self.parent:
            self.parent[x] = x
            self.sizes[x] = 1

    def find(self, x: Hashable) -> Hashable:
        self.add(x)
        root = x
        while self.parent[root] != root:
            root = self.parent[root]
        while self.parent[x] != root:         # path compression
            nxt = self.parent[x]
            self.parent[x] = root
            x = nxt
        return root

    def union(self, a: Hashable, b: Hashable) -> bool:
        ra = self.find(a)
        rb = self.find(b)
        if ra == rb:
            return False
        if self.sizes[ra] < self.sizes[rb]:
            ra, rb = rb, ra
        self.parent[rb] = ra                  # union by size: the smaller group joins the larger
        self.sizes[ra] += self.sizes[rb]
        return True

    def size_of(self, x: Hashable) -> int:
        return self.sizes[self.find(x)]

    def groups(self) -> List[List[Hashable]]:
        out: Dict[Hashable, List[Hashable]] = {}
        for x in list(self.parent):           # a copy: find() may touch the dict while we loop
            out.setdefault(self.find(x), []).append(x)
        return list(out.values())
