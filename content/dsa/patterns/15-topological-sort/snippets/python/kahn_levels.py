from __future__ import annotations

from typing import List, Optional, Sequence, Tuple


# Template 3: Kahn's algorithm one round at a time. Each round takes every node whose in-degree is 0 right now,
# e.g. every course you can take this semester. Returns the rounds (lists of nodes), or None on a cycle.
# The number of rounds is the number of nodes on the longest dependency chain.
def topo_levels(n: int, edges: Sequence[Tuple[int, int]]) -> Optional[List[List[int]]]:
    adj: List[List[int]] = [[] for _ in range(n)]
    indegree = [0] * n
    for frm, to in edges:
        adj[frm].append(to)
        indegree[to] += 1
    current = [v for v in range(n) if indegree[v] == 0]
    rounds: List[List[int]] = []
    placed = 0
    while current:
        rounds.append(current)
        placed += len(current)
        nxt = []
        for u in current:
            for v in adj[u]:
                indegree[v] -= 1
                if indegree[v] == 0:
                    nxt.append(v)  # its last prerequisite was in this round
        current = nxt
    return rounds if placed == n else None
