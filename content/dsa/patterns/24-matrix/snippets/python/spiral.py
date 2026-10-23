# Template 2: layers and boundaries. Four walls frame the unread rectangle; after each side is read,
# that wall moves inward. The two guards stop a leftover single row or column being read twice.
from typing import List


def spiral_order(m: List[List[int]]) -> List[int]:
    out: List[int] = []
    top, bottom = 0, len(m) - 1
    left, right = 0, len(m[0]) - 1
    while top <= bottom and left <= right:
        for c in range(left, right + 1):
            out.append(m[top][c])
        top += 1
        for r in range(top, bottom + 1):
            out.append(m[r][right])
        right -= 1
        if top <= bottom:
            for c in range(right, left - 1, -1):
                out.append(m[bottom][c])
            bottom -= 1
        if left <= right:
            for r in range(bottom, top - 1, -1):
                out.append(m[r][left])
            left += 1
    return out


# The same spiral written the other way round: a direction array and "turn when blocked", to fill 1..n*n.
def spiral_fill(n: int) -> List[List[int]]:
    grid = [[0] * n for _ in range(n)]
    dr = [0, 1, 0, -1]   # right, down, left, up
    dc = [1, 0, -1, 0]
    r = c = d = 0
    for k in range(1, n * n + 1):
        grid[r][c] = k
        nr, nc = r + dr[d], c + dc[d]
        if nr < 0 or nr >= n or nc < 0 or nc >= n or grid[nr][nc] != 0:
            d = (d + 1) % 4   # blocked: turn right
        r += dr[d]
        c += dc[d]
    return grid
