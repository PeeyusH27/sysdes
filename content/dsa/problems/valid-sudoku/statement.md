You are given a partially filled `9 x 9` Sudoku board as a grid of strings. Each cell is either a digit `"1"` to `"9"` or `"."` for an empty cell. Return `true` if the board is **valid so far**, meaning:

- each row contains no digit more than once,
- each column contains no digit more than once,
- each of the nine `3 x 3` boxes (the ones that start at rows and columns 0, 3 and 6) contains no digit more than once.

Only the filled cells are checked. A valid board does not have to be solvable.

### Constraints

- The board has exactly 9 rows and 9 columns.
- Every cell is `"."` or a digit from `"1"` to `"9"`.
