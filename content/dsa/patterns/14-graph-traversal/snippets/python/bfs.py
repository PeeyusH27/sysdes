from __future__ import annotations

from collections import deque
from typing import List, Sequence, Tuple


# Template 2: BFS from one start node. Nodes come out of the queue in order of distance, so the first time a
# node is discovered is along a fewest-edges path. dist[v] = number of edges from start, or -1 if unreachable.
def bfs_distances(adj: List[List[int]], start: int) -> List[int]:
    dist = [-1] * len(adj)                  # -1 doubles as "not visited"
    dist[start] = 0                         # mark the start when it is enqueued
    queue = deque([start])                  # a deque: list.pop(0) would be O(n) per call
    while queue:
        node = queue.popleft()
        for nxt in adj[node]:
            if dist[nxt] != -1:
                continue                    # already queued, so its distance is final
            dist[nxt] = dist[node] + 1      # mark on enqueue
            queue.append(nxt)
    return dist


# Fewest moves between two cells of a grid of strings ("." open, "#" wall), one level per step. -1 if blocked.
def grid_steps(grid: Sequence[str], start: Tuple[int, int], target: Tuple[int, int]) -> int:
    sr, sc = start
    tr, tc = target
    rows = len(grid)
    cols = len(grid[0])
    if grid[sr][sc] == "#" or grid[tr][tc] == "#":
        return -1
    dirs = [(1, 0), (-1, 0), (0, 1), (0, -1)]
    seen = [[False] * cols for _ in range(rows)]
    seen[sr][sc] = True
    queue = deque([(sr, sc)])
    steps = 0
    while queue:
        for _ in range(len(queue)):         # everything queued right now is `steps` moves away
            r, c = queue.popleft()
            if r == tr and c == tc:
                return steps
            for dr, dc in dirs:
                nr, nc = r + dr, c + dc
                if nr < 0 or nr >= rows or nc < 0 or nc >= cols:
                    continue
                if seen[nr][nc] or grid[nr][nc] == "#":
                    continue
                seen[nr][nc] = True
                queue.append((nr, nc))
        steps += 1
    return -1
