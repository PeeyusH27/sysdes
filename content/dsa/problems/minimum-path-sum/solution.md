### Intuition

Stepping to the cheaper neighbour at each cell looks reasonable but fails: in the first example it goes `1 → 3 → 5 → 2 → 6` (17) because it can't see that the expensive-looking `4` leads to a much cheaper route (14).

Instead, think about the **last move**. A path ending at `(r, c)` arrives from the cell above or from the cell to the left. Whichever it is, the part before should be the cheapest possible path to that neighbour. So the cheapest cost to reach `(r, c)` is its own cost plus the cheaper of the two neighbours' best costs. That is the grid-paths recurrence with `Math.min` instead of `+`.

### Step by step

1. **State**: `best[r][c]` = the smallest cost of a right/down path from `(0, 0)` to `(r, c)`, including both ends.
2. **Recurrence**: `best[r][c] = grid[r][c] + Math.min(best[r - 1][c], best[r][c - 1])`.
3. **Base cases**:
   1. `best[0][0] = grid[0][0]`.
   2. Top row: only reachable from the left, so `best[0][c] = best[0][c - 1] + grid[0][c]` (a running sum).
   3. Left column: only reachable from above, so `best[r][0] = best[r - 1][0] + grid[r][0]`.
4. **Order**: row by row, left to right, so above and left are always ready.
5. **Answer**: `best[rows - 1][cols - 1]`.
6. **Space**: each row reads only the row above, so one row is enough: `row[c] = grid[r][c] + Math.min(row[c], row[c - 1])`.

### Dry run: `[[1, 4, 2], [3, 8, 1], [5, 2, 6]]`

| | col 0 | col 1 | col 2 |
|---|---|---|---|
| **row 0** | 1 | 1 + 4 = 5 | 5 + 2 = 7 |
| **row 1** | 1 + 3 = 4 | 8 + min(5, 4) = 12 | 1 + min(7, 12) = 8 |
| **row 2** | 4 + 5 = 9 | 2 + min(12, 9) = 11 | 6 + min(8, 11) = **14** |

Walking back from 14 along the smaller neighbours (8, 7, 5, 1) recovers the path: right, right, down, down.

### Why it works

Take the cheapest path to `(r, c)`. Its last step comes from above or from the left. The part before that step must itself be a cheapest path to that neighbour; otherwise, swapping in a cheaper one would make the whole path cheaper. So the best cost is `grid[r][c]` plus the best cost of one of the two neighbours, and taking the minimum picks the right one.

### Edge cases

- A single cell: the answer is that cell's value.
- One row or one column: only one path exists, and the answer is the sum of all cells (the base-case running sums).
- Zero-cost cells are fine; costs are never negative, so a longer path is never cheaper by accident.

### Common mistakes

- Greedy "step to the cheaper neighbour": fails the first example.
- Treating the top row and left column like inner cells, which reads `best[-1][c]` (throws) or adds a phantom 0 from outside the grid.
- Forgetting to count the start cell or the end cell.
- Plain recursion over "right or down" without a memo: correct, but it follows every path separately and times out on the 20 × 20 grid.
- Writing the results into `grid` itself works, but it changes the caller's input: copy first if the input must stay intact.
