from __future__ import annotations

from typing import Any, List, Sequence


# Template 1a: recursive DFS on a grid. A grid is an implicit graph: cell (r, c) is a node and its
# neighbours are the in-bounds cells one step away. Counts the regions of connected cells equal to `target`.
# Python's default recursion limit is about 1000 frames, so a region longer than that needs 1b below.
def count_regions(grid: Sequence[Sequence[Any]], target: Any = 1) -> int:
    rows = len(grid)
    cols = len(grid[0]) if rows > 0 else 0
    seen = [[False] * cols for _ in range(rows)]
    dirs = [(1, 0), (-1, 0), (0, 1), (0, -1)]

    def dfs(r: int, c: int) -> None:
        seen[r][c] = True                                      # mark before exploring further
        for dr, dc in dirs:
            nr, nc = r + dr, c + dc
            if nr < 0 or nr >= rows or nc < 0 or nc >= cols:
                continue                                       # off the grid
            if seen[nr][nc] or grid[nr][nc] != target:
                continue                                       # visited, or not part of a region
            dfs(nr, nc)

    regions = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == target and not seen[r][c]:
                regions += 1                                   # nothing earlier reached it: a new region
                dfs(r, c)
    return regions


# Template 1b: the same flood with an explicit stack, so a huge region can't overflow the call stack.
# Returns the size of every region in the order the scan finds them.
def region_sizes(grid: Sequence[Sequence[Any]], target: Any = 1) -> List[int]:
    rows = len(grid)
    cols = len(grid[0]) if rows > 0 else 0
    seen = [[False] * cols for _ in range(rows)]
    dirs = [(1, 0), (-1, 0), (0, 1), (0, -1)]
    sizes = []
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] != target or seen[r][c]:
                continue
            seen[r][c] = True                                  # mark on push
            stack = [(r, c)]
            size = 0
            while stack:
                cr, cc = stack.pop()
                size += 1
                for dr, dc in dirs:
                    nr, nc = cr + dr, cc + dc
                    if nr < 0 or nr >= rows or nc < 0 or nc >= cols:
                        continue
                    if seen[nr][nc] or grid[nr][nc] != target:
                        continue
                    seen[nr][nc] = True
                    stack.append((nr, nc))
            sizes.append(size)
    return sizes
