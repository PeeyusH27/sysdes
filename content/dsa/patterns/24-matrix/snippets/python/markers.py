# Template 3: marker row and column. Record "this row/column must be cleared" inside the grid itself (its first
# row and first column), instead of in extra arrays. Decide first, change later: never zero while scanning.
from typing import List


def set_zeroes(m: List[List[int]]) -> None:
    rows, cols = len(m), len(m[0])
    first_row_zero = any(m[0][j] == 0 for j in range(cols))   # the markers live in row 0 and column 0,
    first_col_zero = any(m[i][0] == 0 for i in range(rows))   # so remember if they held a zero

    for i in range(1, rows):
        for j in range(1, cols):
            if m[i][j] == 0:
                m[i][0] = 0   # mark row i
                m[0][j] = 0   # mark column j
    for i in range(1, rows):
        for j in range(1, cols):
            if m[i][0] == 0 or m[0][j] == 0:
                m[i][j] = 0
    if first_row_zero:   # only now is it safe to clear the markers
        for j in range(cols):
            m[0][j] = 0
    if first_col_zero:
        for i in range(rows):
            m[i][0] = 0
