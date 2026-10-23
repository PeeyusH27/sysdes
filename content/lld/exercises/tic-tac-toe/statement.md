Build the game logic for **tic-tac-toe on an N by N board**, for two players, `"X"` and `"O"`. `"X"` always moves first and the players then alternate. The first player to fill a whole row, a whole column, or either of the two diagonals with their own mark wins. If the board fills up with no winner, the game is a draw.

Implement the class `Game`:

- `Game(n)`: a new, empty `n` by `n` board (`n >= 1`).
- `move(player, row, col)`: `player` marks the cell at `row`, `col` (both 0-indexed). Returns one of these strings, checked **in this order**:
  1. `"GAME_OVER"` if the game has already ended, whatever the arguments are.
  2. `"NOT_YOUR_TURN"` if it is not `player`'s turn.
  3. `"INVALID_MOVE"` if the cell is off the board or already taken.
  4. Otherwise the mark is placed, and the result is `"X_WINS"` or `"O_WINS"` if this move completed a line, else `"DRAW"` if the board is now full, else `"OK"`.
- `winner()`: `"X"` or `"O"` once someone has won, `"DRAW"` after a draw, and `null` while the game is still on.
- `board()`: the grid as an array of `n` rows, each an array of `n` strings: `""` for an empty cell, `"X"` or `"O"`.

A move that is rejected (`"NOT_YOUR_TURN"`, `"INVALID_MOVE"`, `"GAME_OVER"`) changes nothing, and in particular **does not use up the turn**: after an invalid move the same player still has to move.

**Design requirements**

- Split responsibilities. A `Board` should own the grid and know whether a mark completed a line. The `Game` should own whose turn it is and how the game ends, and delegate the rest to the board. One class doing all of it is the design this exercise is meant to move you away from.
- Checking a move must be **O(1)**, not a scan of the row, column and diagonals, and certainly not of the whole board. The tests include a 500 by 500 board.

**Notes**

- `"X"` and `"O"` are the only players. Any other `player` string is not that player's turn.
- A move that fills the last cell and completes a line is a win, not a draw.
- On a 1 by 1 board the first move wins.
- `board()` must return a copy: changing the returned array must not change the game.
