### Intuition

The tempting one-pass solution is wrong: if you zero a row as soon as you see a 0, the new zeroes look just like original zeroes, so the scan then zeroes even more rows and columns than it should. You must **decide first, change later**.

Deciding needs memory: which rows and which columns contain a zero. Two arrays of flags are fine (O(rows + columns) space). The in-place trick is to use the grid's own **first row and first column** as those flag arrays: `matrix[i][0] = 0` means "row `i` must be cleared", `matrix[0][j] = 0` means "column `j` must be cleared". The only catch is that the first row and first column also hold real data, so remember with two booleans whether they originally contained a zero.

### Step by step

1. Scan the first row and first column and set `firstRowZero` and `firstColZero`.
2. For every inner cell `(i, j)` with `i, j >= 1`: if it is 0, write 0 into `matrix[i][0]` and `matrix[0][j]`.
3. For every inner cell, if `matrix[i][0]` or `matrix[0][j]` is 0, set the cell to 0.
4. If `firstRowZero`, clear the first row. If `firstColZero`, clear the first column.

### Dry run: [[1, 2, 0], [4, 5, 6], [7, 0, 9]]

| step | grid | note |
|---|---|---|
| start | 1 2 0 / 4 5 6 / 7 0 9 | firstRowZero = true (the 0 at column 2), firstColZero = false |
| mark | 1 0 0 / 4 5 6 / 0 0 9 | the inner 0 at (2, 1) writes zeroes into matrix[2][0] and matrix[0][1] |
| apply to inner cells | 1 0 0 / 4 0 0 / 0 0 0 | cells in a marked row or column are cleared |
| clear first row | 0 0 0 / 4 0 0 / 0 0 0 | firstRowZero was true; first column is left alone |

The final grid clears row 0 and column 2 (from the original 0 at the top right) and row 2 and column 1 (from the 0 in row 2).

### Edge cases

- A zero in the first row or column only: the booleans carry it, the markers are applied to the inner cells, and the first row or column is cleared last.
- A 1 x n or m x 1 grid has no inner cells; only the booleans matter.
- Every cell zero: stays all zero.

### Common mistakes

- Clearing the first row or column **before** applying the markers, which destroys the flags.
- Forgetting the two booleans, so a zero that was originally in the first row is lost or invented.
- Zeroing immediately during the scan.

### Other ways to solve it

Two boolean arrays `zeroRow[m]` and `zeroCol[n]`: O(m + n) extra space and much easier to get right. Interviewers usually accept it first and then ask for the O(1) version.
