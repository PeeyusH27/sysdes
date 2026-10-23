import threading
from typing import List, Optional, Tuple

from board import Board


class Game:
    """Knows whose turn it is and how the match ends. Every applied change bumps `version`, so two clients
    that both acted on the same view cannot both succeed. One lock makes the turn check and the cell check
    one atomic step: the single writer."""

    def __init__(self, n: int = 3):
        self.board = Board(n)
        self.marks = ["X", "O"]
        self.turn = 0
        self.status = "IN_PROGRESS"  # IN_PROGRESS -> WON | DRAW, and undo goes back
        self.winner: Optional[str] = None
        self.version = 0
        self.history: List[Tuple[str, int, int]] = []  # the undo stack (Command)
        self._lock = threading.Lock()

    @property
    def current(self) -> str:
        return self.marks[self.turn]

    def move(self, mark: str, r: int, c: int, seen: Optional[int] = None) -> str:
        with self._lock:
            if self.status != "IN_PROGRESS":
                return "GAME_OVER"
            if seen is not None and seen != self.version:
                return "STALE"  # the caller decided on an old board
            if mark != self.current:
                return "NOT_YOUR_TURN"
            if not self.board.is_free(r, c):
                return "INVALID_MOVE"
            wins = self.board.would_complete(mark, r, c)
            self.board.place(mark, r, c)
            self.history.append((mark, r, c))
            self.version += 1
            if wins:
                self.status, self.winner = "WON", mark
                return "WIN"
            if self.board.is_full():
                self.status = "DRAW"
                return "DRAW"
            self.turn = (self.turn + 1) % len(self.marks)
            return "OK"

    def undo(self) -> bool:
        with self._lock:
            if not self.history:
                return False
            mark, r, c = self.history.pop()
            self.board.clear(r, c)
            self.turn = self.marks.index(mark)
            self.status, self.winner = "IN_PROGRESS", None
            self.version += 1
            return True
