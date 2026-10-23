# Template 1: rotate by combining two simple moves. Transpose swaps (i, j) with (j, i); reversing every row
# then mirrors left to right. Transpose + reverse rows = 90 degrees clockwise, in place, O(1) extra space.
from typing import List

Grid = List[List[int]]


def transpose(m: Grid) -> Grid:
    # A new grid, so it also works for rectangles: rows x cols becomes cols x rows.
    return [[m[i][j] for i in range(len(m))] for j in range(len(m[0]))]


def rotate_clockwise(m: Grid) -> None:
    n = len(m)
    for i in range(n):
        for j in range(i + 1, n):   # j > i: swap each pair once
            m[i][j], m[j][i] = m[j][i], m[i][j]
    for row in m:
        row.reverse()


def rotate_counter_clockwise(m: Grid) -> None:
    for row in m:
        row.reverse()   # reverse first, then transpose, for the other direction
    n = len(m)
    for i in range(n):
        for j in range(i + 1, n):
            m[i][j], m[j][i] = m[j][i], m[i][j]
