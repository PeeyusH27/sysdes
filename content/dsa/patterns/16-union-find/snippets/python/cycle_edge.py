from __future__ import annotations

from typing import List, Optional, Sequence, Tuple

from union_find import UnionFind


# Template 3: cycle detection in an undirected graph. Add the edges one by one; the first edge
# whose two ends already share a root closes a cycle (they were connected without it).
def first_cycle_edge(n: int, edges: Sequence[Tuple[int, int]]) -> Optional[List[int]]:
    uf = UnionFind(n)
    for a, b in edges:
        if not uf.union(a, b):
            return [a, b]
    return None  # the edges form a forest


# A graph is a tree when it has exactly n - 1 edges and none of them closes a cycle.
def is_tree(n: int, edges: Sequence[Tuple[int, int]]) -> bool:
    return len(edges) == n - 1 and first_cycle_edge(n, edges) is None
