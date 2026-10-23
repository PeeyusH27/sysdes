from typing import List, Optional


def weight(mark: str) -> int:
    return 1 if mark == "X" else -1


class Board:
    """Knows the grid and whether a mark finishes a line. It keeps a running total per line
    (+1 for each X, -1 for each O), so a line is won exactly when its total reaches n or -n."""

    def __init__(self, n: int):
        self.n = n
        self.cells: List[List[Optional[str]]] = [[None] * n for _ in range(n)]
        self.rows = [0] * n
        self.cols = [0] * n
        self.diag = 0  # cells where row == col
        self.anti = 0  # cells where row + col == n - 1
        self.filled = 0

    def is_free(self, r: int, c: int) -> bool:
        return 0 <= r < self.n and 0 <= c < self.n and self.cells[r][c] is None

    def is_full(self) -> bool:
        return self.filled == self.n * self.n

    def would_complete(self, mark: str, r: int, c: int) -> bool:
        """O(1) and read-only: would this mark complete a line? A mixed line can never reach n in absolute value."""
        d = weight(mark)
        totals = [self.rows[r] + d, self.cols[c] + d]
        if r == c:
            totals.append(self.diag + d)
        if r + c == self.n - 1:
            totals.append(self.anti + d)
        return any(abs(t) == self.n for t in totals)

    def place(self, mark: str, r: int, c: int) -> None:
        self._apply(r, c, mark, 1)

    def clear(self, r: int, c: int) -> None:  # the undo of place: same counters, opposite sign
        self._apply(r, c, self.cells[r][c], -1)

    def _apply(self, r: int, c: int, mark: Optional[str], sign: int) -> None:
        d = weight(mark) * sign
        self.cells[r][c] = mark if sign > 0 else None
        self.filled += sign
        self.rows[r] += d
        self.cols[c] += d
        if r == c:
            self.diag += d
        if r + c == self.n - 1:
            self.anti += d
