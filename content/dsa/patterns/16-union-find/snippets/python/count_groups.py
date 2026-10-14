from __future__ import annotations

from typing import Dict, List, Sequence, Tuple

from union_find import UnionFind


# Template 2: count groups. Start with n groups (every item alone); each union that really
# merges two roots removes one group. Pairs inside an existing group change nothing.
def count_groups(n: int, pairs: Sequence[Tuple[int, int]]) -> int:
    uf = UnionFind(n)
    for a, b in pairs:
        uf.union(a, b)
    return uf.count


# The same loop answers "how big is each group?": bucket every item under its root.
def groups_of(n: int, pairs: Sequence[Tuple[int, int]]) -> List[List[int]]:
    uf = UnionFind(n)
    for a, b in pairs:
        uf.union(a, b)
    groups: Dict[int, List[int]] = {}
    for i in range(n):
        root = uf.find(i)  # always find(i), never parent[i]: a parent is not always a root
        groups.setdefault(root, []).append(i)
    return list(groups.values())
