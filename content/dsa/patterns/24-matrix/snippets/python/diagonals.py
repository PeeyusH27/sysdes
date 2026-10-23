# Template 5b: diagonals. Cells on one anti-diagonal share r + c; cells on one main diagonal share r - c.
# Walk the sums in order, clip the row range to the grid, and reverse every other diagonal to zig-zag.
from typing import List


def anti_diagonals(m: List[List[int]]) -> List[List[int]]:
    rows, cols = len(m), len(m[0])
    out: List[List[int]] = []
    for total in range(rows + cols - 1):
        out.append([m[r][total - r] for r in range(max(0, total - cols + 1), min(rows - 1, total) + 1)])   # top-right to bottom-left
    return out


def diagonal_order(m: List[List[int]]) -> List[int]:
    out: List[int] = []
    for total, diagonal in enumerate(anti_diagonals(m)):
        out.extend(reversed(diagonal) if total % 2 == 0 else diagonal)   # even diagonals run bottom-left to top-right
    return out
