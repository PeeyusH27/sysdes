from __future__ import annotations

from collections import deque
from typing import List, Sequence


# Template 3: multi-source BFS. Every source starts in the queue at distance 0, so one pass gives each cell its
# distance to the NEAREST source. Grid of strings: "E" exit (a source), "." open, "#" wall; -1 = unreachable.
def distance_to_nearest(grid: Sequence[str]) -> List[List[int]]:
    rows = len(grid)
    cols = len(grid[0])
    dist = [[-1] * cols for _ in range(rows)]
    queue = deque()
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == "E":
                dist[r][c] = 0                    # all sources are seeded (and marked) together
                queue.append((r, c))
    dirs = [(1, 0), (-1, 0), (0, 1), (0, -1)]
    while queue:
        r, c = queue.popleft()
        for dr, dc in dirs:
            nr, nc = r + dr, c + dc
            if nr < 0 or nr >= rows or nc < 0 or nc >= cols:
                continue
            if grid[nr][nc] != "." or dist[nr][nc] != -1:
                continue
            dist[nr][nc] = dist[r][c] + 1         # first discovery = nearest source
            queue.append((nr, nc))
    return dist
