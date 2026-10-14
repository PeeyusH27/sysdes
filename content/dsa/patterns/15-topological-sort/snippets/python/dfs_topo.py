from __future__ import annotations

from typing import List, Sequence, Tuple


# Template 2: DFS with three colours. WHITE = not visited, GRAY = on the current path, BLACK = finished.
# An edge into a GRAY node closes a cycle. A node finishes after everything it points to, so the reversed
# finishing order is a topological order. Edges (frm, to) mean "frm before to". Returns [] on a cycle.
def topo_sort_dfs(n: int, edges: Sequence[Tuple[int, int]]) -> List[int]:
    adj: List[List[int]] = [[] for _ in range(n)]
    for frm, to in edges:
        adj[frm].append(to)
    WHITE, GRAY, BLACK = 0, 1, 2
    color = [WHITE] * n
    finished: List[int] = []

    def visit(u: int) -> bool:                      # False if a cycle is reachable from u
        color[u] = GRAY
        for v in adj[u]:
            if color[v] == GRAY:
                return False                        # back edge: v is still on the path
            if color[v] == WHITE and not visit(v):  # BLACK: already finished, nothing to do
                return False
        color[u] = BLACK
        finished.append(u)                          # everything after u is already in `finished`
        return True

    for u in range(n):
        if color[u] == WHITE and not visit(u):
            return []
    finished.reverse()
    return finished
