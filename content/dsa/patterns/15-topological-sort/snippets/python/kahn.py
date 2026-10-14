from __future__ import annotations

from collections import deque
from typing import List, Sequence, Tuple


# Template 1: Kahn's algorithm. Nodes are 0..n-1 and each edge (frm, to) means "frm must come before to".
# Repeatedly take a node with no remaining incoming edges. Returns a topological order, or [] if there is a cycle.
def topo_sort_kahn(n: int, edges: Sequence[Tuple[int, int]]) -> List[int]:
    adj: List[List[int]] = [[] for _ in range(n)]
    indegree = [0] * n
    for frm, to in edges:
        adj[frm].append(to)
        indegree[to] += 1
    queue = deque(v for v in range(n) if indegree[v] == 0)  # nothing has to come before these
    order = []
    while queue:
        u = queue.popleft()
        order.append(u)
        for v in adj[u]:
            indegree[v] -= 1                  # the edge u -> v is used up
            if indegree[v] == 0:
                queue.append(v)               # everything v waited for is now placed
    return order if len(order) == n else []   # nodes on (or behind) a cycle never reach in-degree 0
