# One job each: Board knows the grid and whether a mark completes a line; Game knows whose turn it is and how the game ends.
class Board:
    def __init__(self, n):
        self.n = n
        self.cells = [[""] * n for _ in range(n)]
        # Running totals per line, +1 for each X and -1 for each O. A line is won when its total reaches +-n.
        self.rows = [0] * n
        self.cols = [0] * n
        self.diag = 0
        self.anti = 0
        self.filled = 0

    def is_free(self, row, col):
        return (
            isinstance(row, int) and isinstance(col, int)
            and 0 <= row < self.n and 0 <= col < self.n
            and self.cells[row][col] == ""
        )

    def place(self, mark, row, col):
        """Places a mark and returns True when it completes a line. O(1): only four counters change."""
        d = 1 if mark == "X" else -1
        self.cells[row][col] = mark
        self.filled += 1
        self.rows[row] += d
        self.cols[col] += d
        if row == col:
            self.diag += d
        if row + col == self.n - 1:
            self.anti += d
        return any(abs(t) == self.n for t in (self.rows[row], self.cols[col], self.diag, self.anti))

    def is_full(self):
        return self.filled == self.n * self.n

    def snapshot(self):
        return [list(r) for r in self.cells]


class Game:
    def __init__(self, n):
        self.grid = Board(n)
        self.turn = "X"
        self.result = None  # "X", "O" or "DRAW" once finished

    def move(self, player, row, col):
        if self.result is not None:
            return "GAME_OVER"
        if player != self.turn:
            return "NOT_YOUR_TURN"
        if not self.grid.is_free(row, col):
            return "INVALID_MOVE"
        if self.grid.place(player, row, col):
            self.result = player
            return player + "_WINS"
        if self.grid.is_full():
            self.result = "DRAW"
            return "DRAW"
        self.turn = "O" if player == "X" else "X"
        return "OK"

    def winner(self):
        return self.result

    def board(self):
        return self.grid.snapshot()
