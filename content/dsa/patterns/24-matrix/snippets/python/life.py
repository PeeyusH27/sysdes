# Template 4: simulation with state encoding. All cells change at once, so decisions must use the OLD board.
# Encode old and new state in one number: 0 dead, 1 alive, 2 alive -> dead, 3 dead -> alive.
# Eight directions as (row, column) steps: the direction-array idiom for every grid walk.
from typing import List

NEIGHBOURS = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]


def _alive_neighbours(board: List[List[int]], r: int, c: int) -> int:
    live = 0
    for dr, dc in NEIGHBOURS:
        nr, nc = r + dr, c + dc
        if 0 <= nr < len(board) and 0 <= nc < len(board[0]) and board[nr][nc] in (1, 2):   # 2 was alive before
            live += 1
    return live


def game_of_life(board: List[List[int]]) -> None:
    for r in range(len(board)):
        for c in range(len(board[0])):
            live = _alive_neighbours(board, r, c)
            if board[r][c] == 1 and (live < 2 or live > 3):
                board[r][c] = 2   # dies
            elif board[r][c] == 0 and live == 3:
                board[r][c] = 3   # is born
    for row in board:
        for c in range(len(row)):
            row[c] = 1 if row[c] in (1, 3) else 0   # keep the new state


# The simple alternative: write into a copy, read from the original. O(rows * columns) extra space.
def next_generation(board: List[List[int]]) -> List[List[int]]:
    nxt = [row[:] for row in board]
    for r in range(len(board)):
        for c in range(len(board[0])):
            live = _alive_neighbours(board, r, c)
            if board[r][c] == 1:
                nxt[r][c] = 1 if live in (2, 3) else 0
            else:
                nxt[r][c] = 1 if live == 3 else 0
    return nxt
