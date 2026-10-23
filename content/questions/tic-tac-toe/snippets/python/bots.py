from typing import List, Tuple

from board import Board

Cell = Tuple[int, int]


def free(board: Board) -> List[Cell]:
    return [(r, c) for r in range(board.n) for c in range(board.n) if board.is_free(r, c)]


# Strategy: a bot is a function (board, mark) -> cell. The game never knows which one is playing.
def first_free(board: Board, mark: str) -> Cell:
    return free(board)[0]


def sensible(board: Board, mark: str) -> Cell:
    """Win if you can, else block the opponent, else take the middle, else the first free cell."""
    other = "O" if mark == "X" else "X"
    cells = free(board)
    mid = board.n // 2
    for wanted in (lambda r, c: board.would_complete(mark, r, c),
                   lambda r, c: board.would_complete(other, r, c),
                   lambda r, c: (r, c) == (mid, mid)):
        for r, c in cells:
            if wanted(r, c):
                return (r, c)
    return cells[0]
