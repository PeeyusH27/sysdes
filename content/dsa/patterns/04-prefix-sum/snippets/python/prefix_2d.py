# Template 3: 2D prefix sums. P[r][c] is the sum of the rectangle grid[0..r-1][0..c-1] (one extra row and
# column of zeros), so any rectangle sum is four lookups by inclusion-exclusion.
from typing import List


def build_prefix_2d(grid: List[List[int]]) -> List[List[int]]:
    rows = len(grid)
    cols = len(grid[0]) if rows else 0
    P = [[0] * (cols + 1) for _ in range(rows + 1)]
    for r in range(rows):
        for c in range(cols):
            P[r + 1][c + 1] = grid[r][c] + P[r][c + 1] + P[r + 1][c] - P[r][c]   # the overlap was added twice
    return P


# Sum of grid[r1..r2][c1..c2], all ends inclusive.
def rect_sum(P: List[List[int]], r1: int, c1: int, r2: int, c2: int) -> int:
    return P[r2 + 1][c2 + 1] - P[r1][c2 + 1] - P[r2 + 1][c1] + P[r1][c1]
