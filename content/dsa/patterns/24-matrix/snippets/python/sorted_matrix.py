# Template 5a: binary search on a matrix. If each row starts above the previous row's end, the grid read row by
# row is one sorted list: search positions 0..rows*cols-1 and convert a position to (row, column).
from typing import List


def search_flat(m: List[List[int]], target: int) -> bool:
    cols = len(m[0])
    lo, hi = 0, len(m) * cols - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        value = m[mid // cols][mid % cols]
        if value == target:
            return True
        if value < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return False


# If rows and columns are each sorted but rows do not chain, walk a staircase from the top-right corner:
# too big means nothing below-left of here can match in this column, so go left; too small, go down.
def search_staircase(m: List[List[int]], target: int) -> bool:
    r, c = 0, len(m[0]) - 1
    while r < len(m) and c >= 0:
        if m[r][c] == target:
            return True
        if m[r][c] > target:
            c -= 1
        else:
            r += 1
    return False
