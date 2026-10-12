### Intuition

Look at the **last move** into any cell `(r, c)`. Since the robot only moves right or down, it came either from the cell **above**, `(r - 1, c)`, or from the cell to the **left**, `(r, c - 1)`. Paths of the first kind end with a down move and paths of the second kind end with a right move, so no path is counted twice and none is missed:

`paths(r, c) = paths(r - 1, c) + paths(r, c - 1)`

A recursion on this formula is correct but recomputes the same cells exponentially many times. There are only `m × n` cells, so fill a table once, in an order where the two cells each one reads are already done.

### Step by step

1. **State**: `paths[r][c]` = the number of right/down paths from `(0, 0)` to `(r, c)`.
2. **Recurrence**: `paths[r][c] = paths[r - 1][c] + paths[r][c - 1]`.
3. **Base cases**: every cell in row 0 can only be reached by moving right all the way, and every cell in column 0 by moving down all the way, so they are all `1`. Creating the table with `fill(1)` sets them.
   - Build the rows with `Array.from({ length: m }, () => new Array(n).fill(1))`, so each row is its own array.
4. **Order**: rows top to bottom, and within a row left to right, starting at `(1, 1)`.
5. **Answer**: `paths[m - 1][n - 1]`, the bottom-right corner.
6. **Space**: each row only reads the row above, so a single row works too: `row[c] += row[c - 1]` (the old `row[c]` is the value from above).

### Dry run: `m = 3`, `n = 3`

| | col 0 | col 1 | col 2 |
|---|---|---|---|
| **row 0** | 1 | 1 | 1 |
| **row 1** | 1 | 1 + 1 = 2 | 1 + 2 = 3 |
| **row 2** | 1 | 2 + 1 = 3 | 3 + 3 = **6** |

Each inner cell is the cell above plus the cell to its left.

### Why it works

Every path to `(r, c)` other than the start ends with exactly one last move, down or right. Removing it leaves a path to `(r - 1, c)` or to `(r, c - 1)`, and adding the move back turns any such path into a path to `(r, c)`. That one-to-one match means the count is exactly the sum of the two neighbours.

### Edge cases

- One row or one column: the only path goes straight along it, and the answer is 1 (the loops don't run).
- `1 × 1`: the robot is already there; one empty path.
- Large grids: the counts grow fast (`17 × 18` gives over a billion), but they stay exact integers in JavaScript.

### Common mistakes

- `new Array(m).fill(new Array(n).fill(1))`: every row is the **same** array. Here it happens to give the right count, because one shared row behaves exactly like the one-row version (`row[c] += row[c - 1]`). The same habit silently breaks any table that reads the diagonal or seeds row 0 and column 0 differently, like Longest Common Subsequence and Edit Distance, so build rows with `Array.from`.
- Starting the loops at 0 and reading `paths[-1][c]`, which throws.
- Plain recursion without a memo: correct, but it times out on the larger grids.

### Other ways to solve it

**Combinatorics** (O(min(m, n)) time, O(1) space): every path is a sequence of `m - 1` down moves and `n - 1` right moves, so the answer is the binomial coefficient C(m + n - 2, m - 1). Compute it as a running product, `result = result * (n - 1 + i) / i` for `i` from 1 to `m - 1`. Each intermediate value is itself a binomial coefficient, so the division is always exact.
