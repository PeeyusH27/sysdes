from __future__ import annotations

from typing import Dict, Hashable, List, Optional, Sequence, Tuple


# Turn an edge list into an adjacency list once, up front: adj[u] is the list of u's neighbours, so
# looping over a node's neighbours costs O(its degree) instead of a scan over every edge.
def build_adjacency(n: int, edges: Sequence[Tuple[int, int]], directed: bool = False) -> List[List[int]]:
    adj: List[List[int]] = [[] for _ in range(n)]  # n separate lists (not [[]] * n, which shares one)
    for a, b in edges:
        adj[a].append(b)
        if not directed:
            adj[b].append(a)                       # an undirected edge is stored in both directions
    return adj


# When nodes are strings or sparse numbers ("JFK", 10**9), key a dict by node instead of using a list.
def build_adjacency_map(edges: Sequence[Tuple[Hashable, Hashable]], directed: bool = False) -> Dict[Hashable, List[Hashable]]:
    adj: Dict[Hashable, List[Hashable]] = {}

    def add(frm: Hashable, to: Optional[Hashable] = None) -> None:
        adj.setdefault(frm, [])
        if to is not None:
            adj[frm].append(to)

    for a, b in edges:
        add(a, b)
        if directed:
            add(b)                                 # make sure sinks exist as keys too
        else:
            add(b, a)
    return adj
